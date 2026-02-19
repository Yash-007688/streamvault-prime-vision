import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export type SupportedQuality = "360p" | "720p" | "1080p" | "4k";

export const TOKEN_COST: Record<SupportedQuality, number> = {
  "360p": 1, "720p": 2, "1080p": 3, "4k": 4,
};

function extractVideoId(rawUrl: string): string | null {
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
      if (["shorts", "embed", "v"].includes(pathParts[0])) {
        return /^[a-zA-Z0-9_-]{11}$/.test(pathParts[1] || "") ? pathParts[1] : null;
      }
    }
  } catch { /* ignore */ }
  return null;
}

export interface ClientConfig {
  name: string;
  clientName: string;
  clientVersion: string;
  userAgent: string;
  extraHeaders?: Record<string, string>;
  extraContext?: Record<string, unknown>;
}

const CLIENTS: ClientConfig[] = [
  {
    name: "IOS",
    clientName: "IOS",
    clientVersion: "19.29.1",
    userAgent: "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
    extraHeaders: {
      "X-Youtube-Client-Name": "5",
      "X-Youtube-Client-Version": "19.29.1",
    },
    extraContext: {
      deviceMake: "Apple",
      deviceModel: "iPhone16,2",
      osName: "iPhone",
      osVersion: "17.5.1.21F90",
    },
  },
  {
    name: "ANDROID",
    clientName: "ANDROID",
    clientVersion: "19.09.37",
    userAgent: "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
    extraHeaders: {
      "X-Youtube-Client-Name": "3",
      "X-Youtube-Client-Version": "19.09.37",
    },
    extraContext: {
      androidSdkVersion: 30,
      osName: "Android",
      osVersion: "11",
    },
  },
  {
    name: "TV_EMBED",
    clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    clientVersion: "2.0",
    userAgent: "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) 85.0.4183.93/6.5 TV Safari/537.36",
    extraContext: {},
  },
  {
    name: "MWEB",
    clientName: "MWEB",
    clientVersion: "2.20240304.08.00",
    userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    extraContext: {},
  },
];

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
  const qualityMap: Record<SupportedQuality, string> = {
    "360p": "360",
    "720p": "720",
    "1080p": "1080",
    "4k": "2160", // Cobalt uses height or specific strings? Docs say 360, 720, 1080, max. Let's assume height string.
  };
  const targetQuality = qualityMap[quality] || "720";
  
  // Try multiple cobalt API endpoints for reliability
  const endpoints = [
    "https://api.cobalt.tools/api/json",
    "https://co.wuk.sh/api/json",
  ];

  for (const endpoint of endpoints) {
    const payloads = [
      {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        videoQuality: targetQuality,
        filenameStyle: "pretty",
        vCodec: "h264",
      },
      {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        quality: targetQuality, // Some instances use 'quality' instead of 'videoQuality'
        audioFormat: "best",
        filenamePattern: "classic",
      },
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

        const cobaltData = await cobaltRes.json();
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

export interface InnertubeFormat {
  url?: string;
  height?: number;
  mimeType?: string;
}

export interface InnertubeData {
  playabilityStatus?: {
    status?: string;
    reason?: string;
  };
  streamingData?: {
    formats?: InnertubeFormat[];
    adaptiveFormats?: InnertubeFormat[];
  };
}

async function tryInnertubeClient(
  videoId: string,
  client: ClientConfig,
  target: number
): Promise<string | null> {
  console.log(`Trying ${client.name} client...`);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": client.userAgent,
    ...(client.extraHeaders || {}),
  };

  const body = {
    videoId,
    context: {
      client: {
        clientName: client.clientName,
        clientVersion: client.clientVersion,
        hl: "en",
        gl: "US",
        ...(client.extraContext || {}),
      },
      thirdParty: client.clientName === "TVHTML5_SIMPLY_EMBEDDED_PLAYER" 
        ? { embedUrl: "https://www.youtube.com" } 
        : undefined,
    },
    contentCheckOk: true,
    racyCheckOk: true,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false&key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
      { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`${client.name}: HTTP ${res.status}`);
      await res.text();
      return null;
    }

    const data = await res.json() as InnertubeData;
    const status = data.playabilityStatus?.status;
    
    if (status && status !== "OK") {
      console.log(`${client.name}: ${status} - ${data.playabilityStatus?.reason || "unknown"}`);
      // Don't return null yet for UNPLAYABLE - might still have formats in some cases
      if (status === "LOGIN_REQUIRED" || status === "ERROR") return null;
    }

    // Prefer muxed formats (video + audio)
    const muxed = (data.streamingData?.formats || [])
      .filter((f) => f.url && f.height)
      .map((f) => ({ url: f.url!, height: f.height! }));

    console.log(`${client.name}: ${muxed.length} muxed formats`);

    if (muxed.length > 0) {
      muxed.sort((a, b) => Math.abs(a.height - target) - Math.abs(b.height - target));
      return muxed[0].url;
    }

    // Try adaptive formats (video only)
    const adaptive = (data.streamingData?.adaptiveFormats || [])
      .filter((f) => f.url && f.height && f.mimeType?.startsWith("video/"))
      .map((f) => ({ url: f.url!, height: f.height! }));

    if (adaptive.length > 0) {
      adaptive.sort((a, b) => Math.abs(a.height - target) - Math.abs(b.height - target));
      console.log(`${client.name}: using adaptive ${adaptive[0].height}p`);
      return adaptive[0].url;
    }

    return null;
  } catch (err) {
    clearTimeout(timeout);
    console.error(`${client.name} error:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function getDownloadUrl(videoId: string, quality: SupportedQuality): Promise<string | null> {
  const targetHeight: Record<SupportedQuality, number> = {
    "360p": 360, "720p": 720, "1080p": 1080, "4k": 2160,
  };
  const target = targetHeight[quality] || 720;

  // Try each client in order
  for (const client of CLIENTS) {
    const url = await tryInnertubeClient(videoId, client, target);
    if (url) return url;
  }

  // Fallback to Cobalt
  console.log("Innertube clients failed, trying Cobalt...");
  const cobaltUrl = await tryCobaltDownload(videoId, quality);
  if (cobaltUrl) return cobaltUrl;

  return null;
}

// @ts-ignore – Deno is a global in the Deno runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = (globalThis as any).Deno?.env.get("SUPABASE_URL");
  const supabaseServiceKey = (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server Configuration Error: Missing Supabase keys" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error("Auth error:", authError);
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { url, quality: rawQuality = "720p", title = "" } = await req.json();
    const quality = rawQuality as SupportedQuality;

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cost = TOKEN_COST[quality] || 1;
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("tokens").eq("user_id", user.id).single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found or database error" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.tokens < cost) {
      return new Response(
        JSON.stringify({ error: `Not enough tokens. ${quality} needs ${cost}, you have ${profile.tokens}.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Download: video=${videoId} quality=${quality}`);
    const downloadUrl = await getDownloadUrl(videoId, quality);

    if (!downloadUrl) {
      return new Response(
        JSON.stringify({ error: "Could not get download link. Try a different quality or try again later." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct tokens and log download
    const { error: updateError } = await supabase.from("profiles").update({ tokens: profile.tokens - cost }).eq("user_id", user.id);
    if (updateError) {
        console.error("Token update error:", updateError);
        // We shouldn't fail the download if deduction fails, but we should log it.
        // Or strictly speaking, we should fail? 
        // For now, let's just log it and proceed, or maybe fail to prevent free usage?
        // Let's fail to be safe.
        return new Response(JSON.stringify({ error: "Failed to process transaction" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const { error: insertError } = await supabase.from("downloads").insert({
      user_id: user.id, video_url: url, video_title: title || "Untitled", quality,
    });
    
    if (insertError) {
        console.error("Download log error:", insertError);
    }

    return new Response(
      JSON.stringify({
        downloadUrl, title: title || "Untitled", quality,
        tokenCost: cost, tokensRemaining: profile.tokens - cost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(JSON.stringify({ error: "Download failed" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
