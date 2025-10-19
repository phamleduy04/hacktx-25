import * as React from "react";
import { useRef, useState } from "react";

/** keyword rules */
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
  if (kws.includes("rear grip") || kws.includes("traction loss"))
    return "Consider +2% rear brake bias and check RR/RL pressures; smoother throttle exit T8.";
  if (kws.includes("possible smoke"))
    return "Monitor oil/ERS temps; prepare box if temps rise +5°C next lap.";
  if (kws.includes("vibration"))
    return "Check flat-spot / wheel speed variance; reduce brake pressure in high-load turns.";
  if (kws.includes("brake lockup"))
    return "Reduce front brake bias 1–2%; earlier release to apex.";
  if (kws.includes("oversteer"))
    return "Stabilize rear: traction map +1; wing click later.";
  if (kws.includes("understeer"))
    return "Front slip: bias forward −1%; later turn-in, slower mid-corner.";
  return "Logged. Monitoring deltas for the next lap.";
}

const RadioTab = () => {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [latMs, setLatMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const t0Ref = useRef<number>(0);

  /** mic -> stt */
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 });
      recRef.current = rec;
      rec.ondataavailable = (e) => e.data?.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        await sendToSTT(blob);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
      };
      t0Ref.current = performance.now();
      rec.start();
      setIsRecording(true);
      setTimeout(() => rec.state === "recording" && rec.stop(), 2500);
    } catch {
      setError("Mic permission denied or unavailable.");
      setIsRecording(false);
    }
  };

  const sendToSTT = async (blob: Blob) => {
    const form = new FormData();
    form.append("file", blob, "clip.webm");
    try {
      const r = await fetch("/api/stt", { method: "POST", body: form });
      const text = await r.text();
      setLatMs(Math.round(performance.now() - t0Ref.current));

      if (!r.ok) {
        console.error("STT error", r.status, text);
        setError(`STT failed (${r.status})`);
        return;
      }
      const data = JSON.parse(text);
      if (!data?.text) return setError("No transcript returned.");

      setTranscript(data.text);
      const kws = extractKeywords(data.text);
      setKeywords(kws);
      setSuggestion(buildSuggestion(kws));
    } catch {
      setError("Service unavailable.");
    }
  };

  const handleRecord = () => {
    if (isRecording) recRef.current?.state === "recording" && recRef.current.stop();
    else startRecording();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left side */}
      <div className="space-y-4">
        <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-300">Radio Console</h2>
            {latMs !== null && (
              <span className="text-[11px] px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                latency {latMs} ms
              </span>
            )}
          </div>

          {error && (
            <div className="mb-3 text-sm bg-red-900/40 border border-red-600 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleRecord}
            className={`w-full px-4 py-2 rounded ${
              isRecording ? "bg-red-600 animate-pulse" : "bg-sky-500 hover:bg-sky-600"
            }`}
          >
            {isRecording ? "Recording..." : "🎙️ Push to Talk"}
          </button>

          <textarea
            value={transcript}
            placeholder="Transcribed text will appear here..."
            className="w-full mt-3 p-3 bg-zinc-800 text-zinc-200 rounded border border-zinc-700 font-mono text-sm min-h-[120px]"
            readOnly
          />
        </div>
      </div>

      {/* Right side */}
      <div className="space-y-4">
        {/* Keywords */}
        <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-4 shadow">
          <div className="mb-2 text-sm font-semibold tracking-wide text-zinc-300">Detected Keywords</div>
          {keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <span key={kw} className="px-2 py-1 bg-zinc-800 border border-sky-600/30 rounded text-xs">
                  {kw}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No keywords detected yet</p>
          )}
        </div>

        {/* Linked Metrics */}
        <div className="border border-zinc-800 bg-zinc-900 rounded-lg p-4 shadow">
          <div className="mb-2 text-sm font-semibold tracking-wide text-zinc-300">Linked Metrics</div>
          {keywords.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700">
                <div className="text-sm text-zinc-200">tire_rr_temp_c</div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-mono text-sm">+8°C</span>
                  <span className="border px-1.5 py-0.5 rounded text-xs border-zinc-600">78%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700">
                <div className="text-sm text-zinc-200">ers_deploy_rate</div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 font-mono text-sm">+6%</span>
                  <span className="border px-1.5 py-0.5 rounded text-xs border-zinc-600">62%</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No linked metrics</p>
          )}
        </div>

        {/* Suggestion */}
        {suggestion && (
          <div className="border border-emerald-600/30 bg-zinc-900 rounded-lg p-4 shadow">
            <div className="mb-2 text-sm font-semibold tracking-wide text-emerald-400">Suggestion</div>
            <p className="text-sm text-zinc-200">{suggestion}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RadioTab;
