import { rk4 } from '../integrators/rk4';
import type { StateVector, DerivativeFunction } from '../types/state';

export function step(
    f: DerivativeFunction,
    t: number,
    state: StateVector,
    dt: number
): { t: number; state: StateVector } {
    const nextState = rk4(state, dt, f);
    return {
        t: t + dt,
        state: nextState
    };
}
