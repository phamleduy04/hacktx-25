import * as THREE from 'three';

export interface TrackPoint {
  x: number;
  y: number;
}

export interface TrackData {
  points: TrackPoint[];
  curve: THREE.CatmullRomCurve3;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Parse track data from the XY coordinate text file
 */
export function parseTrackData(data: string): TrackPoint[] {
  const lines = data.trim().split('\n');
  const points: TrackPoint[] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      const [x, y] = line.split(',').map(coord => parseFloat(coord.trim()));
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        points.push({ x, y });
      }
    }
  }
  
  return points;
}

/**
 * Create a smooth spline curve from track points
 */
export function createTrackCurve(points: TrackPoint[]): THREE.CatmullRomCurve3 {
  // Convert 2D points to 3D (Y = 0 for flat track on XZ plane) and flip x-axis
  const curvePoints = points.map(point => new THREE.Vector3(-point.x, 0, point.y));
  
  // Create closed Catmull-Rom curve
  const curve = new THREE.CatmullRomCurve3(curvePoints);
  curve.closed = true;
  
  return curve;
}

/**
 * Calculate track bounds for centering and scaling
 */
export function calculateTrackBounds(points: TrackPoint[]) {
  const xs = points.map(p => -p.x); // Flip x-axis for bounds calculation
  const ys = points.map(p => p.y);
  
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * Get track center point for camera positioning
 */
export function getTrackCenter(bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: 0, // Track is flat on XZ plane
    z: (bounds.minY + bounds.maxY) / 2, // minY and maxY become minZ and maxZ
  };
}

/**
 * Create track geometry as a flat ribbon with specified height
 */
export function createTrackGeometry(curve: THREE.CatmullRomCurve3, width: number = 150, height: number = 0.01): THREE.BufferGeometry {
  const segments = 200; // Number of segments along the curve
  
  // Create geometry using TubeGeometry for a smooth track with height
  const geometry = new THREE.TubeGeometry(curve, segments, width / 2, 8, true);
  
  // Scale the geometry to have the specified height
  geometry.scale(1, height, 1);
  
  return geometry;
}

/**
 * Create track borders geometry
 */
export function createTrackBorders(curve: THREE.CatmullRomCurve3, trackWidth: number = 150): THREE.BufferGeometry {
  const segments = 200;
  const borderWidth = 50;
  
  // Create inner and outer border curves
  const innerPoints = [];
  const outerPoints = [];
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    
    // Calculate perpendicular vector (for XZ plane)
    const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    
    // Inner border
    const innerPoint = point.clone().add(perpendicular.clone().multiplyScalar(trackWidth / 2 - borderWidth / 2));
    innerPoints.push(innerPoint);
    
    // Outer border
    const outerPoint = point.clone().add(perpendicular.clone().multiplyScalar(trackWidth / 2 + borderWidth / 2));
    outerPoints.push(outerPoint);
  }
  
  // Create geometry for borders
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  
  // Create border strips
  for (let i = 0; i < segments; i++) {
    const inner1 = innerPoints[i];
    const inner2 = innerPoints[i + 1];
    const outer1 = outerPoints[i];
    const outer2 = outerPoints[i + 1];
    
    // Create two triangles for each segment
    vertices.push(
      inner1.x, inner1.y, inner1.z,
      outer1.x, outer1.y, outer1.z,
      inner2.x, inner2.y, inner2.z,
      
      inner2.x, inner2.y, inner2.z,
      outer1.x, outer1.y, outer1.z,
      outer2.x, outer2.y, outer2.z
    );
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

/**
 * Load and process track data
 */
export async function loadTrackData(): Promise<TrackData> {
  try {
    const response = await fetch('/xy_data.txt');
    const data = await response.text();
    const points = parseTrackData(data);
    const curve = createTrackCurve(points);
    const bounds = calculateTrackBounds(points);
    
    return {
      points,
      curve,
      bounds
    };
  } catch (error) {
    console.error('Failed to load track data:', error);
    throw error;
  }
}
