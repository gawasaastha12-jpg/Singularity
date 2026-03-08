import { describe, it, expect } from 'vitest';
import { runScalableBenchmark } from '../../packages/physics/src/benchmark/scalable';
import { hashFloat64Array } from '../../packages/physics/src/utils/hash';
import { SnapshotSerializer } from '../../packages/physics/src/snapshot/serializer';
import { ReplaySystem } from '../../packages/physics/src/snapshot/replay';
import { generateDeterministicBodies } from '../../packages/physics/src/benchmark/benchmark';
import { createGravityDerivative } from '../../packages/physics/src/forces/gravity';
import { Simulator } from '../../packages/physics/src/engine/simulator';
import { velocityVerlet } from '../../packages/physics/src/integrators/verlet';

describe('Phase 8: Validation & Replay', () => {

    it('should generate consistent state hashes across repeated runs', () => {
        const h1 = runScalableBenchmark(50, 20, 5).finalHash;
        const h2 = runScalableBenchmark(50, 20, 5).finalHash;
        expect(h1).toBeDefined();
        expect(h1).toEqual(h2);
    });

    it('should verify replay states map correctly through binary serializer buffer', () => {
        const bodyCount = 10;
        const seed = 42;
        const { state, masses } = generateDeterministicBodies(bodyCount, seed);

        const serializer = new SnapshotSerializer(bodyCount);
        const snapshot = serializer.serialize(state, masses);

        const arrayBuffer = ReplaySystem.saveSnapshot(snapshot);
        expect(arrayBuffer.byteLength).toBe(bodyCount * 4 * 8 + bodyCount * 8);

        const loadedSnapshot = ReplaySystem.loadSnapshot(arrayBuffer, bodyCount);
        const deserialized = serializer.deserialize(loadedSnapshot);

        for (let i = 0; i < state.length; i++) {
            expect(deserialized.state[i]).toBeCloseTo(state[i], 10);
        }
        for (let i = 0; i < masses.length; i++) {
            expect(deserialized.masses[i]).toBeCloseTo(masses[i], 10);
        }
    });

    it('should deterministically replay verification mode without divergence', () => {
        const bodyCount = 10;
        const seed = 123;
        const steps = 10;

        const { state, masses } = generateDeterministicBodies(bodyCount, seed);
        const dt = 0.01;
        const epsilon = 1e-3;

        const derivative = createGravityDerivative(masses, epsilon);
        const sim = new Simulator(new Float64Array(state), derivative, { dt, epsilon, integrator: velocityVerlet });

        // Use a separate serializer to freeze the initial snapshot
        const initialSnapshot = new SnapshotSerializer(bodyCount).serialize(new Float64Array(state), masses);
        const expectedHashes: number[] = [];

        // Loop uses its own allocation-free serializer
        const loopSerializer = new SnapshotSerializer(bodyCount);
        for (let i = 0; i < steps; i++) {
            sim.tick();
            const snap = loopSerializer.serialize(sim.getState(), masses);
            expectedHashes.push(hashFloat64Array(snap.state));
        }

        const validReplay = ReplaySystem.verifyReplay({
            initialSnapshot,
            steps,
            expectedHashes
        });

        expect(validReplay).toBe(true);
    });
});
