import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QRScannerProps {
  onScanSuccess: (data: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function QRScanner({ 
  onScanSuccess, 
  onError, 
  className = '' 
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      if (!readerRef.current) {
        throw new Error('QR reader not initialized');
      }

      await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current || undefined,
        (result, error) => {
          if (result) {
            const text = result.getText();
            try {
              const data = JSON.parse(text);
              if (data.type === 'webrtc-offer') {
                onScanSuccess(data.sdp);
                stopScanning();
              } else {
                throw new Error('Invalid QR code format');
              }
            } catch {
              setError('Invalid QR code format');
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
      onError?.(errorMessage);
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
      onScanSuccess(manualCode);
    }
  };

  const getStatusColor = () => {
    if (error) return 'bg-red-500';
    if (isScanning) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isScanning) return 'Scanning...';
    return 'Ready to scan';
  };

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          {getStatusText()}
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
              Or enter the pairing code manually:
            </p>
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter 6-digit code"
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
              <li>3. Or enter the 6-digit pairing code</li>
              <li>4. Start tilting your device to control the 3D model!</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
