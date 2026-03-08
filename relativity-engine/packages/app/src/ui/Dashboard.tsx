import { useSimulationStore } from '../store/useSimulationStore';

export function Dashboard() {
    const metrics = useSimulationStore(state => state.metrics);
    const comPosition = useSimulationStore(state => state.comPosition);
    const mode = useSimulationStore(state => state.mode);
    const isInstabilityMode = useSimulationStore(state => state.isInstabilityMode);
    const isHalted = useSimulationStore(state => state.isHalted);
    const haltReason = useSimulationStore(state => state.haltReason);
    const resetEnergyBaseline = useSimulationStore(state => state.resetEnergyBaseline);

    // Hide UI elements selectively based on requirements
    if (mode === 'COSMOS') return null;

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(5, 5, 8, 0.9)',
            border: isHalted ? '2px solid #ff4444' : '1px solid #333',
            borderRadius: '8px',
            padding: '16px',
            color: isHalted ? '#ff4444' : '#00ffcc',
            fontFamily: 'monospace',
            fontSize: '14px',
            minWidth: '250px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 10
        }}>
            {isHalted ? (
                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                    <h3 style={{ margin: 0, color: '#ff4444' }}>⚠️ SIMULATION HALTED</h3>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>{haltReason}</div>
                </div>
            ) : (
                <h3 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #333', paddingBottom: '8px', color: '#fff' }}>
                    Simulation Metrics
                </h3>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!metrics.isConservative && (
                    <div style={{ backgroundColor: '#fbcf0022', border: '1px solid #fbcf00', color: '#fbcf00', fontSize: '10px', padding: '4px', textAlign: 'center', borderRadius: '4px' }}>
                        Non-Conservative Mode (External Forces)
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa' }}>Step:</span>
                    <span>{metrics.currentStep.toLocaleString()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa' }}>Energy Drift:</span>
                    <span style={{
                        color: metrics.isConservative && metrics.energyDrift > (isInstabilityMode ? 1.0 : 1e-6) ? '#ff5555' : '#00ffcc',
                        fontWeight: metrics.energyDrift > 0.1 ? 'bold' : 'normal'
                    }}>
                        {metrics.energyDrift.toExponential(4)} %
                    </span>
                </div>

                {metrics.divergence && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #fbcf0033', padding: '4px', borderRadius: '4px' }}>
                        <span style={{ color: '#fbcf00' }}>RK4-Verlet Div:</span>
                        <span style={{ color: '#fbcf00' }}>{metrics.divergence.meanDelta.toExponential(2)}</span>
                    </div>
                )}


                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa' }}>COM Drift:</span>
                    <span style={{ color: Math.hypot(comPosition[0], comPosition[1], comPosition[2]) > 0.1 ? '#ffcc00' : '#00ffcc' }}>
                        {Math.hypot(comPosition[0], comPosition[1], comPosition[2]).toFixed(4)}
                    </span>
                </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dotted #333', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isInstabilityMode && (
                    <div style={{ color: '#ff4444', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
                        ⚠️ INSTABILITY MODE ACTIVE
                    </div>
                )}

                <button
                    onClick={resetEnergyBaseline}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: '1px solid #00ffcc',
                        color: '#00ffcc',
                        padding: '8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontSize: '11px'
                    }}
                >
                    RESET ENERGY BASELINE
                </button>
            </div>
        </div>
    );
}
