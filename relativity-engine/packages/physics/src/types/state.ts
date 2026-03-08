export type StateVector = Float64Array;
export type DerivativeFunction = (
    state: StateVector,
    out: StateVector
) => void;
