import StrategyColumn from "@/components/racing/StrategyColumn";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

const CompareTab = () => {
  const deltaGain = 1.6;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategyColumn strategyId="A" initialName="Conservative" />
        <StrategyColumn strategyId="B" initialName="Aggressive" />
      </div>

      <Card className="border-primary/30 bg-card shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-4">
            <span className="text-lg font-semibold text-muted-foreground">Strategy A</span>
            <ArrowRight className="w-5 h-5 text-primary" />
            <div className="text-center">
              <div className="text-3xl font-bold text-success">
                {deltaGain > 0 ? '+' : ''}{deltaGain}s
              </div>
              <div className="text-xs text-muted-foreground">Projected gain</div>
            </div>
            <ArrowRight className="w-5 h-5 text-primary" />
            <span className="text-lg font-semibold text-muted-foreground">Strategy B</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompareTab;
