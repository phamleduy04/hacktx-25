import React, { useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { TrackData } from '../utils/trackUtils';

interface AnimatedF1CarProps {
  trackData: TrackData;
  speed?: number;
  autoStart?: boolean;
  carScale?: number;
  startOffset?: number;
  xOffset?: number; // X offset for car positioning
  carId?: number;
  pitStopPosition?: number; // Position on track (0-1) where pit stop occurs
  pitStopDuration?: number; // Duration of pit stop in seconds
  onPitStopStart?: (carId: number) => void;
  onPitStopEnd?: (carId: number) => void;
  pitStopToggle?: boolean; // Manual pit stop trigger
  onPitStopToggle?: (carId: number, enabled: boolean) => void;
  isRaceStarted?: boolean; // Race start/stop state
  onLapComplete?: (carId: number, lapNumber: number, lapTime: number) => void; // Lap completion callback
  onPositionUpdate?: (carId: number, trackPosition: number, currentLap: number) => void; // Real-time position update
}

const F1Car = forwardRef<THREE.Group, AnimatedF1CarProps>(({ 
  trackData, 
  speed = 0.0008, 
  autoStart = true, 
  carScale = 500,
  startOffset = 0,
  xOffset = 0,
  carId: _carId = 0,
  pitStopPosition = 0.5, // Default pit stop at halfway point
  pitStopDuration = 2, // 20 seconds
  onPitStopStart,
  onPitStopEnd,
  pitStopToggle = false,
  onPitStopToggle: _onPitStopToggle,
  isRaceStarted = false,
  onLapComplete,
  onPositionUpdate
}, ref) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/f1_car.glb');

  // Expose the group ref to parent components
  useImperativeHandle(ref, () => {
    if (!groupRef.current) {
      throw new Error('Group ref is not available');
    }
    return groupRef.current;
  }, []);

  // Animation state
  const animationTime = useRef(0);
  const isAnimating = useRef(autoStart);
  const previousPosition = useRef<THREE.Vector3 | null>(null);
  const initialFrames = useRef(0);
  const hasCompletedInitialMovement = useRef(false);

  // Pit stop state
  const isInPitStop = useRef(false);
  const pitStopStartTime = useRef(0);
  const needsPitStop = useRef(false);

  // Lap counting state
  const currentLap = useRef(0);
  const lastTrackPosition = useRef(0);
  const hasCrossedFinishLine = useRef(false);
  const isFinished = useRef(false);
  const raceStartTime = useRef<number | null>(null);

  // Scale and position the car appropriately
  const scaledScene = useMemo(() => {
    const scaledScene = scene.clone();

    // Use the carScale prop directly
    scaledScene.scale.setScalar(carScale);

    console.log(`Car scale: ${carScale}`);

    return scaledScene;
  }, [scene, carScale]);

  // Handle pit stop need toggle
  React.useEffect(() => {
    needsPitStop.current = pitStopToggle;
    if (pitStopToggle) {
      console.log(`Car ${_carId} needs pit stop - will stop when reaching pit stop position`);
    }
  }, [pitStopToggle, _carId]);

  // Handle race start - reset lap counter and start timing
  React.useEffect(() => {
    if (isRaceStarted && raceStartTime.current === null) {
      raceStartTime.current = Date.now();
      currentLap.current = 0;
      isFinished.current = false;
      console.log(`Car ${_carId} race started`);
    } else if (!isRaceStarted) {
      raceStartTime.current = null;
      currentLap.current = 0;
      isFinished.current = false;
    }
  }, [isRaceStarted, _carId]);

  useFrame((_state, delta) => {
    if (!groupRef.current || !isAnimating.current) return;

    // Handle initial movement (5 frames) when page loads
    if (hasCompletedInitialMovement.current && !isRaceStarted) {
      return;
    } else if (!hasCompletedInitialMovement.current && !isRaceStarted) {
      initialFrames.current += 1;
      if (initialFrames.current >= 3) {
        hasCompletedInitialMovement.current = true;
        return;
      }
    }

    // Handle pit stop logic
    if (isInPitStop.current) {
      // Check if pit stop duration has elapsed
      if (_state.clock.elapsedTime - pitStopStartTime.current >= pitStopDuration) {
        isInPitStop.current = false;
        needsPitStop.current = false;
        onPitStopEnd?.(_carId);
        console.log(`Car ${_carId} finished pit stop`);
      }
      return; // Don't move car during pit stop
    }

    // Update animation time
    const currentSpeed = isFinished.current ? speed * 0.5 : speed; // Reduce speed after finishing
    animationTime.current += delta * currentSpeed;

    // Get position and direction from the track curve
    const t = (animationTime.current + startOffset) % 1; // Keep between 0 and 1

    // Lap detection logic
    if (isRaceStarted && raceStartTime.current !== null && !isFinished.current) {
      // Check if car has crossed the finish line (from ~0.99+ to ~0.01)
      const hasCrossedLine = lastTrackPosition.current > 0.99 && t < 0.01;
      
      if (hasCrossedLine && !hasCrossedFinishLine.current) {
        hasCrossedFinishLine.current = true;
        currentLap.current += 1;
        
        // Calculate lap time
        const lapTime = Date.now() - raceStartTime.current;
        
        console.log(`Car ${_carId} completed lap ${currentLap.current} in ${(lapTime / 1000).toFixed(2)}s`);
        
        // Notify parent component
        onLapComplete?.(_carId, currentLap.current, lapTime);
        
        // Check if race is finished (16 laps)
        if (currentLap.current >= 16) {
          isFinished.current = true;
          console.log(`Car ${_carId} finished the race!`);
        }
      } else if (t > 0.1) {
        // Reset finish line crossing detection when car is away from start/finish line
        hasCrossedFinishLine.current = false;
      }
    }
    
    // Update last position for next frame
    lastTrackPosition.current = t;

    // Send real-time position update
    if (isRaceStarted && onPositionUpdate) {
      onPositionUpdate(_carId, t, currentLap.current);
    }

    // Check if car needs pit stop and has reached pit stop position
    if (needsPitStop.current && !isInPitStop.current && t >= pitStopPosition && t < pitStopPosition + 0.01) {
      isInPitStop.current = true;
      pitStopStartTime.current = _state.clock.elapsedTime;
      onPitStopStart?.(_carId);
      console.log(`Car ${_carId} entered pit stop at position ${t.toFixed(3)} (triggered by toggle)`);
    }

    const position = trackData.curve.getPointAt(t);

    // Update car position (elevate above track and apply X offset)
    groupRef.current.position.set(position.x, position.y + 5, position.z);

    // Calculate rotation based on movement direction (using previous position)
    if (previousPosition.current) {
      const direction = new THREE.Vector3().subVectors(position, previousPosition.current);
      if (direction.length() > 0.001) { // Only update if movement is significant
        const angle = Math.atan2(direction.x, direction.z);
        groupRef.current.rotation.y = angle;
      }
    } else {
      // Fallback to tangent direction for first frame
      const tangent = trackData.curve.getTangentAt(t);
      const angle = Math.atan2(tangent.z, tangent.x);
      groupRef.current.rotation.y = angle;
    }

    // Store current position for next frame (only if significant movement)
    if (!previousPosition.current || position.distanceTo(previousPosition.current) > 0.001) {
      previousPosition.current = position.clone();
    }

    // Debug logging every 60 frames (about once per second)
    if (Math.floor(animationTime.current * 60) % 60 === 0) {
      console.log('Car Debug Info:');
      console.log(`Position: x=${position.x.toFixed(2)}, y=${position.y.toFixed(2)}, z=${position.z.toFixed(2)}`);
      console.log(`Scale: ${carScale}`);
      console.log(`Animation time: ${t.toFixed(3)}`);
      console.log(`In pit stop: ${isInPitStop.current}`);
      console.log(`Track bounds: x=${trackData.bounds.minX.toFixed(0)} to ${trackData.bounds.maxX.toFixed(0)}, z=${trackData.bounds.minY.toFixed(0)} to ${trackData.bounds.maxY.toFixed(0)}`);
    }
  });

  // Toggle animation on/off
  const toggleAnimation = useCallback(() => {
    isAnimating.current = !isAnimating.current;
  }, []);

  // Reset to start
  const resetPosition = useCallback(() => {
    animationTime.current = 0;
    if (groupRef.current) {
      const startPosition = trackData.curve.getPointAt(0);
      groupRef.current.position.copy(startPosition);
    }
  }, [trackData.curve]);

  // Expose controls (for future use)
  React.useEffect(() => {
    if (groupRef.current) {
      (groupRef.current as THREE.Group & { toggleAnimation: () => void; resetPosition: () => void }).toggleAnimation = toggleAnimation;
      (groupRef.current as THREE.Group & { toggleAnimation: () => void; resetPosition: () => void }).resetPosition = resetPosition;
    }
  }, [toggleAnimation, resetPosition]);

  return (
    <group ref={groupRef}>
      <group position={[xOffset, 0, 0]}>
        <primitive object={scaledScene} />
      </group>
      {/* Replace car model with a simple cube for debugging */}
      {/* <mesh position={[0, -200, 0]}>
        <boxGeometry args={[carScale, carScale, carScale]} />
        <meshLambertMaterial color="red" />
      </mesh> */}
    </group>
  );
});

const AnimatedF1Car = forwardRef<THREE.Group, AnimatedF1CarProps>(({ 
  trackData, 
  speed, 
  autoStart, 
  carScale, 
  startOffset, 
  xOffset,
  carId: _carId,
  pitStopPosition,
  pitStopDuration,
  onPitStopStart,
  onPitStopEnd,
  pitStopToggle,
  onPitStopToggle,
  isRaceStarted,
  onLapComplete,
  onPositionUpdate
}, ref) => {
  const [data, setData] = React.useState<TrackData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (trackData) {
      setData(trackData);
      setLoading(false);
    } else {
      // This component expects trackData to be passed as a prop
      setError('No track data provided');
      setLoading(false);
    }
  }, [trackData]);

  if (loading) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="blue" />
      </mesh>
    );
  }

  if (error || !data) {
    console.error('Failed to load car:', error);
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    );
  }

  return <F1Car 
    ref={ref} 
    trackData={data} 
    speed={speed} 
    autoStart={autoStart} 
    carScale={carScale} 
    startOffset={startOffset} 
    xOffset={xOffset}
    carId={_carId}
    pitStopPosition={pitStopPosition}
    pitStopDuration={pitStopDuration}
    onPitStopStart={onPitStopStart}
    onPitStopEnd={onPitStopEnd}
    pitStopToggle={pitStopToggle}
    onPitStopToggle={onPitStopToggle}
    isRaceStarted={isRaceStarted}
    onLapComplete={onLapComplete}
    onPositionUpdate={onPositionUpdate}
  />;
});

AnimatedF1Car.displayName = 'AnimatedF1Car';

export default AnimatedF1Car;
