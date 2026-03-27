import { ShadowEvent, EventCategory, ParseError } from '../types';

let eventCounter = 0;
const genId = () => `em_${Date.now()}_${eventCounter++}`;

const CATEGORY_PATTERNS: [RegExp, EventCategory][] = [
    [/\b(invoice|receipt|payment|bank|statement|transaction|tax|w-?2|401k|portfolio|credit|payroll|pay.?stub)\b/i, 'financial'],
    [/\b(order|shipping|delivery|purchase|amazon|shipped|confirmation|tracking)\b/i, 'shopping'],
    [/\b(flight|booking|itinerary|hotel|reservation|airline|airbnb|boarding.?pass)\b/i, 'travel'],
    [/\b(appointment|prescription|lab.?results?|health|doctor|clinic|pharmacy|medical)\b/i, 'health'],
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

function extractOrgFromDomain(email: string): string | null {
    const match = email.match(/@([\w.-]+)\./);
    if (!match) return null;
    const domain = match[1].toLowerCase();
    // Skip generic domains
    if (['gmail', 'yahoo', 'hotmail', 'outlook', 'protonmail', 'icloud', 'aol', 'mail'].includes(domain)) return null;
    return domain.charAt(0).toUpperCase() + domain.slice(1);
}

export interface EmailResult {
    events: ShadowEvent[];
    errors: ParseError[];
}

/**
 * Parses email metadata from various formats.
 * Supports:
 *  - JSON array of { from, to, subject, date, ... }
 *  - Google Takeout Gmail JSON: { messages: [...] }
 */
export function parseEmailMetadata(raw: string, filename = 'emails.json'): EmailResult {
    const errors: ParseError[] = [];

    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return {
            events: [],
            errors: [{
                source: 'email',
                filename,
                message: 'File is not valid JSON.',
                suggestion: 'Export your email metadata as JSON. Gmail doesn\'t natively export JSON — use a tool like Google Takeout MBOX converter or export from your email client.',
            }],
        };
    }

    const obj = data as any;
    const items = Array.isArray(obj) ? obj : obj.messages || obj.emails || obj.mail || [];

    if (!Array.isArray(items) || items.length === 0) {
        errors.push({
            source: 'email',
            filename,
            message: 'No email entries found.',
            suggestion: 'Expected a JSON array with objects containing "from", "to", and "subject" fields.',
        });
        return { events: [], errors };
    }

    const events = items
        .filter((item: any) => item.subject || item.from)
        .map((item: any) => {
            const subject = item.subject || '(no subject)';
            const from = item.from || '';
            const to = item.to || '';
            const cc = item.cc || '';

            const timestamp = item.date
                ? new Date(item.date).getTime()
                : item.timestamp
                    ? (typeof item.timestamp === 'number'
                        ? (item.timestamp > 1e12 ? item.timestamp : item.timestamp * 1000)
                        : new Date(item.timestamp).getTime())
                    : Date.now();

            const category = inferCategory(subject);
            const emailEntities = extractEmails(`${from} ${to} ${cc}`);

            // Extract organization names from email domains
            const entities = [...emailEntities];
            for (const email of emailEntities) {
                const org = extractOrgFromDomain(email);
                if (org) entities.push(org);
            }

            return {
                id: genId(),
                timestamp,
                source: 'email' as const,
                category,
                title: subject,
                details: `From: ${from} → To: ${to}`,
                entities: [...new Set(entities)],
            };
        })
        .filter((e: ShadowEvent) => !isNaN(e.timestamp));

    return { events, errors };
}
