import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UnitySimPanel from "@/components/racing/UnitySimPanel";
import { Play, Award, Target, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const scenarios = [
  "Light rain in 10 minutes",
  "Early tire cliff",
  "Safety car Lap 18",
  "Back to back virtual safety car",
];

const TrainingTab = () => {
  const [scenario, setScenario] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [timer, setTimer] = useState(30);
  const [score, setScore] = useState(850);
  const [streak, setStreak] = useState(5);

  const handleStartScenario = () => {
    if (!scenario) {
      toast({ title: "Select a scenario first" });
      return;
    }
    setIsActive(true);
    toast({ title: "Scenario started", description: scenario });
  };

  const handleChoice = (choice: string) => {
    toast({ title: "Choice recorded", description: choice });
    setIsActive(false);
  };

  return (
    <div className="space-y-6">
      {/* Scenario Picker */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
            Scenario Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Select value={scenario} onValueChange={setScenario}>
            <SelectTrigger className="flex-1 bg-secondary border-border">
              <SelectValue placeholder="Choose a scenario..." />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleStartScenario}
            disabled={!scenario || isActive}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Unity Sim */}
        <div>
          <UnitySimPanel />
        </div>

        {/* Right - Challenge Panel */}
        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
              Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isActive ? (
              <>
                <div className="text-center">
                  <div className="text-4xl font-bold font-mono text-warning mb-2">
                    {timer}s
                  </div>
                  <div className="text-xs text-muted-foreground">Time remaining</div>
                </div>

                <div className="p-4 bg-secondary rounded-lg border border-border">
                  <p className="text-sm text-foreground leading-relaxed">
                    Your left front tire is degrading rapidly. Rivals are within 3 seconds behind.
                    Rain is forecasted in 12 minutes. What's your call?
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => handleChoice("Pit now")}
                    variant="outline"
                    className="w-full border-success/30 hover:bg-success/10"
                  >
                    Pit now
                  </Button>
                  <Button
                    onClick={() => handleChoice("Pit in 2 laps")}
                    variant="outline"
                    className="w-full border-warning/30 hover:bg-warning/10"
                  >
                    Pit in 2 laps
                  </Button>
                  <Button
                    onClick={() => handleChoice("Do not pit")}
                    variant="outline"
                    className="w-full border-danger/30 hover:bg-danger/10"
                  >
                    Do not pit
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select and start a scenario to begin training
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score Strip */}
      <Card className="border-primary/30 bg-card shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <Award className="w-6 h-6 mx-auto mb-1 text-primary" />
              <div className="text-xl font-bold text-foreground">{score}</div>
              <div className="text-xs text-muted-foreground">Total Points</div>
            </div>
            <div className="text-center">
              <Zap className="w-6 h-6 mx-auto mb-1 text-success" />
              <div className="text-xl font-bold text-foreground">{streak}</div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold font-mono text-primary">0.68s</div>
              <div className="text-xs text-muted-foreground">Avg Latency</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingTab;
