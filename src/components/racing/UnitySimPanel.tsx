import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef } from "react";

const UnitySimPanel = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Placeholder for Unity WebGL initialization
    // window.unityInstance would be initialized here
  }, []);

  return (
    <Card className="border-border bg-card shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
          Track View
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-grid-line/20">
          {/* Unity Canvas Container */}
          <div
            ref={canvasRef}
            id="unitySim"
            className="w-full h-full flex items-center justify-center"
          >
            <div className="text-center space-y-3 p-8">
              <div className="w-16 h-16 mx-auto rounded-full border-2 border-dashed border-primary/30 animate-pulse" />
              <p className="text-muted-foreground text-sm">Waiting for telemetry</p>
            </div>
          </div>

          {/* Overlay Chips - Top Left */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <Badge className="bg-card/90 backdrop-blur-sm border-primary/30 shadow-lg">
              <span className="text-xs text-muted-foreground">Lap</span>
              <span className="ml-2 font-mono text-primary">17</span>
            </Badge>
            <Badge className="bg-card/90 backdrop-blur-sm border-primary/30 shadow-lg">
              <span className="text-xs text-muted-foreground">Pos</span>
              <span className="ml-2 font-mono text-primary">P4</span>
            </Badge>
          </div>

          {/* Overlay Strip - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card via-card/95 to-transparent backdrop-blur-sm border-t border-border/50 p-3">
            <div className="grid grid-cols-5 gap-3 text-center">
              <div>
                <div className="text-xs text-muted-foreground mb-1">S1</div>
                <div className="font-mono text-sm text-foreground">31.12</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">S2</div>
                <div className="font-mono text-sm text-foreground">39.87</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">S3</div>
                <div className="font-mono text-sm text-foreground">27.44</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">ERS</div>
                <div className="font-mono text-sm text-primary">46%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Fuel</div>
                <div className="font-mono text-sm text-foreground">38.4kg</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnitySimPanel;
