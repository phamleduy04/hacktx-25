import { useState, useEffect, useCallback, useRef, use } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWebRTCClient } from '@/hooks/use-webrtc-client';
import { useDeviceOrientation } from '@/hooks/use-device-orientation';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useSearchParams } from 'react-router-dom';

export default function MobilePage() {
  const [roomId, setRoomId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [showRoomInput, setShowRoomInput] = useState(true);
  const [connectionMethod, setConnectionMethod] = useState<'roomid' | 'qr'>('roomid');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shouldConnect, setShouldConnect] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const {
    connectionState,
    connectToHost,
    sendOrientationData,
    close,
    hasOffer
  } = useWebRTCClient(roomId);

  // Initialize QR reader
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  const {
    orientation,
    permission,
    isSupported,
    requestPermission,
    error: orientationError
  } = useDeviceOrientation();

  // Handle room ID connection
  const handleConnect = useCallback(async () => {
    if (!roomId || !hasOffer) return;
    
    try {
      setShowRoomInput(false);
      await connectToHost();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [roomId, connectToHost, hasOffer]);

  // QR Scanner methods
  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      if (!readerRef.current) {
        throw new Error('QR reader not initialized');
      }

      await readerRef.current.decodeFromVideoDevice(
        null,
        videoRef.current as HTMLVideoElement,
        (result, error) => {
          if (result) {
            const text = result.getText();
            try {
              // Try to parse as JSON first (for backward compatibility)
              const data = JSON.parse(text);
              if (data.type === 'room-id') {
                handleQRScan(data.roomId);
                stopScanning();
              } else {
                throw new Error('Invalid QR code format');
              }
            } catch {
              // If JSON parsing fails, treat the text as a direct room ID
              if (text && text.length >= 3) {

                const parsedText = text.split('?roomId=')[1];
                if (parsedText && parsedText.length < 6) {
                  setError('Invalid QR code format');
                  return;
                }
                handleQRScan(parsedText);
                stopScanning();
              } else {
                setError('Invalid QR code format');
              }
            }
          }
          if (error && error.name !== 'NotFoundException') {
            setError(`Scan error: ${error.message}`);
          }
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleQRScan(manualCode);
    }
  };

  // Handle QR code scan
  const handleQRScan = useCallback(async (scannedRoomId: string) => {
    try {
      console.log('QR code scanned, room ID received:', scannedRoomId);
      setRoomId(scannedRoomId);
      setShowRoomInput(false);
      setShouldConnect(true);
    } catch (error) {
      console.error('Failed to connect via QR:', error);
    }
  }, []);

  useEffect(() => {
    if (shouldConnect && roomId) {
      handleConnect().catch(console.error);
    }
  }, [shouldConnect, handleConnect, roomId]);

  useEffect(() => {
    const roomId = searchParams.get('roomId');
    if (roomId) {
      setRoomId(roomId);
      setShowRoomInput(false);
      setShouldConnect(true);
    }
  }, [searchParams]);

  // Update isConnected based on WebRTC connection state
  useEffect(() => {
    console.log('Connection state changed:', connectionState);
    setIsConnected(connectionState.status === 'connected');
  }, [connectionState]);

  // Debug orientation data - only send when connected
  useEffect(() => {
    console.log('Orientation data changed:', { alpha: orientation.alpha, beta: orientation.beta, gamma: orientation.gamma });

    // Only send orientation data when actually connected
    if (isConnected && connectionState.status === 'connected') {
      sendOrientationData({
        type: 'orientation',
        alpha: orientation.alpha || 0,
        beta: orientation.beta || 0,
        gamma: orientation.gamma || 0,
        timestamp: Date.now()
      });
    }
  }, [orientation.alpha, orientation.beta, orientation.gamma, sendOrientationData, isConnected, connectionState.status]);

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
    <div className="min-h-screen bg-gray-50 p-4 color-black">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Mobile Controller</h1>
          <p className="text-muted-foreground text-sm">Control the 3D F1 car</p>
        </div>

        {/* Debug: Room ID set but still showing input */}
        {roomId && showRoomInput && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-700">
              <strong>Debug:</strong> Room ID set to "{roomId}" but still showing input
            </p>
          </div>
        )}

        {/* Connection */}
        {showRoomInput && (
          <div className="space-y-4">
            {/* Method Selection */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={connectionMethod === 'roomid' ? 'default' : 'secondary'}
                onClick={() => setConnectionMethod('roomid')}
                className="w-full"
              >
                Room ID
              </Button>
              <Button
                variant={connectionMethod === 'qr' ? 'default' : 'secondary'}
                onClick={() => setConnectionMethod('qr')}
                className="w-full"
              >
                QR Code
              </Button>
            </div>

            {/* Room ID Method */}
            {connectionMethod === 'roomid' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enter the room ID from desktop:
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
              </div>
            )}

            {/* QR Code Method */}
            {connectionMethod === 'qr' && (
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      error ? 'bg-red-500' :
                      isScanning ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} />
                    {error ? 'Error' :
                     isScanning ? 'Scanning...' : 'Ready to scan'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {/* Camera View */}
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video 
                        ref={videoRef}
                        className="w-full h-48 object-cover"
                        playsInline
                        muted
                      />
                      {!isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Button onClick={startScanning} variant="default">
                            Start Camera
                          </Button>
                        </div>
                      )}
                      {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/50 text-white px-3 py-1 rounded">
                            Point camera at QR code
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">{error}</p>
                        <Button 
                          onClick={() => setError(null)} 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}

                    {/* Manual Code Entry */}
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Or enter the room ID manually:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="Enter room ID"
                          maxLength={6}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleManualSubmit}
                          disabled={manualCode.length !== 6}
                          size="sm"
                        >
                          Connect
                        </Button>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">How to connect:</h4>
                      <ol className="text-sm text-muted-foreground space-y-1">
                        <li>1. Allow camera permission when prompted</li>
                        <li>2. Point camera at the QR code on desktop</li>
                        <li>3. Or enter the room ID manually</li>
                        <li>4. Start tilting your device to control the 3D model!</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Debug: Room ID received but not connected */}
        {roomId && !showRoomInput && !isConnected && (
          <div className="text-center space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Debug: Connection Status</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Room ID:</strong> {roomId}</p>
                <p><strong>Connection State:</strong> {connectionState.status}</p>
                <p><strong>Has Offer:</strong> {hasOffer ? 'Yes' : 'No'}</p>
                {connectionState.error && (
                  <p className="text-red-600"><strong>Error:</strong> {connectionState.error}</p>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700 mb-3">
                Waiting for WebRTC connection to establish...
              </p>
              <Button 
                onClick={() => {
                  console.log('Manual retry connection');
                  connectToHost().catch(console.error);
                }}
                variant="outline"
                size="sm"
              >
                Retry Connection
              </Button>
            </div>
          </div>
        )}

        {/* Permission Request */}
        {isConnected && permission !== 'granted' && (
          <div className="text-center space-y-4">
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
          </div>
        )}

        {/* Active Controller */}
        {isConnected && permission === 'granted' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm font-medium">Controller Active</span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Tilt your device to control the 3D F1 car
            </p>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-100 p-2 rounded">
                <div className="font-semibold text-gray-700">Alpha</div>
                <div className="text-gray-600">
                  {orientation.alpha?.toFixed(1) || '0'}°
                </div>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                <div className="font-semibold text-gray-700">Beta</div>
                <div className="text-gray-600">
                  {orientation.beta?.toFixed(1) || '0'}°
                </div>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                <div className="font-semibold text-gray-700">Gamma</div>
                <div className="text-gray-600">
                  {orientation.gamma?.toFixed(1) || '0'}°
                </div>
              </div>
            </div>

            <Button 
              onClick={handleDisconnect}
              variant="destructive"
              className="w-full"
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
