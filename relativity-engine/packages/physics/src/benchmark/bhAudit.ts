import { Simulator } from '../engine/simulator';
import { generateDeterministicBodies } from './benchmark';
import { createBarnesHutDerivative } from '../forces/integrationAdapter';
import { createGravityDerivative } from '../forces/gravity';
import { velocityVerlet } from '../integrators/verlet';
import { totalEnergy } from '../energy/totalEnergy';
import { hashFloat64Array } from '../utils/hash';
import { SnapshotSerializer } from '../snapshot/serializer';
import {
    audit_approximationsPerformed,
    audit_exactInteractions,
    resetAuditCounters
} from '../forces/deterministicTraversal';
import type { StateVector } from '../types/state';

const SEED = 42;
const BODY_COUNT = 300;
const EPSILON = 1e-3;
const DT = 0.01;

function copyState(state: StateVector): StateVector {
    return new Float64Array(state);
}

function runDriftAudit(theta: number, steps: number, logInterval: number): { maxDrift: number, finalDrift: number } {
    const { state, masses } = generateDeterministicBodies(BODY_COUNT, SEED);
    const init: StateVector = state;
    const deriv = createBarnesHutDerivative(masses, EPSILON, theta);
    const sim = new Simulator(init, deriv, { dt: DT, epsilon: EPSILON, integrator: velocityVerlet });

    const initialE = totalEnergy(sim.getState(), masses, EPSILON);
    let maxDrift = 0;
    let finalDrift = 0;

    for (let i = 1; i <= steps; i++) {
        sim.tick();
        if (i % logInterval === 0 || i === steps) {
            const curE = totalEnergy(sim.getState(), masses, EPSILON);
            const drift = Math.abs((curE - initialE) / initialE);
            if (drift > maxDrift) maxDrift = drift;
            if (i === steps) finalDrift = drift;
            console.log(`[Drift θ=${theta}] Step ${i} | Drift: ${drift.toExponential(4)}`);
        }
    }
    return { maxDrift, finalDrift };
}

function runDivergenceAudit(theta: number, steps: number): { rmsPos: number, rmsVel: number, timeMs: number } {
    const { state, masses } = generateDeterministicBodies(BODY_COUNT, SEED);
    const stateD: StateVector = state;
    const stateBH: StateVector = copyState(stateD);

    const derivD = createGravityDerivative(masses, EPSILON);
    const derivBH = createBarnesHutDerivative(masses, EPSILON, theta);

    const simD = new Simulator(stateD, derivD, { dt: DT, epsilon: EPSILON, integrator: velocityVerlet });
    const simBH = new Simulator(stateBH, derivBH, { dt: DT, epsilon: EPSILON, integrator: velocityVerlet });

    // Warmup
    simD.tick(); simBH.tick();

    const t0 = performance.now();
    for (let i = 0; i < steps; i++) {
        simD.tick();
        simBH.tick();
    }
    const tMs = (performance.now() - t0) / steps;

    // Calc RMS
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

    return {
        rmsPos: Math.sqrt(sumPos / BODY_COUNT),
        rmsVel: Math.sqrt(sumVel / BODY_COUNT),
        timeMs: tMs
    };
}

function runRatioAudit(theta: number) {
    const { state, masses } = generateDeterministicBodies(BODY_COUNT, SEED);
    const init: StateVector = state;
    const deriv = createBarnesHutDerivative(masses, EPSILON, theta);
    const sim = new Simulator(init, deriv, { dt: DT, epsilon: EPSILON, integrator: velocityVerlet });

    resetAuditCounters();
    sim.tick(); // One step to populate
    const approx = audit_approximationsPerformed;
    const exact = audit_exactInteractions;
    const total = approx + exact;
    const ratio = approx / total;

    console.log(`[Ratio θ=${theta}] Approx: ${approx}, Exact: ${exact}, Ratio: ${(ratio * 100).toFixed(2)}%`);
    return ratio;
}

function runDeterminismRecheck(theta: number, steps: number, interval: number): boolean {
    const hashes1: number[] = [];
    const hashes2: number[] = [];
    const serializer = new SnapshotSerializer(BODY_COUNT);

    {
        const { state, masses } = generateDeterministicBodies(BODY_COUNT, SEED);
        const deriv = createBarnesHutDerivative(masses, EPSILON, theta);
        const sim = new Simulator(state, deriv, { dt: DT, epsilon: EPSILON, integrator: velocityVerlet });

        for (let i = 1; i <= steps; i++) {
            sim.tick();
            if (i % interval === 0) {
                hashes1.push(hashFloat64Array(serializer.serialize(sim.getState(), masses).state));
            }
        }
    }

    {
        const { state, masses } = generateDeterministicBodies(BODY_COUNT, SEED);
        const init: StateVector = state;
        const deriv = createBarnesHutDerivative(masses, EPSILON, theta);
        const sim = new Simulator(init, deriv, { dt: DT, epsilon: EPSILON, integrator: velocityVerlet });

        for (let i = 1; i <= steps; i++) {
            sim.tick();
            if (i % interval === 0) {
                hashes2.push(hashFloat64Array(serializer.serialize(sim.getState(), masses).state));
            }
        }
    }

    let ok = true;
    for (let i = 0; i < hashes1.length; i++) {
        if (hashes1[i] !== hashes2[i]) {
            console.error(`[Determinism] Mismatch at check ${i}: ${hashes1[i]} vs ${hashes2[i]}`);
            ok = false;
        }
    }
    return ok;
}

export function runFullAudit() {
    console.log("=== BARNES-HUT NUMERICAL AUDIT ===");

    console.log("\n1. Energy Drift Verification (100k steps, θ=0.5)");
    const drift100k = runDriftAudit(0.5, 100_000, 10_000);
    console.log(`Max Drift: ${drift100k.maxDrift.toExponential(4)}, Final: ${drift100k.finalDrift.toExponential(4)}`);

    console.log("\n2. Direct vs Barnes-Hut Trajectory Divergence (10k steps)");
    const div10k = runDivergenceAudit(0.5, 10_000);
    console.log(`RMS Pos Divergence: ${div10k.rmsPos.toExponential(4)}`);
    console.log(`RMS Vel Divergence: ${div10k.rmsVel.toExponential(4)}`);

    console.log("\n3. Approximation Ratio Audit");
    runRatioAudit(0.5);

    console.log("\n4. Theta Sweep Test (10k divergence, 100k drift)");
    const thetas = [0.3, 0.5, 0.7, 1.0];
    for (const th of thetas) {
        // Run drift at 100k takes huge time, we simulate the run
        console.log(`\n--- Theta: ${th} ---`);
        const thDiv = runDivergenceAudit(th, 10_000);
        const thDrift = runDriftAudit(th, 100_000, 50_000);
        console.log(`Avg Step Time (incl Baseline): ${thDiv.timeMs.toFixed(3)} ms`);
        console.log(`Max Drift (100k): ${thDrift.maxDrift.toExponential(4)}`);
        console.log(`RMS Pos Divergence: ${thDiv.rmsPos.toExponential(4)}`);
    }

    console.log("\n5. Long-Run Stability Test (1,000,000 steps, θ=0.5)");
    const lrDrift = runDriftAudit(0.5, 1_000_000, 100_000);
    console.log(`Max Drift: ${lrDrift.maxDrift.toExponential(4)}, Final: ${lrDrift.finalDrift.toExponential(4)}`);

    console.log("\n6. Determinism Integrity Recheck (20k steps)");
    const detOk = runDeterminismRecheck(0.5, 20_000, 1_000);
    console.log(`Determinism OK: ${detOk}`);
}

// @ts-ignore
if (typeof require !== 'undefined' && require.main === module) {
    runFullAudit();
}
