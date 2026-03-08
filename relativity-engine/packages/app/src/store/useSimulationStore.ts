import { create } from 'zustand';

export type SimulationMode = 'RESEARCH' | 'COSMOS';

export interface SimulationMetrics {
    energyDrift: number;
    energyDriftRK4: number;
    energyDriftVerlet: number;
    momentum: [number, number];
    angularMomentum: number;
    divergence: { meanDelta: number; maxDelta: number } | null;
    lyapunovEstimate: number;
    currentStep: number;
    theta: number;
    epsilon: number;
    dt: number;
    integrator: string;
    isConservative: boolean;
    seed: number;
}

interface SimulationState {
    mode: SimulationMode;
    isPlaying: boolean;
    metrics: SimulationMetrics;

    // Parameters
    theta: number;
    epsilon: number;
    dt: number;
    integrator: string;
    scenario: string;
    octreeDebug: boolean;
    comPosition: [number, number, number];
    debugMesh: Float32Array | null;

    // Research Extra
    isInstabilityMode: boolean;
    isDivergenceMode: boolean;
    isHalted: boolean;
    haltReason: string | null;
    externalForceType: 'NONE' | 'UNIFORM' | 'DRAG' | 'NOISE';
    externalForceMagnitude: number;

    // Actions
    setMode: (mode: SimulationMode) => void;
    togglePlay: () => void;
    setPlaying: (play: boolean) => void;
    updateMetrics: (metrics: Partial<SimulationMetrics>) => void;

    // Parameter Setters
    setTheta: (theta: number) => void;
    setEpsilon: (epsilon: number) => void;
    setDt: (dt: number) => void;
    setIntegrator: (integrator: string) => void;
    setScenario: (scenario: string) => void;
    setOctreeDebug: (debug: boolean) => void;
    setComPosition: (pos: [number, number, number]) => void;

    // Research Actions
    setInstabilityMode: (enabled: boolean) => void;
    setDivergenceMode: (enabled: boolean) => void;
    setExternalForce: (type: 'NONE' | 'UNIFORM' | 'DRAG' | 'NOISE', magnitude: number) => void;
    addImpulse: (bodyIndex: number, dv: [number, number]) => void;
    resetEnergyBaseline: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
    mode: 'RESEARCH',
    isPlaying: true, // Auto-play on mount

    theta: 0.5,
    epsilon: 0.001,
    dt: 0.01,
    integrator: 'VERLET',
    scenario: 'RANDOM',
    octreeDebug: false,
    comPosition: [0, 0, 0],
    debugMesh: null,

    metrics: {
        energyDrift: 0,
        energyDriftRK4: 0,
        energyDriftVerlet: 0,
        momentum: [0, 0],
        angularMomentum: 0,
        divergence: null,
        lyapunovEstimate: 0,
        currentStep: 0,
        theta: 0.5,
        epsilon: 0.001,
        dt: 0.01,
        integrator: 'VERLET',
        isConservative: true,
        seed: 42,
    },

    isInstabilityMode: false,
    isDivergenceMode: false,
    isHalted: false,
    haltReason: null,
    externalForceType: 'NONE',
    externalForceMagnitude: 0,

    setMode: (mode) => set({ mode }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setPlaying: (play) => set({ isPlaying: play }),

    updateMetrics: (newMetrics) => set((state) => {
        const { comPosition, debugMesh, ...restMetrics } = newMetrics as any;
        return {
            metrics: { ...state.metrics, ...restMetrics },
            ...(comPosition ? { comPosition } : {}),
            ...(debugMesh !== undefined ? { debugMesh } : {})
        };
    }),

    setTheta: (theta) => set({ theta }),
    setEpsilon: (epsilon) => set({ epsilon }),
    setDt: (dt) => set({ dt }),
    setIntegrator: (integrator) => set({ integrator }),
    setScenario: (scenario) => set({ scenario }),
    setOctreeDebug: (octreeDebug) => set({ octreeDebug }),
    setComPosition: (comPosition) => set({ comPosition }),

    setInstabilityMode: (enabled) => set({ isInstabilityMode: enabled }),
    setDivergenceMode: (enabled) => set({ isDivergenceMode: enabled }),
    setExternalForce: (type, magnitude) => set({ externalForceType: type, externalForceMagnitude: magnitude }),
    addImpulse: () => { }, // Handled by middleware or effect usually, but we'll call worker directly
    resetEnergyBaseline: () => { }, // Same
}));
