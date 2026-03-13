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

### 🎥 Media Info & Discovery

#### `GET /api/info`
Fetches basic metadata (title, thumbnail, duration) for any supported URL.
- **Param:** `url` (Page URL)

#### `GET /api/links`
Returns a cleaned-up list of direct MP4 and MP3 download links categorized by quality/bitrate.
- **Param:** `url` (Page URL)

#### `GET /api/raw`
Returns the complete raw format data from `yt-dlp`, including every available stream URL.
- **Param:** `url` (Page URL)

#### `GET /api/search`
Searches YouTube or Facebook videos without needing an API key.
- **Params:** 
    - `q`: Search query string.
    - `limit`: Number of results (default `10`).
    - `platform`: `youtube` (default) or `facebook`.

---

### 📥 Downloading & Streaming

#### `GET /api/download`
Streams media directly to the browser as a forced file download.
- **Params:** 
    - `url`: Media page URL.
    - `type`: `video` (MP4) or `audio` (MP3).

#### `GET /api/stream`
Proxies media through the server for **in-browser playback** (bypasses CORS/encryption).
- **Params:** 
    - `url`: Media page URL.
    - `type`: `video` or `audio`.
- **Usage:** `<video src="/api/stream?url=...">`

#### `GET /api/photo/stream`
Proxies image URLs to bypass CORS or force a download.
- **Params:** 
    - `url`: Encoded image URL.
    - `download`: Set to `1` to force download.

---

### 👥 Facebook Specific

#### `GET /api/fb/photo` (NEW ✨)
Robustly extracts the main high-resolution photo from a Facebook post using an automated browser (Playwright).
- **Param:** `url` (Facebook share/post URL)
- **Wait Time:** ~4 seconds to ensure dynamic content loads.

#### `GET /api/facebook/photos`
Extracts all photo URLs found in a Facebook album or post using lightweight scraping.
- **Param:** `url` (Facebook post URL)
- **Response:** List of photo objects with stream/download proxy URLs.

---

### 🛠️ Admin & Management

#### `GET /api/admin/logs`
(Protected) Returns a JSON array of the latest download and streaming activity logs.

#### `POST /api/admin/cookie`
(Protected) Updates the `cookies.txt` file on the server. Used for accessing private/age-restricted content.

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
│   │   │   ├── fb/            # Robust FB photo extraction (Playwright)
│   │   │   ├── photo/stream/  # Image proxy/CORS bypass
│   │   │   ├── download/route.ts   # Stream media as file download
│   │   │   ├── info/route.ts       # Fetch video metadata
│   │   │   ├── links/route.ts      # List all available format links
│   │   │   ├── raw/route.ts        # Raw yt-dlp format data
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
