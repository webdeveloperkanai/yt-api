import youtubedl from 'youtube-dl-exec';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
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
