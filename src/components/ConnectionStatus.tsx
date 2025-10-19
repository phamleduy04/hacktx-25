import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConnectionStatusProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  latency?: number;
  dataRate?: number;
  error?: string;
  className?: string;
}

export default function ConnectionStatus({ 
  status, 
  latency, 
  dataRate, 
  error, 
  className = '' 
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
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
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusVariant = () => {
    switch (status) {
      case 'connected':
        return 'default' as const;
      case 'connecting':
        return 'secondary' as const;
      case 'error':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={getStatusVariant()}>
            {getStatusText()}
          </Badge>
        </div>

        {status === 'connected' && (
          <>
            {latency !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Latency:</span>
                <span className="text-sm font-mono">{latency}ms</span>
              </div>
            )}
            {dataRate !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data Rate:</span>
                <span className="text-sm font-mono">{dataRate} Hz</span>
              </div>
            )}
          </>
        )}

        {status === 'error' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {status === 'connecting' && (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full" />
            <span className="text-sm text-muted-foreground">
              Establishing connection...
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
