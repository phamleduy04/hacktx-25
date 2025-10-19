import { useState, useEffect, useCallback, useRef } from 'react';

// Extend DeviceOrientationEvent for iOS permission
interface DeviceOrientationEventWithPermission extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export interface OrientationData {
  alpha: number | null;    // 0-360 (compass)
  beta: number | null;     // -180 to 180 (front-back tilt)
  gamma: number | null;    // -90 to 90 (left-right tilt)
  timestamp: number;
}

export interface DeviceOrientationState {
  orientation: OrientationData;
  permission: 'granted' | 'denied' | 'prompt' | 'unknown';
  isSupported: boolean;
  error?: string;
}

export function useDeviceOrientation() {
  const [state, setState] = useState<DeviceOrientationState>({
    orientation: {
      alpha: null,
      beta: null,
      gamma: null,
      timestamp: Date.now()
    },
    permission: 'unknown',
    isSupported: false
  });

  const lastOrientationRef = useRef<OrientationData>({
    alpha: null,
    beta: null,
    gamma: null,
    timestamp: Date.now()
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Check if DeviceOrientationEvent is supported
      if (!window.DeviceOrientationEvent) {
        setState(prev => ({ 
          ...prev, 
          error: 'DeviceOrientationEvent not supported',
          isSupported: false
        }));
        return false;
      }

      setState(prev => ({ ...prev, isSupported: true }));

      // For iOS 13+, we need to request permission
      if (typeof (DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission).requestPermission!();
        setState(prev => ({ 
          ...prev, 
          permission: permission === 'granted' ? 'granted' : 'denied'
        }));
        return permission === 'granted';
      }

      // For other browsers, assume permission is granted
      setState(prev => ({ ...prev, permission: 'granted' }));
      return true;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Permission request failed: ${error}`,
        permission: 'denied'
      }));
      return false;
    }
  }, []);

  const handleOrientationChange = useCallback((event: DeviceOrientationEvent) => {
    console.log('Device orientation event received:', { alpha: event.alpha, beta: event.beta, gamma: event.gamma });
    const newOrientation = {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      timestamp: Date.now()
    };
    
    lastOrientationRef.current = newOrientation;
    setState(prev => ({
      ...prev,
      orientation: newOrientation
    }));
  }, []);

  useEffect(() => {
    // Check if DeviceOrientationEvent is supported
    if (!window.DeviceOrientationEvent) {
      setState(prev => ({ 
        ...prev, 
        isSupported: false,
        error: 'DeviceOrientationEvent not supported'
      }));
      return;
    }

    setState(prev => ({ ...prev, isSupported: true }));

    // Add event listener with proper options for mobile browsers
    const options = { 
      capture: true,
      passive: true 
    };
    
    // Force user interaction to start orientation events
    const startOrientationTracking = () => {
      window.addEventListener('deviceorientation', handleOrientationChange, options);
      
      // Also try deviceorientationabsolute for better accuracy
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientationChange, options);
      }
    };

    // Start tracking immediately if permission is already granted
    if (state.permission === 'granted') {
      startOrientationTracking();
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientationChange, options);
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleOrientationChange, options);
      }
    };
  }, [handleOrientationChange, state.permission]);

  // Fallback mechanism: continuously update with last known orientation
  useEffect(() => {
    if (state.permission === 'granted' && state.isSupported) {
      const interval = setInterval(() => {
        // Only update if we have valid orientation data
        if (lastOrientationRef.current.alpha !== null && 
            lastOrientationRef.current.beta !== null && 
            lastOrientationRef.current.gamma !== null) {
          setState(prev => ({
            ...prev,
            orientation: {
              ...lastOrientationRef.current,
              timestamp: Date.now()
            }
          }));
        }
      }, 100); // Update every 100ms (10 FPS)

      return () => clearInterval(interval);
    }
  }, [state.permission, state.isSupported]);

  return {
    ...state,
    requestPermission
  };
}
