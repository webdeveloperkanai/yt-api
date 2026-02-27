import youtubedl from 'youtube-dl-exec';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const rawInfo = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            // We want to fetch all available formats to pick the best links
        });

        // Clean up to return simple, direct links
        const info: any = rawInfo;

        // Group Video Formats (filter out audio-only and non-mp4s if possible to keep it clean)
        const rawVideoFormats = info.formats?.filter((f: any) => f.vcodec !== 'none' && f.ext === 'mp4') || [];

        const videos = rawVideoFormats.map((f: any) => ({
            quality: f.format_note || `${f.height}p`,
            resolution: `${f.width}x${f.height}`,
            fps: f.fps,
            size: f.filesize ? `${(f.filesize / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
            url: f.url
        })).filter((v: any, index: number, self: any[]) =>
            // Deduplicate by resolution to avoid clutter
            index === self.findIndex((t) => (t.resolution === v.resolution))
        ).sort((a: any, b: any) => parseInt(b.quality) - parseInt(a.quality)); // Sort Highest to Lowest

        // Group Audio Formats (audio only)
        const rawAudioFormats = info.formats?.filter((f: any) => f.vcodec === 'none' && f.acodec !== 'none') || [];

        const audios = rawAudioFormats.map((f: any) => ({
            quality: `${f.abr || f.audio_ext || 'Unknown'} kbps`,
            ext: f.ext,
            size: f.filesize ? `${(f.filesize / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
            url: f.url
        })).filter((a: any, index: number, self: any[]) =>
            // Deduplicate by quality
            index === self.findIndex((t) => (t.quality === a.quality))
        ).sort((a: any, b: any) => parseInt(b.quality) - parseInt(a.quality));

        return NextResponse.json({
            success: true,
            metadata: {
                title: info.title,
                thumbnail: info.thumbnail,
                duration: info.duration,
                platform: info.extractor_key,
            },
            availableFormats: {
                videos,
                audios
            }
        });

    } catch (err: any) {
        console.error('yt-dlp error:', err);
        return NextResponse.json({ success: false, error: err.message || 'Failed to fetch links' }, { status: 500 });
    }
}
