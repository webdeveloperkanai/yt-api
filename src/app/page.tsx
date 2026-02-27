"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Youtube, Facebook, Music, Video, Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper components for Icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<"video" | "audio" | null>(null);

  const formatUrl = (rawUrl: string) => {
    try {
      const parsedUrl = new URL(rawUrl);

      // YouTube cleanup
      if (parsedUrl.hostname.includes("youtube.com") || parsedUrl.hostname.includes("youtu.be")) {
        // Remove tracking params but keep video 'v' or playlist 'list'
        const v = parsedUrl.searchParams.get("v");
        const list = parsedUrl.searchParams.get("list");

        parsedUrl.searchParams.forEach((_, key) => {
          if (key !== "v" && key !== "list") {
            parsedUrl.searchParams.delete(key);
          }
        });
      }

      return parsedUrl.toString();
    } catch {
      return rawUrl;
    }
  };

  const handleFetchInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setVideoInfo(null);

    const cleanedUrl = formatUrl(url.trim());
    setUrl(cleanedUrl);

    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(cleanedUrl)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch video info");
      }

      setVideoInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: "video" | "audio") => {
    if (!url) return;
    setDownloadingFormat(type);

    try {
      // Trigger download via anchor tag
      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&type=${type}`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      // Extract title for filename if possible, otherwise rely on headers
      a.download = videoInfo?.title ? `${videoInfo.title.substring(0, 30)}.${type === "audio" ? "mp3" : "mp4"}` : "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    } finally {
      // Small timeout to give visual feedback
      setTimeout(() => setDownloadingFormat(null), 1500);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none" />

      <div className="z-10 w-full max-w-3xl flex flex-col items-center">
        {/* Header section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm font-medium text-cyan-300 relative overflow-hidden group border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Sparkles className="w-4 h-4" />
            <span>Universal Media Downloader</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
            Download <span className="text-gradient">Anything.</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto">
            Extract high-quality video and audio from YouTube, TikTok, Facebook, and hundreds of other platforms in seconds.
          </p>

          <div className="flex items-center justify-center gap-6 mt-8 opacity-60">
            <Youtube className="w-8 h-8 hover:text-red-500 transition-colors duration-300" />
            <TikTokIcon className="w-7 h-7 hover:text-white transition-colors duration-300" />
            <Facebook className="w-7 h-7 hover:text-blue-500 transition-colors duration-300" />
            <span className="text-sm font-semibold tracking-wider uppercase ml-2">+ More</span>
          </div>
        </motion.div>

        {/* Form Section */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          onSubmit={handleFetchInfo}
          className="w-full relative group"
        >
          {/* Animated glow behind input */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

          <div className="relative flex items-center bg-black rounded-2xl border border-white/10 p-2 overflow-hidden shadow-2xl">
            <input
              type="text"
              placeholder="Paste video link here (e.g., https://youtube.com/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-transparent text-white px-6 py-4 outline-none placeholder:text-gray-500 text-lg"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="ml-2 bg-white text-black font-semibold rounded-xl px-8 py-4 flex items-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Download className="w-5 h-5 group-hover/btn:-translate-y-1 transition-transform" />
                  <span>Fetch</span>
                </>
              )}
            </button>
          </div>
        </motion.form>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="w-full mt-6"
            >
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {videoInfo && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
              className="w-full mt-8"
            >
              <div className="glass-card p-6 overflow-hidden relative">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Thumbnail */}
                  <div className="w-full md:w-1/3 aspect-video relative rounded-xl overflow-hidden group">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Info & Actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="line-clamp-2 text-xl font-bold text-white mb-2" title={videoInfo.title}>
                        {videoInfo.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-400 mb-6">
                        <span className="bg-white/5 py-1 px-3 rounded-full border border-white/5">
                          {videoInfo.extractor_key}
                        </span>
                        <span>{videoInfo.duration_string || `${videoInfo.duration}s`}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleDownload("video")}
                        disabled={downloadingFormat !== null}
                        className="relative overflow-hidden group glass border-white/10 hover:border-cyan-500/50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:-translate-y-1"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {downloadingFormat === "video" ? (
                          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                        ) : (
                          <Video className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="font-medium text-sm text-gray-200 group-hover:text-white transition-colors">
                          {downloadingFormat === "video" ? "Preparing..." : "Download Video"}
                        </span>
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full mt-1">MP4 High Quality</span>
                      </button>

                      <button
                        onClick={() => handleDownload("audio")}
                        disabled={downloadingFormat !== null}
                        className="relative overflow-hidden group glass border-white/10 hover:border-purple-500/50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:-translate-y-1"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {downloadingFormat === "audio" ? (
                          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                        ) : (
                          <Music className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="font-medium text-sm text-gray-200 group-hover:text-white transition-colors">
                          {downloadingFormat === "audio" ? "Preparing..." : "Download Audio"}
                        </span>
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full mt-1">MP3 320kbps</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative grids */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.03] pointer-events-none" />
    </main>
  );
}
