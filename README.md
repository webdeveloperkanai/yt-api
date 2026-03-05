# 🎬 Universal Media Downloader

A sleek, modern web app built with **Next.js** that lets you download video and audio from YouTube, TikTok, Facebook, and hundreds of other platforms — powered by `yt-dlp` under the hood.

---

## ✨ Features

- **Paste & Fetch** — Paste any video URL to instantly retrieve title, thumbnail, duration, and platform info
- **Download Video** — Downloads the best available MP4 quality
- **Download Audio** — Extracts and downloads audio as MP3 at the highest bitrate
- **Multi-platform support** — YouTube, TikTok, Facebook, and [1000+ sites supported by yt-dlp](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
- **URL Cleanup** — Automatically strips tracking parameters from YouTube links
- **Animated UI** — Smooth transitions with Framer Motion and a glassmorphism dark theme

---

## 🧱 Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | [Next.js 16](https://nextjs.org)    |
| Language     | TypeScript                          |
| Styling      | Tailwind CSS v4                     |
| Animations   | Framer Motion                       |
| Icons        | Lucide React                        |
| Downloader   | [youtube-dl-exec](https://github.com/nicholasgasior/youtube-dl-exec) (wraps `yt-dlp`) |

---

## 📡 API Endpoints

All API routes live under `/api/` and are Next.js Route Handlers.

### `GET /api/info`
Fetches metadata for a given URL.

| Param | Type   | Description        |
|-------|--------|--------------------|
| `url` | string | The media page URL |

**Response:** Full `yt-dlp` JSON output (title, thumbnail, duration, formats, etc.)

---

### `GET /api/download`
Streams media directly to the browser as a download.

| Param  | Type   | Description                      |
|--------|--------|----------------------------------|
| `url`  | string | The media page URL               |
| `type` | string | `video` (MP4) or `audio` (MP3)   |

- `audio` → MP3, best bitrate
- `video` → MP4, best quality

---

### `GET /api/links`
Returns a cleaned list of all available direct download links grouped by type.

| Param | Type   | Description        |
|-------|--------|--------------------|
| `url` | string | The media page URL |

**Response:**
```json
{
  "success": true,
  "metadata": { "title": "...", "thumbnail": "...", "duration": 123, "platform": "Youtube" },
  "availableFormats": {
    "videos": [{ "quality": "1080p", "resolution": "1920x1080", "fps": 30, "size": "45.2 MB", "url": "..." }],
    "audios": [{ "quality": "128 kbps", "ext": "webm", "size": "3.1 MB", "url": "..." }]
  }
}
```

---

### `GET /api/search`
Searches YouTube **or Facebook** and returns video results without needing an API key.

| Param      | Type   | Default     | Description                               |
|------------|--------|-------------|-------------------------------------------|
| `q`        | string | —           | Search query                              |
| `limit`    | number | `10`        | Number of results to return               |
| `platform` | string | `youtube`   | Platform to search: `youtube` or `facebook` |

**Response:**
```json
{
  "success": true,
  "query": "lofi music",
  "count": 10,
  "results": [
    {
      "id": "abc123",
      "url": "https://www.youtube.com/watch?v=abc123",
      "streamUrl": "/api/stream?url=https%3A%2F%2F...",
      "title": "Lofi Hip Hop Radio",
      "thumbnails": [{ "url": "..." }],
      "duration": 3600,
      "view_count": 1000000,
      "channel": { "id": "...", "name": "Lofi Girl", "url": "..." },
      "platform": "youtube"
    }
  ]
}
```

> Each result includes a `streamUrl` that can be used directly as the `src` in a `<video>` or `<audio>` element for in-browser playback.

---

### `GET /api/stream`
Proxies media from any supported platform through the server for **in-browser playback** (no forced download).

| Param  | Type   | Default  | Description                       |
|--------|--------|----------|-----------------------------------|
| `url`  | string | —        | The media page URL                |
| `type` | string | `video`  | `video` (MP4) or `audio` (MP3)    |

**Usage example:**
```html
<video controls src="/api/stream?url=https%3A%2F%2Fyoutube.com%2Fwatch%3Fv%3DXXX"></video>
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **yt-dlp** must be installed and accessible on your system PATH — [Download yt-dlp](https://github.com/yt-dlp/yt-dlp#installation)
- **FFmpeg** (required for audio extraction) — [Download FFmpeg](https://ffmpeg.org/download.html)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd yt-dl

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
yt-dl/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── download/route.ts   # Stream media as file download
│   │   │   ├── info/route.ts       # Fetch video metadata
│   │   │   ├── links/route.ts      # List all available format links
│   │   │   ├── search/route.ts     # YouTube & Facebook search (no API key)
│   │   │   └── stream/route.ts     # Proxy stream for in-browser playback
│   │   ├── globals.css             # Global styles & Tailwind config
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Main downloader UI
│   └── lib/
│       └── utils.ts                # Utility helpers (cn, etc.)
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## ⚠️ Legal Disclaimer

This tool is intended for **personal use only**. Downloading copyrighted content without permission may violate the terms of service of the respective platforms and applicable copyright laws. Use responsibly.
