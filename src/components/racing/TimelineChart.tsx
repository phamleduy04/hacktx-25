import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const mockData = [
  { lap: 1, paceDelta: 0, tireFL: 1.0, tireFR: 1.0, tireRL: 1.0, tireRR: 1.0 },
  { lap: 5, paceDelta: -0.2, tireFL: 0.92, tireFR: 0.90, tireRL: 0.88, tireRR: 0.85 },
  { lap: 10, paceDelta: -0.35, tireFL: 0.82, tireFR: 0.78, tireRL: 0.75, tireRR: 0.72 },
  { lap: 15, paceDelta: -0.45, tireFL: 0.70, tireFR: 0.68, tireRL: 0.65, tireRR: 0.60 },
  { lap: 17, paceDelta: -0.28, tireFL: 0.64, tireFR: 0.60, tireRL: 0.55, tireRR: 0.52 },
];

const TimelineChart = () => {
  return (
    <Card id="timeline" className="border-border bg-card shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
          Pace & Tire Wear Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--grid-line))" />
            <XAxis
              dataKey="lap"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              label={{ value: "Lap", position: "insideBottom", offset: -5, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              domain={[-1, 1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="paceDelta"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name="Pace Δ"
            />
            <Line
              type="monotone"
              dataKey="tireFL"
              stroke="hsl(var(--success))"
              strokeWidth={1.5}
              dot={false}
              name="FL"
            />
            <Line
              type="monotone"
              dataKey="tireFR"
              stroke="hsl(var(--success))"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="FR"
            />
            <Line
              type="monotone"
              dataKey="tireRL"
              stroke="hsl(var(--danger))"
              strokeWidth={1.5}
              dot={false}
              name="RL"
            />
            <Line
              type="monotone"
              dataKey="tireRR"
              stroke="hsl(var(--danger))"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="RR"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TimelineChart;
