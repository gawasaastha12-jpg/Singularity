import type { StateVector } from '../types/state';

export function calculateTotalMomentum(state: StateVector, masses: number[]): [number, number] {
    let px = 0;
    let py = 0;
    const bodyCount = masses.length;

    for (let i = 0; i < bodyCount; i++) {
        const ix = i * 4;
        const m = masses[i];
        px += m * state[ix + 2];
        py += m * state[ix + 3];
    }

    return [px, py];
}

export function calculateAngularMomentum(state: StateVector, masses: number[]): number {
    let Lz = 0;
    const bodyCount = masses.length;

    for (let i = 0; i < bodyCount; i++) {
        const ix = i * 4;
        const m = masses[i];
        const x = state[ix];
        const y = state[ix + 1];
        const vx = state[ix + 2];
        const vy = state[ix + 3];

        // L = r x p = m * (x * vy - y * vx) in 2D
        Lz += m * (x * vy - y * vx);
    }

    return Lz;
}
