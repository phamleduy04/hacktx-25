import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useGLTF } from '@react-three/drei';
import type { Group } from 'three';
import * as THREE from 'three';

interface OrientationData {
  alpha: number | null;    // 0-360 (compass)
  beta: number | null;     // -180 to 180 (front-back tilt)
  gamma: number | null;    // -90 to 90 (left-right tilt)
  timestamp: number;
}

interface ControlledF1ViewerProps {
  modelPath: string;
  orientationData?: OrientationData | null;
  enableAutoRotation?: boolean;
  className?: string;
}

function ControlledF1Model({ 
  modelPath, 
  orientationData, 
  enableAutoRotation = true 
}: { 
  modelPath: string;
  orientationData?: OrientationData | null;
  enableAutoRotation?: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const targetRotationRef = useRef(new THREE.Euler());
  const currentRotationRef = useRef(new THREE.Euler());
  
  // Load the actual GLB file
  const { scene } = useGLTF(modelPath);

  useFrame(() => {
    if (!groupRef.current) return;

    if (orientationData && orientationData.alpha !== null && orientationData.beta !== null && orientationData.gamma !== null) {
      // Convert device orientation to 3D rotation
      // Map device orientation to car rotation
      const alpha = (orientationData.alpha || 0) * Math.PI / 180; // Convert to radians
      const beta = (orientationData.beta || 0) * Math.PI / 180;
      const gamma = (orientationData.gamma || 0) * Math.PI / 180;

      // Apply rotation mapping:
      // - Beta (front-back tilt) -> X rotation (pitch)
      // - Gamma (left-right tilt) -> Z rotation (roll) 
      // - Alpha (compass) -> Y rotation (yaw)
      targetRotationRef.current.set(
        beta * 0.5,  // Scale down for more subtle movement
        alpha * 0.3,
        gamma * 0.3
      );

      // Smooth interpolation to avoid jittery movement
      const lerpFactor = 0.1;
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * lerpFactor;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * lerpFactor;
      currentRotationRef.current.z += (targetRotationRef.current.z - currentRotationRef.current.z) * lerpFactor;
      groupRef.current.rotation.copy(currentRotationRef.current);
    } else if (enableAutoRotation) {
      // Fallback to auto-rotation when no orientation data
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="text-white bg-black/50 px-4 py-2 rounded">
        Loading 3D Model...
      </div>
    </Html>
  );
}

export default function ControlledF1Viewer({ 
  modelPath, 
  orientationData, 
  enableAutoRotation = true,
  className = '' 
}: ControlledF1ViewerProps) {
  return (
    <div className={`w-full h-96 ${className}`}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={<LoadingFallback />}>
          <ControlledF1Model 
            modelPath={modelPath} 
            orientationData={orientationData}
            enableAutoRotation={enableAutoRotation}
          />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={!orientationData} // Disable manual rotation when receiving data
          />
          <Environment preset="studio" />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
        </Suspense>
      </Canvas>
    </div>
  );
}
