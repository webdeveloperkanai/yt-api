# 🎬 Universal Media Downloader

A sleek, modern web app built with **Next.js** that lets you download video and audio from YouTube, TikTok, Facebook, and hundreds of other platforms — powered by `yt-dlp` under the hood.

---

## ✨ Features

- **Paste & Fetch** — Paste any video URL to instantly retrieve title, thumbnail, duration, and platform info.
- **Facebook Photo Extraction** — Extract all photos from a Facebook post (album or single) and download them individually.
- **Admin Console** — Manage `cookies.txt` and view live download/streaming logs via a password-protected dashboard (`/admin`).
- **Photo Proxy/Stream** — Stream Facebook photos through the server to bypass CORS, perfect for use in external editor apps.
- **Download Video** — Downloads the best available MP4 quality.
- **Download Audio** — Extracts and downloads audio as MP3 at the highest bitrate.
- **Multi-platform support** — YouTube, TikTok, Facebook, and [1000+ sites supported by yt-dlp](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).
- **Animated UI** — Smooth transitions with Framer Motion and a glassmorphism dark theme.

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
Fetches metadata for a given URL. Supports `cookies.txt` for gated content.

---

### `GET /api/download`
Streams media directly to the browser as a download. Logs activity to Admin Console.

---

### `GET /api/facebook/photos`
Extracts photo URLs from a Facebook post.
- **Param:** `url` (Facebook post URL)
- **Response:** List of photo objects with individual `streamUrl` and `downloadUrl`.

---

### `GET /api/photo/stream`
Proxies any image URL to bypass CORS or force a download.
- **Params:** 
    - `url`: The encoded image URL.
    - `download`: Set to `1` to force a file download.
- **Usage:** `<img src="/api/photo/stream?url=...">`

---

### `GET /api/search`
Searches YouTube or Facebook and returns video results without needing an API key.

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

### `GET /api/admin/logs`
(Protected) Returns the last 200 download/stream activity logs.

---

### `POST /api/admin/cookie`
(Protected) Updates the `cookies.txt` file in the project root.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **yt-dlp** and **FFmpeg** installed on your system.

### Installation
1. Clone the repo and run `npm install`.
2. Create a `.env` file:
   ```env
   ADMIN_PASSWORD=your_secure_password
   ```
3. (Optional) Go to `/admin` using your password to set up `cookies.txt` for Facebook/Age-restricted content.

### Development
```bash
npm run dev
```

---

## 📁 Project Structure

```
yt-dl/
├── src/
│   ├── app/
│   │   ├── admin/             # Admin Dashboard UI
│   │   ├── api/
│   │   │   ├── admin/         # Cookie & Log management
│   │   │   ├── facebook/      # FB photo extraction
│   │   │   ├── photo/stream/  # Image proxy/CORS bypass
│   │   │   ├── download/route.ts   # Stream media as file download
│   │   │   ├── info/route.ts       # Fetch video metadata
│   │   │   ├── links/route.ts      # List all available format links
│   │   │   ├── search/route.ts     # YouTube & Facebook search (no API key)
│   │   │   └── stream/route.ts     # Proxy stream for in-browser playback
│   │   ├── globals.css             # Global styles & Tailwind config
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx           # Main Downloader UI
│   └── lib/
│       ├── logger.ts          # Shared log buffer logic
│       └── utils.ts           # UI utilities
├── cookies.txt                # Managed via Admin Console
├── .env                       # Secrets (ADMIN_PASSWORD)
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## ⚠️ Legal Disclaimer
For personal use only. Respect platform terms of service and copyright laws.
