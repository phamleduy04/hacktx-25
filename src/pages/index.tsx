import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ModelViewer from '@/components/ModelViewer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';

export default function App() {
  const isMobile = useIsMobile();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">F1 Car 3D Model Viewer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Experience your F1 car model with React Three Fiber and peer-to-peer mobile control
            </p>
            
            {/* Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="text-4xl">🖥️</div>
                  <h3 className="font-semibold">Desktop Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Host the 3D model and receive control from mobile devices
                  </p>
                  <Link to="/desktop">
                    <Button className="w-full">
                      Start Desktop Host
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 border-dashed border-gray-300 hover:border-green-500 transition-colors">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="text-4xl">📱</div>
                  <h3 className="font-semibold">Mobile Controller</h3>
                  <p className="text-sm text-muted-foreground">
                    Control the 3D model using your device's motion sensors
                  </p>
                  <Link to="/mobile">
                    <Button className="w-full" variant="outline">
                      Open Mobile Controller
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Current Device Detection */}
            <div className="flex justify-center">
              <Badge variant={isMobile ? "default" : "secondary"}>
                {isMobile ? "📱 Mobile Device Detected" : "🖥️ Desktop Device Detected"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Standalone 3D Viewer */}
        <Card>
          <CardHeader>
            <CardTitle>Standalone 3D Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              View the F1 car model without peer-to-peer control
            </p>
            <div className="border rounded-lg overflow-hidden">
              <ModelViewer modelPath="/f1_car.glb" />
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Model Successfully Loaded</h3>
              <p className="text-sm text-green-700">
                Your F1 car model is now loaded and ready for interaction! The model is in GLB format for optimal performance with React Three Fiber.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              You can interact with the 3D model by dragging to rotate, scrolling to zoom, and right-clicking to pan.
            </p>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <div className="text-2xl">🌐</div>
                <h4 className="font-semibold">WebRTC P2P</h4>
                <p className="text-sm text-muted-foreground">
                  Direct peer-to-peer connection using WebRTC
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl">📊</div>
                <h4 className="font-semibold">Real-time Data</h4>
                <p className="text-sm text-muted-foreground">
                  Live accelerometer data visualization
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl">🎮</div>
                <h4 className="font-semibold">Motion Control</h4>
                <p className="text-sm text-muted-foreground">
                  Control 3D model with device orientation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
