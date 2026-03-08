import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../store/useSimulationStore';

export function OctreeOverlay() {
    const linesRef = useRef<THREE.LineSegments>(null);
    const mode = useSimulationStore(state => state.mode);
    const octreeDebug = useSimulationStore(state => state.octreeDebug);

    // Safety disable when not in Research mode
    const isVisible = mode === 'RESEARCH' && octreeDebug;

    // We reuse a singular LineSegments BufferGeometry indefinitely to avoid GC
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        // Max 2000 boxes -> 12 lines per box -> 24 vertices per box.
        // 2000 * 24 * 3 = 144,000 floats
        const positions = new Float32Array(144000);
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setDrawRange(0, 0); // Start empty
        return geo;
    }, []);

    useFrame(() => {
        if (!isVisible || !linesRef.current) {
            if (linesRef.current) {
                // Instantly hide
                linesRef.current.geometry.setDrawRange(0, 0);
            }
            return;
        }

        const debugMesh = useSimulationStore.getState().debugMesh;
        if (!debugMesh || debugMesh.length === 0) return;

        // Process [cx, cy, cz, halfSize] sequence into line segment vertices.
        // We do this every frame if it changes, but the typed array is zero-allocation.
        const positionAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const positions = positionAttr.array as Float32Array;

        const numBoxes = debugMesh.length / 4;
        let vIdx = 0;

        for (let i = 0; i < numBoxes; i++) {
            const bx = i * 4;
            const cx = debugMesh[bx];
            const cy = debugMesh[bx + 1];
            const cz = debugMesh[bx + 2];
            const hs = debugMesh[bx + 3];

            // 8 corners of the box
            const x0 = cx - hs, x1 = cx + hs;
            const y0 = cy - hs, y1 = cy + hs;
            const z0 = cz - hs, z1 = cz + hs;

            // 12 edges, 2 vertices each
            // Bottom face
            positions[vIdx++] = x0; positions[vIdx++] = y0; positions[vIdx++] = z0;
            positions[vIdx++] = x1; positions[vIdx++] = y0; positions[vIdx++] = z0;
            positions[vIdx++] = x1; positions[vIdx++] = y0; positions[vIdx++] = z0;
            positions[vIdx++] = x1; positions[vIdx++] = y1; positions[vIdx++] = z0;
            positions[vIdx++] = x1; positions[vIdx++] = y1; positions[vIdx++] = z0;
            positions[vIdx++] = x0; positions[vIdx++] = y1; positions[vIdx++] = z0;
            positions[vIdx++] = x0; positions[vIdx++] = y1; positions[vIdx++] = z0;
            positions[vIdx++] = x0; positions[vIdx++] = y0; positions[vIdx++] = z0;

            // Top face
            positions[vIdx++] = x0; positions[vIdx++] = y0; positions[vIdx++] = z1;
            positions[vIdx++] = x1; positions[vIdx++] = y0; positions[vIdx++] = z1;
            positions[vIdx++] = x1; positions[vIdx++] = y0; positions[vIdx++] = z1;
            positions[vIdx++] = x1; positions[vIdx++] = y1; positions[vIdx++] = z1;
            positions[vIdx++] = x1; positions[vIdx++] = y1; positions[vIdx++] = z1;
            positions[vIdx++] = x0; positions[vIdx++] = y1; positions[vIdx++] = z1;
            positions[vIdx++] = x0; positions[vIdx++] = y1; positions[vIdx++] = z1;
            positions[vIdx++] = x0; positions[vIdx++] = y0; positions[vIdx++] = z1;

            // Connecting pillars
            positions[vIdx++] = x0; positions[vIdx++] = y0; positions[vIdx++] = z0;
            positions[vIdx++] = x0; positions[vIdx++] = y0; positions[vIdx++] = z1;

            positions[vIdx++] = x1; positions[vIdx++] = y0; positions[vIdx++] = z0;
            positions[vIdx++] = x1; positions[vIdx++] = y0; positions[vIdx++] = z1;

            positions[vIdx++] = x1; positions[vIdx++] = y1; positions[vIdx++] = z0;
            positions[vIdx++] = x1; positions[vIdx++] = y1; positions[vIdx++] = z1;

            positions[vIdx++] = x0; positions[vIdx++] = y1; positions[vIdx++] = z0;
            positions[vIdx++] = x0; positions[vIdx++] = y1; positions[vIdx++] = z1;
        }

        positionAttr.needsUpdate = true;
        linesRef.current.geometry.setDrawRange(0, Math.floor(vIdx / 3));
    });

    return (
        <lineSegments ref={linesRef} geometry={geometry}>
            <lineBasicMaterial color="#00ffcc" transparent={true} opacity={0.15} depthWrite={false} />
        </lineSegments>
    );
}
