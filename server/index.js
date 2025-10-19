import { Blob } from "buffer";
import pkg from "undici";
const { fetch, FormData } = pkg;

import express from "express";
import multer from "multer";
import dotenv from "dotenv";
dotenv.config();


const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// quick sanity endpoint – proves file upload works
app.post("/api/echo", upload.single("file"), (req, res) => {
  res.json({
    gotFile: !!req.file,
    mimetype: req.file?.mimetype,
    bytes: req.file?.size,
  });
});

app.post("/api/stt", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });

  // Log what the browser actually sent
  console.log("[proxy] incoming file:", req.file.mimetype, req.file.size, "bytes");

  try {
    const form = new FormData();
    const type = req.file.mimetype || "audio/webm"; // e.g. "audio/webm" or "audio/mp4"

    form.append("model_id", "scribe_v1");    
    // optional, but helps:
    form.append("language_code", "en"); 

    form.append("file", new Blob([req.file.buffer], { type }), "clip");


    const upstream = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
      body: form, // undici sets multipart boundary
    });

    const raw = await upstream.text();
    console.log("[proxy] upstream status:", upstream.status);
    if (!upstream.ok) {
      console.error("[proxy] upstream body:", raw?.slice(0, 400));
      return res.status(upstream.status).json({ error: `upstream ${upstream.status}`, details: raw });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("[proxy] bad JSON:", raw?.slice(0, 200));
      return res.status(502).json({ error: "bad json from upstream", details: raw });
    }
    return res.json(data); // { text: "..." }
  } catch (e) {
    console.error("[proxy] exception:", e);
    return res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`server on http://localhost:${PORT}`));
