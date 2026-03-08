import { useSimulationStore } from '../store/useSimulationStore';

export function ControlDock() {
    const {
        mode, setMode, isPlaying, togglePlay,
        theta, setTheta, epsilon, setEpsilon,
        integrator, setIntegrator,
        scenario, setScenario,
        octreeDebug, setOctreeDebug,
        isInstabilityMode, setInstabilityMode,
        isDivergenceMode, setDivergenceMode,
        externalForceType, setExternalForce,
        externalForceMagnitude,
        addImpulse, setDt
    } = useSimulationStore();

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(10, 10, 15, 0.85)',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '12px 24px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
            zIndex: 10
        }}>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={togglePlay}
                    style={{
                        background: isPlaying ? '#ff4444' : '#44ff44',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        color: 'black',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>
            </div>

            <div style={{ width: '1px', height: '24px', background: '#444' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#aaa' }}>THETA (APPROX)</label>
                <input
                    type="range"
                    min="0.2" max="1.2" step="0.05"
                    value={theta}
                    onChange={e => setTheta(parseFloat(e.target.value))}
                    style={{ cursor: 'pointer', width: '80px' }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#aaa' }}>EPSILON (SOFT)</label>
                <input
                    type="range"
                    min="0.001" max="0.1" step="0.001"
                    value={epsilon}
                    onChange={e => setEpsilon(parseFloat(e.target.value))}
                    style={{ cursor: 'pointer', width: '80px' }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#aaa' }}>INTEGRATOR</label>
                <select
                    value={integrator}
                    onChange={e => setIntegrator(e.target.value)}
                    style={{ background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '12px', padding: '2px 4px' }}
                >
                    <option value="VERLET">Velocity Verlet</option>
                    <option value="RK4">RK4 (Soon)</option>
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#aaa' }}>SCENARIO</label>
                <select
                    value={scenario}
                    onChange={e => setScenario(e.target.value)}
                    style={{ background: '#222', color: 'white', border: '1px solid #444', borderRadius: '4px', fontSize: '12px', padding: '2px 4px' }}
                >
                    <option value="RANDOM">Random Chaos</option>
                    <option value="BINARY">Binary Star System</option>
                    <option value="SOLAR">Solar System</option>
                    <option value="THREE_BODY">Three Body Problem</option>
                    <option value="COLD_COLLAPSE">Cold Collapse</option>
                    <option value="COLLISION_SPHERE">Collision Sphere</option>
                </select>
            </div>

            <div style={{ width: '1px', height: '24px', background: '#444' }} />

            {/* Research Toolbar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '9px', color: '#00ffcc' }}>IMPULSE MAG</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={() => {
                                const mag = (document.getElementById('impulse-mag') as HTMLInputElement)?.valueAsNumber || 50;
                                addImpulse(Math.floor(Math.random() * 5000), [(Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag]);
                            }}
                            title="Add Impulse to Random Body"
                            style={{ background: '#333', border: '1px solid #555', color: '#00ffcc', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                        >
                            ⚡
                        </button>
                        <input
                            id="impulse-mag"
                            type="range"
                            min="1" max="500" step="10"
                            defaultValue="50"
                            style={{ width: '40px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '9px', color: isInstabilityMode ? '#ff4444' : '#aaa' }}>INSTABILITY</label>
                    <input
                        type="checkbox"
                        checked={isInstabilityMode}
                        onChange={e => {
                            setInstabilityMode(e.target.checked);
                            if (e.target.checked) setDt(0.1); else setDt(0.01);
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '9px', color: isDivergenceMode ? '#fbcf00' : '#aaa' }}>DIVERGENCE</label>
                    <input
                        type="checkbox"
                        checked={isDivergenceMode}
                        onChange={e => setDivergenceMode(e.target.checked)}
                    />
                </div>

                <div style={{ width: '1px', height: '16px', background: '#333' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '9px', color: '#aaa' }}>EXT FORCE</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <select
                            value={externalForceType}
                            onChange={e => setExternalForce(e.target.value as any, externalForceMagnitude)}
                            style={{ background: '#111', color: '#fff', border: '1px solid #444', fontSize: '9px' }}
                        >
                            <option value="NONE">NONE</option>
                            <option value="UNIFORM">UNIFORM</option>
                            <option value="DRAG">DRAG</option>
                            <option value="NOISE">NOISE</option>
                        </select>
                        {externalForceType !== 'NONE' && (
                            <input
                                type="range"
                                min="0" max="100" step="1"
                                value={externalForceMagnitude}
                                onChange={e => setExternalForce(externalForceType, parseFloat(e.target.value))}
                                style={{ width: '50px' }}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div style={{ width: '1px', height: '24px', background: '#444' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#aaa' }}>OCTREE (RESEARCH)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                        type="checkbox"
                        checked={octreeDebug}
                        onChange={e => setOctreeDebug(e.target.checked)}
                        disabled={mode !== 'RESEARCH'}
                        style={{ cursor: mode === 'RESEARCH' ? 'pointer' : 'not-allowed' }}
                    />
                    <span style={{ fontSize: '12px', color: mode === 'RESEARCH' ? '#fff' : '#555' }}>
                        DEBUG Mesh
                    </span>
                </div>
            </div>

            <div style={{ width: '1px', height: '24px', background: '#444' }} />

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => setMode('RESEARCH')}
                    style={{
                        background: mode === 'RESEARCH' ? '#444' : 'transparent',
                        border: '1px solid #555',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    RESEARCH
                </button>
                <button
                    onClick={() => setMode('COSMOS')}
                    style={{
                        background: mode === 'COSMOS' ? '#444' : 'transparent',
                        border: '1px solid #555',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    COSMOS
                </button>
            </div>

        </div>
    );
}
