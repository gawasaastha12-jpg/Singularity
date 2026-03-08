import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../store/useSimulationStore';
import { BODY_VERTEX_SHADER, BODY_FRAGMENT_SHADER } from './shaders';

interface BodyPointsProps {
    sab: SharedArrayBuffer;
    bodyCount: number;
}

export function BodyPoints({ sab, bodyCount }: BodyPointsProps) {
    const pointsRef = useRef<THREE.Points>(null);
    const mode = useSimulationStore(state => state.mode);
    const modeInt = mode === 'COSMOS' ? 1 : 0;

    // Shader Uniforms
    const uniforms = useMemo(() => ({
        uMode: { value: modeInt }
    }), []);

    useEffect(() => {
        uniforms.uMode.value = modeInt;
    }, [modeInt, uniforms]);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();

        // Directly map the Float32Array to the SAB from the worker
        // This is the core magic: Zero allocations in render loop!
        const positionArray = new Float32Array(sab);
        const positionAttribute = new THREE.BufferAttribute(positionArray, 3);

        // We tell ThreeJS this buffer will change rapidly
        positionAttribute.setUsage(THREE.DynamicDrawUsage);

        geo.setAttribute('position', positionAttribute);

        // Generate pseudo-masses to match the physics engine's deterministic generator
        // for rendering variety (this only happens once)
        class LCG {
            state: number;
            constructor(seed: number) { this.state = seed ? seed : 1; }
            next() {
                this.state = (this.state * 1664525 + 1013904223) >>> 0;
                return this.state / 4294967296;
            }
        }
        const rng = new LCG(42);
        const massArray = new Float32Array(bodyCount);
        for (let i = 0; i < bodyCount; i++) massArray[i] = 10 + rng.next() * 90;

        geo.setAttribute('mass', new THREE.BufferAttribute(massArray, 1));

        return geo;
    }, [sab, bodyCount]);

    // Update ThreeJS geometry flag every frame because the underlying SharedArrayBuffer mutates
    useFrame(() => {
        if (pointsRef.current) {
            pointsRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <points ref={pointsRef} geometry={geometry}>
            <shaderMaterial
                vertexShader={BODY_VERTEX_SHADER}
                fragmentShader={BODY_FRAGMENT_SHADER}
                uniforms={uniforms}
                transparent={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}
