// yt-dlp API server for Render deployment
// Deploy this folder as a Node.js Web Service on Render

import express from "express";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const YTDLP_BIN = process.env.YTDLP_BIN || "yt-dlp";

// Health check
app.get("/", (_req, res) => res.json({ status: "ok" }));

// Video info
app.post("/video-info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const { stdout } = await execFileAsync(YTDLP_BIN, [
      "--dump-single-json",
      "--skip-download",
      "--no-warnings",
      "--no-call-home",
      "--no-playlist",
      "--", url,
    ], { timeout: 30000 });

    const info = JSON.parse(stdout);
    res.json({
      title: info.title || "Unknown",
      thumbnail: info.thumbnail || null,
      videoId: info.id || null,
      author: info.uploader || info.channel || "Unknown",
      channel: info.channel || info.uploader || "Unknown",
    });
  } catch (err) {
    console.error("video-info error:", err.message);
    res.status(422).json({ error: "Failed to get video info" });
  }
});

// Video download
app.post("/video-download", async (req, res) => {
  const { url, quality = "720p", format = "mp4" } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const heightMap = { "360p": 360, "720p": 720, "1080p": 1080, "4k": 2160 };
  const targetHeight = heightMap[quality] || 720;

  try {
    // For mp3, extract audio only
    const formatArg = format === "mp3"
      ? "bestaudio[ext=m4a]/bestaudio"
      : `bestvideo[height<=${targetHeight}]+bestaudio/best[height<=${targetHeight}]/best`;

    const { stdout } = await execFileAsync(YTDLP_BIN, [
      "--dump-single-json",
      "--no-warnings",
      "--no-call-home",
      "--no-playlist",
      "-f", formatArg,
      "--", url,
    ], { timeout: 30000 });

    const info = JSON.parse(stdout);

    // Get the direct URL
    const downloadUrl = info.url || info.requested_downloads?.[0]?.url;
    if (!downloadUrl) {
      return res.status(422).json({ error: "Could not extract download URL" });
    }

    res.json({
      title: info.title || "video",
      thumbnail: info.thumbnail || null,
      author: info.uploader || info.channel || "Unknown",
      downloadUrl,
      quality,
      format,
    });
  } catch (err) {
    console.error("video-download error:", err.message);
    res.status(422).json({ error: "Failed to process download" });
  }
});

app.listen(PORT, () => console.log(`yt-dlp API running on port ${PORT}`));
