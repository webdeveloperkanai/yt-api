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

    try {
        const rawInfo: any = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            ...(hasCookies ? { cookies: cookiesPath } : {}),
            addHeader: [
                'referer:youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            ],
        });

        const formats: any[] = rawInfo.formats || [];

        // ── Raw Video streams (has both video + audio codec, OR video-only) ──
        const rawVideoFormats = formats
            .filter((f) => f.vcodec && f.vcodec !== 'none' && f.url)
            .map((f) => ({
                format_id: f.format_id,
                quality: f.format_note || (f.height ? `${f.height}p` : 'unknown'),
                resolution: f.width && f.height ? `${f.width}x${f.height}` : null,
                fps: f.fps ?? null,
                ext: f.ext,
                vcodec: f.vcodec,
                acodec: f.acodec !== 'none' ? f.acodec : null,
                tbr: f.tbr ?? null,
                size: f.filesize
                    ? `${(f.filesize / 1024 / 1024).toFixed(2)} MB`
                    : f.filesize_approx
                    ? `~${(f.filesize_approx / 1024 / 1024).toFixed(2)} MB`
                    : null,
                url: f.url,
            }))
            // deduplicate by format_id
            .filter((v, i, arr) => arr.findIndex((x) => x.format_id === v.format_id) === i)
            // sort: highest resolution first
            .sort((a, b) => {
                const ra = parseInt(a.quality) || 0;
                const rb = parseInt(b.quality) || 0;
                return rb - ra;
            });

        // ── Raw Audio streams (audio-only) ──
        const rawAudioFormats = formats
            .filter((f) => f.vcodec === 'none' && f.acodec && f.acodec !== 'none' && f.url)
            .map((f) => ({
                format_id: f.format_id,
                quality: f.abr ? `${Math.round(f.abr)} kbps` : f.format_note || 'unknown',
                ext: f.ext,
                acodec: f.acodec,
                abr: f.abr ?? null,
                size: f.filesize
                    ? `${(f.filesize / 1024 / 1024).toFixed(2)} MB`
                    : f.filesize_approx
                    ? `~${(f.filesize_approx / 1024 / 1024).toFixed(2)} MB`
                    : null,
                url: f.url,
            }))
            .filter((a, i, arr) => arr.findIndex((x) => x.format_id === a.format_id) === i)
            // sort: highest bitrate first
            .sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0));

        return NextResponse.json({
            success: true,
            metadata: {
                title: rawInfo.title,
                thumbnail: rawInfo.thumbnail,
                duration: rawInfo.duration,
                channel: rawInfo.channel,
                view_count: rawInfo.view_count,
            },
            rawVideo: rawVideoFormats,
            rawAudio: rawAudioFormats,
        });

    } catch (err: any) {
        console.error('raw route error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to fetch raw URLs' },
            { status: 500 }
        );
    }
}
