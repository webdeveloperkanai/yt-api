import youtubedl from 'youtube-dl-exec';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '10'; // Default to 10 results

    if (!query) {
        return NextResponse.json({ error: 'Search query (q) is required' }, { status: 400 });
    }

    try {
        // using ytsearch prefix to invoke youtube's search
        const searchQuery = `ytsearch${limit}:${query}`;

        // We use dumpSingleJson to get the output. yt-dlp returns a playlist object for searches
        const rawData = await youtubedl(searchQuery, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            ignoreErrors: true, // continue even if some videos fail
            flatPlaylist: true, // Only get metadata, don't thoroughly extract each video
            addHeader: [
                'referer:youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            ]
        });

        // The output is structured as a playlist
        const searchData: any = rawData;

        // Extract the results
        const results = searchData.entries?.map((entry: any) => ({
            id: entry.id,
            url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
            title: entry.title,
            thumbnails: entry.thumbnails || [{ url: `https://i.ytimg.com/vi/${entry.id}/maxresdefault.jpg` }],
            duration: entry.duration,
            view_count: entry.view_count,
            channel: {
                id: entry.channel_id,
                name: entry.channel,
                url: entry.channel_url
            }
        })) || [];

        return NextResponse.json({
            success: true,
            query: query,
            count: results.length,
            results: results
        });

    } catch (err: any) {
        console.error('yt-dlp search error:', err);
        return NextResponse.json({ success: false, error: err.message || 'Failed to scrape search results' }, { status: 500 });
    }
}
