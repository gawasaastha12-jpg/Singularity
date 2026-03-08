export function step(state, dt, integrator, derivative) {
    if (dt <= 0) {
        throw new Error("Time step must be positive");
    }
    return integrator(state, dt, derivative);
}
