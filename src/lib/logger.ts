// Shared in-memory log store (ring buffer, last 200 entries)
export type LogType = 'download-video' | 'download-audio' | 'stream' | 'photo';

export interface LogEntry {
    id: string;
    timestamp: string;
    type: LogType;
    url: string;
    status: 'started' | 'completed' | 'error';
    detail?: string; // file size, error message, etc.
    durationMs?: number;
}

const MAX_LOGS = 200;

// Global singleton log buffer
const globalForLogs = global as typeof global & { __logBuffer?: LogEntry[] };
if (!globalForLogs.__logBuffer) {
    globalForLogs.__logBuffer = [];
}

export function pushLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const buf = globalForLogs.__logBuffer!;
    const full: LogEntry = {
        ...entry,
        id: Math.random().toString(36).slice(2),
        timestamp: new Date().toISOString(),
    };
    buf.unshift(full); // newest first
    if (buf.length > MAX_LOGS) buf.splice(MAX_LOGS);
    return full;
}

export function getLogs(): LogEntry[] {
    return globalForLogs.__logBuffer ?? [];
}

export function clearLogs() {
    globalForLogs.__logBuffer = [];
}
