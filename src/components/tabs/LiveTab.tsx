import UnitySimPanel from "@/components/racing/UnitySimPanel";
import TimelineChart from "@/components/racing/TimelineChart";
import DecisionCard from "@/components/racing/DecisionCard";
import JustificationBreakdown from "@/components/racing/JustificationBreakdown";
import ThresholdsBox from "@/components/racing/ThresholdsBox";
import ActionRow from "@/components/racing/ActionRow";
import { Badge } from "@/components/ui/badge";
import { CloudRain, Gauge, Wind } from "lucide-react";

const LiveTab = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - 2/3 width */}
      <div className="lg:col-span-2 space-y-6">
        <UnitySimPanel />
        <TimelineChart />
      </div>

      {/* Right Column - 1/3 width */}
      <div className="space-y-6">
        {/* Header Widgets */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-secondary border-border">
            <Gauge className="w-3 h-3 mr-1" />
            <span className="text-xs">33°C</span>
          </Badge>
          <Badge variant="outline" className="bg-secondary border-border">
            <Wind className="w-3 h-3 mr-1" />
            <span className="text-xs">9 kph</span>
          </Badge>
          <Badge variant="outline" className="bg-secondary border-border">
            <CloudRain className="w-3 h-3" />
          </Badge>
        </div>

        <DecisionCard />
        <JustificationBreakdown />
        <ThresholdsBox />
        <ActionRow />
      </div>
    </div>
  );
};

export default LiveTab;
