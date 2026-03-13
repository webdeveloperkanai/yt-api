import { exec } from 'youtube-dl-exec';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { pushLog } from '@/lib/logger';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const type = searchParams.get('type'); // 'video' or 'audio'

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    const hasCookies = fs.existsSync(cookiesPath);

    const res = searchParams.get('res') || '720';
    const height = parseInt(res, 10) || 720;
    const isAudio = type === 'audio';

    const logType = isAudio ? 'download-audio' : 'download-video';
    const startMs = Date.now();

    pushLog({ type: logType, url, status: 'started' });

    const options: Record<string, any> = {
        noCheckCertificates: true,
        noWarnings: true,
        ...(hasCookies ? { cookies: cookiesPath } : {}),
        addHeader: [
            'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'referer:https://www.facebook.com/',
        ],
        output: '-', // stream to stdout
    };

    if (isAudio) {
        options.extractAudio = true;
        options.audioFormat = 'mp3';
        options.format = 'bestaudio/best';
    } else {
        options.format = `best[height<=${height}][ext=mp4]/best[height<=${height}]/best`;
    }

    try {
        const ytDlpProcess = exec(url, options);

        if (!ytDlpProcess.stdout) {
            throw new Error('yt-dlp stdout is null');
        }

        let totalBytes = 0;

        const readable = new ReadableStream({
            start(controller) {
                ytDlpProcess.stdout!.on('data', (chunk) => {
                    totalBytes += chunk.length;
                    controller.enqueue(chunk);
                });
                ytDlpProcess.stdout!.on('end', () => {
                    controller.close();
                    pushLog({
                        type: logType,
                        url,
                        status: 'completed',
                        detail: `${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
                        durationMs: Date.now() - startMs,
                    });
                });
                ytDlpProcess.stdout!.on('error', (err) => {
                    controller.error(err);
                    pushLog({ type: logType, url, status: 'error', detail: err.message, durationMs: Date.now() - startMs });
                });
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
        pushLog({ type: logType, url, status: 'error', detail: err.message, durationMs: Date.now() - startMs });
        return NextResponse.json({ error: err.message || 'Failed to download' }, { status: 500 });
    }
}
