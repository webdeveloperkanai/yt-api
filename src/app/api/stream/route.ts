import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const type = searchParams.get('type') || 'video';

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const isAudio = type === 'audio';

    const ytDlpBin = path.join(
        process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin',
        process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
    );

    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    const hasCookies = fs.existsSync(cookiesPath);

    const baseArgs = [
        '--no-check-certificates',
        '--no-warnings',
        '--add-header', 'referer:youtube.com',
        '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        ...(hasCookies ? ['--cookies', cookiesPath] : []),
    ];

    try {
        if (isAudio) {
            // Audio: single pre-muxed URL → just redirect
            const directUrl: string = await getUrls(ytDlpBin, [
                ...baseArgs,
                '--get-url',
                '--format', 'bestaudio[ext=m4a]/bestaudio',
                url,
            ]).then(lines => lines[0]);

            return NextResponse.redirect(directUrl, 302);
        }

        // Video 1080p: get separate video + audio URLs, merge with ffmpeg
        const urls = await getUrls(ytDlpBin, [
            ...baseArgs,
            '--get-url',
            '--format', 'bestvideo[height<=1080][vcodec^=vp9]+bestaudio[acodec=opus]/bestvideo[height<=1080]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio',
            url,
        ]);

        let ffmpegArgs: string[];

        if (urls.length === 1) {
            // Pre-muxed single URL → redirect directly
            return NextResponse.redirect(urls[0], 302);
        } else {
            // Two streams → ffmpeg merge to webm pipe
            ffmpegArgs = [
                '-hide_banner', '-loglevel', 'error',
                '-i', urls[0],   // video
                '-i', urls[1],   // audio
                '-c', 'copy',
                '-f', 'webm',
                'pipe:1',
            ];
        }

        const stream = new ReadableStream({
            start(controller) {
                let closed = false;

                const close = () => {
                    if (!closed) { closed = true; try { controller.close(); } catch { } }
                };

                const ff = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

                ff.stdout!.on('data', (chunk: Buffer) => {
                    if (!closed) {
                        try { controller.enqueue(chunk); }
                        catch { closed = true; ff.kill('SIGTERM'); }
                    }
                });

                ff.stdout!.on('end', close);
                ff.on('error', (err) => {
                    if (!closed) { closed = true; try { controller.error(err); } catch { } }
                });

                req.signal.addEventListener('abort', () => { ff.kill('SIGTERM'); close(); });
            },
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'video/webm',
                'Cache-Control': 'no-cache, no-store',
                'X-Content-Type-Options': 'nosniff',
            },
        });

    } catch (err: any) {
        console.error('Stream error:', err.message);
        return NextResponse.json({ error: err.message || 'Stream failed' }, { status: 500 });
    }
}

function getUrls(bin: string, args: string[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
        let out = '';
        let errOut = '';
        const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        child.stdout!.on('data', (d: Buffer) => { out += d.toString(); });
        child.stderr!.on('data', (d: Buffer) => { errOut += d.toString(); });
        child.on('close', (code) => {
            const lines = out.trim().split('\n').map(l => l.trim()).filter(Boolean);
            if (code === 0 && lines.length > 0) resolve(lines);
            else reject(new Error(errOut.split('\n').find(l => l.includes('ERROR')) || `yt-dlp code ${code}`));
        });
        child.on('error', reject);
    });
}
