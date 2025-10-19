import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Shield, Fuel, CloudRain, TrendingDown } from "lucide-react";

const weights = [
  { name: "Tire degradation", percent: 55, icon: Gauge },
  { name: "Undercut risk", percent: 25, icon: Shield },
  { name: "Fuel loss per lap", percent: 10, icon: Fuel },
  { name: "Safety car probability", percent: 5, icon: CloudRain },
  { name: "Weather shift", percent: 5, icon: TrendingDown },
];

const JustificationBreakdown = () => {
  return (
    <Card id="why" className="border-border bg-card shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
          Why
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {weights.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <item.icon className="w-3 h-3 text-primary" />
                <span className="text-foreground">{item.name}</span>
              </div>
              <span className="font-mono text-primary">{item.percent}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default JustificationBreakdown;
