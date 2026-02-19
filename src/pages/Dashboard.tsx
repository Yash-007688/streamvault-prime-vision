import { motion } from "framer-motion";
import { Search, Download, Coins, Info, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOKEN_COST: Record<string, number> = {
  "360p": 1,
  "720p": 2,
  "1080p": 3,
  "4k": 4,
};

const QUALITY_OPTIONS = ["360p", "720p", "1080p", "4k"] as const;

const Dashboard = () => {
  const { profile, session, refreshProfile } = useAuth();
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<null | {
    title: string;
    thumbnail: string | null;
    videoId: string | null;
    author: string;
  }>(null);
  const [quality, setQuality] = useState("720p");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const tokens = profile?.tokens ?? 0;

  const handleSearch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setVideoInfo(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-video-info", {
        body: { url },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setVideoInfo(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to fetch video info";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo || !session) return;
    const cost = TOKEN_COST[quality] || 1;
    if (tokens < cost) {
      toast.error(`Not enough tokens! ${quality} requires ${cost} token(s).`);
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("download-video", {
        body: { url, quality, title: videoInfo.title },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.downloadUrl) {
        // Fetch the file as a blob to force a real download
        try {
          const response = await fetch(data.downloadUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `${videoInfo.title || "video"}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        } catch {
          // Fallback: open in new tab
          const link = document.createElement("a");
          link.href = data.downloadUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.setAttribute("download", `${videoInfo.title || "video"}.mp4`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        toast.success(`Download started! ${data.tokenCost} token(s) used. ${data.tokensRemaining} remaining.`);
        refreshProfile();
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Download failed";
      setError(message);
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  const currentCost = TOKEN_COST[quality] || 1;

  return (
    <div className="animated-gradient-bg min-h-screen pt-28 pb-20 px-6">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Token bar */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-foreground">Download Video</h1>
            <div className="flex items-center gap-2 glass-card px-4 py-2">
              <Coins className="h-4 w-4 text-accent" />
              <span className="font-semibold text-foreground">{tokens}</span>
              <span className="text-sm text-muted-foreground">tokens left</span>
            </div>
          </div>

          {/* URL Input */}
          <div className="glass-card p-6 mb-6">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              YouTube URL
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium text-sm transition-all hover:shadow-[0_0_20px_hsl(var(--glow-primary))] disabled:opacity-50 flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="glass-card p-4 mb-6 border border-destructive/30 flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Video Preview */}
          {videoInfo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 mb-6"
            >
              <div className="flex gap-6">
                <div className="w-48 h-28 rounded-lg bg-secondary/50 flex-shrink-0 overflow-hidden">
                  {videoInfo.thumbnail && (
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{videoInfo.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{videoInfo.author}</p>

                  {/* Quality Select */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm text-muted-foreground">Quality:</span>
                    {QUALITY_OPTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          quality === q
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {q} ({TOKEN_COST[q]}t)
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={downloading || tokens < currentCost}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-[0_0_20px_hsl(var(--glow-primary))] disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {downloading ? "Processing..." : `Download (${quality}) — ${currentCost} token${currentCost > 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Info */}
          <div className="glass-card p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Token cost: 360p = 1, 720p = 2, 1080p = 3, 4K = 4. Tokens never expire. Visit the{" "}
              <a href="/pricing" className="text-primary hover:underline">pricing page</a> to purchase more.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
