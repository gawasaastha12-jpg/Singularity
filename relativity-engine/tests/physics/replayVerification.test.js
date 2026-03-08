import { describe, it, expect } from 'vitest';
import { hashFloat64Array } from '../../packages/physics/src/utils/hash';
import { SnapshotSerializer } from '../../packages/physics/src/snapshot/serializer';
import { generateDeterministicBodies } from '../../packages/physics/src/benchmark/benchmark';
import { createBarnesHutDerivative } from '../../packages/physics/src/forces/integrationAdapter';
import { Simulator } from '../../packages/physics/src/engine/simulator';
import { velocityVerlet } from '../../packages/physics/src/integrators/verlet';
describe('Phase 9: Barnes-Hut Verification', () => {
    it('should hash match exactly 500 steps using Barnes-Hut O(n log n) mode between two identical runs', () => {
        const bodyCount = 500;
        const seed = 42;
        const steps = 500;
        const dt = 0.01;
        const epsilon = 1e-3;
        const theta = 0.5;
        const { state, masses } = generateDeterministicBodies(bodyCount, seed);
        // Sim 1
        const deriv1 = createBarnesHutDerivative(masses, epsilon, theta);
        const sim1 = new Simulator([...state], deriv1, { dt, epsilon, integrator: velocityVerlet });
        // Sim 2
        const deriv2 = createBarnesHutDerivative(masses, epsilon, theta);
        const sim2 = new Simulator([...state], deriv2, { dt, epsilon, integrator: velocityVerlet });
        const serializer = new SnapshotSerializer(bodyCount);
        const hashes1 = [];
        const hashes2 = [];
        for (let i = 0; i < steps; i++) {
            sim1.tick();
            hashes1.push(hashFloat64Array(serializer.serialize(sim1.getState(), masses).state));
            sim2.tick();
            hashes2.push(hashFloat64Array(serializer.serialize(sim2.getState(), masses).state));
        }
        // Validate complete determinism matching 
        for (let i = 0; i < steps; i++) {
            if (hashes1[i] !== hashes2[i]) {
                throw new Error(`Hash mismatch at step ${i}. Sim 1: ${hashes1[i]}, Sim 2: ${hashes2[i]}`);
            }
        }
        expect(hashes1).toEqual(hashes2);
    });
});
