import youtubedl from 'youtube-dl-exec';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// YouTube search — yt-dlp (unchanged)
// ---------------------------------------------------------------------------
async function searchYouTube(query: string, limit: number) {
    const rawData: any = await youtubedl(`ytsearch${limit}:${query}`, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        ignoreErrors: true,
        flatPlaylist: true,
        addHeader: [
            'referer:youtube.com',
            'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        ],
    });

    return (rawData.entries ?? []).map((entry: any) => {
        const videoId = entry.id;
        const videoUrl = entry.url || `https://www.youtube.com/watch?v=${videoId}`;

        const thumbnails: { url: string }[] =
            Array.isArray(entry.thumbnails) && entry.thumbnails.length
                ? entry.thumbnails.map((t: any) => ({ url: t.url }))
                : entry.thumbnail
                    ? [{ url: entry.thumbnail }]
                    : [{ url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` }];

        const resolutions = [360, 480, 720, 1080];

        return {
            id: videoId,
            url: videoUrl,
            streamUrl: `/api/stream?url=${encodeURIComponent(videoUrl)}`,
            rawUrl: `/api/raw?url=${encodeURIComponent(videoUrl)}`,
            title: entry.title,
            thumbnails,
            duration: entry.duration ?? null,
            view_count: entry.view_count ?? null,
            channel: {
                id: entry.channel_id ?? null,
                name: entry.channel ?? null,
                url: entry.channel_url ?? null,
            },
            platform: 'youtube',
            formats: resolutions.map(res => ({
                quality: `${res}p`,
                stream: `/api/stream?url=${encodeURIComponent(videoUrl)}&res=${res}`,
                download: `/api/download?url=${encodeURIComponent(videoUrl)}&res=${res}`
            })),
            audio: {
                stream: `/api/stream?url=${encodeURIComponent(videoUrl)}&type=audio`,
                download: `/api/download?url=${encodeURIComponent(videoUrl)}&type=audio`
            }
        };
    });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 30);
    const platform = (searchParams.get('platform') || 'youtube').toLowerCase();

    if (!query) {
        return NextResponse.json({ error: 'Search query (q) is required' }, { status: 400 });
    }

    try {
        const results = await searchYouTube(query, limit);

        return NextResponse.json({ success: true, platform: 'youtube', query, count: results.length, results });
    } catch (err: any) {
        console.error('Search error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to fetch search results' },
            { status: 500 }
        );
    }
}
