import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../store/useSimulationStore';

export function CenterOfMassMarker() {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);

    // Subscribe to state without causing React re-renders on the physics tick
    // We fetch the current value safely each frame in useFrame

    const mode = useSimulationStore(state => state.mode);
    const isCosmos = mode === 'COSMOS';

    useFrame(() => {
        if (!meshRef.current) return;
        const comPosition = useSimulationStore.getState().comPosition;
        meshRef.current.position.set(comPosition[0], comPosition[1], comPosition[2]);
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[isCosmos ? 40 : 15, 16, 16]} />
            <meshBasicMaterial
                ref={materialRef}
                color={isCosmos ? '#ffd700' : '#00ffff'}
                transparent={true}
                opacity={isCosmos ? 0.8 : 0.9}
                depthTest={false}
            />
        </mesh>
    );
}
