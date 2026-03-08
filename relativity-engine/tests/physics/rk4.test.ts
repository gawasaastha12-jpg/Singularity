import { expect, test } from 'vitest';
import { rk4 } from '../../packages/physics/src/integrators/rk4';

function distance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0)
  );
}

const oscillator = (state: Float64Array, out: Float64Array) => {
  out[0] = state[1];
  out[1] = -state[0];
};

test('harmonic oscillator energy stability', () => {
  let state = new Float64Array([1, 0]);
  const dt = 0.01;

  for (let i = 0; i < 1000; i++) {
    state = rk4(state, dt, oscillator);
  }

  const energy = state[0] ** 2 + state[1] ** 2;
  expect(Math.abs(energy - 1)).toBeLessThan(0.01);
});

test('rk4 is deterministic', () => {
  const state1 = rk4(new Float64Array([1, 0]), 0.01, oscillator);
  const state2 = rk4(new Float64Array([1, 0]), 0.01, oscillator);

  expect(state1).toEqual(state2);
});

test('dt = 0 returns identical state', () => {
  const state = new Float64Array([1, 2]);
  const result = rk4(state, 0, oscillator);

  expect(result).toEqual(state);
});

test('approximate time reversal symmetry', () => {
  const state = new Float64Array([1, 0]);
  const dt = 0.01;

  const forward = rk4(state, dt, oscillator);
  const backward = rk4(forward, -dt, oscillator);

  // Convert to regular arrays for the distance function
  expect(distance(Array.from(backward), Array.from(state))).toBeLessThan(1e-6);
});
