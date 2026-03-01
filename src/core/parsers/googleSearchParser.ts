import { ShadowEvent, EventCategory } from '../types';

let eventCounter = 0;
const genId = () => `evt_${Date.now()}_${eventCounter++}`;

// Category inference from query text
const CATEGORY_PATTERNS: [RegExp, EventCategory][] = [
    [/\b(bank|credit|loan|mortgage|invest|stock|crypto|salary|payment|paypal|venmo)\b/i, 'financial'],
    [/\b(hospital|doctor|symptom|medicine|pharmacy|health|dental|therapy|diagnosis)\b/i, 'health'],
    [/\b(amazon|buy|shop|price|deal|coupon|order|ebay|walmart)\b/i, 'shopping'],
    [/\b(flight|hotel|airbnb|travel|vacation|trip|booking|passport)\b/i, 'travel'],
];

function inferCategory(text: string): EventCategory {
    for (const [re, cat] of CATEGORY_PATTERNS) {
        if (re.test(text)) return cat;
    }
    return 'search';
}

function extractEntities(text: string): string[] {
    const entities: string[] = [];
    // Extract quoted strings, capitalized words, emails, etc.
    const emailRe = /[\w.+-]+@[\w.-]+\.\w+/g;
    const matches = text.match(emailRe);
    if (matches) entities.push(...matches);

    // Extract capitalized multi-word names (simple heuristic)
    const nameRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
    const nameMatches = text.match(nameRe);
    if (nameMatches) entities.push(...nameMatches);

    return [...new Set(entities)];
}

/**
 * Parses Google Takeout "My Activity" search history.
 * Expected format: array of objects with { title, time, products?, details? }
 * or { header, title, titleUrl, time, products }
 */
export function parseGoogleSearch(raw: string): ShadowEvent[] {
    try {
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : [];
        return items
            .filter((item: any) => item.title || item.query)
            .map((item: any) => {
                const query = (item.title || item.query || '').replace(/^Searched for\s+/i, '');
                const timestamp = item.time
                    ? new Date(item.time).getTime()
                    : item.timestamp
                        ? new Date(item.timestamp).getTime()
                        : Date.now();
                const category = inferCategory(query);
                return {
                    id: genId(),
                    timestamp,
                    source: 'google_search' as const,
                    category,
                    title: query,
                    details: JSON.stringify(item.products || []),
                    entities: extractEntities(query),
                };
            })
            .filter((e: ShadowEvent) => !isNaN(e.timestamp));
    } catch {
        console.warn('Failed to parse Google Search history');
        return [];
    }
}
