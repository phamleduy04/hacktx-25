import { useEffect, useState } from 'react';
import { useWebRTCHost } from '@/hooks/use-webrtc-host';
import ControlledF1Viewer from '@/components/ControlledF1Viewer';
import OrientationChart from '@/components/OrientationChart';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DesktopPage() {
  const [roomId] = useState(() => Math.random().toString(36).substring(2, 8));
  
  const {
    connectionState,
    receivedData,
    createOffer,
  } = useWebRTCHost(roomId);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      createOffer().catch(console.error);
      setIsInitialized(true);
    }
  }, [createOffer, isInitialized]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">F1 Car Remote Control</h1>
          <p className="text-muted-foreground text-sm">Desktop Host</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3D Model */}
          <div>
            <ControlledF1Viewer 
              modelPath="/f1_car.glb"
              orientationData={receivedData}
              enableAutoRotation={!receivedData}
            />
            {receivedData && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  ✓ Receiving data from mobile device
                </p>
              </div>
            )}
          </div>

          {/* Connection */}
          <div className="space-y-4">
            {/* Room ID */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Room ID:</p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{roomId}</p>
              </div>
            </div>

            {/* QR Code */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionState.status === 'connected' ? 'bg-green-500' :
                    connectionState.status === 'connecting' ? 'bg-yellow-500' :
                    connectionState.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                  {connectionState.status === 'connected' ? 'Connected' :
                   connectionState.status === 'connecting' ? 'Connecting...' :
                   connectionState.status === 'error' ? 'Error' : 'Waiting for connection'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG 
                      value={window.location.origin + '/mobile?roomId=' + roomId} 
                      size={200}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Scan this QR code with your mobile device
                    </p>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <p className="text-sm font-mono text-gray-600">Room ID</p>
                      <p className="text-2xl font-bold text-gray-900">{roomId}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Connection Steps:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Open this page on your mobile device</li>
                    <li>2. Scan the QR code above</li>
                    <li>3. The room ID will be automatically filled</li>
                    <li>4. Allow motion sensor permissions</li>
                    <li>5. Start controlling the 3D model!</li>
                  </ol>
                </div>

                {connectionState.status === 'connected' && (
                  <Badge variant="default" className="w-full justify-center">
                    ✓ Mobile device connected
                  </Badge>
                )}
              </CardContent>
            </Card>


            {/* Data Chart */}
            {receivedData && (
              <OrientationChart data={receivedData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
