import { step } from "./step";
export class Simulator {
    derivative;
    config;
    state;
    constructor(initialState, derivative, config) {
        this.state = new Float64Array(initialState);
        this.derivative = derivative;
        this.config = config;
    }
    tick() {
        this.state = step(this.state, this.config.dt, this.config.integrator, this.derivative);
        return new Float64Array(this.state);
    }
    getState() {
        return new Float64Array(this.state);
    }
    setConfig(newConfig, newDerivative) {
        this.config = { ...this.config, ...newConfig };
        if (newDerivative) {
            this.derivative = newDerivative;
        }
    }
    clone() {
        const clonedState = new Float64Array(this.state);
        // Development assertion for deep copy
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
            if (clonedState === this.state) {
                throw new Error("Clone failure: state not deep copied");
            }
        }
        const clone = new Simulator(clonedState, this.derivative, { ...this.config });
        return clone;
    }
}
