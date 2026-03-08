import { rk4 } from '../integrators/rk4';
export function step(f, t, state, dt) {
    const nextState = rk4(state, dt, f);
    return {
        t: t + dt,
        state: nextState
    };
}
