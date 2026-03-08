import { expect, test } from 'vitest';
import { rk4 } from '../../packages/physics/src/integrators/rk4';
import { createGravityDerivative } from '../../packages/physics/src/forces/gravity';
test('two-body orbit remains bounded', () => {
    const masses = [1e6, 1];
    const derivative = createGravityDerivative(masses);
    const radius = 100;
    const velocity = Math.sqrt((6.67430e-11 * masses[0]) / radius);
    let state = new Float64Array([
        0, 0, 0, 0, // massive body
        radius, 0, 0, velocity // orbiting body
    ]);
    let t = 0;
    const dt = 1;
    for (let i = 0; i < 2000; i++) {
        state = rk4(state, dt, derivative);
        t += dt;
    }
    const x = state[4];
    const y = state[5];
    const distance = Math.sqrt(x * x + y * y);
    expect(distance).toBeGreaterThan(50);
    expect(distance).toBeLessThan(150);
});
