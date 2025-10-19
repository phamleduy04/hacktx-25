// src/components/QuickSTT.tsx
import { useRef, useState } from "react";

export default function QuickSTT() {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    const rec = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 64000,
    });
    mediaRecorder.current = rec;
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      await sendToEleven(blob);
      stream.getTracks().forEach((t) => t.stop());
      setListening(false);
    };
    rec.start();
    setListening(true);
    // auto-stop after ~3 s
    setTimeout(() => rec.stop(), 3000);
  };

  const sendToEleven = async (blob: Blob) => {
    const form = new FormData();
    form.append("file", blob, "clip.webm");

    try {
      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": import.meta.env.VITE_ELEVENLABS_API_KEY },
        body: form,
      });
      const data = await res.json();
      if (data.text) setTranscript(data.text);
      // e.g. send to pit decision logic
      fetch("/api/analyze-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: data.text }),
  });
  
    } catch (err) {
      console.error("STT error", err);
    }
  };

  return (
    <div className="p-4 rounded-2xl border bg-black text-white space-y-3">
      <button
        onClick={startRecording}
        disabled={listening}
        className={`px-4 py-2 rounded ${listening ? "bg-red-600" : "bg-blue-600"}`}
      >
        {listening ? "Listening..." : "🎙️ Tap to Speak"}
      </button>

      <div className="text-sm text-zinc-300 min-h-[2rem]">
        {transcript ? (
          <span className="opacity-90">“{transcript}”</span>
        ) : (
          <span className="text-zinc-500">Your words appear here</span>
        )}
      </div>
    </div>
  );
}
