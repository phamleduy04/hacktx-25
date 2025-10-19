import React, { useEffect, useRef, useState } from 'react';

interface CarRaceData {
  laps: number;
  lapTimes: number[];
  isFinished: boolean;
  lastLapTime: number;
  currentTrackPosition: number;
  currentLap: number;
}

interface Driver {
  id: number;
  name: string;
  team: string;
  color: string;
}

interface ScoreboardProps {
  carRaceData: Record<number, CarRaceData>;
  drivers: Driver[];
  raceStartTime: number | null;
}

interface CarPosition {
  carId: number;
  position: number;
  laps: number;
  trackPosition: number;
  timeGap: string;
  isFinished: boolean;
  driver: Driver;
}

export default function Scoreboard({ carRaceData, drivers, raceStartTime }: ScoreboardProps) {
  // Track previous positions to detect changes
  const previousPositionsRef = useRef<Record<number, number>>({});
  const [positionChanges, setPositionChanges] = useState<Record<number, 'up' | 'down' | null>>({});
  // Calculate positions and time gaps
  const calculatePositions = (): CarPosition[] => {
    const cars: CarPosition[] = [];
    
    // Create array of all cars with their data
    Object.entries(carRaceData).forEach(([carIdStr, data]) => {
      const carId = parseInt(carIdStr);
      const driver = drivers.find(d => d.id === carId);
      if (driver) {
        cars.push({
          carId,
          position: 0, // Will be calculated below
          laps: data.laps,
          trackPosition: data.currentTrackPosition,
          timeGap: '',
          isFinished: data.isFinished,
          driver
        });
      }
    });

    // Sort by laps (descending), then by track position (ascending for same lap)
    cars.sort((a, b) => {
      if (a.laps !== b.laps) {
        return b.laps - a.laps; // More laps first
      }
      if (a.laps === 0) return 0; // Both haven't started
      // For same lap, sort by track position (higher position = further ahead)
      return b.trackPosition - a.trackPosition; // Higher track position first
    });

    // Assign positions
    cars.forEach((car, index) => {
      car.position = index + 1;
    });

    // Calculate time gaps
    if (cars.length > 0) {
      const leader = cars[0];
      
      cars.forEach((car, index) => {
        if (index === 0) {
          car.timeGap = '0.000s';
        } else if (car.laps < leader.laps) {
          // Car is lapped
          const lapDifference = leader.laps - car.laps;
          car.timeGap = `+${lapDifference} LAP${lapDifference > 1 ? 'S' : ''}`;
        } else if (car.laps === leader.laps && car.laps > 0) {
          // Same lap - compare crossing timestamps with P1 car
          const carData = carRaceData[car.carId];
          const leaderData = carRaceData[leader.carId];
          
          // Get the timestamp when each car crossed the finish line for this lap
          const carCrossingTime = carData.lastLapTime;
          const leaderCrossingTime = leaderData.lastLapTime;
          
          if (carCrossingTime && leaderCrossingTime) {
            const timeDiff = carCrossingTime - leaderCrossingTime;
            if (timeDiff > 0) {
              car.timeGap = `+${(timeDiff / 1000).toFixed(3)}s`;
            } else {
              car.timeGap = '0.000s';
            }
          } else {
            car.timeGap = '0.000s';
          }
        } else {
          car.timeGap = '0.000s';
        }
      });
    }

    return cars;
  };

  const positions = calculatePositions();

  // Detect position changes and show transient indicators
  useEffect(() => {
    const prev = previousPositionsRef.current;
    const pending: Record<number, 'up' | 'down' | null> = {};

    positions.forEach((car) => {
      const prevPos = prev[car.carId];
      if (prevPos && prevPos !== car.position) {
        pending[car.carId] = car.position < prevPos ? 'up' : 'down';
      } else if (!(car.carId in prev)) {
        pending[car.carId] = null;
      }
    });

    if (Object.keys(pending).length > 0) {
      setPositionChanges((old) => ({ ...old, ...pending }));
      const timeout = setTimeout(() => {
        setPositionChanges((old) => {
          const cleared: Record<number, 'up' | 'down' | null> = { ...old };
          positions.forEach((car) => {
            cleared[car.carId] = null;
          });
          return cleared;
        });
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [positions]);

  // Update previous positions snapshot
  useEffect(() => {
    const snapshot: Record<number, number> = {};
    positions.forEach((car) => {
      snapshot[car.carId] = car.position;
    });
    previousPositionsRef.current = snapshot;
  }, [positions]);

  return (
    <div className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-4 shadow-lg text-white min-w-[300px]">
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-yellow-400">F1 RACE POSITIONS</h3>
        <div className="text-xs text-gray-300">
          {raceStartTime ? 'Race in Progress' : 'Race Stopped'}
        </div>
      </div>
      
      <div className="space-y-1">
        {positions.map((car) => (
          <div
            key={car.carId}
            className={`flex items-center justify-between px-3 py-2 rounded text-sm font-mono transition-transform duration-500 ${
              car.isFinished 
                ? 'bg-green-900/50 border-l-4 border-green-400' 
                : car.laps < positions[0]?.laps 
                  ? 'bg-yellow-900/30 border-l-4 border-yellow-400'
                  : 'bg-gray-800/50 border-l-4 border-gray-400'
            } ${positionChanges[car.carId] === 'up' ? 'ring-2 ring-green-400 scale-[1.02]' : ''} ${positionChanges[car.carId] === 'down' ? 'ring-2 ring-red-400 scale-[0.98]' : ''}`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 text-center font-bold">
                P{car.position}
              </div>
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: car.driver.color }}
              />
              <div>
                <div className="font-bold">{car.driver.name}</div>
                <div className="text-xs text-gray-300">{car.driver.team}</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-bold">
                {car.timeGap}
              </div>
              <div className="text-xs text-gray-300 flex items-center justify-end gap-1">
                Lap {car.laps}/16
                {car.isFinished && <span className="text-green-400 ml-1">✓</span>}
                {positionChanges[car.carId] === 'up' && <span className="text-green-400 font-bold">▲</span>}
                {positionChanges[car.carId] === 'down' && <span className="text-red-400 font-bold">▼</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {positions.length === 0 && (
        <div className="text-center text-gray-400 py-4">
          No race data available
        </div>
      )}
    </div>
  );
}
