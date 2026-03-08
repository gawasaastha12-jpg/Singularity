import type { Integrator } from "../types/integrator";

export interface EngineConfig {
    dt: number;
    epsilon: number;
    integrator: Integrator;
}
