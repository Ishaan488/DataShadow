import { ShadowEvent, ParseError } from '../types';

let eventCounter = 0;
const genId = () => `yt_${Date.now()}_${eventCounter++}`;

const CATEGORY_PATTERNS: [RegExp, string][] = [
    [/\b(invest|stock|crypto|bitcoin|money|financial|trading|bank)\b/i, 'financial'],
    [/\b(health|medical|symptom|workout|fitness|doctor|nutrition)\b/i, 'health'],
    [/\b(travel|flight|hotel|city.?guide|destination)\b/i, 'travel'],
    [/\b(cook|recipe|food|baking|meal)\b/i, 'other'],
];

function inferVideoCategory(title: string): string {
    for (const [re, cat] of CATEGORY_PATTERNS) {
        if (re.test(title)) return cat;
    }
    return 'video';
}

export interface YouTubeResult {
    events: ShadowEvent[];
    errors: ParseError[];
}

/**
 * Parses YouTube watch/search history from Google Takeout.
 * Real format: array of { header, title, titleUrl, time, products, subtitles?, details?, activityControls? }
 */
export function parseYouTubeHistory(raw: string, filename = 'watch-history.json'): YouTubeResult {
    const errors: ParseError[] = [];

    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return {
            events: [],
            errors: [{
                source: 'youtube',
                filename,
                message: 'File is not valid JSON.',
                suggestion: 'Upload watch-history.json from Google Takeout. Look inside Takeout/YouTube and YouTube Music/history/',
            }],
        };
    }

    const items = Array.isArray(data) ? data : [];
    if (items.length === 0) {
        errors.push({
            source: 'youtube',
            filename,
            message: 'No YouTube history entries found.',
            suggestion: 'Expected a JSON array of watch history objects.',
        });
        return { events: [], errors };
    }

    const events = items
        .filter((item: any) => item.title)
        .map((item: any) => {
            let title = (item.title || '');
            title = title.replace(/^Watched\s+/i, '').replace(/^Searched for\s+/i, '');

            const channel = item.subtitles?.[0]?.name || '';
            const timestamp = item.time
                ? new Date(item.time).getTime()
                : Date.now();

            // Extract video ID from URL
            let videoId = '';
            if (item.titleUrl) {
                const match = item.titleUrl.match(/[?&]v=([^&]+)/);
                if (match) videoId = match[1];
            }

            const entities: string[] = [];
            if (channel) entities.push(channel);

            const category = inferVideoCategory(title);

            return {
                id: genId(),
                timestamp,
                source: 'youtube' as const,
                category: category as any,
                title,
                details: channel ? `Channel: ${channel}${videoId ? ` | Video: ${videoId}` : ''}` : '',
                entities,
            };
        })
        .filter((e: ShadowEvent) => !isNaN(e.timestamp));

    return { events, errors };
}
