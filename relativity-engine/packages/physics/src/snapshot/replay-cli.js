import { ReplaySystem } from './replay';
import { SnapshotSerializer } from './serializer';
import { generateDeterministicBodies } from '../benchmark/benchmark';
import { Simulator } from '../engine/simulator';
import { createGravityDerivative } from '../forces/gravity';
import { velocityVerlet } from '../integrators/verlet';
import { hashFloat64Array } from '../utils/hash';
export function runReplayVerificationDemo() {
    const bodyCount = 100;
    const steps = 50;
    const seed = 42;
    // Gen initial config
    const { state, masses } = generateDeterministicBodies(bodyCount, seed);
    const serializer = new SnapshotSerializer(bodyCount);
    const initialSnapshot = serializer.serialize(state, masses);
    // Gen expects hashes
    const dt = 0.01;
    const epsilon = 1e-3;
    const derivative = createGravityDerivative(masses, epsilon);
    const expectedHashes = [];
    const generatorSim = new Simulator(new Float64Array(state), derivative, { dt, epsilon, integrator: velocityVerlet });
    const loopSerializer = new SnapshotSerializer(bodyCount);
    for (let i = 0; i < steps; i++) {
        generatorSim.tick();
        const sState = generatorSim.getState();
        const snap = loopSerializer.serialize(sState, masses);
        expectedHashes.push(hashFloat64Array(snap.state));
    }
    // Attempt verify
    console.log("Generating ground truth successful. Running Replay System...");
    const verified = ReplaySystem.verifyReplay({
        initialSnapshot,
        steps,
        expectedHashes
    });
    if (verified) {
        console.log("SUCCESS: Replay fully matches deterministic expected hashes.");
    }
    else {
        console.error("FAILURE: Replay drifted from deterministic expected hashes.");
    }
}
console.log("Starting Replay Verification Demo...");
runReplayVerificationDemo();
