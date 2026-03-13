import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    console.log(`[FB-PHOTO] Request received for: ${url}`);

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        console.log(`[FB-PHOTO] Navigating to URL...`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log(`[FB-PHOTO] Page loaded, waiting 4 seconds...`);
        await page.waitForTimeout(4000);

        console.log(`[FB-PHOTO] Extracting content...`);
        const html = await page.content();

        // 1. Try og:image meta tag
        const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/) || 
                        html.match(/<meta[^>]+content="([^">]+)"[^>]+property="og:image"/);
        
        let photoUrl = ogMatch ? ogMatch[1].replace(/&amp;/g, '&') : null;

        // 2. If not found or fallback, look for large scontent images
        if (!photoUrl) {
            const imgRegex = /<img[^>]+src="([^">]+(?:scontent|fbcdn)[^">]+)"/g;
            let match;
            const candidates = [];
            while ((match = imgRegex.exec(html)) !== null) {
                const src = match[1].replace(/&amp;/g, '&');
                if (!src.includes('emoji') && !src.includes('rsrc.php')) {
                    candidates.push(src);
                }
            }
            // Pick the first one as a fallback or implement better heuristic
            if (candidates.length > 0) {
                photoUrl = candidates[0];
            }
        }

        if (photoUrl) {
            console.log(`[FB-PHOTO] Found photo URL: ${photoUrl.substring(0, 50)}...`);
            return NextResponse.json({
                success: true,
                url: photoUrl,
                source: url
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Could not find main photo in the page source.'
            }, { status: 404 });
        }

    } catch (error: any) {
        console.error('[FB-PHOTO] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'An error occurred during extraction.'
        }, { status: 500 });
    } finally {
        if (browser) {
            await browser.close();
            console.log(`[FB-PHOTO] Browser closed.`);
        }
    }
}
