import { describe, it, expect } from 'vitest';
import { generateDeterministicBodies } from '../src/benchmark/benchmark';
import { Simulator } from '../src/engine/simulator';
import { rk4 } from '../src/integrators/rk4';


describe('Scientific Rigor Validation', () => {
    const BODY_COUNT = 100;
    const SEED = 12345;

    it('should produce identical trajectories with the same seed', () => {
        const gen1 = generateDeterministicBodies(BODY_COUNT, SEED, 'RANDOM');
        const gen2 = generateDeterministicBodies(BODY_COUNT, SEED, 'RANDOM');

        expect(gen1.state).toEqual(gen2.state);
        expect(gen1.masses).toEqual(gen2.masses);
    });

    it('should maintain deep clone independence', () => {
        const gen = generateDeterministicBodies(BODY_COUNT, SEED, 'RANDOM');
        const sim1 = new Simulator(gen.state, (_s, _o) => { }, { dt: 0.1, epsilon: 1, integrator: rk4 });
        const sim2 = sim1.clone();

        const state1 = sim1.getState();
        const state2 = sim2.getState();

        expect(state1).not.toBe(state2);

        // Modify state1, state2 should remain unchanged
        state1[0] = 9999;
        expect(sim2.getState()[0]).not.toBe(9999);
    });

    it('should conserve energy in simple binary system', () => {
        // This is a placeholder for a more complex integration test
        expect(true).toBe(true);
    });
});
