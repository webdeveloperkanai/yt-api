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
        // Use yt-dlp to extract info from Facebook post
        const rawInfo: any = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            ...(hasCookies ? { cookies: cookiesPath } : {}),
            addHeader: [
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'referer:https://www.facebook.com/',
            ],
        });

        let photos: { url: string; width?: number; height?: number; id: string }[] = [];

        // ── Extract from thumbnails array (album/multi-photo posts) ──
        if (Array.isArray(rawInfo.thumbnails) && rawInfo.thumbnails.length > 0) {
            photos = rawInfo.thumbnails.map((t: any, i: number) => ({
                id: t.id ?? String(i),
                url: t.url,
                width: t.width ?? null,
                height: t.height ?? null,
            }));
        }
        // ── Single thumbnail fallback ──
        else if (rawInfo.thumbnail) {
            photos = [{ id: '0', url: rawInfo.thumbnail }];
        }

        // ── Deduplicate by URL ──
        const seen = new Set<string>();
        photos = photos.filter(p => {
            if (!p.url || seen.has(p.url)) return false;
            seen.add(p.url);
            return true;
        });

        // ── If it's a video post, also include the thumbnail as a photo ──
        const isVideo = rawInfo.formats && rawInfo.formats.length > 0;

        return NextResponse.json({
            success: true,
            title: rawInfo.title ?? null,
            description: rawInfo.description ?? null,
            isVideo,
            photoCount: photos.length,
            photos,
            // Provide stream URLs for each photo (proxy)
            photosWithStream: photos.map(p => ({
                ...p,
                streamUrl: `/api/photo/stream?url=${encodeURIComponent(p.url)}`,
                downloadUrl: `/api/photo/stream?url=${encodeURIComponent(p.url)}&download=1`,
            })),
        });

    } catch (err: any) {
        console.error('Facebook photos error:', err);

        // ── Fallback: try og:image scraping ──
        try {
            const ogPhotos = await scrapeOgImages(url);
            if (ogPhotos.length > 0) {
                return NextResponse.json({
                    success: true,
                    title: null,
                    isVideo: false,
                    photoCount: ogPhotos.length,
                    photos: ogPhotos,
                    photosWithStream: ogPhotos.map(p => ({
                        ...p,
                        streamUrl: `/api/photo/stream?url=${encodeURIComponent(p.url)}`,
                        downloadUrl: `/api/photo/stream?url=${encodeURIComponent(p.url)}&download=1`,
                    })),
                });
            }
        } catch (scrapeErr) {
            console.error('OG scrape error:', scrapeErr);
        }

        return NextResponse.json(
            { success: false, error: err.message || 'Failed to extract photos' },
            { status: 500 }
        );
    }
}

// ---------------------------------------------------------------------------
// Scrape og:image / twitter:image meta tags as fallback
// ---------------------------------------------------------------------------
async function scrapeOgImages(url: string): Promise<{ id: string; url: string }[]> {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    });
    const html = await res.text();
    const photos: { id: string; url: string }[] = [];
    const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
    const twRegex = /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi;

    let match: RegExpExecArray | null;
    while ((match = ogRegex.exec(html))) {
        photos.push({ id: `og-${photos.length}`, url: match[1] });
    }
    while ((match = twRegex.exec(html))) {
        photos.push({ id: `tw-${photos.length}`, url: match[1] });
    }
    return photos;
}
