import { ShadowEvent, EventCategory, ParseError } from '../types';

let eventCounter = 0;
const genId = () => `bh_${Date.now()}_${eventCounter++}`;

const CATEGORY_PATTERNS: [RegExp, EventCategory][] = [
    [/\b(bank|paypal|venmo|credit|invest|crypto|trading|fidelity|chase|coinbase|irs|tax)\b/i, 'financial'],
    [/\b(webmd|health|doctor|pharmacy|symptom|medical|clinic|hospital|mychart)\b/i, 'health'],
    [/\b(amazon|ebay|shop|buy|cart|checkout|walmart|etsy|bestbuy|target|order)\b/i, 'shopping'],
    [/\b(booking|airbnb|tripadvisor|flight|hotel|travel|airline|united|delta|kayak)\b/i, 'travel'],
    [/\b(youtube|netflix|spotify|twitch|hulu|disney|primevideo)\b/i, 'video'],
    [/\b(facebook|instagram|twitter|tiktok|reddit|linkedin)\b/i, 'social'],
    [/\b(gmail|outlook|mail|protonmail)\b/i, 'communication'],
    [/\b(zillow|redfin|apartments|realtor)\b/i, 'other'],
];

function inferCategory(url: string, title: string): EventCategory {
    const text = `${url} ${title}`;
    for (const [re, cat] of CATEGORY_PATTERNS) {
        if (re.test(text)) return cat;
    }
    return 'browsing';
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

// Chrome uses WebKit timestamps: microseconds since 1601-01-01
const WEBKIT_EPOCH_OFFSET = 11644473600000; // ms between 1601-01-01 and 1970-01-01

function parseTimestamp(item: any): number {
    const rawTime = item.lastVisitTime || item.last_visit_time || item.timestamp;
    
    if (typeof rawTime === 'number') {
        if (rawTime > 1e15) return rawTime / 1000 - WEBKIT_EPOCH_OFFSET; // Chrome WebKit microseconds
        if (rawTime > 1e12) return rawTime; // Standard ms
        if (rawTime > 1e9) return rawTime * 1000; // Standard seconds
    }
    
    if (typeof rawTime === 'string') {
        // Try parsing string as number first (e.g. from CSV)
        const num = Number(rawTime);
        if (!isNaN(num) && rawTime.trim() !== '') {
            if (num > 1e15) return num / 1000 - WEBKIT_EPOCH_OFFSET;
            if (num > 1e12) return num;
            if (num > 1e9) return num * 1000;
        }
        // Then try parsing as ISO/locale date string
        const t = new Date(rawTime).getTime();
        if (!isNaN(t)) return t;
    }
    
    return Date.now();
}

/**
 * Split a CSV line respecting quoted values.
 */
function splitCsv(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result.map(s => s.trim().replace(/^"|"$/g, ''));
}

/**
 * Parse CSV browser history (Chrome, Edge, extensions)
 */
function parseCSV(raw: string): any[] {
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const header = splitCsv(lines[0]).map(h => h.toLowerCase().replace(/[^a-z_]/g, ''));
    
    const urlIdx = header.findIndex(h => h.includes('url') || h === 'link');
    const titleIdx = header.findIndex(h => h.includes('title') || h === 'name');
    const visitIdx = header.findIndex(h => h.includes('visitcount') || h.includes('count'));
    const timeIdx = header.findIndex(h => (h.includes('time') || h.includes('date')) && !h.includes('count'));

    if (urlIdx === -1) return [];

    return lines.slice(1).map(line => {
        const cols = splitCsv(line);
        return {
            url: cols[urlIdx] || '',
            title: titleIdx !== -1 ? cols[titleIdx] : '',
            visit_count: visitIdx !== -1 ? parseInt(cols[visitIdx]) || 1 : 1,
            lastVisitTime: timeIdx !== -1 ? cols[timeIdx] : 0,
        };
    }).filter(item => item.url && item.url.startsWith('http'));
}

export interface BrowserHistoryResult {
    events: ShadowEvent[];
    errors: ParseError[];
}

/**
 * Parses browser history from JSON or CSV export.
 * JSON: [{ url, title, visit_count, lastVisitTime/timestamp }]
 * CSV: Chrome export format
 * Firefox: places.json with { windows: [{ tabs: [{ entries: [{url, title}] }] }] }
 */
export function parseBrowserHistory(raw: string, filename = 'BrowserHistory.json'): BrowserHistoryResult {
    const errors: ParseError[] = [];

    // Try CSV first (detect by checking if first line looks like headers and not JSON)
    const firstLine = raw.trim().split('\n')[0] || '';
    if (firstLine.includes(',') && !firstLine.startsWith('[') && !firstLine.startsWith('{')) {
        const items = parseCSV(raw);
        if (items.length > 0) {
            return {
                events: items.map(item => ({
                    id: genId(),
                    timestamp: parseTimestamp(item),
                    source: 'browser_history' as const,
                    category: inferCategory(item.url, item.title),
                    title: item.title || extractDomain(item.url),
                    details: extractDomain(item.url),
                    entities: [extractDomain(item.url)],
                })),
                errors,
            };
        }
    }

    // Try JSON
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return {
            events: [],
            errors: [{
                source: 'browser_history',
                filename,
                message: 'File is not valid JSON or CSV.',
                suggestion: 'Export browser history as JSON or CSV. Chrome: use a history export extension. Firefox: export from about:places.',
            }],
        };
    }

    const obj = data as any;

    // Firefox sessionstore / places format
    if (obj.windows && Array.isArray(obj.windows)) {
        const entries: any[] = [];
        for (const win of obj.windows) {
            for (const tab of (win.tabs || [])) {
                for (const entry of (tab.entries || [])) {
                    entries.push(entry);
                }
            }
        }
        return {
            events: entries.filter(e => e.url).map(entry => ({
                id: genId(),
                timestamp: entry.lastAccessed || Date.now(),
                source: 'browser_history' as const,
                category: inferCategory(entry.url, entry.title || ''),
                title: entry.title || extractDomain(entry.url),
                details: extractDomain(entry.url),
                entities: [extractDomain(entry.url)],
            })),
            errors,
        };
    }

    // Standard JSON array format
    const items = Array.isArray(obj) ? obj : obj.Browser?.History || obj.history || [];
    if (!Array.isArray(items) || items.length === 0) {
        errors.push({
            source: 'browser_history',
            filename,
            message: 'No browser history entries found.',
            suggestion: 'Expected a JSON array with objects containing "url" and "title" fields.',
        });
        return { events: [], errors };
    }

    const events = items
        .filter((item: any) => item.url)
        .map((item: any) => {
            const url = item.url || '';
            const title = item.title || extractDomain(url);
            const timestamp = parseTimestamp(item);
            const category = inferCategory(url, title);
            const domain = extractDomain(url);
            return {
                id: genId(),
                timestamp,
                source: 'browser_history' as const,
                category,
                title,
                details: domain,
                entities: [domain],
            };
        })
        .filter((e: ShadowEvent) => !isNaN(e.timestamp));

    return { events, errors };
}
