import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, Send, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

/** simple rule-based mapper so the right panel populates without AI */
function extractKeywords(text: string) {
  const t = text.toLowerCase();
  const kws: string[] = [];
  if (/rear.*(loose|slide|slip)/.test(t)) kws.push("rear grip", "traction loss");
  if (/smell.*smoke|smoke/.test(t)) kws.push("possible smoke");
  if (/vibration|shudder/.test(t)) kws.push("vibration");
  if (/brake|locking/.test(t)) kws.push("brake lockup");
  if (/oversteer/.test(t)) kws.push("oversteer");
  if (/understeer/.test(t)) kws.push("understeer");
  return Array.from(new Set(kws));
}

function buildSuggestion(kws: string[]) {
  if (kws.includes("rear grip") || kws.includes("traction loss")) {
    return "Consider +2% rear brake bias and check RR/RL pressures; advise smoother throttle exit T8.";
  }
  if (kws.includes("possible smoke")) {
    return "Monitor oil temp/ERS temps; prepare box call if temps continue +5°C next lap.";
  }
  if (kws.includes("vibration")) {
    return "Check tire flat-spot telemetry and wheel speed variance; consider reduced brake pressure into high-load turns.";
  }
  if (kws.includes("brake lockup")) {
    return "Reduce brake bias front by 1–2%, earlier release into apex.";
  }
  if (kws.includes("oversteer")) {
    return "Stabilize rear: add wing click later; for now, traction map +1.";
  }
  if (kws.includes("understeer")) {
    return "Front slip: brake bias forward −1%, suggest later turn-in and slower mid-corner.";
  }
  return "Logged. Monitoring deltas for the next lap.";
}

const RadioTab = () => {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [latMs, setLatMs] = useState<number | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const t0Ref = useRef<number>(0);

  const startRecording = async () => {
    try {
      // mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // codec fallback
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 });
      recRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        await sendToSTT(blob);
        // cleanup
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
      };

      // go
      t0Ref.current = performance.now();
      rec.start();
      setIsRecording(true);
      toast({ title: "Recording started" });

      // auto stop ~2.5s
      setTimeout(() => rec.state === "recording" && rec.stop(), 2500);
    } catch (e) {
      console.error(e);
      toast({ title: "Microphone error", description: "Permission denied or unavailable." });
      setIsRecording(false);
    }
  };

  const sendToSTT = async (blob: Blob) => {
    const form = new FormData();
    form.append("file", blob, "clip.webm");
    try {
      const r = await fetch("/api/stt", { method: "POST", body: form });
      const data = await r.json();
      setLatMs(Math.round(performance.now() - t0Ref.current));

      if (!r.ok || !data?.text) {
        toast({ title: "STT failed", description: data?.error ?? "No transcript returned." });
        return;
      }

      setTranscript(data.text);
      const kws = extractKeywords(data.text);
      setKeywords(kws);
      setSuggestion(buildSuggestion(kws));
      toast({ title: "Transcribed", description: data.text });
    } catch (e) {
      console.error(e);
      toast({ title: "STT error", description: "Service unavailable." });
    }
  };

  const handleRecord = () => {
    if (isRecording) {
      // manual stop
      recRef.current?.state === "recording" && recRef.current.stop();
      return;
    }
    startRecording();
  };

  const handleSend = () => {
    if (!transcript) return;
    toast({ title: "Radio logged", description: "Message sent to logs/correlation." });
    // TODO: optionally POST to your Convex action/logs here.
  };

  // deterministic test without mic (optional)
  const sendSample = async () => {
    try {
      const res = await fetch("/sample.webm");
      const blob = await res.blob();
      t0Ref.current = performance.now();
      await sendToSTT(blob);
    } catch {
      toast({ title: "Missing sample", description: "Put /public/sample.webm to use this." });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left - Radio Console */}
      <div className="space-y-4">
        <Card id="radio" className="border-border bg-card shadow-lg">
          <CardHeader className="pb-3 flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
              Radio Console
            </CardTitle>
            {latMs !== null && (
              <span className="text-[11px] px-2 py-1 rounded bg-muted text-foreground/80">
                latency {latMs} ms
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={handleRecord}
                className={`flex-1 ${
                  isRecording ? "bg-danger hover:bg-danger/90 animate-pulse" : "bg-primary hover:bg-primary/90"
                } text-primary-foreground`}
              >
                <Mic className="w-4 h-4 mr-2" />
                {isRecording ? "Recording..." : "Push to Talk"}
              </Button>
              <Button variant="outline" onClick={sendSample}>
                ▶︎ Sample
              </Button>
            </div>

            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcribed text will appear here..."
              className="min-h-[120px] bg-secondary border-border font-mono text-sm"
              readOnly={isRecording}
            />

            <Button
              onClick={handleSend}
              disabled={!transcript}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Send className="w-4 h-4 mr-2" />
              Send to Agent
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right - Correlation & Suggestion */}
      <div className="space-y-4">
        <Card id="correlate" className="border-border bg-card shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
              Detected Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="bg-secondary border-primary/30">
                    {kw}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No keywords detected yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground">
              Linked Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {keywords.length > 0 ? (
              <>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                  <div className="text-sm text-foreground">tire_rr_temp_c</div>
                  <div className="flex items-center gap-2">
                    <span className="text-danger font-mono text-sm">+8°C</span>
                    <Badge variant="outline" className="text-xs">
                      78%
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                  <div className="text-sm text-foreground">ers_deploy_rate</div>
                  <div className="flex items-center gap-2">
                    <span className="text-warning font-mono text-sm">+6%</span>
                    <Badge variant="outline" className="text-xs">
                      62%
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No linked metrics</p>
            )}
          </CardContent>
        </Card>

        {suggestion && (
          <Card className="border-success/30 bg-card shadow-lg shadow-success/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold tracking-wide text-success flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Suggestion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-foreground leading-relaxed">{suggestion}</p>
              <Button
                className="w-full bg-success hover:bg-success/90 text-card"
                onClick={() => toast({ title: "Suggestion accepted" })}
              >
                Accept
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RadioTab;
