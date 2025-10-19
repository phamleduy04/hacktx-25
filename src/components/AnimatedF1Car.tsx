import React, { useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { TrackData } from '../utils/trackUtils';

interface AnimatedF1CarProps {
  primary?: boolean;
  trackData: TrackData;
  speed?: number;
  autoStart?: boolean;
  carScale?: number;
  startOffset?: number;
  startXOffset?: number;
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
  primary = false,
  trackData, 
  speed = 0.0008, 
  autoStart = true, 
  carScale = 500,
  startOffset = 0,
  startXOffset = 0,
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
  const { scene } = useGLTF(primary ? '/f1_car_1.glb' : '/f1_car_2.glb');

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

  // Random offset state
  const currentOffset = useRef({ x: startXOffset ?? Math.random() * 500, z: 0 });
  const targetOffset = useRef({ x: startXOffset ?? Math.random() * 500, z: 0 });
  const offsetDirection = useRef({ x: 0, z: 0 });
  const lastDirectionChange = useRef(0);
  const directionChangeInterval = useRef(2 + Math.random() * 3); // Change direction every 2-5 seconds

  // Scale and position the car appropriately
  const scaledScene = useMemo(() => {
    const scaledScene = scene.clone();

    // Use the carScale prop directly
    scaledScene.scale.setScalar(carScale * (primary ? 0.01 : 1));

    console.log(`Car scale: ${carScale}`);

    return scaledScene;
  }, [scene, carScale, primary]);

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

    // Update random offset
    const currentTime = _state.clock.elapsedTime;
    
    // Check if it's time to change direction
    if (currentTime - lastDirectionChange.current >= directionChangeInterval.current) {
      // Generate new random direction
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 1.5) * 10; // Speed between 0.5 and 2.0 units per second
      offsetDirection.current.x = Math.cos(angle) * speed;
      offsetDirection.current.z = Math.sin(angle) * speed;
      
      // Generate new target offset
      const maxOffset = 100;
      targetOffset.current.x = (Math.random() - 0.5) * maxOffset * 2;
      targetOffset.current.z = (Math.random() - 0.5) * maxOffset * 2;
      
      // Update timing for next direction change
      lastDirectionChange.current = currentTime;
      directionChangeInterval.current = 2 + Math.random() * 3;
    }
    
    // Gradually move current offset towards target
    const lerpFactor = delta * 0.5; // Adjust speed of offset changes
    currentOffset.current.x += (targetOffset.current.x - currentOffset.current.x) * lerpFactor;
    currentOffset.current.z += (targetOffset.current.z - currentOffset.current.z) * lerpFactor;
    
    // Apply direction movement
    currentOffset.current.x += offsetDirection.current.x * delta;
    currentOffset.current.z += offsetDirection.current.z * delta;
    
    // Clamp offset to maximum of 20 units
    const maxOffset = 100;
    const currentDistance = Math.sqrt(currentOffset.current.x ** 2 + currentOffset.current.z ** 2);
    if (currentDistance > maxOffset) {
      const scale = maxOffset / currentDistance;
      currentOffset.current.x *= scale;
      currentOffset.current.z *= scale;
    }

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

    // Update car position (elevate above track and apply random offset)
    groupRef.current.position.set(
      position.x + currentOffset.current.x, 
      position.y + (primary ? 10 : 5), 
      position.z + currentOffset.current.z
    );

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
      <primitive object={scaledScene} />
      {/* Replace car model with a simple cube for debugging */}
      {/* <mesh position={[0, -200, 0]}>
        <boxGeometry args={[carScale, carScale, carScale]} />
        <meshLambertMaterial color="red" />
      </mesh> */}
    </group>
  );
});

const AnimatedF1Car = forwardRef<THREE.Group, AnimatedF1CarProps>(({ 
  primary,
  trackData, 
  speed, 
  autoStart, 
  carScale, 
  startOffset, 
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
    primary={primary}
    ref={ref} 
    trackData={data} 
    speed={speed} 
    autoStart={autoStart} 
    carScale={carScale} 
    startOffset={startOffset} 
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
