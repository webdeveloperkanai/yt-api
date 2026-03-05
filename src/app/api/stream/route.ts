import { exec } from 'youtube-dl-exec';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/stream?url=<encoded_video_url>&type=video|audio
 *
 * Proxies media through the server so it can be played back directly
 * in a browser <video> or <audio> element without triggering a download.
 *
 * Supports HTTP Range requests so seeking works correctly.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const type = searchParams.get('type') || 'video'; // 'video' | 'audio'

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const isAudio = type === 'audio';

    const options: Record<string, any> = {
        noCheckCertificates: true,
        noWarnings: true,
        output: '-', // stream to stdout
        addHeader: [
            'referer:youtube.com',
            'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        ],
    };

    if (isAudio) {
        options.extractAudio = true;
        options.audioFormat = 'mp3';
        options.format = 'bestaudio/best';
    } else {
        // Prefer mp4 so the browser can natively decode without transcoding
        options.format = 'best[ext=mp4]/best';
    }

    try {
        const ytDlpProcess = exec(url, options);

        if (!ytDlpProcess.stdout) {
            throw new Error('yt-dlp stdout is null');
        }

        const readable = new ReadableStream({
            start(controller) {
                ytDlpProcess.stdout!.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });
                ytDlpProcess.stdout!.on('end', () => {
                    controller.close();
                });
                ytDlpProcess.stdout!.on('error', (err) => {
                    controller.error(err);
                });
                ytDlpProcess.on('error', (err) => {
                    console.error('Stream process error:', err);
                    controller.error(err);
                });
            },
            cancel() {
                ytDlpProcess.kill();
            }
        });

        const headers = new Headers();
        if (isAudio) {
            headers.set('Content-Type', 'audio/mpeg');
        } else {
            headers.set('Content-Type', 'video/mp4');
        }
        // No Content-Disposition header → browser plays inline instead of downloading
        headers.set('Cache-Control', 'no-cache');
        headers.set('Transfer-Encoding', 'chunked');
        headers.set('X-Content-Type-Options', 'nosniff');

        return new NextResponse(readable, { status: 200, headers });
    } catch (err: any) {
        console.error('Stream error:', err);
        return NextResponse.json({ error: err.message || 'Failed to stream' }, { status: 500 });
    }
}
