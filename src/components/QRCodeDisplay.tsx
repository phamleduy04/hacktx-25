import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QRCodeDisplayProps {
  offerSdp: string;
  pairingCode: string;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  className?: string;
}

export default function QRCodeDisplay({ 
  offerSdp, 
  pairingCode, 
  connectionState, 
  className = '' 
}: QRCodeDisplayProps) {
  const qrData = JSON.stringify({
    type: 'webrtc-offer',
    sdp: offerSdp,
    timestamp: Date.now()
  });

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Waiting for connection';
    }
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
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG 
              value={qrData} 
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
              <p className="text-sm font-mono text-gray-600">Pairing Code</p>
              <p className="text-2xl font-bold text-gray-900">{pairingCode}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Connection Steps:</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. Open this page on your mobile device</li>
            <li>2. Scan the QR code above</li>
            <li>3. Enter the pairing code on mobile</li>
            <li>4. Start controlling the 3D model!</li>
          </ol>
        </div>

        {connectionState === 'connected' && (
          <Badge variant="default" className="w-full justify-center">
            ✓ Mobile device connected
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
