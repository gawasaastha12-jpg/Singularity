import { G } from '../constants/physicalConstants';
export function totalEnergy(state, masses, epsilon = 0) {
    const bodyCount = masses.length;
    if (state.length !== bodyCount * 4) {
        throw new Error(`State dimension mismatch: expected ${bodyCount * 4}, got ${state.length}`);
    }
    let kinetic = 0;
    let potential = 0;
    for (let i = 0; i < bodyCount; i++) {
        const ix = i * 4;
        const ivx = ix + 2;
        const ivy = ix + 3;
        const vx = state[ivx];
        const vy = state[ivy];
        kinetic += 0.5 * masses[i] * (vx * vx + vy * vy);
        for (let j = i + 1; j < bodyCount; j++) {
            const jx = j * 4;
            const dx = state[jx] - state[ix];
            const dy = state[jx + 1] - state[ix + 1];
            const dist = Math.sqrt(dx * dx + dy * dy + epsilon * epsilon);
            potential -= G * masses[i] * masses[j] / dist;
        }
    }
    return kinetic + potential;
}
