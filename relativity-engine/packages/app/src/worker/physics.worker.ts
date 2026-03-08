import { Simulator } from '../../../physics/src/engine/simulator';
import { generateDeterministicBodies } from '../../../physics/src/benchmark/benchmark';
import { BarnesHutContext } from '../../../physics/src/forces/bhForce';
import { velocityVerlet } from '../../../physics/src/integrators/verlet';
import { rk4 } from '../../../physics/src/integrators/rk4';
import { totalEnergy } from '../../../physics/src/energy/totalEnergy';
import { calculateTotalMomentum, calculateAngularMomentum } from '../../../physics/src/energy/physicsMetrics';
import * as rng from '../../../physics/src/utils/rng';

// Constants
const BODY_COUNT = 5000;
let currentSeed = 42;
// Config Variables (Mutable via SET_PARAMS)
let currentTheta = 0.5;
let currentEpsilon = 1e-3;
let currentDt = 0.01;
let currentIntegrator = 'VERLET';

// Research Features
let isDivergenceMode = false;
let simulatorVerlet: Simulator | null = null;
let simulatorRK4: Simulator | null = null;
let externalForceType: 'NONE' | 'UNIFORM' | 'DRAG' | 'NOISE' = 'NONE';
let externalForceMagnitude = 0;
let isConservative = true;

// Lyapunov tracking
const lyapunovHistory: { t: number, logDelta: number }[] = [];
let lyapunovEstimate = 0;

// Variables
let simulator: Simulator;
let currentBarnesHutContext: BarnesHutContext;
let masses: number[];
let positionBuffer: SharedArrayBuffer;
let positionView: Float32Array; // Shared buffer mapping 
let isPlaying = true;
let currentStep = 0;
let initialEnergy = 0;
let initialEnergyRK4 = 0;
let initialEnergyVerlet = 0;
let isUpdating = false;
let configVersion = 0;

let isHalted = false;

// Playback snapshots
interface SnapshotEntry {
    step: number;
    state: Float64Array; // Strict Float64Array
}
const snapshotHistory: SnapshotEntry[] = [];

function initSimulation(sab: SharedArrayBuffer) {
    positionBuffer = sab;
    positionView = new Float32Array(positionBuffer);

    // Gen bodies deterministicly
    const gen = generateDeterministicBodies(BODY_COUNT, currentSeed);
    masses = gen.masses;
    const initialState = gen.state; // Float64Array

    // Sab transfer
    updateSharedBuffer(initialState);

    // Physics Init
    currentBarnesHutContext = new BarnesHutContext(BODY_COUNT);
    const derivative = (s: Float64Array, out: Float64Array) => {
        currentBarnesHutContext.evaluateAllForces(s, masses, currentTheta, currentEpsilon, out);
        applyExternalForces(s, out);
    };

    simulator = new Simulator(initialState, derivative, {
        dt: currentDt,
        epsilon: currentEpsilon,
        integrator: currentIntegrator === 'RK4' ? rk4 : velocityVerlet
    });

    initialEnergy = totalEnergy(initialState, masses, currentEpsilon);

    // Initial snapshot
    saveSnapshot();

    postMessage({ type: 'INIT_ACK' });

    // Start Loop
    physicsLoop();
}

function updateSharedBuffer(state: Float64Array) {
    for (let i = 0; i < BODY_COUNT; i++) {
        const ix = i * 4;
        const i3 = i * 3;
        positionView[i3] = state[ix];       // x
        positionView[i3 + 1] = state[ix + 1];   // y
        positionView[i3 + 2] = 0;             // z (2D simulation for now)
    }
}

function saveSnapshot() {
    // Keep last 20 seconds at 60fps = 1200 frames approx. Save every 60 steps = ~1 sec jumps
    if (snapshotHistory.length > 20) {
        snapshotHistory.shift();
    }
    const state = simulator.getState(); // Returns fresh Float64Array
    snapshotHistory.push({ step: currentStep, state });
}

function applyExternalForces(state: Float64Array, derivatives: Float64Array) {
    if (externalForceType === 'NONE') return;

    for (let i = 0; i < BODY_COUNT; i++) {
        const ix = i * 4;
        const ivx = ix + 2;
        const ivy = ix + 3;

        switch (externalForceType) {
            case 'UNIFORM':
                derivatives[ivx] += externalForceMagnitude;
                break;
            case 'DRAG':
                derivatives[ivx] -= externalForceMagnitude * state[ivx];
                derivatives[ivy] -= externalForceMagnitude * state[ivy];
                break;
            case 'NOISE':
                derivatives[ivx] += (rng.random() - 0.5) * externalForceMagnitude;
                derivatives[ivy] += (rng.random() - 0.5) * externalForceMagnitude;
                break;
        }
    }
}

function calculateDivergence(s1: Float64Array, s2: Float64Array) {
    let sumDelta = 0;
    let maxDelta = 0;
    for (let i = 0; i < BODY_COUNT; i++) {
        const ix = i * 4;
        const dx = s1[ix] - s2[ix];
        const dy = s1[ix + 1] - s2[ix + 1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        sumDelta += dist;
        if (dist > maxDelta) maxDelta = dist;
    }
    return { meanDelta: sumDelta / BODY_COUNT, maxDelta };
}

function haltSimulation(reason: string) {
    isHalted = true;
    isPlaying = false;
    postMessage({ type: 'HALT', payload: { reason } });
    console.error(`Simulation Halted: ${reason}`);
}

function stepForward() {
    if (isHalted) return;

    simulator.tick();

    if (isDivergenceMode && simulatorVerlet && simulatorRK4) {
        simulatorVerlet.tick();
        simulatorRK4.tick();
    }

    currentStep++;

    const state = simulator.getState();

    // Stability Guard: Finite position
    for (let i = 0; i < BODY_COUNT; i++) {
        const ix = i * 4;
        if (!Number.isFinite(state[ix]) || !Number.isFinite(state[ix + 1])) {
            haltSimulation("Numerical Instability Detected (NaN/Infinity in position)");
            return;
        }
    }

    updateSharedBuffer(state);

    if (currentStep % 60 === 0) {
        saveSnapshot();
    }

    // Metric emission
    if (currentStep % 10 === 0) {
        const currentE = totalEnergy(state, masses, currentEpsilon);
        const drift = Math.abs((currentE - initialEnergy) / initialEnergy) * 100;

        // Stability Guard: Energy Explosion
        if (isConservative && drift > 1e6) {
            haltSimulation("Energy Divergence Explosion");
            return;
        }

        const momentum = calculateTotalMomentum(state, masses);
        const angularMomentum = calculateAngularMomentum(state, masses);

        let divergence = null;
        let driftRK4 = 0;
        let driftVerlet = 0;

        if (isDivergenceMode && simulatorVerlet && simulatorRK4) {
            const sV = simulatorVerlet.getState();
            const sR = simulatorRK4.getState();
            divergence = calculateDivergence(sV, sR);

            const eV = totalEnergy(sV, masses, currentEpsilon);
            const eR = totalEnergy(sR, masses, currentEpsilon);

            driftVerlet = Math.abs((eV - initialEnergyVerlet) / initialEnergyVerlet) * 100;
            driftRK4 = Math.abs((eR - initialEnergyRK4) / initialEnergyRK4) * 100;

            // Lyapunov Estimation: λ ≈ slope of ln(meanDelta) vs time
            if (divergence.meanDelta > 1e-12) {
                lyapunovHistory.push({ t: currentStep * currentDt, logDelta: Math.log(divergence.meanDelta) });
                if (lyapunovHistory.length > 100) lyapunovHistory.shift();

                if (lyapunovHistory.length > 50) {
                    // Linear regression for slope
                    let n = lyapunovHistory.length;
                    let sumT = 0, sumL = 0, sumTL = 0, sumT2 = 0;
                    for (const pt of lyapunovHistory) {
                        sumT += pt.t;
                        sumL += pt.logDelta;
                        sumTL += pt.t * pt.logDelta;
                        sumT2 += pt.t * pt.t;
                    }
                    lyapunovEstimate = (n * sumTL - sumT * sumL) / (n * sumT2 - sumT * sumT);
                }
            }
        }

        let comX = 0, comY = 0, sumM = 0;
        for (let i = 0; i < BODY_COUNT; i++) {
            const ix = i * 4;
            comX += state[ix] * masses[i];
            comY += state[ix + 1] * masses[i];
            sumM += masses[i];
        }

        postMessage({
            type: 'METRICS',
            payload: {
                energyDrift: drift,
                energyDriftRK4: driftRK4,
                energyDriftVerlet: driftVerlet,
                currentStep,
                configVersion,
                comPosition: [comX / sumM, comY / sumM, 0],
                momentum,
                angularMomentum,
                divergence,
                theta: currentTheta,
                epsilon: currentEpsilon,
                dt: currentDt,
                integrator: currentIntegrator,
                isConservative,
                seed: currentSeed,
                lyapunovEstimate
            }
        });
    }
}

function physicsLoop() {
    if (isPlaying && !isUpdating) {
        stepForward();
    }
    // We target roughly 60 updates a second. setTimeout has poor precision so 
    // relying on it for strict DT isn't perfect, but keeps worker from 100% spiking.
    setTimeout(physicsLoop, 16);
}

function handleMessage(e: MessageEvent) {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            initSimulation(payload.sab);
            break;

        case 'SET_PARAMS':
            isUpdating = true;
            if (payload.theta !== undefined) currentTheta = payload.theta;
            if (payload.epsilon !== undefined) currentEpsilon = payload.epsilon;
            if (payload.dt !== undefined) currentDt = payload.dt;
            if (payload.integrator !== undefined) currentIntegrator = payload.integrator;

            currentBarnesHutContext = new BarnesHutContext(BODY_COUNT);
            const newDeriv = (s: Float64Array, out: Float64Array) => {
                currentBarnesHutContext.evaluateAllForces(s, masses, currentTheta, currentEpsilon, out);
                applyExternalForces(s, out);
            };

            simulator.setConfig({
                dt: currentDt,
                epsilon: currentEpsilon,
                integrator: currentIntegrator === 'RK4' ? rk4 : velocityVerlet
            }, newDeriv);

            if (isDivergenceMode && simulatorVerlet && simulatorRK4) {
                simulatorVerlet.setConfig({ dt: currentDt, epsilon: currentEpsilon, integrator: velocityVerlet }, newDeriv);
                simulatorRK4.setConfig({ dt: currentDt, epsilon: currentEpsilon, integrator: rk4 }, newDeriv);
            }

            configVersion++;
            snapshotHistory.length = 0;
            isUpdating = false;
            break;

        case 'IMPULSE':
            const stateImp = simulator.getState();
            const bx = payload.bodyIndex * 4;
            stateImp[bx + 2] += payload.dv[0];
            stateImp[bx + 3] += payload.dv[1];
            // Update all active simulators
            simulator = new Simulator(stateImp, (s, o) => {
                currentBarnesHutContext.evaluateAllForces(s, masses, currentTheta, currentEpsilon, o);
                applyExternalForces(s, o);
            }, { dt: currentDt, epsilon: currentEpsilon, integrator: currentIntegrator === 'RK4' ? rk4 : velocityVerlet });

            if (isDivergenceMode) {
                simulatorVerlet = simulator.clone();
                simulatorVerlet.setConfig({ integrator: velocityVerlet });
                simulatorRK4 = simulator.clone();
                simulatorRK4.setConfig({ integrator: rk4 });
            }
            updateSharedBuffer(stateImp);
            break;

        case 'RESET_ENERGY_BASELINE':
            initialEnergy = totalEnergy(simulator.getState(), masses, currentEpsilon);
            break;

        case 'SET_FORCE_PARAMS':
            externalForceType = payload.type;
            externalForceMagnitude = payload.magnitude;
            isConservative = (externalForceType === 'NONE' || externalForceType === 'UNIFORM');
            break;

        case 'SET_DIVERGENCE_MODE':
            isDivergenceMode = payload.enabled;
            if (isDivergenceMode) {
                simulatorVerlet = simulator.clone();
                simulatorVerlet.setConfig({ integrator: velocityVerlet });
                simulatorRK4 = simulator.clone();
                simulatorRK4.setConfig({ integrator: rk4 });

                initialEnergyVerlet = totalEnergy(simulatorVerlet.getState(), masses, currentEpsilon);
                initialEnergyRK4 = totalEnergy(simulatorRK4.getState(), masses, currentEpsilon);
            } else {
                simulatorVerlet = null;
                simulatorRK4 = null;
            }
            break;
        case 'LOAD_SCENARIO':
            isUpdating = true;
            isHalted = false;
            lyapunovHistory.length = 0;
            lyapunovEstimate = 0;

            const reqScenario = payload.scenario || 'RANDOM';
            const reqSeed = payload.seed !== undefined ? payload.seed : currentSeed;
            currentSeed = reqSeed;

            const gen = generateDeterministicBodies(BODY_COUNT, currentSeed, reqScenario);
            masses = gen.masses;
            const newState = gen.state;

            const deriv = (st: Float64Array, out: Float64Array) => {
                currentBarnesHutContext.evaluateAllForces(st, masses, currentTheta, currentEpsilon, out);
                applyExternalForces(st, out);
            };

            simulator = new Simulator(newState, deriv, {
                dt: currentDt,
                epsilon: currentEpsilon,
                integrator: currentIntegrator === 'RK4' ? rk4 : velocityVerlet
            });

            initialEnergy = totalEnergy(newState, masses, currentEpsilon);

            if (isDivergenceMode) {
                simulatorVerlet = simulator.clone();
                simulatorVerlet.setConfig({ integrator: velocityVerlet }, deriv);
                simulatorRK4 = simulator.clone();
                simulatorRK4.setConfig({ integrator: rk4 }, deriv);
                initialEnergyVerlet = initialEnergy;
                initialEnergyRK4 = initialEnergy;
            }

            currentStep = 0;
            updateSharedBuffer(newState);
            snapshotHistory.length = 0;
            saveSnapshot();
            configVersion++;
            isUpdating = false;
            break;
        case 'PLAY_PAUSE':
            isPlaying = payload.isPlaying;
            break;
        case 'STEP_FORWARD':
            if (!isPlaying) stepForward();
            break;
        case 'RESET':
            // Fast reset to step 0
            if (snapshotHistory.length > 0) {
                const snap = snapshotHistory[0]; // which is step 0 generated at init
                currentStep = snap.step;

                currentBarnesHutContext = new BarnesHutContext(BODY_COUNT);
                const resetDerivative = (s: Float64Array, out: Float64Array) => currentBarnesHutContext.evaluateAllForces(s, masses, currentTheta, currentEpsilon, out);

                simulator = new Simulator(new Float64Array(snap.state), resetDerivative, { dt: currentDt, epsilon: currentEpsilon, integrator: velocityVerlet });
                updateSharedBuffer(snap.state);
            }
            break;
    }
}

addEventListener('message', handleMessage);
