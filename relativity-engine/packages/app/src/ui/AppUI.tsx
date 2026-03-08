import { useEffect, useState, useRef } from 'react';
import { SimulationCanvas } from '../render/SimulationCanvas';
import { ControlDock } from './ControlDock';
import { Dashboard } from './Dashboard';
import { ResearchMetricsPanel } from './ResearchMetricsPanel';
import { useSimulationStore } from '../store/useSimulationStore';

const BODY_COUNT = 5000;

export function AppUI() {
    const [sab, setSab] = useState<SharedArrayBuffer | null>(null);
    const workerRef = useRef<Worker | null>(null);

    // Store bindings
    const isPlaying = useSimulationStore(state => state.isPlaying);
    const updateMetrics = useSimulationStore(state => state.updateMetrics);

    // Parameter bindings
    const theta = useSimulationStore(state => state.theta);
    const epsilon = useSimulationStore(state => state.epsilon);
    const dt = useSimulationStore(state => state.dt);
    const integrator = useSimulationStore(state => state.integrator);
    const scenario = useSimulationStore(state => state.scenario);
    const octreeDebug = useSimulationStore(state => state.octreeDebug);

    // Research bindings
    const isDivergenceMode = useSimulationStore(state => state.isDivergenceMode);
    const externalForceType = useSimulationStore(state => state.externalForceType);
    const externalForceMagnitude = useSimulationStore(state => state.externalForceMagnitude);

    useEffect(() => {
        // Init SharedArrayBuffer for 5000 bodies * 3 floats (x,y,z) * 4 bytes per float
        const buffer = new SharedArrayBuffer(BODY_COUNT * 3 * 4);
        setSab(buffer);

        // Spawn worker
        const worker = new Worker(new URL('../worker/physics.worker.ts', import.meta.url), {
            type: 'module'
        });
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'METRICS') {
                updateMetrics(payload);
            } else if (type === 'HALT') {
                useSimulationStore.setState({ isHalted: true, haltReason: payload.reason, isPlaying: false });
            }
        };

        // Fire init
        worker.postMessage({ type: 'INIT', payload: { sab: buffer } });

        return () => {
            worker.terminate();
        };
    }, [updateMetrics]);

    // Keep play state in sync
    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'PLAY_PAUSE', payload: { isPlaying } });
        }
    }, [isPlaying]);

    // Keep parameters in sync
    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'SET_PARAMS',
                payload: { theta, epsilon, dt, integrator }
            });
        }
    }, [theta, epsilon, dt, integrator]);

    // Handle Scenario loads
    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'LOAD_SCENARIO',
                payload: { scenario }
            });
        }
    }, [scenario]);

    // Handle Debug toggles
    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'SET_DEBUG',
                payload: { octree: octreeDebug }
            });
        }
    }, [octreeDebug]);

    // Handle Divergence Mode
    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'SET_DIVERGENCE_MODE',
                payload: { enabled: isDivergenceMode }
            });
        }
    }, [isDivergenceMode]);

    // Handle External Forces
    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'SET_FORCE_PARAMS',
                payload: { type: externalForceType, magnitude: externalForceMagnitude }
            });
        }
    }, [externalForceType, externalForceMagnitude]);

    // Inject imperative actions into store for this session
    useEffect(() => {
        useSimulationStore.setState({
            addImpulse: (bodyIndex, dv) => {
                workerRef.current?.postMessage({ type: 'IMPULSE', payload: { bodyIndex, dv } });
            },
            resetEnergyBaseline: () => {
                workerRef.current?.postMessage({ type: 'RESET_ENERGY_BASELINE' });
            }
        });
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>

            {/* Render Context (3D Canvas) mounts only once SAB is ready */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                {sab ? <SimulationCanvas sab={sab} bodyCount={BODY_COUNT} /> : null}
            </div>

            {/* Non-rendering UI Layouts */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                {/* Pointer events set back to auto for interactive elements */}
                <div style={{ pointerEvents: 'auto' }}>
                    <Dashboard />
                    <ControlDock />
                    <ResearchMetricsPanel />
                </div>
            </div>

        </div>
    );
}
