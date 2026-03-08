import { runBenchmarkSuite, exportBenchmarkToFile } from "./benchmark";
export function analyzeBenchmarkResults(filePath) {
    const fs = require("fs");
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const rawData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(rawData);
    if (!data || !data.results || !Array.isArray(data.results)) {
        throw new Error("Invalid or malformed benchmark JSON structure.");
    }
    let maxDrift = 0;
    let rk4Step1000 = 0;
    let verletStep1000 = 0;
    let rk4Drift1000 = 0;
    let verletDrift1000 = 0;
    let rk4TotalTime = 0;
    let verletTotalTime = 0;
    const rk4Times = new Map();
    // Print table header
    console.log("Bodies | Integrator     | Avg Step (ms) | Drift %       | Total Time (ms)");
    console.log("--------------------------------------------------------------------------");
    for (const res of data.results) {
        if (typeof res.bodies !== "number" || typeof res.integratorName !== "string") {
            throw new Error("Malformed schema in result entries.");
        }
        const namePad = res.integratorName.padEnd(14);
        const avgPad = res.averageStepTimeMs.toFixed(3).padEnd(13);
        const driftPad = res.energyDriftPercentage.toFixed(6).padEnd(13);
        const totalPad = res.totalSimulationTimeMs.toFixed(2);
        console.log(`${res.bodies.toString().padEnd(6)} | ${namePad} | ${avgPad} | ${driftPad} | ${totalPad}`);
        if (res.energyDriftPercentage > maxDrift) {
            maxDrift = res.energyDriftPercentage;
        }
        if (res.bodies === 1000) {
            if (res.integratorName === "rk4") {
                rk4Step1000 = res.averageStepTimeMs;
                rk4Drift1000 = res.energyDriftPercentage;
            }
            else if (res.integratorName === "velocityVerlet") {
                verletStep1000 = res.averageStepTimeMs;
                verletDrift1000 = res.energyDriftPercentage;
            }
        }
        if (res.integratorName === "rk4") {
            rk4TotalTime += res.totalSimulationTimeMs;
            rk4Times.set(res.bodies, res.totalSimulationTimeMs);
        }
        else if (res.integratorName === "velocityVerlet") {
            verletTotalTime += res.totalSimulationTimeMs;
        }
    }
    const fastestName = rk4TotalTime < verletTotalTime ? "rk4" : "velocityVerlet";
    const slowestName = rk4TotalTime < verletTotalTime ? "velocityVerlet" : "rk4";
    const t500 = rk4Times.get(500) || 1;
    const t1000 = rk4Times.get(1000) || 1;
    const ratio = t1000 / t500;
    let trend = "quadratic";
    if (ratio < 2.5) {
        trend = "linear";
    }
    else if (ratio < 3.5) {
        trend = "subquadratic";
    }
    const avgStep1000 = (rk4Step1000 + verletStep1000) / 2;
    let recommendation = "O(n\u00b2) is sufficient. Defer Barnes\u2013Hut.";
    if (maxDrift > 2) {
        recommendation = "Investigate integrator stability before scaling.";
    }
    else if (avgStep1000 > 25) {
        recommendation = "Introduce Barnes\u2013Hut tree.";
    }
    else if (avgStep1000 < 16 && maxDrift < 1) {
        recommendation = "O(n\u00b2) is sufficient. Defer Barnes\u2013Hut.";
    }
    return {
        fastestIntegrator: fastestName,
        slowestIntegrator: slowestName,
        rk4AvgStepTime1000: rk4Step1000,
        verletAvgStepTime1000: verletStep1000,
        rk4Drift1000: rk4Drift1000,
        verletDrift1000: verletDrift1000,
        scalingTrend: trend,
        maxDriftObserved: maxDrift,
        recommendedNextStep: recommendation
    };
}
async function main() {
    console.log("Executing Benchmark Suite. This may take a moment...");
    // Step 1: Execute
    const suiteResult = runBenchmarkSuite();
    // Step 2: Export JSON
    exportBenchmarkToFile(suiteResult);
    // Wait for file system flush (since exported func uses async writeFile)
    await new Promise(resolve => setTimeout(resolve, 500));
    const filePath = 'benchmark-results.json';
    console.log("\n--- BENCHMARK RESULTS ---");
    // Step 3 & 4: Analyze & Print
    const analysis = analyzeBenchmarkResults(filePath);
    console.log("\n--- EXECUTIVE SUMMARY ---");
    console.log(JSON.stringify(analysis, null, 2));
}
if (typeof require !== 'undefined' && require.main === module) {
    main().catch(err => {
        console.error("Benchmark failed:", err);
        process.exit(1);
    });
}
