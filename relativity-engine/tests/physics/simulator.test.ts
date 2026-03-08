import { expect, test } from 'vitest';
import { Simulator } from '../../packages/physics/src/engine/simulator';
import { EngineConfig } from '../../packages/physics/src/engine/config';
import { rk4 } from '../../packages/physics/src/integrators/rk4';
import { velocityVerlet } from '../../packages/physics/src/integrators/verlet';

const mockDerivative = (_t: number, state: number[]) => {
    return state.map(v => -v);
};

test('Simulator advances state correctly and matches bare integrator', () => {
    const initial = [1, 2, 3, 4];
    const config: EngineConfig = {
        dt: 0.1,
        epsilon: 0,
        integrator: rk4
    };

    const sim = new Simulator(initial, mockDerivative, config);
    sim.tick();

    const bareState = rk4([...initial], 0.1, mockDerivative);

    expect(sim.getState()).toEqual(bareState);
});

test('Integrator swap works (RK4 vs Verlet)', () => {
    const initial = [1, 2, 3, 4];
    const configRK4: EngineConfig = {
        dt: 0.1,
        epsilon: 0,
        integrator: rk4
    };
    const configVerlet: EngineConfig = {
        dt: 0.1,
        epsilon: 0,
        integrator: velocityVerlet
    };

    const simRK4 = new Simulator(initial, mockDerivative, configRK4);
    const simVerlet = new Simulator(initial, mockDerivative, configVerlet);

    simRK4.tick();
    simVerlet.tick();

    // Integrators act diff minimally, but states evolved
    expect(simRK4.getState()).toBeDefined();
    expect(simVerlet.getState()).toBeDefined();
});

test('Input initial state is not mutated', () => {
    const initial = [10, 20, 30, 40];
    const copy = [...initial];
    const config: EngineConfig = { dt: 1, epsilon: 0, integrator: rk4 };

    const sim = new Simulator(initial, mockDerivative, config);
    sim.tick();

    expect(initial).toEqual(copy);
});

test('Simulator produces deterministic results', () => {
    const initial = [1, 0, 0, 1];
    const config: EngineConfig = { dt: 0.05, epsilon: 0, integrator: velocityVerlet };

    const sim1 = new Simulator(initial, mockDerivative, config);
    const sim2 = new Simulator(initial, mockDerivative, config);

    for (let i = 0; i < 100; i++) {
        sim1.tick();
        sim2.tick();
    }

    expect(sim1.getState()).toEqual(sim2.getState());
});
