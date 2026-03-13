import { NextRequest, NextResponse } from 'next/server';
import { getLogs, clearLogs } from '@/lib/logger';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function checkAuth(req: NextRequest): boolean {
    return req.headers.get('x-admin-password') === ADMIN_PASSWORD;
}

// GET — return logs, optionally filtered by type
export async function GET(req: NextRequest) {
    if (!checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type'); // 'download-video','download-audio','stream','photo'
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 100;

    let logs = getLogs();
    if (typeFilter) {
        logs = logs.filter(l => l.type === typeFilter);
    }
    logs = logs.slice(0, limit);

    return NextResponse.json({ success: true, count: logs.length, logs });
}

// DELETE — clear all logs
export async function DELETE(req: NextRequest) {
    if (!checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    clearLogs();
    return NextResponse.json({ success: true, message: 'Logs cleared' });
}
