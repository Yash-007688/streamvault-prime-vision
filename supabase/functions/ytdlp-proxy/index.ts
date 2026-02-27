import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const YTDLP_API_URL = Deno.env.get("YTDLP_API_URL");
  if (!YTDLP_API_URL) {
    return new Response(
      JSON.stringify({ error: "YTDLP_API_URL not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { action, url, quality, format, title } = body;

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route to the correct Render endpoint
    let endpoint: string;
    let payload: Record<string, unknown>;

    if (action === "info") {
      endpoint = `${YTDLP_API_URL}/video-info`;
      payload = { url };
    } else if (action === "download") {
      endpoint = `${YTDLP_API_URL}/video-download`;
      payload = { url, quality: quality || "720p", format: format || "mp4", title };
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'info' or 'download'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward request to Render yt-dlp API
    const apiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await apiResponse.json();

    return new Response(JSON.stringify(data), {
      status: apiResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ytdlp-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Proxy request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
