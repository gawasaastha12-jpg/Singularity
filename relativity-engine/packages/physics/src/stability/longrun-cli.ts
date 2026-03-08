import { runStabilityTest } from './longrun';

console.log("Starting Long-Duration Stability Test...");
// 1M steps standard long run, checking every 10k steps, aborts at 1e-10 drift
runStabilityTest({
    bodies: 1000,
    steps: 1_000_000,
    logInterval: 10_000,
    driftThreshold: 1e-10
});
