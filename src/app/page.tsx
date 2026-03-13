"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Youtube, Facebook, Music, Video, Loader2, Sparkles,
  AlertCircle, Search, X, Play, Image as ImageIcon, Settings,
  ExternalLink, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── TikTok icon ─────────────────────────────────────────────────────────────
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

// ─── Types ───────────────────────────────────────────────────────────────────
type AppMode = "download" | "search";
type Platform = "youtube" | "facebook";

interface SearchResult {
  id: string;
  url: string;
  streamUrl: string;
  title: string;
  thumbnails: { url: string }[];
  duration: number | null;
  view_count: number | null;
  channel: { id: string | null; name: string | null; url: string | null };
  platform: Platform;
}

interface PhotoItem {
  id: string;
  url: string;
  width?: number;
  height?: number;
  streamUrl: string;
  downloadUrl: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDuration(secs: number | null) {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(n: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

function isFacebookUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname.includes("facebook.com") || hostname.includes("fb.com") || hostname.includes("fb.watch");
  } catch { return false; }
}

// ─── Photo Gallery Modal ──────────────────────────────────────────────────────
function PhotoGalleryModal({ photos, title, onClose }: { photos: PhotoItem[]; title?: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: "spring", bounce: 0.3 }}
        className="relative w-full max-w-4xl bg-[#0a0a0f] rounded-2xl overflow-hidden border border-white/10 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Photo Gallery</h3>
              {title && <p className="text-gray-500 text-xs line-clamp-1">{title}</p>}
            </div>
            <span className="ml-2 text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{photos.length} photos</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Photo grid */}
        <div className="overflow-y-auto p-4 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="relative group rounded-xl overflow-hidden bg-white/5 border border-white/5 aspect-square"
              >
                <img
                  src={photo.streamUrl}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    // fallback to direct url on proxy error
                    (e.target as HTMLImageElement).src = photo.url;
                  }}
                />
                {/* Hover overlay with copy & download */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-2">
                  <a
                    href={photo.downloadUrl}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors w-full justify-center"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(photo.streamUrl);
                    }}
                    className="flex items-center gap-1.5 bg-white/10 text-white text-xs font-medium rounded-lg px-3 py-2 hover:bg-white/20 transition-colors w-full justify-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Copy Stream URL
                  </button>
                </div>
                {/* Index badge */}
                <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                  #{i + 1}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <p className="text-xs text-gray-500">
            💡 <strong className="text-gray-400">Editor tip:</strong> Use{" "}
            <code className="bg-white/5 px-1 py-0.5 rounded text-cyan-400">/api/photo/stream?url={"<encoded-url>"}</code>{" "}
            to embed any photo in your editor without CORS issues.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Video Player Modal ───────────────────────────────────────────────────────
function VideoPlayerModal({ result, onClose }: { result: SearchResult; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", bounce: 0.3 }}
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
        <video ref={useRef<HTMLVideoElement>(null)} src={result.streamUrl} controls autoPlay className="w-full aspect-video bg-black" style={{ maxHeight: "70vh" }} />
        <div className="p-4 border-t border-white/10">
          <h3 className="text-white font-semibold line-clamp-2 text-sm md:text-base mb-1">{result.title}</h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {result.platform === "youtube" ? (
              <span className="flex items-center gap-1"><Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube</span>
            ) : (
              <span className="flex items-center gap-1"><Facebook className="w-3.5 h-3.5 text-blue-500" /> Facebook</span>
            )}
            {result.channel?.name && <span>{result.channel.name}</span>}
            {formatViews(result.view_count) && <span>{formatViews(result.view_count)}</span>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Search Result Card ───────────────────────────────────────────────────────
function ResultCard({ result, onPlay }: { result: SearchResult; onPlay: () => void }) {
  const thumb = result.thumbnails?.[0]?.url;
  const duration = formatDuration(result.duration);
  const views = formatViews(result.view_count);

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform duration-300" onClick={onPlay}>
      <div className="relative aspect-video bg-white/5 overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={result.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Video className="w-10 h-10 text-white/20" /></div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30"><Play className="w-7 h-7 text-white fill-white" /></div>
        </div>
        {duration && <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">{duration}</span>}
        <span className={cn("absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", result.platform === "youtube" ? "bg-red-600/90 text-white" : "bg-blue-600/90 text-white")}>
          {result.platform === "youtube" ? "YT" : "FB"}
        </span>
      </div>
      <div className="p-3">
        <p className="text-white text-sm font-medium line-clamp-2 leading-snug mb-2">{result.title}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="truncate max-w-[70%]">{result.channel?.name || "—"}</span>
          {views && <span>{views}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  // Download state
  const [url, setUrl] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<"video" | "audio" | null>(null);

  // Facebook photo state
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photoData, setPhotoData] = useState<{ photos: PhotoItem[]; title?: string } | null>(null);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // Search state
  const [mode, setMode] = useState<AppMode>("download");
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [playingResult, setPlayingResult] = useState<SearchResult | null>(null);

  const isFB = isFacebookUrl(url);

  // ── Download helpers ──────────────────────────────────────────────────────
  const formatUrl = (rawUrl: string) => {
    try {
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.hostname.includes("youtube.com") || parsedUrl.hostname.includes("youtu.be")) {
        parsedUrl.searchParams.forEach((_, key) => {
          if (key !== "v" && key !== "list") parsedUrl.searchParams.delete(key);
        });
      }
      return parsedUrl.toString();
    } catch { return rawUrl; }
  };

  const handleFetchInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoadingInfo(true);
    setDownloadError("");
    setVideoInfo(null);
    setPhotoData(null);
    setPhotoError("");
    const cleanedUrl = formatUrl(url.trim());
    setUrl(cleanedUrl);
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(cleanedUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch video info");
      setVideoInfo(data);
    } catch (err: any) {
      setDownloadError(err.message);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleFetchPhotos = async () => {
    if (!url) return;
    setLoadingPhotos(true);
    setPhotoError("");
    setPhotoData(null);
    try {
      const res = await fetch(`/api/facebook/photos?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to extract photos");
      if (data.photoCount === 0) throw new Error("No photos found in this post. It may be a video-only post.");
      setPhotoData({ photos: data.photosWithStream, title: data.title });
      setShowPhotoGallery(true);
    } catch (err: any) {
      setPhotoError(err.message);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleDownload = async (type: "video" | "audio") => {
    if (!url) return;
    setDownloadingFormat(type);
    try {
      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&type=${type}`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = videoInfo?.title ? `${videoInfo.title.substring(0, 30)}.${type === "audio" ? "mp3" : "mp4"}` : "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setDownloadError(err.message);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 1500);
    }
  };

  // ── Search helper ─────────────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    setResults([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}&limit=12&platform=${platform}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Search failed");
      setResults(data.results || []);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center p-4 sm:p-8 pt-12">
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none" />

      {/* Admin link */}
      <a
        href="/admin"
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors glass border border-white/10 px-3 py-1.5 rounded-full"
      >
        <Settings className="w-3.5 h-3.5" /> Admin
      </a>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm font-medium text-cyan-300 border-white/10">
            <Sparkles className="w-4 h-4" />
            <span>Universal Media Downloader</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
            Download <span className="text-gradient">Anything.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto">
            Search and download video & audio from YouTube, Facebook, TikTok, and hundreds more.
          </p>
        </motion.div>

        {/* Mode tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-1 p-1.5 rounded-2xl glass border border-white/10 mb-8"
        >
          {(["download", "search"] as AppMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn("px-6 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-300", mode === m ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white")}
            >
              {m === "download" ? "⬇ Download" : "🔍 Search"}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── DOWNLOAD MODE ── */}
          {mode === "download" && (
            <motion.div key="download" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} className="w-full">
              <form onSubmit={handleFetchInfo} className="w-full relative group">
                <div className={cn(
                  "absolute -inset-1 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000",
                  isFB ? "bg-gradient-to-r from-blue-600 to-cyan-500" : "bg-gradient-to-r from-purple-600 to-cyan-600"
                )} />
                <div className="relative flex items-center bg-black rounded-2xl border border-white/10 p-2 shadow-2xl">
                  {isFB && <Facebook className="w-5 h-5 text-blue-400 ml-4 flex-shrink-0" />}
                  <input
                    type="text"
                    placeholder="Paste video or post link here (YouTube, Facebook, TikTok...)"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setVideoInfo(null); setPhotoData(null); setDownloadError(""); setPhotoError(""); }}
                    className="w-full bg-transparent text-white px-6 py-4 outline-none placeholder:text-gray-500 text-lg"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={loadingInfo || !url.trim()}
                    className="ml-2 bg-white text-black font-semibold rounded-xl px-8 py-4 flex items-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loadingInfo ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Download className="w-5 h-5" /><span>Fetch</span></>}
                  </button>
                </div>
              </form>

              {/* Facebook quick action buttons */}
              <AnimatePresence>
                {isFB && url && !videoInfo && !loadingInfo && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="w-full mt-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={handleFetchPhotos}
                        disabled={loadingPhotos}
                        className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
                      >
                        {loadingPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        {loadingPhotos ? "Extracting photos..." : "📷 Get Post Photos"}
                      </button>
                      <span className="text-gray-600 text-xs">or click Fetch for video download</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Errors */}
              <AnimatePresence>
                {(downloadError || photoError) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="w-full mt-6">
                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{downloadError || photoError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Video info card */}
              <AnimatePresence>
                {videoInfo && !downloadError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                    className="w-full mt-8"
                  >
                    <div className="glass-card p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3 aspect-video relative rounded-xl overflow-hidden group">
                          <img src={videoInfo.thumbnail} alt={videoInfo.title} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-full"><Video className="w-6 h-6 text-white" /></div>
                          </div>
                          {/* Platform badge */}
                          {isFB && (
                            <span className="absolute top-2 left-2 bg-blue-600/90 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                              <Facebook className="w-3 h-3" /> Facebook
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="line-clamp-2 text-xl font-bold text-white mb-2">{videoInfo.title}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-400 mb-6">
                              <span className="bg-white/5 py-1 px-3 rounded-full border border-white/5">{videoInfo.extractor_key}</span>
                              <span>{videoInfo.duration_string || `${videoInfo.duration}s`}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handleDownload("video")} disabled={downloadingFormat !== null} className="relative overflow-hidden group glass border-white/10 hover:border-cyan-500/50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:-translate-y-1">
                              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                              {downloadingFormat === "video" ? <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /> : <Video className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />}
                              <span className="font-medium text-sm text-gray-200">{downloadingFormat === "video" ? "Preparing..." : "Download Video"}</span>
                              <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">MP4 720p HD</span>
                            </button>
                            <button onClick={() => handleDownload("audio")} disabled={downloadingFormat !== null} className="relative overflow-hidden group glass border-white/10 hover:border-purple-500/50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:-translate-y-1">
                              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                              {downloadingFormat === "audio" ? <Loader2 className="w-6 h-6 text-purple-400 animate-spin" /> : <Music className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />}
                              <span className="font-medium text-sm text-gray-200">{downloadingFormat === "audio" ? "Preparing..." : "Download Audio"}</span>
                              <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">MP3 320kbps</span>
                            </button>
                          </div>
                          {/* Additional FB photo button after fetching info */}
                          {isFB && (
                            <button
                              onClick={handleFetchPhotos}
                              disabled={loadingPhotos}
                              className="mt-3 flex items-center justify-center gap-2 bg-blue-600/15 border border-blue-500/25 text-blue-400 hover:bg-blue-600/25 rounded-xl px-4 py-3 text-sm font-semibold transition-all w-full"
                            >
                              {loadingPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                              {loadingPhotos ? "Extracting photos..." : "📷 Also Get Post Photos"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── SEARCH MODE ── */}
          {mode === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} className="w-full">
              {/* Platform selector */}
              <div className="flex items-center justify-center gap-3 mb-6">
                {(["youtube", "facebook"] as Platform[]).map((p) => (
                  <button key={p} onClick={() => { setPlatform(p); setResults([]); setSearchError(""); }}
                    className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border",
                      platform === p
                        ? p === "youtube" ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20" : "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                        : "glass border-white/10 text-gray-400 hover:text-white"
                    )}
                  >
                    {p === "youtube" ? <Youtube className="w-4 h-4" /> : <Facebook className="w-4 h-4" />}
                    {p === "youtube" ? "YouTube" : "Facebook"}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <form onSubmit={handleSearch} className="w-full relative group mb-8">
                <div className={cn("absolute -inset-1 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000", platform === "youtube" ? "bg-gradient-to-r from-red-600 to-orange-500" : "bg-gradient-to-r from-blue-600 to-cyan-500")} />
                <div className="relative flex items-center bg-black rounded-2xl border border-white/10 p-2 shadow-2xl">
                  <Search className="w-5 h-5 text-gray-500 ml-4 flex-shrink-0" />
                  <input type="text" placeholder={`Search ${platform === "youtube" ? "YouTube" : "Facebook"} videos...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent text-white px-4 py-4 outline-none placeholder:text-gray-500 text-lg" autoComplete="off" />
                  {searchQuery && <button type="button" onClick={() => { setSearchQuery(""); setResults([]); }} className="p-2 text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>}
                  <button type="submit" disabled={searching || !searchQuery.trim()} className="ml-2 bg-white text-black font-semibold rounded-xl px-8 py-4 flex items-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]">
                    {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /><span>Search</span></>}
                  </button>
                </div>
              </form>

              {/* Search error */}
              <AnimatePresence>
                {searchError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="w-full mb-6">
                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{searchError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading skeleton */}
              {searching && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass-card overflow-hidden animate-pulse">
                      <div className="aspect-video bg-white/5" />
                      <div className="p-3 space-y-2"><div className="h-3 bg-white/5 rounded-full w-full" /><div className="h-3 bg-white/5 rounded-full w-2/3" /></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results grid */}
              {!searching && results.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((r) => <ResultCard key={r.id} result={r} onPlay={() => setPlayingResult(r)} />)}
                </motion.div>
              )}

              {/* Empty state */}
              {!searching && results.length === 0 && !searchError && searchQuery && (
                <div className="text-center text-gray-500 py-20">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No results found. Try a different query.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.03] pointer-events-none" />

      {/* Video player modal */}
      <AnimatePresence>
        {playingResult && <VideoPlayerModal result={playingResult} onClose={() => setPlayingResult(null)} />}
      </AnimatePresence>

      {/* Photo gallery modal */}
      <AnimatePresence>
        {showPhotoGallery && photoData && (
          <PhotoGalleryModal
            photos={photoData.photos}
            title={photoData.title}
            onClose={() => setShowPhotoGallery(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
