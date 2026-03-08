import { expect, test } from 'vitest';
import { rk4 } from '../../packages/physics/src/integrators/rk4';
import { velocityVerlet } from '../../packages/physics/src/integrators/verlet';
import { createGravityDerivative } from '../../packages/physics/src/forces/gravity';
import { totalEnergy } from '../../packages/physics/src/energy/totalEnergy';

test('verlet conserves energy better long-term than rk4', () => {

    const masses = [1e6, 1];
    const epsilon = 1e-3;

    const derivative = createGravityDerivative(masses, epsilon);

    const radius = 100;
    const velocity = Math.sqrt((6.67430e-11 * masses[0]) / radius);

    const initialState = [
        0, 0, 0, 0,
        radius, 0, 0, velocity
    ];

    const dt = 10000;
    const steps = 20000;

    let stateRK4 = [...initialState];
    let stateVerlet = [...initialState];

    const initialEnergy = totalEnergy(initialState, masses, epsilon);

    let t = 0;

    for (let i = 0; i < steps; i++) {
        stateRK4 = rk4(stateRK4, dt, derivative);
        stateVerlet = velocityVerlet(stateVerlet, dt, derivative);
        t += dt;
    }

    const driftRK4 = Math.abs(totalEnergy(stateRK4, masses, epsilon) - initialEnergy);
    const driftVerlet = Math.abs(totalEnergy(stateVerlet, masses, epsilon) - initialEnergy);

    console.log('Drift comparison over 20000 steps:', { driftRK4, driftVerlet });

    expect(driftVerlet).toBeLessThan(driftRK4);
});
