import { motion } from "framer-motion";
import { Search, Download, Info, AlertCircle, Image as ImageIcon, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

const QUALITY_OPTIONS = ["360p", "720p", "1080p", "4k"] as const;
const FORMAT_OPTIONS = ["mp4", "mp3", "mkv"] as const;

const Dashboard = () => {
  const { refreshProfile } = useAuth();
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<null | {
    title: string;
    thumbnail: string | null;
    videoId: string | null;
    author: string;
    channel?: string;
  }>(null);
  const [quality, setQuality] = useState("720p");
  const [format, setFormat] = useState("mp4");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (overrideUrl?: string | React.MouseEvent) => {
    const searchUrl = typeof overrideUrl === 'string' ? overrideUrl : url;
    if (!searchUrl.trim()) return;
    setLoading(true);
    setError("");
    setVideoInfo(null);

    try {
      // Use Vercel API Route
      const response = await fetch("/api/video-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: searchUrl }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to fetch video info");
      
      setVideoInfo(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to fetch video info";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedUrl = e.clipboardData.getData("text");
    if (pastedUrl && pastedUrl.trim()) {
      // Small delay to ensure state update doesn't conflict, though we pass it directly
      setTimeout(() => handleSearch(pastedUrl), 0);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo) return;
    
    // In no-backend mode, we skip token checks or just assume success
    // The useAuth hook provides infinite tokens for guest

    setDownloading(true);
    setError("");

    try {
      // No-backend mode: bypass auth check
      const response = await fetch("/api/video-download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, quality, format, title: videoInfo.title }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Download failed");

      if (data?.downloadUrl) {
        // Fetch the file as a blob to force a real download
        try {
          const response = await fetch(data.downloadUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `${videoInfo.title || "video"}.${format}`;
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
          link.setAttribute("download", `${videoInfo.title || "video"}.${format}`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        toast.success(`Download started!`);
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

  const handleDownloadThumbnail = async () => {
    if (!videoInfo?.thumbnail) return;
    
    try {
      const response = await fetch(videoInfo.thumbnail);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${videoInfo.title || "thumbnail"}_thumbnail.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      toast.success("Thumbnail downloaded!");
    } catch {
      // Fallback: open in new tab
      window.open(videoInfo.thumbnail, '_blank');
    }
  };

  return (
    <div className="animated-gradient-bg min-h-screen pt-28 pb-20 px-6">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Token bar - REMOVED */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-foreground">Download Video</h1>
            <div className="flex items-center gap-2 glass-card px-4 py-2">
              <span className="font-semibold text-foreground">Free Forever</span>
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
                onPaste={handlePaste}
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
            <div className="glass-card p-4 mb-6 border border-destructive/30 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive font-medium">Download failed</p>
              </div>
              <p className="text-xs text-muted-foreground">
                The server might be busy or updating. Please try again in a few seconds.
              </p>
              <details className="text-xs text-destructive/80 font-mono bg-destructive/5 p-2 rounded cursor-pointer">
                <summary className="mb-1 hover:underline">Show technical details</summary>
                {error}
              </details>
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
                  <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={videoInfo.channel || ""} alt={videoInfo.channel || videoInfo.author} />
                      <AvatarFallback>
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground/80">{videoInfo.channel || videoInfo.author}</span>
                  </div>

                  {/* Format Select */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm text-muted-foreground">Format:</span>
                    {FORMAT_OPTIONS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          format === f
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Quality Select */}
                  {format !== 'mp3' && (
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
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:shadow-[0_0_20px_hsl(var(--glow-primary))] disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {downloading ? "Processing..." : `Download (${quality})`}
                    </button>

                    <button
                      onClick={handleDownloadThumbnail}
                      className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Thumbnail
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Info */}
          <div className="glass-card p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              StreamVault is completely free. Download as many videos as you want in any quality.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
