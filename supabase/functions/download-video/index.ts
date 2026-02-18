import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_COST: Record<string, number> = {
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

interface ClientConfig {
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
  const timeout = setTimeout(() => controller.abort(), 12000);

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

    const data = await res.json();
    const status = data.playabilityStatus?.status;
    
    if (status && status !== "OK") {
      console.log(`${client.name}: ${status} - ${data.playabilityStatus?.reason || "unknown"}`);
      // Don't return null yet for UNPLAYABLE - might still have formats in some cases
      if (status === "LOGIN_REQUIRED" || status === "ERROR") return null;
    }

    // Prefer muxed formats (video + audio)
    const muxed = (data.streamingData?.formats || [])
      .filter((f: any) => f.url && f.height)
      .map((f: any) => ({ url: f.url, height: f.height }));

    console.log(`${client.name}: ${muxed.length} muxed formats`);

    if (muxed.length > 0) {
      muxed.sort((a: any, b: any) => Math.abs(a.height - target) - Math.abs(b.height - target));
      return muxed[0].url;
    }

    // Try adaptive formats (video only)
    const adaptive = (data.streamingData?.adaptiveFormats || [])
      .filter((f: any) => f.url && f.height && f.mimeType?.startsWith("video/"))
      .map((f: any) => ({ url: f.url, height: f.height }));

    if (adaptive.length > 0) {
      adaptive.sort((a: any, b: any) => Math.abs(a.height - target) - Math.abs(b.height - target));
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

async function getDownloadUrl(videoId: string, quality: string): Promise<string | null> {
  const targetHeight: Record<string, number> = {
    "360p": 360, "720p": 720, "1080p": 1080, "4k": 2160,
  };
  const target = targetHeight[quality] || 720;

  // Try each client in order
  for (const client of CLIENTS) {
    const url = await tryInnertubeClient(videoId, client, target);
    if (url) return url;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { url, quality = "720p", title = "" } = await req.json();

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cost = TOKEN_COST[quality] || 1;
    const { data: profile } = await supabase
      .from("profiles").select("tokens").eq("user_id", user.id).single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.tokens < cost) {
      return new Response(
        JSON.stringify({ error: `Not enough tokens. ${quality} needs ${cost}, you have ${profile.tokens}.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Download: video=${videoId} quality=${quality}`);
    const downloadUrl = await getDownloadUrl(videoId, quality);

    if (!downloadUrl) {
      return new Response(
        JSON.stringify({ error: "Could not get download link. Try a different quality or try again later." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct tokens and log download
    await supabase.from("profiles").update({ tokens: profile.tokens - cost }).eq("user_id", user.id);
    await supabase.from("downloads").insert({
      user_id: user.id, video_url: url, video_title: title || "Untitled", quality,
    });

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
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
