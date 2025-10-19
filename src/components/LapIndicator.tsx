import type * as THREE from 'three';

interface LapIndicatorProps {
  position: THREE.Vector3;
}

export default function LapIndicator({ position }: LapIndicatorProps) {
  return (
    <group position={[position.x, position.y, position.z]} rotation={[0, 3 * Math.PI / 5, 0]}>
      {/* Base Line - Green rectangular prism on track surface */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[80, 4, 20]} />
        <meshLambertMaterial color={0x00ff00} />
      </mesh>
      
      {/* Single Black Strip - Longer finish line */}
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[500, 2, 40]} />
        <meshLambertMaterial color={0x000000} />
      </mesh>
    </group>
  );
}
