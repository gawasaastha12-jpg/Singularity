import type { StateVector, DerivativeFunction } from "./state";

export type Integrator = (
    state: StateVector,
    dt: number,
    derivative: DerivativeFunction
) => StateVector;
