import type { StateVector } from '../types/state';
import { G } from '../constants/physicalConstants';

export function createGravityDerivative(
    masses: number[],
    epsilon: number = 0
) {
    if (epsilon < 0) {
        throw new Error('Softening epsilon must be >= 0');
    }

    const eps2 = epsilon * epsilon;

    return (state: StateVector, derivatives: StateVector): void => {

        const bodyCount = masses.length;

        if (state.length !== bodyCount * 4) {
            throw new Error(
                `State dimension mismatch: expected ${bodyCount * 4}, got ${state.length}`
            );
        }

        derivatives.fill(0);

        for (let i = 0; i < bodyCount; i++) {
            const ix = i * 4;
            derivatives[ix] = state[ix + 2];
            derivatives[ix + 1] = state[ix + 3];
        }

        for (let i = 0; i < bodyCount; i++) {
            const ix = i * 4;
            const xi = state[ix];
            const yi = state[ix + 1];

            const mi = masses[i];
            const ivx = ix + 2;
            const ivy = ix + 3;

            let axi = derivatives[ivx];
            let ayi = derivatives[ivy];

            for (let j = i + 1; j < bodyCount; j++) {
                const jx = j * 4;
                const jy = jx + 1;

                const dx = state[jx] - xi;
                const dy = state[jy] - yi;

                const distSq = dx * dx + dy * dy + eps2;
                const invDist = 1 / Math.sqrt(distSq);
                const invDist3 = invDist * invDist * invDist;

                const g_invDist3 = G * invDist3;

                const force_i = g_invDist3 * masses[j];
                const force_j = g_invDist3 * mi;

                axi += force_i * dx;
                ayi += force_i * dy;

                const jvx = jx + 2;
                const jvy = jx + 3;
                derivatives[jvx] -= force_j * dx;
                derivatives[jvy] -= force_j * dy;
            }

            derivatives[ivx] = axi;
            derivatives[ivy] = ayi;
        }
    };
}
