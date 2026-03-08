import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useSimulationStore } from '../store/useSimulationStore';
import { BodyPoints } from './BodyPoints';
import { CenterOfMassMarker } from './CenterOfMassMarker';
import { OctreeOverlay } from './OctreeOverlay';

interface SimulationCanvasProps {
    sab: SharedArrayBuffer;
    bodyCount: number;
}

export function SimulationCanvas({ sab, bodyCount }: SimulationCanvasProps) {
    const mode = useSimulationStore(state => state.mode);
    const isCosmos = mode === 'COSMOS';

    return (
        <Canvas
            camera={{ position: [0, 0, 8000], fov: 45, near: 1, far: 50000 }}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            dpr={[1, 1.5]}
        >
            <color attach="background" args={isCosmos ? ['#05050a'] : ['#000000']} />

            {/* Cosmos Background */}
            {isCosmos && <Stars radius={8000} depth={200} count={3000} factor={4} saturation={0} fade speed={1} />}

            <Suspense fallback={null}>
                <BodyPoints sab={sab} bodyCount={bodyCount} />
                <CenterOfMassMarker />
                <OctreeOverlay />
            </Suspense>

            <OrbitControls
                enableDamping={isCosmos}
                dampingFactor={isCosmos ? 0.05 : 1}
                autoRotate={isCosmos}
                autoRotateSpeed={0.5}
            />

            {isCosmos && (
                <EffectComposer>
                    <Bloom
                        luminanceThreshold={1.2} // Only affect cores 
                        luminanceSmoothing={0.9}
                        intensity={2.0}
                    />
                </EffectComposer>
            )}
        </Canvas>
    );
}
