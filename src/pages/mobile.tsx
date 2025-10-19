import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWebRTCClient } from '@/hooks/use-webrtc-client';
import { useDeviceOrientation } from '@/hooks/use-device-orientation';
import ConnectionStatus from '@/components/ConnectionStatus';

export default function MobilePage() {
  const [roomId, setRoomId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [showRoomInput, setShowRoomInput] = useState(true);

  const [alpha, setAlpha] = useState<number>(0);
  const [beta, setBeta] = useState<number>(0);
  const [gamma, setGamma] = useState<number>(0);

  const {
    connectionState,
    connectToHost,
    sendOrientationData,
    close,
    hasOffer
  } = useWebRTCClient(roomId);

  const {
    orientation,
    permission,
    isSupported,
    requestPermission,
    error: orientationError
  } = useDeviceOrientation();

  // Handle room ID connection
  const handleConnect = useCallback(async () => {
    if (!roomId) return;
    
    try {
      setShowRoomInput(false);
      await connectToHost();
      // Don't set isConnected here - let the WebRTC connection state handle it
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [roomId, connectToHost]);

  // Update isConnected based on WebRTC connection state
  useEffect(() => {
    setIsConnected(connectionState.status === 'connected');
  }, [connectionState.status]);

  // Debug orientation data
  useEffect(() => {
    console.log('Orientation data changed:', { alpha: orientation.alpha, beta: orientation.beta, gamma: orientation.gamma });
    setAlpha(orientation.alpha || 0);
    setBeta(orientation.beta || 0);
    setGamma(orientation.gamma || 0);

    sendOrientationData({
      type: 'orientation',
      alpha: orientation.alpha || 0,
      beta: orientation.beta || 0,
      gamma: orientation.gamma || 0,
      timestamp: Date.now()
    });
  }, [orientation.alpha, orientation.beta, orientation.gamma, sendOrientationData]);

  // Request permissions and start streaming
  useEffect(() => {
    if (connectionState.status === 'connected' && permission === 'granted') {
      console.log('Starting orientation data streaming...');
      console.log('Current orientation:', { alpha: alpha, beta: beta, gamma: gamma });
      // Start streaming orientation data
      const interval = setInterval(() => {
        if (alpha !== null && beta !== null && gamma !== null) {
          console.log('Sending orientation data:', { alpha: alpha, beta: beta, gamma: gamma });
          sendOrientationData({
            type: 'orientation',
            alpha: alpha,
            beta: beta,
            gamma: gamma,
            timestamp: Date.now()
          });
        } else {
          console.log('Orientation data is null:', { alpha: alpha, beta: beta, gamma: gamma });
        }
      }, 1000 / 30); // 30 FPS

      return () => clearInterval(interval);
    } else {
      console.log('Not streaming - connection:', connectionState.status, 'permission:', permission);
    }
  }, [connectionState.status, permission, sendOrientationData, alpha, beta, gamma]);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      alert('Permission denied. Please allow motion sensor access to control the 3D model.');
    }
  };

  const handleDisconnect = () => {
    close();
    setIsConnected(false);
    setRoomId('');
    setShowRoomInput(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Mobile Controller</h1>
          <p className="text-muted-foreground">
            Control the 3D F1 car with your device's motion sensors
          </p>
        </div>

        {/* Connection Status */}
        <ConnectionStatus 
          status={connectionState.status}
          error={connectionState.error}
        />

        {/* Room ID Input */}
        {showRoomInput && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Room ID</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Enter the room ID from the desktop:
                </p>
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="abc123"
                  className="text-center text-lg"
                />
              </div>
              <Button 
                onClick={handleConnect}
                disabled={!roomId || !hasOffer}
                className="w-full"
              >
                {hasOffer ? 'Connect' : 'Waiting for desktop...'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Permission Request */}
        {isConnected && permission !== 'granted' && (
          <Card>
            <CardHeader>
              <CardTitle>Motion Sensor Permission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To control the 3D model, we need access to your device's motion sensors.
              </p>
              <Button 
                onClick={handleRequestPermission}
                className="w-full"
                disabled={!isSupported}
              >
                {isSupported ? 'Grant Permission' : 'Motion sensors not supported'}
              </Button>
              {orientationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{orientationError}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        {isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs">
                <p>Connection: {connectionState.status}</p>
                <p>Permission: {permission}</p>
                <p>Orientation: α={orientation.alpha?.toFixed(1) || 'null'}, β={orientation.beta?.toFixed(1) || 'null'}, γ={orientation.gamma?.toFixed(1) || 'null'}</p>
                <p>Alpha: {alpha?.toFixed(1) || 'null'}°, Beta: {beta?.toFixed(1) || 'null'}°, Gamma: {gamma?.toFixed(1) || 'null'}°</p>
                <p>Supported: {isSupported ? 'Yes' : 'No'}</p>
                {orientationError && <p className="text-red-500">Error: {orientationError}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Controller */}
        {isConnected && permission === 'granted' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Active Controller
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Tap the button below to start motion tracking, then tilt your device to control the 3D F1 car!
                </p>
                <Button 
                  onClick={() => {
                    // Force user interaction to start orientation events
                    console.log('User interaction triggered - starting orientation tracking');
                    // Trigger a fake orientation event to wake up the sensor
                    window.dispatchEvent(new Event('deviceorientation'));
                  }}
                  className="w-full"
                  size="lg"
                >
                  🚗 Start Motion Control
                </Button>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-red-50 p-2 rounded">
                    <div className="font-semibold text-red-700">Alpha</div>
                    <div className="text-red-600">
                      {orientation.alpha?.toFixed(1) || 'N/A'}°
                    </div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="font-semibold text-green-700">Beta</div>
                    <div className="text-green-600">
                      {orientation.beta?.toFixed(1) || 'N/A'}°
                    </div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-semibold text-blue-700">Gamma</div>
                    <div className="text-blue-600">
                      {orientation.gamma?.toFixed(1) || 'N/A'}°
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Controls:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Tilt forward/back to rotate car</li>
                  <li>• Tilt left/right to roll car</li>
                  <li>• Rotate device to change direction</li>
                </ul>
              </div>

              <Button 
                onClick={handleDisconnect}
                variant="destructive"
                className="w-full"
              >
                Disconnect
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Make sure the desktop is showing the QR code</li>
              <li>Scan the QR code with this device</li>
              <li>Enter the 6-digit pairing code when prompted</li>
              <li>Allow motion sensor permissions</li>
              <li>Start tilting your device to control the 3D car!</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> This works best on the same WiFi network as the desktop.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
