import { exec } from 'youtube-dl-exec';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

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

    // Check if we have a cookies.txt file in the root to bypass YouTube bot detection
    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    const hasCookies = fs.existsSync(cookiesPath);

    const options: Record<string, any> = {
        noCheckCertificates: true,
        noWarnings: true,
        output: '-', // stream to stdout
        addHeader: [
            'referer:youtube.com',
            'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        ],
        ...(hasCookies ? { cookies: cookiesPath } : {})
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
        const info: any = await exec(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            ...options
        });

        if (!info || !info.url) {
            throw new Error('Could not extract direct URL');
        }

        // Redirect the client to the direct media URL.
        // The browser will handle HTTP Range requests natively.
        return NextResponse.redirect(info.url, 302);
    } catch (err: any) {
        console.error('Stream redirect error:', err);
        return NextResponse.json({ error: err.message || 'Failed to get stream URL' }, { status: 500 });
    }
}
