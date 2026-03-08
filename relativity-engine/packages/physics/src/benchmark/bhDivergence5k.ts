import { Simulator } from '../engine/simulator';
import { generateDeterministicBodies } from './benchmark';
import { createBarnesHutDerivative } from '../forces/integrationAdapter';
import { createGravityDerivative } from '../forces/gravity';
import { velocityVerlet } from '../integrators/verlet';
import { totalEnergy } from '../energy/totalEnergy';
import type { StateVector } from '../types/state';

const SEED = 42;
const BODY_COUNT = 5000;
const EPSILON = 1e-3;
const DT = 0.01;
const STEPS = 1000;
const THETA = 0.5;

function copyState(state: StateVector): StateVector {
    return new Float64Array(state);
}

function runDivergenceAudit() {
    console.log(`Generating ${BODY_COUNT} bodies...`);
    const { state, masses } = generateDeterministicBodies(BODY_COUNT, SEED);
    const stateD: StateVector = state;
    const stateBH: StateVector = copyState(stateD);

    const derivD = createGravityDerivative(masses, EPSILON);
    const derivBH = createBarnesHutDerivative(masses, EPSILON, THETA);

    const simD = new Simulator(stateD, derivD, { dt: DT, epsilon: EPSILON, integrator: velocityVerlet });
    const simBH = new Simulator(stateBH, derivBH, { dt: DT, epsilon: EPSILON, integrator: velocityVerlet });

    const initialE_BH = totalEnergy(simBH.getState(), masses, EPSILON);

    console.log(`Starting ${STEPS}-step divergence test at ${BODY_COUNT} bodies (Theta=${THETA}).`);
    console.log("Estimated completion time: ~45 minutes. Logging every 100 steps...");

    const t0 = performance.now();
    for (let i = 1; i <= STEPS; i++) {
        simD.tick();
        simBH.tick();
        if (i % 100 === 0) {
            console.log(`Completed ${i}/${STEPS} steps...`);
        }
    }
    const tMs = (performance.now() - t0) / STEPS;

    let sumPos = 0;
    let sumVel = 0;
    const sD = simD.getState();
    const sB = simBH.getState();

    for (let i = 0; i < BODY_COUNT; i++) {
        const ix = i * 4;
        const dx = sB[ix] - sD[ix];
        const dy = sB[ix + 1] - sD[ix + 1];

        const dvx = sB[ix + 2] - sD[ix + 2];
        const dvy = sB[ix + 3] - sD[ix + 3];

        sumPos += dx * dx + dy * dy;
        sumVel += dvx * dvx + dvy * dvy;
    }

    const rmsPos = Math.sqrt(sumPos / BODY_COUNT);
    const rmsVel = Math.sqrt(sumVel / BODY_COUNT);
    const finalE_BH = totalEnergy(simBH.getState(), masses, EPSILON);
    const driftBH = Math.abs((finalE_BH - initialE_BH) / initialE_BH);

    console.log("=== RESULTS ===");
    console.log(`RMS Pos Divergence: ${rmsPos.toExponential(4)}`);
    console.log(`RMS Vel Divergence: ${rmsVel.toExponential(4)}`);
    console.log(`Drift at ${STEPS} steps (BH): ${driftBH.toExponential(4)}`);
    console.log(`Time per step (both sims combined): ${tMs.toFixed(3)} ms`);
}

runDivergenceAudit();
