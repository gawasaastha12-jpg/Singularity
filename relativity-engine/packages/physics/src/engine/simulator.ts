declare const process: any;
import type { EngineConfig } from "./config";
import type { StateVector, DerivativeFunction } from "../types/state";
import { step } from "./step";

export class Simulator {
    private derivative: DerivativeFunction;
    private config: EngineConfig;
    private state: StateVector;

    constructor(
        initialState: StateVector,
        derivative: DerivativeFunction,
        config: EngineConfig
    ) {
        this.state = new Float64Array(initialState);
        this.derivative = derivative;
        this.config = config;
    }

    tick(): StateVector {
        this.state = step(
            this.state,
            this.config.dt,
            this.config.integrator,
            this.derivative
        );
        return new Float64Array(this.state);
    }

    getState(): StateVector {
        return new Float64Array(this.state);
    }

    setConfig(newConfig: Partial<EngineConfig>, newDerivative?: DerivativeFunction) {
        this.config = { ...this.config, ...newConfig };
        if (newDerivative) {
            this.derivative = newDerivative;
        }
    }

    clone(): Simulator {
        const clonedState = new Float64Array(this.state);

        // Development assertion for deep copy
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
            if (clonedState === this.state) {
                throw new Error("Clone failure: state not deep copied");
            }
        }

        const clone = new Simulator(
            clonedState,
            this.derivative,
            { ...this.config }
        );

        return clone;
    }
}

