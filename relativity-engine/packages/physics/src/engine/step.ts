import type { StateVector, DerivativeFunction } from "../types/state";
import type { Integrator } from "../types/integrator";

export function step(
    state: StateVector,
    dt: number,
    integrator: Integrator,
    derivative: DerivativeFunction
): StateVector {
    if (dt <= 0) {
        throw new Error("Time step must be positive");
    }

    return integrator(state, dt, derivative);
}
