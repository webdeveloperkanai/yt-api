import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/photo/stream?url=<encoded-image-url>&download=1
 *
 * Proxies any photo URL through the server so:
 *  - CORS issues are bypassed (editor can use http://localhost:3000/api/photo/stream?url=...)
 *  - Facebook CDN auth headers are added
 *  - ?download=1 triggers browser download instead of inline display
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');
    const isDownload = searchParams.get('download') === '1';

    if (!imageUrl) {
        return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    try {
        const upstream = await fetch(decodeURIComponent(imageUrl), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': 'https://www.facebook.com/',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            },
        });

        if (!upstream.ok) {
            return NextResponse.json(
                { error: `Upstream returned ${upstream.status}` },
                { status: upstream.status }
            );
        }

        const contentType = upstream.headers.get('content-type') || 'image/jpeg';
        const body = upstream.body;

        if (!body) {
            return NextResponse.json({ error: 'No response body' }, { status: 502 });
        }

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Cache-Control', 'public, max-age=86400');
        // Allow editor apps to embed via cross-origin
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET');
        headers.set('Access-Control-Allow-Headers', '*');

        if (isDownload) {
            // Guess extension from content-type
            const ext = contentType.includes('png') ? 'png'
                : contentType.includes('gif') ? 'gif'
                : contentType.includes('webp') ? 'webp'
                : 'jpg';
            headers.set('Content-Disposition', `attachment; filename="photo.${ext}"`);
        } else {
            headers.set('Content-Disposition', 'inline');
        }

        return new NextResponse(body, { status: 200, headers });

    } catch (err: any) {
        console.error('Photo stream error:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to stream photo' },
            { status: 500 }
        );
    }
}
