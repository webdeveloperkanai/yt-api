import { exec } from 'youtube-dl-exec';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const type = searchParams.get('type'); // 'video' or 'audio'

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const isAudio = type === 'audio';

    const options: Record<string, any> = {
        noCheckCertificates: true,
        noWarnings: true,
        addHeader: [
            'referer:youtube.com',
            'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        ],
        output: '-', // stream to stdout
    };

    if (isAudio) {
        options.extractAudio = true;
        options.audioFormat = 'mp3';
        options.format = 'bestaudio/best';
    } else {
        // for video, typically getting mp4, limited to 720p
        options.format = 'best[height<=720][ext=mp4]/best[height<=720]/best';
    }

    try {
        const ytDlpProcess = exec(url, options);

        if (!ytDlpProcess.stdout) {
            throw new Error('yt-dlp stdout is null');
        }

        // Convert Node.js Readable stream into Web ReadableStream
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

                // Handle process exit / errors
                ytDlpProcess.on('error', (err) => {
                    console.error('Process error:', err);
                    controller.error(err);
                });
            },
            cancel() {
                ytDlpProcess.kill();
            }
        });

        const headers = new Headers();
        if (isAudio) {
            headers.set('Content-Disposition', `attachment; filename="audio.mp3"`);
            headers.set('Content-Type', 'audio/mpeg');
        } else {
            headers.set('Content-Disposition', `attachment; filename="video.mp4"`);
            headers.set('Content-Type', 'video/mp4');
        }

        return new NextResponse(readable, { headers });
    } catch (err: any) {
        console.error('Download error:', err);
        return NextResponse.json({ error: err.message || 'Failed to download' }, { status: 500 });
    }
}
