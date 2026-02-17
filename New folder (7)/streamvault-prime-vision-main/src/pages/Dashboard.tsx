import { motion } from "framer-motion";
import { Search, Download, Coins, Info, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const { profile, session } = useAuth();
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<null | {
    title: string;
    thumbnail: string;
    videoId: string;
    author: string;
  }>(null);
  const [quality, setQuality] = useState("720p");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const tokens = profile?.tokens ?? 0;

  const getFunctionErrorMessage = async (fnError: any) => {
    try {
      const context = fnError?.context as { json?: () => Promise<any> } | undefined;
      if (context?.json) {
        const payload = await context.json();
        if (payload?.error) return payload.error;
      }
    } catch {
      // Fall through to generic error text if context parsing fails.
    }
    return fnError?.message || "Request failed";
  };

  const handleSearch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setVideoInfo(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-video-info", {
        body: { url },
      });

      if (fnError) throw new Error(await getFunctionErrorMessage(fnError));
      if (data?.error) throw new Error(data.error);

      setVideoInfo(data);
    } catch (e: any) {
      setError(e.message || "Failed to fetch video info");
      toast.error(e.message || "Failed to fetch video info");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo || !session) return;
    if (tokens < 1) {
      toast.error("Not enough tokens!");
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("download-video", {
        body: { url, quality, title: videoInfo.title },
      });

      if (fnError) throw new Error(await getFunctionErrorMessage(fnError));
      if (data?.error) throw new Error(data.error);

      if (data?.downloadUrl) {
        // Open download URL in new tab to trigger browser download
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download started! Check your browser downloads.");
      }
    } catch (e: any) {
      setError(e.message || "Download failed");
      toast.error(e.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

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
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{videoInfo.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{videoInfo.author}</p>

                  {/* Quality Select */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm text-muted-foreground">Quality:</span>
                    {["360p", "720p", "1080p"].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          quality === q
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={downloading || tokens < 1}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-[0_0_20px_hsl(var(--glow-primary))] disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {downloading ? "Processing..." : `Download (${quality}) — 1 token`}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Info */}
          <div className="glass-card p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Each download costs 1 token. Tokens never expire. If you run out, visit the{" "}
              <a href="/pricing" className="text-primary hover:underline">pricing page</a> to purchase more.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
