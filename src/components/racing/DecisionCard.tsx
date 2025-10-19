import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

type Recommendation = "YES" | "SOON" | "NO";

interface DecisionCardProps {
  recommendation?: Recommendation;
  reason?: string;
}

const DecisionCard = ({ 
  recommendation = "SOON", 
  reason = "Left front is near cliff and rivals within undercut range" 
}: DecisionCardProps) => {
  const config = {
    YES: {
      text: "Pit now",
      icon: CheckCircle,
      color: "text-success",
      borderColor: "border-success/30",
      glowColor: "shadow-success/20",
    },
    SOON: {
      text: "Pit within two laps",
      icon: Clock,
      color: "text-warning",
      borderColor: "border-warning/30",
      glowColor: "shadow-warning/20",
    },
    NO: {
      text: "Stay out",
      icon: AlertCircle,
      color: "text-danger",
      borderColor: "border-danger/30",
      glowColor: "shadow-danger/20",
    },
  };

  const { text, icon: Icon, color, borderColor, glowColor } = config[recommendation];

  return (
    <Card 
      id="decision" 
      className={`border-2 ${borderColor} shadow-lg ${glowColor}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
          Should we pit?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Icon className={`w-8 h-8 ${color}`} />
          <div className={`text-2xl font-bold ${color}`}>
            {text}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {reason}
        </p>
      </CardContent>
    </Card>
  );
};

export default DecisionCard;
