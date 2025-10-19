import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const thresholds = [
  { label: "Degradation index", value: "0.68" },
  { label: "Pit window laps", value: "18-20" },
  { label: "Time loss if pit now", value: "20.8s" },
  { label: "Time loss if pit in 2 laps", value: "22.1s" },
];

const ThresholdsBox = () => {
  return (
    <Card className="border-border bg-card shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
          Thresholds
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {thresholds.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="font-mono text-sm text-foreground">{item.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ThresholdsBox;
