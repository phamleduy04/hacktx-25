import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { loadTrackData, createTrackGeometry, type TrackData } from '../utils/trackUtils';
import LapIndicator from './LapIndicator';

interface RaceTrackProps {
  trackData?: TrackData;
  pitStopPosition?: number; // Position on track (0-1) where pit stop occurs
}

function Track({ trackData, pitStopPosition = 0.5 }: { trackData: TrackData; pitStopPosition?: number }) {
  const trackRef = useRef<THREE.Mesh>(null);
  
  // Create track geometry
  const trackGeometry = useMemo(() => {
    // Scale track width based on track dimensions
    const trackWidth = trackData.bounds.maxX - trackData.bounds.minX;
    const trackHeight = trackData.bounds.maxY - trackData.bounds.minY;
    const maxDimension = Math.max(trackWidth, trackHeight);
    const trackWidthScaled = Math.max(maxDimension / 50, 200); // Scale track width appropriately
    
    return createTrackGeometry(trackData.curve, trackWidthScaled, 0.01);
  }, [trackData.curve, trackData.bounds]);
  
  // Create materials
  const trackMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      color: 0xffffff, // Lighter asphalt color
      side: THREE.DoubleSide
    });
  }, []);

  // Create pit stop indicator
  const pitStopPosition3D = useMemo(() => {
    return trackData.curve.getPointAt(pitStopPosition);
  }, [trackData.curve, pitStopPosition]);

  // Create lap indicator at start/finish line (t=0)
  const lapIndicatorPosition3D = useMemo(() => {
    return trackData.curve.getPointAt(0);
  }, [trackData.curve]);
  
  
  return (
    <group>
      {/* Main track surface */}
      <mesh ref={trackRef} geometry={trackGeometry} material={trackMaterial} castShadow={false} receiveShadow={false} />
      
      {/* Track borders */}
      {/* <mesh ref={borderRef} geometry={borderGeometry} material={borderMaterial} /> */}
      
      {/* Pit Stop Indicator */}
      <mesh position={[pitStopPosition3D.x, pitStopPosition3D.y + 5, pitStopPosition3D.z]}>
        <cylinderGeometry args={[30, 30, 10, 8]} />
        <meshLambertMaterial color={0xff0000} />
      </mesh>
      
      {/* Pit Stop Sign */}
      <mesh position={[pitStopPosition3D.x, pitStopPosition3D.y + 15, pitStopPosition3D.z]}>
        <boxGeometry args={[60, 20, 5]} />
        <meshLambertMaterial color={0xffffff} />
      </mesh>
      
      {/* Pit Stop Text (using a simple box as placeholder) */}
      <mesh position={[pitStopPosition3D.x, pitStopPosition3D.y + 25, pitStopPosition3D.z]}>
        <boxGeometry args={[40, 8, 2]} />
        <meshLambertMaterial color={0x000000} />
      </mesh>

      {/* Lap Indicator - Start/Finish Line */}
      <LapIndicator position={lapIndicatorPosition3D} />
    </group>
  );
}

export default function RaceTrack({ trackData, pitStopPosition }: RaceTrackProps) {
  const [data, setData] = React.useState<TrackData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (trackData) {
      setData(trackData);
      setLoading(false);
    } else {
      loadTrackData()
        .then((loadedData) => {
          setData(loadedData);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [trackData]);
  
  if (loading) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="gray" />
      </mesh>
    );
  }
  
  if (error) {
    console.error('Failed to load track:', error);
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    );
  }
  
  if (!data) {
    return null;
  }
  
  return <Track trackData={data} pitStopPosition={pitStopPosition} />;
}
