
import { Simulator } from '../engine/simulator';
import { generateDeterministicBodies } from './benchmark';
import { createGravityDerivative } from '../forces/gravity';
import { createBarnesHutDerivative } from '../forces/integrationAdapter';
import { velocityVerlet } from '../integrators/verlet';

function runComparisonBenchmark(bodyCount: number, steps: number = 20): void {
    const seed = 42;
    const { state, masses } = generateDeterministicBodies(bodyCount, seed);
    const epsilon = 1e-3;
    const dt = 0.01;

    // Direct Baseline
    const directDeriv = createGravityDerivative(masses, epsilon);
    const directSim = new Simulator(new Float64Array(state), directDeriv, { dt, epsilon, integrator: velocityVerlet });

    // Barnes-Hut Benchmark
    const bhDeriv = createBarnesHutDerivative(masses, epsilon, 0.5);
    const bhSim = new Simulator(new Float64Array(state), bhDeriv, { dt, epsilon, integrator: velocityVerlet });

    // Warmup
    for (let i = 0; i < 5; i++) {
        directSim.tick();
        bhSim.tick();
    }

    // @ts-ignore
    if (typeof global !== 'undefined' && global.gc) {
        // @ts-ignore
        global.gc();
    }

    const t0 = performance.now();
    for (let i = 0; i < steps; i++) directSim.tick();
    const tDirect = (performance.now() - t0) / steps;

    // @ts-ignore
    if (typeof global !== 'undefined' && global.gc) {
        // @ts-ignore
        global.gc();
    }

    const t1 = performance.now();
    for (let i = 0; i < steps; i++) bhSim.tick();
    const tBH = (performance.now() - t1) / steps;

    const bStr = bodyCount.toString().padEnd(6);
    const dStr = tDirect.toFixed(3).padEnd(14);
    const bhStr = tBH.toFixed(3).padEnd(14);
    const speedup = (tDirect / tBH).toFixed(2);
    console.log(`${bStr} | ${dStr} | ${bhStr} | ${speedup}x`);
}

export function runBenchmarkComparisonSuite() {
    console.log("--- BARNES-HUT VS DIRECT SUMMATION SCALING COMPARISON ---");
    console.log("Bodies | Direct N^2 (ms) | Barnes-Hut (ms)| Speedup");
    console.log("-".repeat(57));

    const scales = [1000, 2000, 5000, 8000];
    for (const s of scales) {
        runComparisonBenchmark(s, 20); // 20 frames each to keep CI fast
    }
}

// Only auto-run if directly executing
// @ts-ignore
if (typeof require !== 'undefined' && require.main === module) {
    runBenchmarkComparisonSuite();
}
