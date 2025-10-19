import { Suspense, useRef, useState, useEffect, useId, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Stats } from '@react-three/drei';
import * as THREE from 'three';
import RaceTrack from './RaceTrack';
import AnimatedF1Car from './AnimatedF1Car';
import CarTrail from './CarTrail';
import Scoreboard from './Scoreboard';
import { loadTrackData, getTrackCenter, type TrackData } from '../utils/trackUtils';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

// Driver configuration
interface Driver {
  id: number;
  name: string;
  team: string;
  color: string;
}

const DRIVERS: Driver[] = [
  { id: 0, name: "HAM", team: "Mercedes", color: "#00D2BE" },
  { id: 1, name: "VER", team: "Red Bull", color: "#0600EF" },
  { id: 2, name: "LEC", team: "Ferrari", color: "#DC0000" },
  { id: 3, name: "NOR", team: "McLaren", color: "#FF8700" }
];

interface CarRaceData {
  laps: number;
  lapTimes: number[]; // Array of lap completion timestamps
  isFinished: boolean;
  lastLapTime: number; // Timestamp of last lap completion
  currentTrackPosition: number; // Real-time track position (0-1)
  currentLap: number; // Current lap number
}


interface F1RaceSimulationProps {
    className?: string;
}

function Scene({ trackData, carScale, carSpeed, followCar, setCarPosition, showTrail, trailColor, trailLength, trailWidth, selectedCarId, pitStopPosition, handlePitStopStart, handlePitStopEnd, pitStopToggles, handlePitStopToggle, carOffsets, isRaceStarted, handleLapComplete, handlePositionUpdate }: {
    trackData: TrackData;
    carScale: number;
    carSpeed: number;
    followCar: boolean;
    setCarPosition: (position: { x: number; y: number; z: number }) => void;
    showTrail: boolean;
    trailColor: string;
    trailLength: number;
    trailWidth: number;
    selectedCarId: number;
    pitStopPosition: number;
    handlePitStopStart: (carId: number) => void;
    handlePitStopEnd: (carId: number) => void;
    pitStopToggles: Record<number, boolean>;
    handlePitStopToggle: (carId: number, enabled: boolean) => void;
    carOffsets: number[];
    isRaceStarted: boolean;
    handleLapComplete: (carId: number, lapNumber: number, lapTime: number) => void;
    handlePositionUpdate: (carId: number, trackPosition: number, currentLap: number) => void;
}) {
    const controlsRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const carRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
    const [carWorldPositions, setCarWorldPositions] = useState<THREE.Vector3[]>([
        new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
    ]);

    // Set up camera to show the entire track
    useEffect(() => {
        if (controlsRef.current && trackData) {
            const center = getTrackCenter(trackData.bounds);
            const trackWidth = trackData.bounds.maxX - trackData.bounds.minX;
            const trackHeight = trackData.bounds.maxY - trackData.bounds.minY;
            const maxDimension = Math.max(trackWidth, trackHeight);

            // Set camera target to track center
            controlsRef.current.target.set(center.x, center.y, center.z);

            // Set camera position to show the entire track (elevated view)
            controlsRef.current.object.position.set(center.x, maxDimension * 2, center.z);
            controlsRef.current.update();
        }
    }, [trackData]);

    // Update orbit controls for smooth damping and camera following
    useFrame(() => {
        if (controlsRef.current) {
            // If following car and we have car position, update camera target
            if (followCar && carRefs.current[selectedCarId]) {
                const carPosition = carRefs.current[selectedCarId].position;
                setCarPosition({ x: carPosition.x, y: carPosition.y, z: carPosition.z });

                // Smoothly move camera target to car position
                controlsRef.current.target.lerp(carPosition, 0.05);
            }

            // Update car world positions for trails
            carRefs.current.forEach((carRef, index) => {
                if (carRef) {
                    const worldPosition = new THREE.Vector3();
                    carRef.getWorldPosition(worldPosition);
                    setCarWorldPositions(prev => {
                        const newPositions = [...prev];
                        newPositions[index] = worldPosition;
                        return newPositions;
                    });
                }
            });

            controlsRef.current.update();
        }
    });

    return (
        <>
            {/* Lighting setup */}
            <ambientLight intensity={0.8} />
            <directionalLight
                position={[1000, 1000, 500]}
                intensity={1.5}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <directionalLight position={[-1000, 1000, -500]} intensity={0.8} />
            <directionalLight position={[0, 1000, 0]} intensity={0.5} />

            {/* Environment */}
            <Environment preset="sunset" />

            {/* Sky background */}
            {/* <mesh>
        <sphereGeometry args={[50000, 32, 32]} />
        <meshBasicMaterial color="#87CEEB" side={2} />
      </mesh> */}

            {/* Ground plane */}
            {/* <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20000, 20000]} />
        <meshLambertMaterial color="#90EE90" />
      </mesh> */}

            {/* Grid helper for reference - using a more stable approach */}
            {/* <gridHelper args={[10000, 100, '#404040', '#808080']} position={[0, -1, 0]} /> */}

            {/* Track */}
            <RaceTrack trackData={trackData} pitStopPosition={pitStopPosition} />

            {/* Debug: Track center marker */}
            <mesh position={[getTrackCenter(trackData.bounds).x, 10, getTrackCenter(trackData.bounds).z]}>
                <boxGeometry args={[50, 20, 50]} />
                <meshBasicMaterial color="blue" wireframe />
            </mesh>

            {/* Debug: Track bounds markers */}
            <mesh position={[trackData.bounds.minX, 5, trackData.bounds.minY]}>
                <boxGeometry args={[20, 10, 20]} />
                <meshBasicMaterial color="green" />
            </mesh>
            <mesh position={[trackData.bounds.maxX, 5, trackData.bounds.maxY]}>
                <boxGeometry args={[20, 10, 20]} />
                <meshBasicMaterial color="yellow" />
            </mesh>

            {/* Animated F1 Cars */}
            {[
                { id: 0, offset: 0.005, xOffset: carOffsets[0] },
                { id: 1, offset: 0, xOffset: carOffsets[1] },
                { id: 2, offset: 0.995, xOffset: carOffsets[2] },
                { id: 3, offset: 0.990, xOffset: carOffsets[3] }
            ].map((car, index) => (
                <AnimatedF1Car
                    key={car.id}
                    ref={(el) => {
                        carRefs.current[index] = el;
                    }}
                    carId={car.id}
                    startOffset={car.offset}
                    xOffset={car.xOffset}
                    trackData={trackData}
                    speed={carSpeed}
                    autoStart={true}
                    carScale={carScale}
                    pitStopPosition={pitStopPosition}
                    pitStopDuration={2}
                    onPitStopStart={handlePitStopStart}
                    onPitStopEnd={handlePitStopEnd}
                    pitStopToggle={pitStopToggles[car.id]}
                    onPitStopToggle={handlePitStopToggle}
                    isRaceStarted={isRaceStarted}
                    onLapComplete={handleLapComplete}
                    onPositionUpdate={handlePositionUpdate}
                />
            ))}

            {/* Car Trails - positioned in world coordinates */}
            {showTrail && carWorldPositions.map((position, index) => (
                <CarTrail
                    // biome-ignore lint/suspicious/noArrayIndexKey: rip
                    key={`trail-car-${index}`}
                    carId={index}
                    carPosition={position}
                    carOffset={carOffsets[index]}
                    color={trailColor}
                    maxLength={trailLength}
                    width={trailWidth}
                />
            ))}

            {/* Orbit controls */}
            <OrbitControls
                ref={controlsRef}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={500}
                maxDistance={50000}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI / 2}
                dampingFactor={0.05}
                enableDamping={true}
                rotateSpeed={0.5}
                zoomSpeed={0.4}
                panSpeed={0.8}
            />

            {/* Performance stats (optional) */}
            <Stats />
        </>
    );
}

export default function F1RaceSimulation({ className = '' }: F1RaceSimulationProps) {
    const [trackData, setTrackData] = useState<TrackData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [carScale, setCarScale] = useState(1500); // Default scale
    const [carSpeed, setCarSpeed] = useState(0.05); // Default speed
    const [followCar, setFollowCar] = useState(false); // Camera follow toggle
    const [selectedCarId, setSelectedCarId] = useState(0); // Selected car to follow
    const [carPosition, setCarPosition] = useState({ x: 0, y: 0, z: 0 });
    const [showTrail, setShowTrail] = useState(true); // Trail toggle
    const [trailColor, setTrailColor] = useState('#ff6b6b'); // Trail color
    const [trailLength, setTrailLength] = useState(100); // Trail length
    const [trailWidth, setTrailWidth] = useState(25); // Trail width
    const [pitStopStatus, setPitStopStatus] = useState<Record<number, { isInPitStop: boolean; timeRemaining: number }>>({});
    const [pitStopPosition, setPitStopPosition] = useState(0.5); // Default pit stop at halfway point
    const [pitStopToggles, setPitStopToggles] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false, 3: false });
    const [isRaceStarted, setIsRaceStarted] = useState(false); // Race start/stop state
    const carOffsets = [-75, -25, 25, 75]; // X offsets for each car
    
    // Race timing state
    const [carRaceData, setCarRaceData] = useState<Record<number, CarRaceData>>({
        0: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        1: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        2: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        3: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 }
    });
    const [raceStartTime, setRaceStartTime] = useState<number | null>(null);
    const sliderId = useId();
    const speedSliderId = useId();
    const trailLengthId = useId();
    const trailWidthId = useId();
    const pitStopPositionId = useId();

    // Handle real-time position updates
    const handlePositionUpdate = useCallback((carId: number, trackPosition: number, currentLap: number) => {
        setCarRaceData(prev => {
            const updated = { ...prev };
            const carData = updated[carId];
            
            // Update real-time position data
            carData.currentTrackPosition = trackPosition;
            carData.currentLap = currentLap;
            
            return updated;
        });
    }, []);

    // Handle lap completion - store crossing timestamps
    const handleLapComplete = useCallback((carId: number, lapNumber: number, lapTime: number) => {
        setCarRaceData(prev => {
            const updated = { ...prev };
            const carData = updated[carId];
            
            // Store the actual crossing timestamp
            carData.laps = lapNumber;
            carData.lapTimes.push(lapTime); // Store timestamp of lap completion
            carData.lastLapTime = lapTime; // Store timestamp of last lap completion
            
            // Check if race is finished (16 laps)
            if (lapNumber >= 16) {
                carData.isFinished = true;
                console.log(`Car ${carId} finished the race!`);
            }
            
            return updated;
        });
    }, []);

    // Handle race start/stop
    const handleRaceStartStop = useCallback(() => {
        if (!isRaceStarted) {
            // Starting race - reset all data and set start time
            setRaceStartTime(Date.now());
            setCarRaceData({
                0: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
                1: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
                2: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
                3: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 }
            });
            setIsRaceStarted(true);
        } else {
            // Stopping race
            setIsRaceStarted(false);
            setRaceStartTime(null);
        }
    }, [isRaceStarted]);

    // Pit stop handlers
    const handlePitStopStart = (carId: number) => {
        setPitStopStatus(prev => ({
            ...prev,
            [carId]: { isInPitStop: true, timeRemaining: 2 }
        }));
    };

    const handlePitStopEnd = (carId: number) => {
        setPitStopStatus(prev => ({
            ...prev,
            [carId]: { isInPitStop: false, timeRemaining: 0 }
        }));
        // Auto-turn off the toggle when pit stop ends
        setPitStopToggles(prev => ({
            ...prev,
            [carId]: false
        }));
    };

    // Handle manual pit stop toggle
    const handlePitStopToggle = (carId: number, enabled: boolean) => {
        setPitStopToggles(prev => ({
            ...prev,
            [carId]: enabled
        }));
    };

    // Update pit stop timer
    useEffect(() => {
        const interval = setInterval(() => {
            setPitStopStatus(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(carId => {
                    const carIdNum = parseInt(carId);
                    if (updated[carIdNum]?.isInPitStop && updated[carIdNum]?.timeRemaining > 0) {
                        updated[carIdNum] = {
                            ...updated[carIdNum],
                            timeRemaining: Math.max(0, updated[carIdNum].timeRemaining - 1)
                        };
                    }
                });
                return updated;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        loadTrackData()
            .then((data) => {
                setTrackData(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className={`w-full h-screen flex items-center justify-center ${className}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-lg">Loading F1 Race Simulation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`w-full h-screen flex items-center justify-center ${className}`}>
                <div className="text-center text-red-600">
                    <h2 className="text-xl font-bold mb-2">Failed to Load Simulation</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!trackData) {
        return (
            <div className={`w-full h-screen flex items-center justify-center ${className}`}>
                <div className="text-center text-gray-600">
                    <p>No track data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full h-screen relative ${className}`}>
            {/* Scoreboard */}
            <Scoreboard 
                carRaceData={carRaceData}
                drivers={DRIVERS}
                raceStartTime={raceStartTime}
            />
            
            {/* Car Controls */}
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                <div className="space-y-4">
                    {/* Race Start/Stop Control */}
                    <div className="space-y-2">
                        <Button
                            onClick={handleRaceStartStop}
                            variant={isRaceStarted ? "destructive" : "default"}
                            className="w-48"
                        >
                            {isRaceStarted ? "🛑 Stop Race" : "🏁 Start Race"}
                        </Button>
                        <div className="text-xs text-gray-600">
                            {isRaceStarted ? "Race in progress" : "Cars waiting at start line"}
                        </div>
                    </div>

                    {/* Car Selection */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Select Car:</div>
                        <div className="flex gap-2">
                            {[0, 1, 2, 3].map((id) => (
                                <Button
                                    key={id}
                                    onClick={() => setSelectedCarId(id)}
                                    variant={selectedCarId === id ? "default" : "outline"}
                                    className="w-12"
                                >
                                    {id + 1}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Camera Follow Toggle */}
                    <div className="space-y-2">
                        <Button
                            onClick={() => setFollowCar(!followCar)}
                            variant={followCar ? "default" : "outline"}
                            className="w-48"
                        >
                            {followCar ? `🎥 Following Car ${selectedCarId + 1}` : "📷 Free Camera"}
                        </Button>
                        {followCar && (
                            <div className="text-xs text-gray-600">
                                Car {selectedCarId + 1} Position: ({carPosition.x.toFixed(0)}, {carPosition.y.toFixed(0)}, {carPosition.z.toFixed(0)})
                            </div>
                        )}
                    </div>

                    {/* Car Scale Slider */}
                    <div className="space-y-2">
                        <label htmlFor={sliderId} className="text-sm font-medium text-gray-700">
                            Car Scale: {carScale}
                        </label>
                        <Slider
                            id={sliderId}
                            value={[carScale]}
                            onValueChange={(value) => setCarScale(value[0])}
                            min={750}
                            max={2000}
                            step={10}
                            className="w-48"
                        />
                    </div>

                    {/* Car Speed Slider */}
                    <div className="space-y-2">
                        <label htmlFor={speedSliderId} className="text-sm font-medium text-gray-700">
                            Car Speed: {(carSpeed * 1000).toFixed(1)}
                        </label>
                        <Slider
                            id={speedSliderId}
                            value={[carSpeed * 1000]}
                            onValueChange={(value) => setCarSpeed(value[0] / 1000)}
                            min={0.1}
                            max={1000}
                            step={0.1}
                            className="w-48"
                        />
                    </div>

                    {/* Pit Stop Controls */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Pit Stop Position:</div>
                        <Slider
                            id={pitStopPositionId}
                            value={[pitStopPosition]}
                            onValueChange={(value) => setPitStopPosition(value[0])}
                            min={0}
                            max={1}
                            step={0.01}
                            className="w-48"
                        />
                        <div className="text-xs text-gray-600">
                            Position: {(pitStopPosition * 100).toFixed(0)}%
                        </div>
                    </div>

                    {/* Pit Stop Status */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Pit Stop Controls:</div>
                        {[0, 1, 2, 3].map((carId) => {
                            const status = pitStopStatus[carId];
                            const toggleEnabled = pitStopToggles[carId] || false;
                            return (
                                <div key={carId} className="flex items-center justify-between space-x-2">
                                    <div className="text-xs flex-1">
                                        Car {carId + 1}: {status?.isInPitStop ? 
                                            `🛑 In Pit Stop (${status.timeRemaining}s)` : 
                                            toggleEnabled ? '⏳ Needs Pit Stop' : '🏁 Racing'
                                        }
                                    </div>
                                    <Switch
                                        checked={toggleEnabled}
                                        onCheckedChange={(checked) => handlePitStopToggle(carId, checked)}
                                        disabled={status?.isInPitStop}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Trail Controls */}
                    <div className="space-y-2">
                        <Button
                            onClick={() => setShowTrail(!showTrail)}
                            variant={showTrail ? "default" : "outline"}
                            className="w-48"
                        >
                            {showTrail ? "🌊 Trail On" : "🌊 Trail Off"}
                        </Button>

                        {showTrail && (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor={trailLengthId} className="text-sm font-medium text-gray-700">
                                        Trail Length: {trailLength}
                                    </label>
                                    <Slider
                                        id={trailLengthId}
                                        value={[trailLength]}
                                        onValueChange={(value) => setTrailLength(value[0])}
                                        min={20}
                                        max={500}
                                        step={10}
                                        className="w-48"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor={trailWidthId} className="text-sm font-medium text-gray-700">
                                        Trail Width: {trailWidth}
                                    </label>
                                    <Slider
                                        id={trailWidthId}
                                        value={[trailWidth]}
                                        onValueChange={(value) => setTrailWidth(value[0])}
                                        min={25}
                                        max={500}
                                        step={1}
                                        className="w-48"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700">Trail Color:</div>
                                    <div className="flex gap-2">
                                        {['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'].map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setTrailColor(color)}
                                                className={`w-8 h-8 rounded-full border-2 ${trailColor === color ? 'border-gray-800' : 'border-gray-300'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                                aria-label={`Select trail color ${color}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Canvas
                camera={{
                    position: [0, 20000, 0],
                    fov: 50,
                    near: 1,
                    far: 100000,
                }}
                shadows
                dpr={[1, 2]}
                performance={{ min: 0.5 }}
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: "high-performance"
                }}
            >
                <Suspense fallback={null}>
                    <Scene
                        trackData={trackData}
                        carScale={carScale}
                        carSpeed={carSpeed}
                        followCar={followCar}
                        selectedCarId={selectedCarId}
                        setCarPosition={setCarPosition}
                        showTrail={showTrail}
                        trailColor={trailColor}
                        trailLength={trailLength}
                        trailWidth={trailWidth}
                        pitStopPosition={pitStopPosition}
                        handlePitStopStart={handlePitStopStart}
                        handlePitStopEnd={handlePitStopEnd}
                        pitStopToggles={pitStopToggles}
                        handlePitStopToggle={handlePitStopToggle}
                        carOffsets={carOffsets}
                        isRaceStarted={isRaceStarted}
                        handleLapComplete={handleLapComplete}
                        handlePositionUpdate={handlePositionUpdate}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
