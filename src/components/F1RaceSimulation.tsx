import { Suspense, useRef, useState, useEffect, useId, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Stats } from '@react-three/drei';
import * as THREE from 'three';
import RaceTrack from './RaceTrack';
import AnimatedF1Car from './AnimatedF1Car';
import CarTrail from './CarTrail';
import Scoreboard from './Scoreboard';
import { loadTrackData, getTrackCenter, isOnStraight, type TrackData } from '../utils/trackUtils';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { api } from '../../convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';

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
    { id: 3, name: "NOR", team: "McLaren", color: "#FF8700" },
    { id: 4, name: "RUS", team: "Mercedes", color: "#1E90FF" },
    { id: 5, name: "PER", team: "Red Bull", color: "#8A2BE2" },
    { id: 6, name: "SAI", team: "Ferrari", color: "#FF4500" },
    { id: 7, name: "PIA", team: "McLaren", color: "#32CD32" }
];

interface CarRaceData {
    laps: number;
    lapTimes: number[]; // Array of lap completion timestamps
    isFinished: boolean;
    lastLapTime: number; // Timestamp of last lap completion
    currentTrackPosition: number; // Real-time track position (0-1)
    currentLap: number; // Current lap number
}

interface CarTelemetry {
    tireWearPercentage: number; // 0-100
    performanceDropSeconds: number; // Accumulated time loss
    lapsSincePit: number;
    lastPitLap: number;
    baseSpeed: number; // Car's natural speed
    currentSpeed: number; // Degraded speed
    raceIncident: string; // "None" | "Yellow Flag" | "Safety Car" | "Collision"
    // AI car speed variation properties
    speedBoostActive?: boolean;
    speedDropActive?: boolean;
    speedVariationDuration?: number;
    speedVariationAmount?: number;
}


interface F1RaceSimulationProps {
    className?: string;
}

function Scene({ trackData, carScale, carSpeed, followCar, setCarPosition, showTrail, trailLength, trailWidth, selectedCarId, pitStopPosition, handlePitStopStart, handlePitStopEnd, pitStopToggles, handlePitStopToggle, isRaceStarted, handleLapComplete, handlePositionUpdate, carTelemetry }: {
    trackData: TrackData;
    carScale: number;
    carSpeed: number;
    followCar: boolean;
    setCarPosition: (position: { x: number; y: number; z: number }) => void;
    showTrail: boolean;
    trailLength: number;
    trailWidth: number;
    selectedCarId: number;
    pitStopPosition: number;
    handlePitStopStart: (carId: number) => void;
    handlePitStopEnd: (carId: number) => void;
    pitStopToggles: Record<number, boolean>;
    handlePitStopToggle: (carId: number, enabled: boolean) => void;
    isRaceStarted: boolean;
    handleLapComplete: (carId: number, lapNumber: number, lapTime: number) => void;
    handlePositionUpdate: (carId: number, trackPosition: number, currentLap: number) => void;
    carTelemetry: Record<number, CarTelemetry>;
}) {

    
    const controlsRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const carRefs = useRef<(THREE.Group | null)[]>([null, null, null, null, null, null, null, null]);
    const [carWorldPositions, setCarWorldPositions] = useState<{ position: THREE.Vector3; rotation: THREE.Quaternion }[]>([
        { position: new THREE.Vector3(), rotation: new THREE.Quaternion() },
        { position: new THREE.Vector3(), rotation: new THREE.Quaternion() },
        { position: new THREE.Vector3(), rotation: new THREE.Quaternion() },
        { position: new THREE.Vector3(), rotation: new THREE.Quaternion() },
        { position: new THREE.Vector3(), rotation: new THREE.Quaternion() },
        { position: new THREE.Vector3(), rotation: new THREE.Quaternion() },
        { position: new THREE.Vector3(), rotation: new THREE.Quaternion() },
        { position: new THREE.Vector3(), rotation: new THREE.Quaternion() },
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
        // addF1CarData({
        //     car_id: "1",
        //     undercut_overcut_opportunity: false,
        //     tire_wear_percentage: 0,
        //     performance_drop_seconds: 0,
        //     track_position: 0,
        //     race_incident: "None",
        //     laps_since_pit: 0,
        // });
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
                    const worldRotation = new THREE.Quaternion();

                    carRef.getWorldPosition(worldPosition);
                    carRef.getWorldQuaternion(worldRotation);

                    const worldRotationEuler = new THREE.Euler();
                    worldRotationEuler.setFromQuaternion(worldRotation);

                    // Use the world position directly (random offset is now handled internally by the car)
                    const updatedPosition = worldPosition;


                    setCarWorldPositions(prev => {
                        const newPositions = [...prev];
                        newPositions[index] = { position: updatedPosition, rotation: worldRotation };
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
                { id: 0, offset: 0.930 },
                { id: 1, offset: 0.935 },
                { id: 2, offset: 0.940 },
                { id: 3, offset: 0.945 },
                { id: 4, offset: 0.950 },
                { id: 5, offset: 0.955 },
                { id: 6, offset: 0.960 },
                { id: 7, offset: 0.965 }
            ].map((car, index) => (
                <AnimatedF1Car
                    primary={index === 0}
                    key={car.id}
                    ref={(el) => {
                        carRefs.current[index] = el;
                    }}
                    carId={car.id}
                    startOffset={car.offset}
                    trackData={trackData}
                    speed={carTelemetry[car.id]?.currentSpeed || carSpeed}
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
                    carPosition={position.position}
                    color={DRIVERS[index]?.color || '#ff6b6b'}
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
    const addF1CarData = useMutation(api.f1.addF1CarData);
    const decisionQuery = useQuery(api.f1Strategy.listF1PitStrategy);
    
    const [trackData, setTrackData] = useState<TrackData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [carScale, setCarScale] = useState(1500); // Default scale
    const [carSpeed, setCarSpeed] = useState(0.05); // Default speed
    const [followCar, setFollowCar] = useState(false); // Camera follow toggle
    const [selectedCarId, setSelectedCarId] = useState(0); // Selected car to follow
    const [carPosition, setCarPosition] = useState({ x: 0, y: 0, z: 0 });
    const [showTrail, setShowTrail] = useState(true); // Trail toggle
    const [trailLength, setTrailLength] = useState(100); // Trail length
    const [trailWidth, setTrailWidth] = useState(25); // Trail width
    const [pitStopStatus, setPitStopStatus] = useState<Record<number, { isInPitStop: boolean; timeRemaining: number }>>({});
    const [pitStopPosition, setPitStopPosition] = useState(0.5); // Default pit stop at halfway point
    const [pitStopToggles, setPitStopToggles] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false });
    const [isRaceStarted, setIsRaceStarted] = useState(false); // Race start/stop state

    // Race timing state
    const [carRaceData, setCarRaceData] = useState<Record<number, CarRaceData>>({
        0: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        1: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        2: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        3: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        4: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        5: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        6: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
        7: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 }
    });

    // Car telemetry state
    const [carTelemetry, setCarTelemetry] = useState<Record<number, CarTelemetry>>({
        0: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None" },
        1: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
        2: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
        3: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
        4: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
        5: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
        6: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
        7: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 }
    });
    const [raceStartTime, setRaceStartTime] = useState<number | null>(null);
    const sliderId = useId();
    const speedSliderId = useId();
    const trailLengthId = useId();
    const trailWidthId = useId();
    const pitStopPositionId = useId();

    // AI car pit stop logic
    const [aiCarPitLaps, setAiCarPitLaps] = useState<Record<number, number>>({});

    // Update car telemetry (tire wear, performance degradation)
    const updateCarTelemetry = useCallback((carId: number, delta: number) => {
        setCarTelemetry(prev => {
            const updated = { ...prev };
            const telemetry = updated[carId];

            if (!telemetry) return updated;

            // Calculate tire wear: linear increase + random variation
            const baseWearRate = 0.05; // 0.05% per second
            const randomVariation = (Math.random() - 0.5) * 0.04; // ±0.02% variation
            const wearIncrease = (baseWearRate + randomVariation) * delta;

            telemetry.tireWearPercentage = Math.min(100, telemetry.tireWearPercentage + wearIncrease);

            // Calculate performance drop based on tire wear
            const performanceDropRate = 0.001; // 0.001s per 1% tire wear
            telemetry.performanceDropSeconds = telemetry.tireWearPercentage * performanceDropRate;

            // Update current speed based on performance drop
            const speedReduction = telemetry.performanceDropSeconds / 100;
            telemetry.currentSpeed = telemetry.baseSpeed * (1 - speedReduction);

            // AI car speed variations (cars 1-7 only)
            if (carId >= 1 && carId <= 7) {
                // Initialize speed variation state if not exists
                if (!telemetry.speedBoostActive && !telemetry.speedDropActive) {
                    telemetry.speedBoostActive = false;
                    telemetry.speedDropActive = false;
                    telemetry.speedVariationDuration = 0;
                    telemetry.speedVariationAmount = 0;
                }

                // Check for new speed variations (10% chance per second)
                if (!telemetry.speedBoostActive && !telemetry.speedDropActive && Math.random() < 0.1) {
                    const isBoost = Math.random() < 0.5; // 50% chance for boost vs drop
                    const variationAmount = 0.03 + Math.random() * 0.02; // 3-5% variation
                    const duration = 2 + Math.random() * 1; // 2-3 seconds

                    if (isBoost) {
                        telemetry.speedBoostActive = true;
                        telemetry.speedVariationAmount = variationAmount;
                        telemetry.speedVariationDuration = duration;
                        console.log(`AI Car ${carId} got speed boost: +${(variationAmount * 100).toFixed(1)}% for ${duration.toFixed(1)}s`);
                    } else {
                        telemetry.speedDropActive = true;
                        telemetry.speedVariationAmount = -variationAmount;
                        telemetry.speedVariationDuration = duration;
                        console.log(`AI Car ${carId} got speed drop: -${(variationAmount * 100).toFixed(1)}% for ${duration.toFixed(1)}s`);
                    }
                }

                // Apply active speed variations
                if (telemetry.speedBoostActive || telemetry.speedDropActive) {
                    telemetry.speedVariationDuration = (telemetry.speedVariationDuration || 0) - delta;
                    
                    if ((telemetry.speedVariationDuration || 0) <= 0) {
                        // Speed variation ended
                        telemetry.speedBoostActive = false;
                        telemetry.speedDropActive = false;
                        telemetry.speedVariationAmount = 0;
                        telemetry.speedVariationDuration = 0;
                    } else {
                        // Apply speed variation
                        const speedMultiplier = 1 + (telemetry.speedVariationAmount || 0);
                        telemetry.currentSpeed = telemetry.baseSpeed * (1 - speedReduction) * speedMultiplier;
                    }
                }
            }

            return updated;
        });
    }, []);


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

            // Only process if this is a new lap (prevent double processing)
            if (carData.laps >= lapNumber) {
                return updated; // Already processed this lap
            }

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

        // Update telemetry - increment laps since pit (only once per lap)
        setCarTelemetry(prev => {
            const updated = { ...prev };
            const telemetry = updated[carId];
            if (telemetry) {
                telemetry.lapsSincePit += 1;
                console.log(`Car ${carId} laps since pit: ${telemetry.lapsSincePit}`);
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
                3: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
                4: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
                5: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
                6: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 },
                7: { laps: 0, lapTimes: [], isFinished: false, lastLapTime: 0, currentTrackPosition: 0, currentLap: 0 }
            });
            
            // Reset telemetry with speed variation properties
            setCarTelemetry({
                0: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None" },
                1: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
                2: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
                3: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
                4: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
                5: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
                6: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 },
                7: { tireWearPercentage: 0, performanceDropSeconds: 0, lapsSincePit: 0, lastPitLap: 0, baseSpeed: carSpeed, currentSpeed: carSpeed, raceIncident: "None", speedBoostActive: false, speedDropActive: false, speedVariationDuration: 0, speedVariationAmount: 0 }
            });
            
            // Initialize AI car pit stop laps (random between 4-12 laps)
            const newAiCarPitLaps: Record<number, number> = {};
            for (let carId = 1; carId <= 7; carId++) {
                newAiCarPitLaps[carId] = 4 + Math.floor(Math.random() * 9); // 4-12 laps
            }
            setAiCarPitLaps(newAiCarPitLaps);
            
            setIsRaceStarted(true);
        } else {
            // Stopping race
            setIsRaceStarted(false);
            setRaceStartTime(null);
        }
    }, [isRaceStarted, carSpeed]);

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

        // Reset telemetry after pit stop
        setCarTelemetry(prev => {
            const updated = { ...prev };
            const telemetry = updated[carId];
            if (telemetry) {
                telemetry.tireWearPercentage = 0;
                telemetry.performanceDropSeconds = 0;
                telemetry.lapsSincePit = 0;
                telemetry.lastPitLap = carRaceData[carId]?.currentLap || 0;
                telemetry.currentSpeed = telemetry.baseSpeed;
                telemetry.raceIncident = "None";
            }
            return updated;
        });
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

    // Update telemetry continuously during race
    useEffect(() => {
        if (!isRaceStarted) return;

        const interval = setInterval(() => {
            [0, 1, 2, 3, 4, 5, 6, 7].forEach(carId => {
                updateCarTelemetry(carId, 1); // Update every second
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isRaceStarted, updateCarTelemetry]);

    // Track last telemetry send time
    const lastSendTimeRef = useRef<number>(0);

    // Convex integration for primary car (car 0) - send telemetry every 3 seconds
    useEffect(() => {
        if (!isRaceStarted || !trackData) return;
        
        // Check if 3 seconds have passed since last send
        const now = Date.now();
        if (now - lastSendTimeRef.current < 3000) {
            return; // Not enough time has passed
        }

        // Only process car 0 (primary car)
        const carId = 0;
        const carData = carRaceData[carId];
        const carTelemetryData = carTelemetry[carId];

        if (!carData || !carTelemetryData) return;

        // Check if car is on a straight section
        if (!isOnStraight(carData.currentTrackPosition, trackData.curve)) {
            return;
        }

        // Detect undercut opportunity with current data
        const undercutOpportunity = (() => {
            const currentPosition = carData.currentTrackPosition;
            const currentTireWear = carTelemetryData.tireWearPercentage;

            // Find cars within ±0.05 track position (same lap)
            const nearbyCars = Object.entries(carRaceData).filter(([id, data]) => {
                const carIdNum = parseInt(id);
                if (carIdNum === carId) return false; // Skip self
                if (data.currentLap !== carData.currentLap) return false; // Different lap

                const positionDiff = Math.abs(data.currentTrackPosition - currentPosition);
                return positionDiff <= 0.05; // Within 5% of track
            });

            // Check tire wear difference with nearby cars
            for (const [id] of nearbyCars) {
                const nearbyCarId = parseInt(id);
                const nearbyCarTelemetry = carTelemetry[nearbyCarId];

                if (nearbyCarTelemetry) {
                    const tireWearDifference = Math.abs(currentTireWear - nearbyCarTelemetry.tireWearPercentage);
                    if (tireWearDifference > 20) { // 20% difference threshold
                        return true; // Opportunity exists
                    }
                }
            }

            return false; // No opportunity
        })();

        // Calculate race position (1-8) based on current standings
        const calculateRacePosition = (carId: number) => {
            const allCars = Object.entries(carRaceData).map(([id, data]) => ({
                carId: parseInt(id),
                laps: data.laps,
                trackPosition: data.currentTrackPosition,
                isFinished: data.isFinished
            }));

            // Sort by laps (descending), then by track position (ascending for same lap)
            allCars.sort((a, b) => {
                if (a.laps !== b.laps) {
                    return b.laps - a.laps; // More laps first
                }
                if (a.laps === 0) return 0; // Both haven't started
                // For same lap, sort by track position (higher position = further ahead)
                return b.trackPosition - a.trackPosition; // Higher track position first
            });

            // Find position of current car
            const position = allCars.findIndex(car => car.carId === carId) + 1;
            return position;
        };

        // Send data to Convex
        const sendTelemetry = async () => {
            try {
                await addF1CarData({
                    car_id: "0",
                    undercut_overcut_opportunity: undercutOpportunity,
                    tire_wear_percentage: Math.round(carTelemetryData.tireWearPercentage),
                    performance_drop_seconds: Math.round(carTelemetryData.performanceDropSeconds * 100) / 100,
                    track_position: calculateRacePosition(carId),
                    race_incident: carTelemetryData.raceIncident as "None" | "Yellow Flag" | "Safety Car" | "VSC",
                    laps_since_pit: carTelemetryData.lapsSincePit
                });
                console.log(`Car 0 telemetry sent to Convex`);
                // Update timestamp after successful send
                lastSendTimeRef.current = now;
            } catch (error) {
                console.error(`Failed to send telemetry for car 0:`, error);
            }
        };

        sendTelemetry();
    }, [isRaceStarted, trackData, carRaceData, carTelemetry, addF1CarData]);

    // Watch decisionQuery for car 0 and auto-trigger pit stops
    useEffect(() => {
        if (!decisionQuery) return;

        // Find decision for car 0
        const car0Decision = decisionQuery.find(decision => decision.car_id === "0");
        
        if (car0Decision && car0Decision.decision === "PIT NOW") {
            console.log("Car 0 received PIT NOW decision from Convex");
            setPitStopToggles(prev => ({
                ...prev,
                [0]: true
            }));
        }
    }, [decisionQuery]);

    // AI car pit stop logic - monitor AI cars and trigger pit stops at assigned laps
    useEffect(() => {
        if (!isRaceStarted) return;

        // Check each AI car (cars 1-7) for pit stop triggers
        for (let carId = 1; carId <= 7; carId++) {
            const carData = carRaceData[carId];
            const assignedPitLap = aiCarPitLaps[carId];
            
            if (carData && assignedPitLap && carData.currentLap >= assignedPitLap) {
                // Check if car is not already in pit stop and hasn't pitted recently
                const telemetry = carTelemetry[carId];
                if (telemetry && telemetry.lapsSincePit >= 2) { // At least 2 laps since last pit
                    console.log(`AI Car ${carId} triggering pit stop at lap ${carData.currentLap}`);
                    setPitStopToggles(prev => ({
                        ...prev,
                        [carId]: true
                    }));
                    
                    // Assign new random pit lap for next pit stop
                    setAiCarPitLaps(prev => ({
                        ...prev,
                        [carId]: assignedPitLap + 4 + Math.floor(Math.random() * 9) // Next pit in 4-12 laps
                    }));
                }
            }
        }
    }, [isRaceStarted, carRaceData, aiCarPitLaps, carTelemetry]);

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
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg bottom-4 overflow-y-auto">
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
                        <div className="flex gap-2 flex-wrap max-w-48">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((id) => (
                                <Button
                                    key={id}
                                    onClick={() => setSelectedCarId(id)}
                                    variant={selectedCarId === id ? "default" : "outline"}
                                    className="w-12"
                                    style={{
                                        backgroundColor: selectedCarId === id ? DRIVERS[id]?.color : undefined,
                                        borderColor: DRIVERS[id]?.color,
                                        color: selectedCarId === id ? 'white' : DRIVERS[id]?.color
                                    }}
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
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((carId) => {
                            const status = pitStopStatus[carId];
                            const toggleEnabled = pitStopToggles[carId] || false;
                            const telemetry = carTelemetry[carId];
                            const tireWearColor = telemetry?.tireWearPercentage < 50 ? 'text-green-600' :
                                telemetry?.tireWearPercentage < 80 ? 'text-yellow-600' : 'text-red-600';

                            return (
                                <div key={carId} className="space-y-1">
                                    <div className="flex items-center justify-between space-x-2">
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

                                    {/* Telemetry Display */}
                                    {telemetry && (
                                        <div className="text-xs text-gray-600 space-y-1 pl-2">
                                            <div className="flex justify-between">
                                                <span>Tire Wear:</span>
                                                <span className={tireWearColor}>
                                                    {telemetry.tireWearPercentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Performance Drop:</span>
                                                <span>{telemetry.performanceDropSeconds.toFixed(2)}s</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Laps Since Pit:</span>
                                                <span>{telemetry.lapsSincePit}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Current Speed:</span>
                                                <span>{((telemetry.currentSpeed / telemetry.baseSpeed) * 100).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    )}
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
                                    <div className="text-sm font-medium text-gray-700">Trail Colors:</div>
                                    <div className="text-xs text-gray-600 mb-2">
                                        Trails are now color-coded by team:
                                    </div>
                                    <div className="flex gap-2 flex-wrap max-w-48">
                                        {DRIVERS.map((driver, index) => (
                                            <div key={driver.id} className="flex flex-col items-center">
                                                <div
                                                    className="w-6 h-6 rounded-full border-2 border-gray-300"
                                                    style={{ backgroundColor: driver.color }}
                                                    title={`Car ${index + 1}: ${driver.name} (${driver.team})`}
                                                />
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {index + 1}
                                                </div>
                                            </div>
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
                        trailLength={trailLength}
                        trailWidth={trailWidth}
                        pitStopPosition={pitStopPosition}
                        handlePitStopStart={handlePitStopStart}
                        handlePitStopEnd={handlePitStopEnd}
                        pitStopToggles={pitStopToggles}
                        handlePitStopToggle={handlePitStopToggle}
                        isRaceStarted={isRaceStarted}
                        handleLapComplete={handleLapComplete}
                        handlePositionUpdate={handlePositionUpdate}
                        carTelemetry={carTelemetry}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
