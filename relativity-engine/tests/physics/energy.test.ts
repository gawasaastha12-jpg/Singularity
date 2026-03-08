import { expect, test } from 'vitest';
import { rk4 } from '../../packages/physics/src/integrators/rk4';
import { createGravityDerivative } from '../../packages/physics/src/forces/gravity';
import { totalEnergy } from '../../packages/physics/src/energy/totalEnergy';
import type { StateVector } from '../../packages/physics/src/types/state';

test('total energy remains approximately conserved', () => {

    const masses = [1e6, 1];
    const epsilon = 1e-3;

    const derivative = createGravityDerivative(masses, epsilon);

    const radius = 100;
    const velocity = Math.sqrt((6.67430e-11 * masses[0]) / radius);

    let state: StateVector = new Float64Array([
        0, 0, 0, 0,
        radius, 0, 0, velocity
    ]);

    const initialEnergy = totalEnergy(state, masses, epsilon);

    let t = 0;
    const dt = 1;

    for (let i = 0; i < 5000; i++) {
        state = rk4(state, dt, derivative);
        t += dt;
    }

    const finalEnergy = totalEnergy(state, masses, epsilon);

    const drift = Math.abs(finalEnergy - initialEnergy);

    expect(drift).toBeLessThan(Math.abs(initialEnergy) * 0.01);
});

function totalMomentum(state: StateVector, masses: number[]) {
    let px = 0;
    let py = 0;

    for (let i = 0; i < masses.length; i++) {
        const ix = i * 4;
        px += masses[i] * state[ix + 2];
        py += masses[i] * state[ix + 3];
    }

    return [px, py];
}

test('total momentum is conserved', () => {

    const masses = [1e6, 1];
    const epsilon = 1e-3;

    const derivative = createGravityDerivative(masses, epsilon);

    let state: StateVector = new Float64Array([
        0, 0, 0, 0,
        100, 0, 0, 10
    ]);

    const initialMomentum = totalMomentum(state, masses);

    let t = 0;
    const dt = 1;

    for (let i = 0; i < 2000; i++) {
        state = rk4(state, dt, derivative);
        t += dt;
    }

    const finalMomentum = totalMomentum(state, masses);

    const drift = Math.hypot(
        finalMomentum[0] - initialMomentum[0],
        finalMomentum[1] - initialMomentum[1]
    );

    expect(drift).toBeLessThan(1e-6);
});
