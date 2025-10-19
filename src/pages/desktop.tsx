import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWebRTCHost } from '@/hooks/use-webrtc-host';
import ConnectionStatus from '@/components/ConnectionStatus';
import ControlledF1Viewer from '@/components/ControlledF1Viewer';
import OrientationChart from '@/components/OrientationChart';

export default function DesktopPage() {
  const [roomId] = useState(() => Math.random().toString(36).substring(2, 8));
  
  const {
    connectionState,
    receivedData,
    createOffer,
    close
  } = useWebRTCHost(roomId);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      createOffer().catch(console.error);
      setIsInitialized(true);
    }
  }, [createOffer, isInitialized]);

  // Remove auto-connection - only connect when mobile device actually connects

  const handleStartConnection = () => {
    createOffer().catch(console.error);
  };

  const handleReset = () => {
    close();
    setIsInitialized(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">F1 Car Remote Control</h1>
          <p className="text-muted-foreground">
            Desktop Host - Control the 3D F1 car with your mobile device
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex justify-center">
          <ConnectionStatus 
            status={connectionState.status}
            error={connectionState.error}
            className="max-w-sm"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - 3D Model */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>3D F1 Car Model</CardTitle>
              </CardHeader>
              <CardContent>
                <ControlledF1Viewer 
                  modelPath="/f1_car.glb"
                  orientationData={receivedData}
                  enableAutoRotation={!receivedData}
                />
                {receivedData && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✓ Receiving orientation data from mobile device
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Alpha: {receivedData.alpha?.toFixed(1)}° | 
                      Beta: {receivedData.beta?.toFixed(1)}° | 
                      Gamma: {receivedData.gamma?.toFixed(1)}°
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - QR Code and Data */}
          <div className="space-y-4">
            {/* Room ID Display */}
            <Card>
              <CardHeader>
                <CardTitle>Room Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Share this Room ID with your mobile device:
                  </p>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{roomId}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionState.status === 'connected' ? 'bg-green-500' :
                    connectionState.status === 'connecting' ? 'bg-yellow-500' :
                    connectionState.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                  <span className="ml-2 text-sm">
                    {connectionState.status === 'connected' ? 'Connected' :
                     connectionState.status === 'connecting' ? 'Connecting...' :
                     connectionState.status === 'error' ? 'Error' : 'Waiting for connection'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Data Visualization */}
            {receivedData && (
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Orientation Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrientationChart data={receivedData} />
                </CardContent>
              </Card>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={handleStartConnection}
                variant="outline"
                disabled={connectionState.status === 'connecting'}
              >
                {connectionState.status === 'disconnected' ? 'Start Connection' : 'Regenerate QR'}
              </Button>
              <Button 
                onClick={handleReset}
                variant="destructive"
                disabled={connectionState.status === 'connecting'}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open this same website on your mobile device</li>
              <li>Navigate to the "Mobile Controller" page</li>
              <li>Enter the Room ID above on your mobile device</li>
              <li>Allow motion sensor permissions on mobile</li>
              <li>Start tilting your mobile device to control the 3D car!</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> Make sure both devices are on the same WiFi network for best performance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
