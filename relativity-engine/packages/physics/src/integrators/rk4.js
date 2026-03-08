export const rk4 = (state, dt, derivative) => {
    const n = state.length;
    if (dt === 0) {
        return new Float64Array(state);
    }
    const k1 = new Float64Array(n);
    derivative(state, k1);
    const s2 = new Float64Array(n);
    for (let i = 0; i < n; i++)
        s2[i] = state[i] + (dt / 2) * k1[i];
    const k2 = new Float64Array(n);
    derivative(s2, k2);
    const s3 = new Float64Array(n);
    for (let i = 0; i < n; i++)
        s3[i] = state[i] + (dt / 2) * k2[i];
    const k3 = new Float64Array(n);
    derivative(s3, k3);
    const s4 = new Float64Array(n);
    for (let i = 0; i < n; i++)
        s4[i] = state[i] + dt * k3[i];
    const k4 = new Float64Array(n);
    derivative(s4, k4);
    const nextState = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        nextState[i] = state[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
    return nextState;
};
