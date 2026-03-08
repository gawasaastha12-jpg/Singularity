import React, { useState } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';

export function ResearchMetricsPanel() {
    const metrics = useSimulationStore(state => state.metrics);
    const mode = useSimulationStore(state => state.mode);
    const [isExpanded, setIsExpanded] = useState(false);

    if (mode !== 'RESEARCH') return null;

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(5, 5, 10, 0.85)',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '12px',
            width: isExpanded ? '300px' : '150px',
            backdropFilter: 'blur(10px)',
            transition: 'width 0.3s ease',
            zIndex: 10
        }}>
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '8px' }}
            >
                <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>RESEARCH MOD</span>
                <span>{isExpanded ? '▼' : '▶'}</span>
            </div>

            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Section label="Momentum">
                        <Metric label="Px" value={metrics.momentum[0].toExponential(4)} />
                        <Metric label="Py" value={metrics.momentum[1].toExponential(4)} />
                    </Section>

                    <Section label="Angular Momentum">
                        <Metric label="Lz" value={metrics.angularMomentum.toExponential(4)} />
                    </Section>

                    {metrics.divergence && (
                        <Section label="Integrator Divergence (RK4 vs Verlet)">
                            <Metric label="Mean Delta" value={metrics.divergence.meanDelta.toExponential(4)} color="#fbcf00" />
                            <Metric label="Max Delta" value={metrics.divergence.maxDelta.toExponential(4)} color="#fbcf00" />
                            <Metric label="Lyapunov λ" value={metrics.lyapunovEstimate.toFixed(4)} color="#ffcc00" />
                            <div style={{ padding: '8px 0' }}>
                                <Metric label="Drift RK4" value={`${metrics.energyDriftRK4.toExponential(2)}%`} />
                                <Metric label="Drift Verlet" value={`${metrics.energyDriftVerlet.toExponential(2)}%`} />
                            </div>
                        </Section>
                    )}

                    <Section label="Solver Config">
                        <Metric label="Integrator" value={metrics.integrator} />
                        <Metric label="dt" value={metrics.dt} />
                        <Metric label="θ" value={metrics.theta} />
                        <Metric label="ε" value={metrics.epsilon} />
                        <Metric label="Seed" value={metrics.seed} />
                    </Section>

                    <button
                        onClick={() => {
                            const exportData = {
                                engineVersion: "2.5.0-rigor",
                                timestamp: new Date().toISOString(),
                                configuration: {
                                    dt: metrics.dt,
                                    theta: metrics.theta,
                                    epsilon: metrics.epsilon,
                                    integrator: metrics.integrator,
                                    seed: metrics.seed,
                                    isConservative: metrics.isConservative
                                },
                                metrics: {
                                    step: metrics.currentStep,
                                    energyDrift: metrics.energyDrift,
                                    driftRK4: metrics.energyDriftRK4,
                                    driftVerlet: metrics.energyDriftVerlet,
                                    lyapunovEstimate: metrics.lyapunovEstimate,
                                    momentum: metrics.momentum,
                                    angularMomentum: metrics.angularMomentum,
                                    divergence: metrics.divergence
                                }
                            };
                            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `experiment-${metrics.seed}-step-${metrics.currentStep}.json`;
                            a.click();
                        }}
                        style={{ background: '#222', border: '1px solid #444', color: '#00ffcc', padding: '6px', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}
                    >
                        EXPORT EXP METADATA JSON
                    </button>
                </div>
            )}
        </div>
    );
}

function Section({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase' }}>{label}</div>
            {children}
        </div>
    );
}

function Metric({ label, value, color = '#fff' }: { label: string, value: any, color?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa' }}>{label}:</span>
            <span style={{ color }}>{value}</span>
        </div>
    );
}
