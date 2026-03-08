import { Simulator } from '../engine/simulator';
import { generateDeterministicBodies } from './benchmark';
import { createGravityDerivative } from '../forces/gravity';
import { velocityVerlet } from '../integrators/verlet';
import { SnapshotSerializer } from '../snapshot/serializer';
import { hashFloat64Array } from '../utils/hash';
export function runScalableBenchmark(bodyCount, steps = 100, warmupSteps = 20) {
    const seed = 42;
    const { state, masses } = generateDeterministicBodies(bodyCount, seed);
    const epsilon = 1e-3;
    const dt = 0.01;
    const derivative = createGravityDerivative(masses, epsilon);
    const simulator = new Simulator(state, derivative, {
        dt,
        epsilon,
        integrator: velocityVerlet
    });
    const serializer = new SnapshotSerializer(bodyCount);
    // Warmup phase
    for (let i = 0; i < warmupSteps; i++) {
        simulator.tick();
    }
    // Force garbage collection if we ran under node with --expose-gc
    // (We wrap in try/catch since usually it's not exposed by default in basic testing)
    // @ts-ignore
    if (typeof global !== 'undefined' && global.gc) {
        // @ts-ignore
        global.gc();
    }
    let startMem = 0;
    // @ts-ignore
    if (typeof process !== 'undefined' && process.memoryUsage) {
        // @ts-ignore
        startMem = process.memoryUsage().heapUsed;
    }
    const stepTimes = new Array(steps);
    for (let i = 0; i < steps; i++) {
        const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        simulator.tick();
        const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        stepTimes[i] = t1 - t0;
    }
    let endMem = 0;
    // @ts-ignore
    if (typeof process !== 'undefined' && process.memoryUsage) {
        // @ts-ignore
        endMem = process.memoryUsage().heapUsed;
    }
    const memoryDeltaMB = (endMem - startMem) / (1024 * 1024);
    let totalTime = 0;
    for (let i = 0; i < steps; i++)
        totalTime += stepTimes[i];
    const avgStepTimeMs = totalTime / steps;
    let sqDiffSum = 0;
    for (let i = 0; i < steps; i++) {
        const diff = stepTimes[i] - avgStepTimeMs;
        sqDiffSum += diff * diff;
    }
    const stdDevMs = Math.sqrt(sqDiffSum / steps);
    const finalState = simulator.getState();
    const serialized = serializer.serialize(finalState, masses);
    const finalHash = hashFloat64Array(serialized.state);
    return {
        bodies: bodyCount,
        steps,
        avgStepTimeMs,
        stdDevMs,
        memoryDeltaMB,
        finalHash
    };
}
export function runScalableSuite() {
    const scale = [1000, 2000, 5000, 8000];
    const results = [];
    for (const b of scale) {
        // Run fewer steps for very large systems to keep benchmark time reasonable
        // The prompt asked for "at least 100 steps per configuration"
        const result = runScalableBenchmark(b, 100, 20);
        results.push(result);
    }
    return results;
}
export function printScalableReport(results) {
    console.log("--- SCALABILITY BENCHMARK ---");
    console.log("Bodies | Avg Step (ms) | StdDev (ms) | MemDelta (MB) | Final Hash");
    console.log("-".repeat(70));
    for (const r of results) {
        const b = r.bodies.toString().padEnd(6);
        const avg = r.avgStepTimeMs.toFixed(3).padEnd(13);
        const sd = r.stdDevMs.toFixed(3).padEnd(11);
        const mem = r.memoryDeltaMB.toFixed(3).padEnd(13);
        const hash = r.finalHash.toString(16).padStart(8, '0');
        console.log(`${b} | ${avg} | ${sd} | ${mem} | ${hash}`);
    }
}
