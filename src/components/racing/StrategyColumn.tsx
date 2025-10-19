import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StrategyColumnProps {
  strategyId: string;
  initialName: string;
}

const mockProjection = [
  { lap: 0, time: 0 },
  { lap: 10, time: 620 },
  { lap: 20, time: 1258 },
  { lap: 30, time: 1894 },
  { lap: 40, time: 2532 },
];

const StrategyColumn = ({ strategyId, initialName }: StrategyColumnProps) => {
  const [name, setName] = useState(initialName);
  const [aggression, setAggression] = useState(50);
  const [wearRate, setWearRate] = useState(0.5);
  const [scChance, setScChance] = useState(0.3);
  const [pitLoss, setPitLoss] = useState(22);

  const handleApplyToLive = () => {
    toast({
      title: "Applied to Live",
      description: `Strategy ${strategyId} (${name}) configuration copied to Live tab`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
              Strategy {strategyId}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-secondary border-border"
          />
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card id={`params${strategyId}`} className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
            Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground">Aggression</span>
              <span className="font-mono text-primary">{aggression}</span>
            </div>
            <Slider
              value={[aggression]}
              onValueChange={(v) => setAggression(v[0])}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground">Tire wear rate</span>
              <span className="font-mono text-primary">{wearRate.toFixed(2)}</span>
            </div>
            <Slider
              value={[wearRate * 100]}
              onValueChange={(v) => setWearRate(v[0] / 100)}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground">Safety car chance</span>
              <span className="font-mono text-primary">{scChance.toFixed(2)}</span>
            </div>
            <Slider
              value={[scChance * 100]}
              onValueChange={(v) => setScChance(v[0] / 100)}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground">Pit loss (seconds)</span>
              <span className="font-mono text-primary">{pitLoss}</span>
            </div>
            <Slider
              value={[pitLoss]}
              onValueChange={(v) => setPitLoss(v[0])}
              min={15}
              max={30}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Projection */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
            Projection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Total time</div>
              <div className="font-mono text-sm text-foreground">42:12.5</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Position</div>
              <div className="font-mono text-sm text-primary">P3</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Stops</div>
              <div className="font-mono text-sm text-foreground">2</div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={mockProjection}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--grid-line))" />
              <XAxis
                dataKey="lap"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "10px",
                }}
              />
              <Line
                type="monotone"
                dataKey="time"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Apply Button */}
      <Button
        onClick={handleApplyToLive}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Apply to Live
      </Button>
    </div>
  );
};

export default StrategyColumn;
