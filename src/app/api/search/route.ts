import youtubedl from 'youtube-dl-exec';
import puppeteer from 'puppeteer';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Recursively walks a JSON object to find all nodes where __typename === 'Video'
// ---------------------------------------------------------------------------
function extractVideoNodes(obj: any, found: any[] = [], seenIds: Set<string> = new Set(), depth = 0): any[] {
    if (!obj || typeof obj !== 'object' || depth > 20) return found;

    if (obj.__typename === 'Video' && obj.id) {
        const id = String(obj.id);
        if (!seenIds.has(id)) {
            seenIds.add(id);
            found.push(obj);
        }
        return found;
    }

    const keys = Array.isArray(obj) ? obj : Object.values(obj);
    for (const val of keys) {
        if (val && typeof val === 'object') {
            extractVideoNodes(val, found, seenIds, depth + 1);
        }
    }
    return found;
}

// ---------------------------------------------------------------------------
// Facebook search — intercepts Facebook's internal GraphQL API responses
// ---------------------------------------------------------------------------
async function searchFacebook(query: string, limit: number) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const graphqlVideos: any[] = [];
    const seenIds = new Set<string>();

    try {
        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1280, height: 900 });
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

        // ── Intercept every response from Facebook and parse it for Video nodes ──
        page.on('response', async (response) => {
            try {
                const url = response.url();
                // Only look at Facebook API / graphql JSON responses
                if (!url.includes('facebook.com')) return;
                const ct = response.headers()['content-type'] || '';
                if (!ct.includes('json') && !ct.includes('javascript') && !ct.includes('text')) return;

                const text = await response.text().catch(() => '');
                if (!text.includes('"Video"')) return;

                // Facebook returns newline-delimited JSON in some endpoints
                for (const line of text.split('\n')) {
                    const t = line.trim();
                    if (!t.startsWith('{')) continue;
                    try {
                        const json = JSON.parse(t);
                        extractVideoNodes(json, graphqlVideos, seenIds);
                    } catch { /* skip non-JSON lines */ }
                }
            } catch { /* ignore response errors */ }
        });

        // Navigate to Facebook video search
        const searchUrl = `https://www.facebook.com/search/videos/?q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30_000 });

        // Wait for initial render, then scroll to trigger more lazy-loaded results
        await new Promise(r => setTimeout(r, 2500));
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, 900));
            await new Promise(r => setTimeout(r, 1200));
        }
        // Let pending network calls finish
        await new Promise(r => setTimeout(r, 2000));

        // ── Primary: use GraphQL-intercepted data ──────────────────────────────
        if (graphqlVideos.length > 0) {
            return graphqlVideos.slice(0, limit).map((v) => {
                const videoId = String(v.id);
                const fbUrl = `https://www.facebook.com/watch?v=${videoId}`;

                // Thumbnail
                const thumbnailUrl: string | null =
                    v.thumbnailImage?.uri ??
                    v.preferred_thumbnail?.image?.uri ??
                    v.thumbnail?.uri ??
                    v.image?.uri ??
                    null;

                // Title — Facebook stores as {text:"..."} or plain string
                const rawTitle: any = v.title ?? v.name ?? v.message ?? null;
                const title: string =
                    (typeof rawTitle === 'object' && rawTitle?.text ? rawTitle.text : String(rawTitle ?? `Facebook Video ${videoId}`))
                        .substring(0, 150);

                // Channel / owner
                const owner = v.owner ?? v.creator ?? v.author ?? null;

                // Duration (milliseconds → seconds)
                const duration: number | null =
                    v.playable_duration_in_ms != null ? Math.floor(v.playable_duration_in_ms / 1000) :
                        v.length_in_second != null ? v.length_in_second :
                            v.length != null ? v.length :
                                null;

                return {
                    id: videoId,
                    url: fbUrl,
                    streamUrl: `/api/stream?url=${encodeURIComponent(fbUrl)}`,
                    title,
                    thumbnails: thumbnailUrl ? [{ url: thumbnailUrl }] : [],
                    duration,
                    view_count: v.viewCount ?? v.video_view_count ?? null,
                    channel: {
                        id: owner?.id ?? null,
                        name: owner?.name ?? null,
                        url: owner?.url ?? null,
                    },
                    platform: 'facebook',
                };
            });
        }

        // ── Fallback: broader DOM scraping if GraphQL yielded nothing ──────────
        const domResults: any[] = await page.evaluate((lim: number) => {
            const seen = new Set<string>();
            const items: any[] = [];
            const patterns = [
                /facebook\.com\/watch\/?\?v=(\d+)/,
                /facebook\.com\/(?:[^/?#]+)\/videos\/(\d+)/,
                /facebook\.com\/video\/(\d+)/,
                /facebook\.com\/reel\/(\d+)/,
            ];

            document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
                if (items.length >= lim) return;
                const href = a.href ?? '';
                let videoId: string | null = null;
                for (const p of patterns) {
                    const m = href.match(p);
                    if (m) { videoId = m[1]; break; }
                }
                if (!videoId || seen.has(videoId)) return;
                seen.add(videoId);

                // Walk up the DOM to find the card container
                let card: Element = a;
                for (let i = 0; i < 8; i++) {
                    if (!card.parentElement) break;
                    card = card.parentElement;
                    if (card.querySelector('img')) break;
                }

                const title =
                    a.getAttribute('aria-label')?.trim() ||
                    card.querySelector('span[dir="auto"]')?.textContent?.trim() ||
                    a.textContent?.trim() ||
                    `Facebook Video ${videoId}`;

                if (!title || title.length < 3) return;

                const img = card.querySelector<HTMLImageElement>('img[src]');
                const fbUrl = `https://www.facebook.com/watch?v=${videoId}`;

                items.push({
                    id: videoId,
                    url: fbUrl,
                    streamUrl: `/api/stream?url=${encodeURIComponent(fbUrl)}`,
                    title: title.substring(0, 150),
                    thumbnails: img?.src ? [{ url: img.src }] : [],
                    duration: null,
                    view_count: null,
                    channel: { id: null, name: null, url: null },
                    platform: 'facebook',
                });
            });
            return items;
        }, limit);

        return domResults;
    } finally {
        await browser.close();
    }
}

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

        return {
            id: videoId,
            url: videoUrl,
            streamUrl: `/api/stream?url=${encodeURIComponent(videoUrl)}`,
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
        const results =
            platform === 'facebook'
                ? await searchFacebook(query, limit)
                : await searchYouTube(query, limit);

        return NextResponse.json({ success: true, platform, query, count: results.length, results });
    } catch (err: any) {
        console.error('Search error:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Failed to fetch search results' },
            { status: 500 }
        );
    }
}
