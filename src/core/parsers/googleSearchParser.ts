import { ShadowEvent, EventCategory, ParseError } from '../types';

let eventCounter = 0;
const genId = () => `evt_${Date.now()}_${eventCounter++}`;

// Category inference from query text
const CATEGORY_PATTERNS: [RegExp, EventCategory][] = [
    [/\b(bank|credit|loan|mortgage|invest|stock|crypto|salary|payment|paypal|venmo|tax|irs|401k|w-?2|1099|fico|credit.?score)\b/i, 'financial'],
    [/\b(hospital|doctor|symptom|medicine|pharmacy|health|dental|therapy|diagnosis|vitamin|clinic|medical|prescription|urgent.?care)\b/i, 'health'],
    [/\b(amazon|buy|shop|price|deal|coupon|order|ebay|walmart|best.?buy|target|etsy|cart|checkout)\b/i, 'shopping'],
    [/\b(flight|hotel|airbnb|travel|vacation|trip|booking|passport|airline|tsa|airport|airfare)\b/i, 'travel'],
];

function inferCategory(text: string): EventCategory {
    for (const [re, cat] of CATEGORY_PATTERNS) {
        if (re.test(text)) return cat;
    }
    return 'search';
}

function extractEntities(text: string): string[] {
    const entities: string[] = [];
    const emailRe = /[\w.+-]+@[\w.-]+\.\w+/g;
    const matches = text.match(emailRe);
    if (matches) entities.push(...matches);

    // Extract capitalized multi-word names
    const nameRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
    const nameMatches = text.match(nameRe);
    if (nameMatches) entities.push(...nameMatches);

    // Extract domain-like patterns
    const domainRe = /[\w-]+\.(com|org|net|io|gov|edu|co)/g;
    const domainMatches = text.match(domainRe);
    if (domainMatches) entities.push(...domainMatches);

    return [...new Set(entities)];
}

/**
 * Extract URL entities from a titleUrl
 */
function extractUrlEntities(url: string): string[] {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        return [hostname];
    } catch {
        return [];
    }
}

export interface GoogleSearchResult {
    events: ShadowEvent[];
    errors: ParseError[];
}

/**
 * Parses Google Takeout "My Activity" search history.
 * Real format: array of { header, title, titleUrl, time, products, subtitles?, details? }
 * Also supports: { title, query, time/timestamp }
 */
export function parseGoogleSearch(raw: string, filename = 'MyActivity.json'): GoogleSearchResult {
    const errors: ParseError[] = [];

    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return {
            events: [],
            errors: [{
                source: 'google_search',
                filename,
                message: 'File is not valid JSON.',
                suggestion: 'Make sure you\'re uploading MyActivity.json from Google Takeout. Look inside Takeout/My Activity/Search/',
            }],
        };
    }

    const items = Array.isArray(data) ? data : [];
    if (items.length === 0) {
        errors.push({
            source: 'google_search',
            filename,
            message: 'No search entries found in file.',
            suggestion: 'Expected a JSON array of search activity objects. Check that this is MyActivity.json from your Google Takeout.',
        });
        return { events: [], errors };
    }

    const events = items
        .filter((item: any) => item.title || item.query)
        .map((item: any) => {
            // Strip common prefixes from Google Takeout format
            let query = (item.title || item.query || '');
            query = query
                .replace(/^Searched for\s+/i, '')
                .replace(/^Visited\s+/i, '')
                .replace(/^Used\s+/i, '');

            const timestamp = item.time
                ? new Date(item.time).getTime()
                : item.timestamp
                    ? new Date(item.timestamp).getTime()
                    : Date.now();

            const category = inferCategory(query);
            const entities = extractEntities(query);

            // Extract entities from URL if available
            if (item.titleUrl) {
                entities.push(...extractUrlEntities(item.titleUrl));
            }

            return {
                id: genId(),
                timestamp,
                source: 'google_search' as const,
                category,
                title: query,
                details: JSON.stringify(item.products || []),
                entities: [...new Set(entities)],
            };
        })
        .filter((e: ShadowEvent) => !isNaN(e.timestamp));

    return { events, errors };
}
