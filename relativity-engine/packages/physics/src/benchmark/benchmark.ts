declare const require: any;
declare const process: any;
import type { Integrator } from '../types/integrator';
import type { StateVector } from '../types/state';
import { createGravityDerivative } from '../forces/gravity';
import { totalEnergy } from '../energy/totalEnergy';
import { Simulator } from '../engine/simulator';
import { rk4 } from '../integrators/rk4';
import { velocityVerlet } from '../integrators/verlet';
import * as rng from '../utils/rng';



export interface State {
    state: StateVector;
    masses: number[];
    seed: number;
}

export type ScenarioType = 'RANDOM' | 'BINARY' | 'SOLAR' | 'THREE_BODY' | 'COLD_COLLAPSE' | 'COLLISION_SPHERE';

export function generateDeterministicBodies(n: number, seed: number, scenario: ScenarioType = 'RANDOM'): State {
    rng.setSeed(seed);
    const masses: number[] = new Array(n);
    const state: StateVector = new Float64Array(n * 4);

    if (scenario === 'BINARY') {
        // Two massive bodies
        masses[0] = 50000;
        state[0] = -200; state[1] = 0; // pos 1
        state[2] = 0; state[3] = 10;   // vel 1

        masses[1] = 50000;
        state[4] = 200; state[5] = 0;  // pos 2
        state[6] = 0; state[7] = -10;  // vel 2

        // Debris field
        const debrisBox = 1500;
        for (let i = 2; i < n; i++) {
            masses[i] = 1 + rng.random() * 5;
            const ix = i * 4;
            state[ix] = (rng.random() - 0.5) * debrisBox;
            state[ix + 1] = (rng.random() - 0.5) * debrisBox;
            state[ix + 2] = (rng.random() - 0.5) * 2;
            state[ix + 3] = (rng.random() - 0.5) * 2;
        }
    } else if (scenario === 'SOLAR') {
        // One massive central body
        masses[0] = 100000;
        state[0] = 0; state[1] = 0; // pos
        state[2] = 0; state[3] = 0; // vel

        // Orbiters
        for (let i = 1; i < n; i++) {
            masses[i] = 5 + rng.random() * 20;
            const r = 100 + (rng.random() * 2000); // dist from center
            const angle = rng.random() * Math.PI * 2;

            // Circular orbital velocity v = sqrt(G*M/r)
            // Assuming G=1 for this sim
            const v = Math.sqrt(masses[0] / r) * 0.8; // slightly elliptical

            const ix = i * 4;
            state[ix] = Math.cos(angle) * r;
            state[ix + 1] = Math.sin(angle) * r;

            // Perpendicular velocity
            state[ix + 2] = -Math.sin(angle) * v;
            state[ix + 3] = Math.cos(angle) * v;
        }
    } else if (scenario === 'THREE_BODY') {
        // 3 similar masses, chaotic
        masses[0] = 30000; state[0] = -100; state[1] = 0; state[2] = 0; state[3] = 5;
        masses[1] = 31000; state[4] = 100; state[5] = 0; state[6] = 0; state[7] = -5;
        masses[2] = 29000; state[8] = 0; state[9] = 150; state[10] = 2; state[11] = 0;

        // Minor dust just to hit N bodies
        for (let i = 3; i < n; i++) {
            masses[i] = 0.1;
            const ix = i * 4;
            state[ix] = (rng.random() - 0.5) * 1000;
            state[ix + 1] = (rng.random() - 0.5) * 1000;
            state[ix + 2] = 0; state[ix + 3] = 0;
        }
    } else if (scenario === 'COLD_COLLAPSE') {
        const radius = 500 * Math.cbrt(n / 1000);
        for (let i = 0; i < n; i++) {
            masses[i] = 100;
            const r = radius * Math.sqrt(rng.random());
            const theta = rng.random() * Math.PI * 2;
            const ix = i * 4;
            state[ix] = Math.cos(theta) * r;
            state[ix + 1] = Math.sin(theta) * r;
            state[ix + 2] = 0;
            state[ix + 3] = 0;
        }
    } else if (scenario === 'COLLISION_SPHERE') {
        const coreRadius = 100;
        const outerRadius = 1000;
        for (let i = 0; i < n; i++) {
            const isCore = i < n * 0.4;
            masses[i] = isCore ? 500 : 50;
            const radius = isCore ? (coreRadius * Math.sqrt(rng.random())) : (outerRadius * Math.sqrt(rng.random()));
            const theta = rng.random() * Math.PI * 2;
            const ix = i * 4;
            state[ix] = Math.cos(theta) * radius;
            state[ix + 1] = Math.sin(theta) * radius;

            // Random velocity dispersion
            const vMag = isCore ? 2 : 10;
            state[ix + 2] = (rng.random() - 0.5) * vMag;
            state[ix + 3] = (rng.random() - 0.5) * vMag;
        }
    } else {
        // RANDOM box
        const boxSize = 1000 * Math.cbrt(n);
        for (let i = 0; i < n; i++) {
            masses[i] = 10 + rng.random() * 90;

            const ix = i * 4;
            state[ix] = (rng.random() - 0.5) * boxSize;
            state[ix + 1] = (rng.random() - 0.5) * boxSize;
            state[ix + 2] = (rng.random() - 0.5) * 5;
            state[ix + 3] = (rng.random() - 0.5) * 5;
        }
    }

    return { masses, state, seed };
}

export interface BenchmarkConfig {
    bodies: number;
    steps: number;
    dt: number;
    integrator: Integrator;
    epsilon: number;
    seed: number;
}

export interface BenchmarkResult {
    bodies: number;
    steps: number;
    integratorName: string;
    totalSimulationTimeMs: number;
    averageStepTimeMs: number;
    memoryUsageMB: number;
    initialEnergy: number;
    finalEnergy: number;
    energyDriftPercentage: number;
}

export interface BenchmarkSuite {
    timestamp: string;
    systemInfo: {
        platform: string;
        arch: string;
        cpus: number;
        ramGB: number;
    };
    results: BenchmarkResult[];
}

export function runBenchmark(config: BenchmarkConfig): BenchmarkResult {
    const { masses, state } = generateDeterministicBodies(config.bodies, config.seed);

    const derivative = createGravityDerivative(masses, config.epsilon);

    // Warmup memory for garbage collection stability if possible, but let's keep it clean
    const simulator = new Simulator(state, derivative, {
        dt: config.dt,
        epsilon: config.epsilon,
        integrator: config.integrator
    });

    const initialE = totalEnergy(simulator.getState(), masses, config.epsilon);

    let startMem = 0;
    if (typeof process !== 'undefined' && process.memoryUsage) {
        startMem = process.memoryUsage().heapUsed;
    }

    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

    for (let i = 0; i < config.steps; i++) {
        simulator.tick();
    }

    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();

    let endMem = 0;
    if (typeof process !== 'undefined' && process.memoryUsage) {
        endMem = process.memoryUsage().heapUsed;
    }


    const finalState = simulator.getState();
    const finalE = totalEnergy(finalState, masses, config.epsilon);

    const drift = Math.abs(finalE - initialE) / Math.abs(initialE) * 100;

    const totalMemBytes = endMem - startMem;
    const memoryUsageMB = Math.max(0, totalMemBytes / (1024 * 1024)); // clamp to 0 if GC happened

    const totalTimeMs = t1 - t0;
    const averageStepTimeMs = totalTimeMs / config.steps;

    return {
        bodies: config.bodies,
        steps: config.steps,
        integratorName: config.integrator.name || 'AnonymousIntegrator',
        totalSimulationTimeMs: totalTimeMs,
        averageStepTimeMs: averageStepTimeMs,
        memoryUsageMB: memoryUsageMB,
        initialEnergy: initialE,
        finalEnergy: finalE,
        energyDriftPercentage: drift
    };
}

export function validateDeterminism(config: BenchmarkConfig): void {
    const sim1 = new Simulator(
        generateDeterministicBodies(config.bodies, config.seed).state,
        createGravityDerivative(generateDeterministicBodies(config.bodies, config.seed).masses, config.epsilon),
        {
            dt: config.dt,
            epsilon: config.epsilon,
            integrator: config.integrator
        }
    );

    const sim2 = new Simulator(
        generateDeterministicBodies(config.bodies, config.seed).state,
        createGravityDerivative(generateDeterministicBodies(config.bodies, config.seed).masses, config.epsilon),
        {
            dt: config.dt,
            epsilon: config.epsilon,
            integrator: config.integrator
        }
    );

    for (let i = 0; i < config.steps; i++) {
        sim1.tick();
        sim2.tick();
    }

    const state1 = sim1.getState();
    const state2 = sim2.getState();

    for (let i = 0; i < state1.length; i++) {
        if (state1[i] !== state2[i]) {
            throw new Error(`Determinism violation at index ${i}: ${state1[i]} !== ${state2[i]}`);
        }
    }
}

export function exportBenchmarkToFile(result: BenchmarkSuite): void {
    const json = JSON.stringify(result, null, 2);
    if (typeof require !== 'undefined') {
        const fs = require('fs');
        fs.writeFile('benchmark-results.json', json, 'utf-8', (err: any) => {
            if (err) console.error('Error writing benchmark-results.json', err);
        });
    }
}

export function runBenchmarkSuite(): BenchmarkSuite {
    const bodyCounts = [10, 50, 100, 250, 500, 1000];
    const steps = 1000;
    const dt = 0.01;
    const epsilon = 1e-3;
    const seed = 42;

    const integrators = [rk4, velocityVerlet];
    const results: BenchmarkResult[] = [];

    for (const bodies of bodyCounts) {
        for (const integrator of integrators) {
            // Optional: validate determinism on a smaller scale to save time, or trust the suite
            if (bodies <= 50) {
                validateDeterminism({ bodies, steps: 10, dt, integrator, epsilon, seed });
            }

            const res = runBenchmark({
                bodies,
                steps,
                dt,
                integrator,
                epsilon,
                seed
            });
            results.push(res);
        }
    }

    return {
        timestamp: new Date().toISOString(),
        systemInfo: {
            platform: typeof process !== 'undefined' ? process.platform : 'unknown',
            arch: typeof process !== 'undefined' ? process.arch : 'unknown',
            cpus: typeof require !== 'undefined' ? require('os').cpus().length : 0,
            ramGB: typeof require !== 'undefined' ? Math.round(require('os').totalmem() / (1024 * 1024 * 1024)) : 0
        },
        results
    };
}
