import {
  extractVideoId,
  pickFormatForQuality,
  runYtDlpMetadata,
  validateYouTubeUrl,
  type SupportedQuality,
  type YtDlpInfo,
  type YtDlpFormat,
} from "./_lib/ytdlp.js";

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined> & {
    authorization?: string;
    Authorization?: string;
  };
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function setCors(res: ApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

const ALLOWED_QUALITIES = new Set<SupportedQuality>(["360p", "720p", "1080p", "4k", "2160p"]);

function sendError(
  res: ApiResponse,
  status: number,
  error: string,
  code: string
) {
  return res.status(status).json({ error, code });
}

function getBearerToken(req: ApiRequest): string | null {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || Array.isArray(authHeader)) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function getMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getBody(req: ApiRequest): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body as Record<string, unknown>;
}

interface CobaltPickerItem {
  url?: string;
}

interface CobaltResponse {
  url?: string;
  downloadUrl?: string;
  data?: {
    url?: string;
  };
  picker?: CobaltPickerItem[];
}

function parseCobaltUrl(payload: CobaltResponse): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.url === "string" && payload.url) return payload.url;
  if (typeof payload.downloadUrl === "string" && payload.downloadUrl) return payload.downloadUrl;
  if (typeof payload?.data?.url === "string" && payload.data.url) return payload.data.url;

  const picker = Array.isArray(payload?.picker) ? payload.picker : [];
  for (const item of picker) {
    if (typeof item?.url === "string" && item.url) return item.url;
  }

  return null;
}

async function tryCobaltDownload(videoId: string, quality: SupportedQuality): Promise<string | null> {
  const qualityMap: Record<string, string> = {
    "360p": "360",
    "720p": "720",
    "1080p": "1080",
    "2160p": "2160",
    "4k": "2160",
  };
  const targetQuality = qualityMap[quality] || "720";
  
  // Try multiple cobalt API endpoints for reliability
  const endpoints = [
    "https://api.cobalt.tools/api/json",
    "https://co.wuk.sh/api/json",
    "https://cobalt.api.red/",
    "https://api.wuk.sh/",
  ];

  for (const endpoint of endpoints) {
    // Try different payload structures as different instances might have slightly different requirements
    const payloads = [
      {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        videoQuality: targetQuality,
        filenameStyle: "pretty",
        vCodec: "h264",
      },
      {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        vQuality: targetQuality,
        filenamePattern: "classic",
        isAudioOnly: false,
      },
      {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        quality: targetQuality,
        audioFormat: "best",
        filenamePattern: "classic",
      }
    ];

    for (const payload of payloads) {
      try {
        const cobaltRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "streamvault/1.0",
          },
          body: JSON.stringify(payload),
        });

        if (!cobaltRes.ok) continue;

        const cobaltData = await cobaltRes.json() as CobaltResponse;
        const resolvedUrl = parseCobaltUrl(cobaltData);
        if (resolvedUrl) return resolvedUrl;
      } catch (err) {
        console.error(`Cobalt request failed for ${endpoint}:`, err);
        continue;
      }
    }
  }
  return null;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(res, 405, "Method not allowed", "METHOD_NOT_ALLOWED");
  }

  try {
    const body = getBody(req);

    const url = validateYouTubeUrl(body.url);
    if (!url) {
      return sendError(res, 400, "Invalid YouTube URL", "INVALID_URL");
    }

    const requestedQuality = (body.quality || "720p") as SupportedQuality;
    if (!ALLOWED_QUALITIES.has(requestedQuality)) {
      return sendError(res, 400, "Invalid quality. Use 360p, 720p, 1080p, or 4k.", "INVALID_QUALITY");
    }

    let downloadUrl: string | null = null;
    let metadata: YtDlpInfo | null = null;
    let selectedFormat: YtDlpFormat | null = null;

    // Primary method: yt-dlp
    try {
      metadata = await runYtDlpMetadata(url);
      selectedFormat = pickFormatForQuality(metadata, requestedQuality);
      if (selectedFormat?.url) {
        downloadUrl = selectedFormat.url;
      }
    } catch (ytdlpError) {
      console.error("yt-dlp failed, falling back to Cobalt:", ytdlpError);
    }

    // Fallback method: Cobalt API
    if (!downloadUrl) {
      const videoId = extractVideoId(url);
      if (videoId) {
        downloadUrl = await tryCobaltDownload(videoId, requestedQuality);
      }
    }

    if (!downloadUrl) {
      return sendError(
        res,
        422,
        `Could not process video: All download methods failed. Try a different quality or video.`,
        "DOWNLOAD_PROCESSING_FAILED"
      );
    }

    // Skipped Supabase token deduction and history logging

    const safeTitle =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : (metadata?.title || "Unknown");

    return res.status(200).json({
      title: metadata?.title || safeTitle || "Untitled",
      thumbnail: metadata?.thumbnail || null,
      author: metadata?.uploader || metadata?.channel || "Unknown",
      qualityRequested: requestedQuality,
      qualityResolved: selectedFormat?.height ? `${selectedFormat.height}p` : requestedQuality,
      formatId: selectedFormat?.format_id || null,
      downloadUrl: downloadUrl,
      expiresNote: "Download URL may expire quickly. Start download immediately.",
      // Legacy fields for compatibility
      tokenCost: 0,
      tokensRemaining: 9999
    });
  } catch (error) {
    const message = getMessage(error);

    if (/timed out/i.test(message)) {
      return sendError(res, 504, "Request timed out", "TIMEOUT");
    }

    return sendError(res, 422, `Could not process video: ${message}`, "DOWNLOAD_PROCESSING_FAILED");
  }
}
