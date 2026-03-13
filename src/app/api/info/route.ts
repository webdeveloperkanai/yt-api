import youtubedl from 'youtube-dl-exec';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const cookiesPath = path.join(process.cwd(), 'cookies.txt');
  const hasCookies = fs.existsSync(cookiesPath);

  // Use correct referer based on URL
  const isFacebook = url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch');
  const referer = isFacebook ? 'https://www.facebook.com/' : 'https://www.youtube.com/';

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      ...(hasCookies ? { cookies: cookiesPath } : {}),
      addHeader: [
        `referer:${referer}`,
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      ]
    });

    const resolutions = [360, 480, 720, 1080];
    const formattedLinks = {
      video: resolutions.map(res => ({
        quality: `${res}p`,
        stream: `/api/stream?url=${encodeURIComponent(url)}&res=${res}`,
        download: `/api/download?url=${encodeURIComponent(url)}&res=${res}`
      })),
      audio: {
        stream: `/api/stream?url=${encodeURIComponent(url)}&type=audio`,
        download: `/api/download?url=${encodeURIComponent(url)}&type=audio`
      }
    };

    return NextResponse.json({
      ...(info as any),
      formattedLinks
    });
  } catch (err: any) {
    console.error('yt-dlp error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch info' }, { status: 500 });
  }
}
