export const velocityVerlet = (state, dt, derivative) => {
    if (dt === 0)
        return new Float64Array(state);
    const n = state.length;
    if (n % 4 !== 0) {
        throw new Error('State must be flat-packed [x,y,vx,vy]');
    }
    const halfDt = dt / 2;
    // First acceleration evaluation
    const derivatives = new Float64Array(n);
    derivative(state, derivatives);
    if (derivatives.length !== n) {
        throw new Error('Derivative dimension mismatch');
    }
    const nextState = new Float64Array(n);
    // Step 1: update positions using half-step velocity
    for (let i = 0; i < n; i += 4) {
        const x = state[i];
        const y = state[i + 1];
        const vx = state[i + 2];
        const vy = state[i + 3];
        const ax = derivatives[i + 2];
        const ay = derivatives[i + 3];
        const vxHalf = vx + ax * halfDt;
        const vyHalf = vy + ay * halfDt;
        nextState[i] = x + vxHalf * dt;
        nextState[i + 1] = y + vyHalf * dt;
        nextState[i + 2] = vxHalf; // temporary
        nextState[i + 3] = vyHalf; // temporary
    }
    // Second acceleration evaluation
    const newDerivatives = new Float64Array(n);
    derivative(nextState, newDerivatives);
    if (newDerivatives.length !== n) {
        throw new Error('Derivative dimension mismatch');
    }
    // Step 2: complete velocity update
    for (let i = 0; i < n; i += 4) {
        const vxHalf = nextState[i + 2];
        const vyHalf = nextState[i + 3];
        const axNew = newDerivatives[i + 2];
        const ayNew = newDerivatives[i + 3];
        nextState[i + 2] = vxHalf + axNew * halfDt;
        nextState[i + 3] = vyHalf + ayNew * halfDt;
    }
    return nextState;
};
