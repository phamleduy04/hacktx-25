import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import LiveTab from "@/components/tabs/LiveTab";
import CompareTab from "@/components/tabs/CompareTab";
import TrainingTab from "@/components/tabs/TrainingTab";
import RadioTab from "@/components/tabs/RadioTab";
import LogsTab from "@/components/tabs/LogsTab";

const Index = () => {
  const [session, setSession] = useState("race");
  const [latency] = useState(0.73);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-primary">Race</span>Mind
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-card border-primary/30 text-foreground">
              <span className="text-muted-foreground text-xs">Latency</span>
              <span className="ml-2 font-mono text-primary">{latency}s</span>
            </Badge>
            
            <Select value={session} onValueChange={setSession}>
              <SelectTrigger className="w-32 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="practice">Practice</SelectItem>
                <SelectItem value="quali">Quali</SelectItem>
                <SelectItem value="race">Race</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs defaultValue="live" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="radio">Radio</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            <LiveTab />
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            <CompareTab />
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <TrainingTab />
          </TabsContent>

          <TabsContent value="radio" className="space-y-6">
            <RadioTab />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <LogsTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            GO
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning"></span>
            SOON
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger"></span>
            STOP
          </span>
          <span className="mx-2">|</span>
          <span>Lap time in seconds</span>
          <span>·</span>
          <span>Tire wear 0-1</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
