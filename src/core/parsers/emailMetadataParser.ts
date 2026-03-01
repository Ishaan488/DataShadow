import { ShadowEvent, EventCategory } from '../types';

let eventCounter = 0;
const genId = () => `em_${Date.now()}_${eventCounter++}`;

const CATEGORY_PATTERNS: [RegExp, EventCategory][] = [
    [/\b(invoice|receipt|payment|bank|statement|transaction)\b/i, 'financial'],
    [/\b(order|shipping|delivery|purchase|amazon)\b/i, 'shopping'],
    [/\b(flight|booking|itinerary|hotel|reservation)\b/i, 'travel'],
    [/\b(appointment|prescription|lab.?results?|health)\b/i, 'health'],
];

function inferCategory(subject: string): EventCategory {
    for (const [re, cat] of CATEGORY_PATTERNS) {
        if (re.test(subject)) return cat;
    }
    return 'communication';
}

function extractEmails(text: string): string[] {
    const re = /[\w.+-]+@[\w.-]+\.\w+/g;
    return [...new Set(text.match(re) || [])];
}

/**
 * Parses email metadata from various formats.
 * Supports: JSON array of { from, to, subject, date, ... }
 */
export function parseEmailMetadata(raw: string): ShadowEvent[] {
    try {
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : data.messages || data.emails || [];
        return items
            .filter((item: any) => item.subject || item.from)
            .map((item: any) => {
                const subject = item.subject || '(no subject)';
                const from = item.from || '';
                const to = item.to || '';
                const timestamp = item.date
                    ? new Date(item.date).getTime()
                    : item.timestamp
                        ? new Date(item.timestamp).getTime()
                        : Date.now();
                const category = inferCategory(subject);
                const entities = extractEmails(`${from} ${to}`);
                return {
                    id: genId(),
                    timestamp,
                    source: 'email' as const,
                    category,
                    title: subject,
                    details: `From: ${from} → To: ${to}`,
                    entities,
                };
            })
            .filter((e: ShadowEvent) => !isNaN(e.timestamp));
    } catch {
        console.warn('Failed to parse Email Metadata');
        return [];
    }
}
