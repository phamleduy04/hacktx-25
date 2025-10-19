import { Button } from "@/components/ui/button";
import { Play, FastForward, Pause } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ActionRow = () => {
  const handleAction = (action: string) => {
    toast({
      title: "Action triggered",
      description: action,
    });
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <Button
        variant="outline"
        className="border-primary/30 hover:bg-primary/10 hover:border-primary"
        onClick={() => handleAction("Simulate Pit Now")}
      >
        <Play className="w-4 h-4 mr-2" />
        <span className="text-xs">Pit Now</span>
      </Button>
      <Button
        variant="outline"
        className="border-primary/30 hover:bg-primary/10 hover:border-primary"
        onClick={() => handleAction("Simulate Pit In Two Laps")}
      >
        <FastForward className="w-4 h-4 mr-2" />
        <span className="text-xs">Pit +2</span>
      </Button>
      <Button
        variant="outline"
        className="border-primary/30 hover:bg-primary/10 hover:border-primary"
        onClick={() => handleAction("Hold Pace")}
      >
        <Pause className="w-4 h-4 mr-2" />
        <span className="text-xs">Hold</span>
      </Button>
    </div>
  );
};

export default ActionRow;
