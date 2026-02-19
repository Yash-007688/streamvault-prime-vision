import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export type YtDlpFormat = {
  format_id?: string;
  url?: string;
  ext?: string;
  height?: number;
  width?: number;
  fps?: number;
  tbr?: number;
  format_note?: string;
  vcodec?: string;
  acodec?: string;
};

export type YtDlpInfo = {
  id?: string;
  title?: string;
  thumbnail?: string;
  uploader?: string;
  channel?: string;
  webpage_url?: string;
  formats?: YtDlpFormat[];
};

export type SupportedQuality = "360p" | "720p" | "1080p";

const SUPPORTED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const YTDLP_TIMEOUT_MS = Number(process.env.YTDLP_TIMEOUT_MS || 25000);

function getBinaryPath(): string {
  if (process.env.YTDLP_BIN) return process.env.YTDLP_BIN;
  
  const localBinName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const localBinPath = path.join(process.cwd(), "bin", localBinName);
  
  if (fs.existsSync(localBinPath)) {
    return localBinPath;
  }
  
  return "yt-dlp";
}

export function validateYouTubeUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;

  try {
    const parsed = new URL(rawUrl.trim());
    if (!["https:", "http:"].includes(parsed.protocol)) return null;
    if (!SUPPORTED_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();

    if (host === "youtu.be" || host === "www.youtu.be") {
      const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host.endsWith("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) return watchId;

      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "shorts" || pathParts[0] === "embed" || pathParts[0] === "v") {
        const candidate = pathParts[1] || "";
        return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function runYtDlpMetadata(url: string): Promise<YtDlpInfo> {
  const binaryPath = getBinaryPath();

  const args = [
    "--dump-single-json",
    "--skip-download",
    "--no-warnings",
    "--no-call-home",
    "--no-playlist",
    url,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`yt-dlp timed out after ${YTDLP_TIMEOUT_MS}ms`));
    }, YTDLP_TIMEOUT_MS);

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");

    proc.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    proc.on("error", (error) => {
      clearTimeout(timer);
      error.message = `Spawn error for ${binaryPath}: ${error.message}`;
      reject(error);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(`yt-dlp failed at ${binaryPath}: ${(stderr || stdout || "unknown error").trim()}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as YtDlpInfo;
        resolve(parsed);
      } catch {
        reject(new Error("Invalid yt-dlp JSON output"));
      }
    });
  });
}

function isProgressive(format: YtDlpFormat): boolean {
  return (
    !!format.url &&
    typeof format.height === "number" &&
    format.height > 0 &&
    format.vcodec !== "none" &&
    format.acodec !== "none"
  );
}

function scoreFormat(format: YtDlpFormat, targetHeight: number): number {
  const height = format.height || 0;
  const heightDelta = Math.abs(targetHeight - height);
  const tbr = typeof format.tbr === "number" ? format.tbr : 0;
  const mp4Bonus = format.ext === "mp4" ? 30 : 0;
  return 2000 - heightDelta + tbr + mp4Bonus;
}

export function pickFormatForQuality(info: YtDlpInfo, quality: SupportedQuality) {
  const targetHeight = Number(quality.replace("p", ""));
  const formats = Array.isArray(info.formats) ? info.formats : [];

  const candidates = formats.filter((f) => isProgressive(f) && (f.height || 0) <= targetHeight);
  if (!candidates.length) return null;

  candidates.sort((a, b) => scoreFormat(b, targetHeight) - scoreFormat(a, targetHeight));
  return candidates[0];
}

export function extractAvailableQualities(info: YtDlpInfo) {
  const qualities: SupportedQuality[] = ["360p", "720p", "1080p"];
  return qualities
    .map((quality) => {
      const format = pickFormatForQuality(info, quality);
      if (!format) return null;
      return {
        quality,
        formatId: format.format_id || null,
        ext: format.ext || "mp4",
        height: format.height || null,
      };
    })
    .filter(Boolean);
}
