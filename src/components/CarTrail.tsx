import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CarTrailProps {
    carPosition: THREE.Vector3;
    carRotation?: THREE.Quaternion;
    maxLength?: number;
    color?: string;
    width?: number;
    opacity?: number;
    carId?: number;
}

export default function CarTrail({
    carPosition,
    maxLength = 100,
    color = '#ff6b6b',
    width = 8,
    opacity = 0.8,
    carId: _carId = 0
}: CarTrailProps) {
    const trailRef = useRef<THREE.Group>(null);
    const positionsRef = useRef<THREE.Vector3[]>([]);
    const lineRef = useRef<THREE.Mesh | null>(null);

    // Initialize geometry and material
    const { geometry, material } = useMemo(() => {
        // Create a tube geometry for proper width control
        const geometry = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]),
            64,
            width / 2,
            8,
            false
        );
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
        });

        return { geometry, material };
    }, [color, opacity, width]);

    // Update material color when it changes
    useEffect(() => {
        if (lineRef.current && lineRef.current.material instanceof THREE.MeshBasicMaterial) {
            lineRef.current.material.color.set(color);
        }
    }, [color]);

    useFrame(() => {
        if (!trailRef.current || !lineRef.current) return;

        // Add current position to trail
        positionsRef.current.push(carPosition.clone());

        // Limit trail length
        if (positionsRef.current.length > maxLength) {
            positionsRef.current.shift();
        }

        // Update geometry with current positions
        if (positionsRef.current.length > 1) {
            // Create a new curve from the positions
            const curve = new THREE.CatmullRomCurve3(positionsRef.current);

            // Create new tube geometry with updated curve
            const newGeometry = new THREE.TubeGeometry(
                curve,
                Math.max(32, positionsRef.current.length * 2),
                width / 2,
                8,
                false
            );

            // Replace the geometry
            if (lineRef.current) {
                lineRef.current.geometry.dispose();
                lineRef.current.geometry = newGeometry;
            }
        }
    });

    return (
        <group ref={trailRef}>
            <primitive ref={lineRef} object={new THREE.Mesh(geometry, material)} />
        </group>
    );
}
