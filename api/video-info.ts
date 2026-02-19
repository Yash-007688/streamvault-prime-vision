import {
  extractVideoId,
  extractAvailableQualities,
  runYtDlpMetadata,
  validateYouTubeUrl,
  type YtDlpInfo,
  type SupportedQuality,
} from "./_lib/ytdlp.ts";

type ApiRequest = {
  method?: string;
  body?: unknown;
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

function sendError(
  res: ApiResponse,
  status: number,
  error: string,
  code: string
) {
  return res.status(status).json({ error, code });
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

    let metadata: YtDlpInfo | undefined;
    let availableFormats: Array<{
      quality: SupportedQuality;
      formatId: string | null;
      ext: string;
      height: number | null;
    }> = [];

    try {
      metadata = await runYtDlpMetadata(url);
      const formats = extractAvailableQualities(metadata);
      // Filter out nulls explicitly to satisfy TypeScript
      availableFormats = formats.filter((f): f is typeof availableFormats[number] => f !== null);
    } catch (ytdlpError) {
      const message = getMessage(ytdlpError);
      if (!/enoent|not found|timed out/i.test(message)) {
        throw ytdlpError;
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        return sendError(res, 400, "Invalid YouTube URL", "INVALID_URL");
      }

      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${videoId}`
        )}&format=json`
      );

      if (!oembedRes.ok) {
        return sendError(res, 404, "Video not found", "VIDEO_NOT_FOUND");
      }

      const oembed = (await oembedRes.json()) as { title?: string; author_name?: string };
      return res.status(200).json({
        title: oembed.title || "Untitled",
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        videoId,
        author: oembed.author_name || "Unknown",
        availableFormats,
      });
    }

    return res.status(200).json({
      title: metadata?.title || "Untitled",
      thumbnail: metadata?.thumbnail || null,
      videoId: metadata?.id || null,
      author: metadata?.uploader || metadata?.channel || "Unknown",
      availableFormats,
    });
  } catch (error) {
    const message = getMessage(error);

    if (/timed out/i.test(message)) {
      return sendError(res, 504, "yt-dlp request timed out", "YTDLP_TIMEOUT");
    }

    if (/enoent|not found/i.test(message)) {
      return sendError(
        res,
        500,
        "yt-dlp binary is not available. Set YTDLP_BIN or deploy to a host that supports yt-dlp.",
        "YTDLP_MISSING"
      );
    }

    if (/unsupported url|unsupported/i.test(message)) {
      return sendError(res, 400, "Unsupported YouTube URL", "UNSUPPORTED_URL");
    }

    return sendError(res, 422, "Could not fetch video info", "VIDEO_INFO_FAILED");
  }
}
