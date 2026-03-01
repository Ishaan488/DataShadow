import { ShadowEvent, EventCategory } from '../types';

let eventCounter = 0;
const genId = () => `bh_${Date.now()}_${eventCounter++}`;

const CATEGORY_PATTERNS: [RegExp, EventCategory][] = [
    [/\b(bank|paypal|venmo|credit|invest|crypto|trading)\b/i, 'financial'],
    [/\b(webmd|health|doctor|pharmacy|symptom|medical)\b/i, 'health'],
    [/\b(amazon|ebay|shop|buy|cart|checkout|walmart|etsy)\b/i, 'shopping'],
    [/\b(booking|airbnb|tripadvisor|flight|hotel|travel)\b/i, 'travel'],
    [/\b(youtube|netflix|spotify|twitch|hulu|disney)\b/i, 'video'],
    [/\b(facebook|instagram|twitter|tiktok|reddit|linkedin)\b/i, 'social'],
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

/**
 * Parses browser history JSON export.
 * Supports Chrome format: [{ url, title, visitCount, lastVisitTime }]
 * and generic: [{ url, title, timestamp }]
 */
export function parseBrowserHistory(raw: string): ShadowEvent[] {
    try {
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : data.Browser?.History || data.history || [];
        return items
            .filter((item: any) => item.url)
            .map((item: any) => {
                const url = item.url || '';
                const title = item.title || extractDomain(url);
                const timestamp = item.lastVisitTime
                    ? item.lastVisitTime / 1000 // Chrome uses microseconds
                    : item.timestamp
                        ? new Date(item.timestamp).getTime()
                        : item.last_visit_time
                            ? new Date(item.last_visit_time).getTime()
                            : Date.now();
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
    } catch {
        console.warn('Failed to parse Browser History');
        return [];
    }
}
