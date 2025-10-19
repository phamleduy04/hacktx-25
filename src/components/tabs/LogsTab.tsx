import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";

const mockEvents = [
  {
    ts: "17:42:12",
    source: "Strategy",
    message: "Pit window opened",
    data: { lap: 18, compound: "Hard" },
    latency: 730,
  },
  {
    ts: "17:41:58",
    source: "Telemetry",
    message: "Tire degradation threshold reached",
    data: { tire: "FL", value: 0.64 },
    latency: 120,
  },
  {
    ts: "17:41:42",
    source: "Radio",
    message: "Driver feedback recorded",
    data: { text: "rear feels loose" },
    latency: 450,
  },
  {
    ts: "17:41:20",
    source: "Simulation",
    message: "Safety car probability updated",
    data: { probability: 0.15 },
    latency: 890,
  },
];

const filters = ["Strategy", "Radio", "Telemetry", "Simulation"];

const LogsTab = () => {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const filteredEvents =
    activeFilters.length === 0
      ? mockEvents
      : mockEvents.filter((e) => activeFilters.includes(e.source));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {filters.map((filter) => (
          <Badge
            key={filter}
            variant={activeFilters.includes(filter) ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => toggleFilter(filter)}
          >
            {filter}
          </Badge>
        ))}
      </div>

      {/* Event Table */}
      <Card id="events" className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
            Event Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length > 0 ? (
            <div className="space-y-2">
              {filteredEvents.map((event, idx) => (
                <Sheet key={idx}>
                  <SheetTrigger asChild>
                    <div
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="font-mono text-xs text-muted-foreground w-20">
                          {event.ts}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.source}
                        </Badge>
                        <span className="text-sm text-foreground">{event.message}</span>
                      </div>
                      <span className="font-mono text-xs text-primary">{event.latency}ms</span>
                    </div>
                  </SheetTrigger>
                  <SheetContent className="bg-card border-border">
                    <SheetHeader>
                      <SheetTitle className="text-foreground">Event Details</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Timestamp</div>
                        <div className="font-mono text-sm text-foreground">{event.ts}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Source</div>
                        <Badge variant="outline">{event.source}</Badge>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Message</div>
                        <div className="text-sm text-foreground">{event.message}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Latency</div>
                        <div className="font-mono text-sm text-primary">{event.latency}ms</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Payload (JSON)</div>
                        <pre className="bg-secondary p-3 rounded-lg border border-border text-xs font-mono text-foreground overflow-auto">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">No events recorded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LogsTab;
