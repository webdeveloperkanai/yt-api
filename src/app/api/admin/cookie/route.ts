import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const COOKIE_PATH = path.join(process.cwd(), 'cookies.txt');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Auto-detect and convert EditThisCookie JSON → Netscape format
function ensureNetscape(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return raw; // already Netscape
    try {
        const parsed = JSON.parse(trimmed);
        const arr: any[] = Array.isArray(parsed) ? parsed : [parsed];
        const lines = ['# Netscape HTTP Cookie File', '# Auto-converted from JSON by yt-dl'];
        for (const c of arr) {
            const domain = c.domain ?? c.Domain ?? '';
            const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
            const path = c.path ?? c.Path ?? '/';
            const secure = (c.secure ?? c.Secure ?? false) ? 'TRUE' : 'FALSE';
            const expires = c.expirationDate
                ? Math.round(c.expirationDate).toString()
                : (c.expires ?? '0');
            const name = c.name ?? c.Name ?? '';
            const value = c.value ?? c.Value ?? '';
            lines.push(`${domain}\t${flag}\t${path}\t${secure}\t${expires}\t${name}\t${value}`);
        }
        return lines.join('\n');
    } catch {
        return raw; // not valid JSON either — pass through
    }
}

function checkAuth(req: NextRequest): boolean {
    const auth = req.headers.get('x-admin-password');
    return auth === ADMIN_PASSWORD;
}

// GET — return cookies.txt status and masked preview
export async function GET(req: NextRequest) {
    if (!checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exists = fs.existsSync(COOKIE_PATH);
    if (!exists) {
        return NextResponse.json({ exists: false, preview: null, lineCount: 0 });
    }

    const content = fs.readFileSync(COOKIE_PATH, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    // Return masked preview (only domain + name columns visible)
    const preview = lines.slice(0, 5).map(line => {
        const cols = line.split('\t');
        if (cols.length >= 6) {
            return `${cols[0]}\t...\t...\t${cols[5]}\t[masked]`;
        }
        return line.substring(0, 60) + (line.length > 60 ? '...' : '');
    }).join('\n');

    return NextResponse.json({
        exists: true,
        lineCount: lines.length,
        preview,
        updatedAt: fs.statSync(COOKIE_PATH).mtime.toISOString(),
    });
}

// POST — write new cookies.txt content
export async function POST(req: NextRequest) {
    if (!checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { content } = body;

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'content field is required' }, { status: 400 });
        }

        // Auto-convert JSON → Netscape if needed
        const netscapeContent = ensureNetscape(content);

        fs.writeFileSync(COOKIE_PATH, netscapeContent, 'utf-8');
        const lines = netscapeContent.split('\n').filter((l: string) => l.trim() && !l.startsWith('#'));
        const wasConverted = netscapeContent !== content;

        return NextResponse.json({ success: true, lineCount: lines.length, converted: wasConverted });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE — remove cookies.txt
export async function DELETE(req: NextRequest) {
    if (!checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (fs.existsSync(COOKIE_PATH)) {
        fs.unlinkSync(COOKIE_PATH);
        return NextResponse.json({ success: true, message: 'cookies.txt deleted' });
    }
    return NextResponse.json({ success: true, message: 'File did not exist' });
}
