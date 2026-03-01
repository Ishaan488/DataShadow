import { ShadowEvent } from '../types';

let eventCounter = 0;
const genId = () => `yt_${Date.now()}_${eventCounter++}`;

/**
 * Parses YouTube watch/search history from Google Takeout.
 * Expected: array of { title, titleUrl, time, subtitles?, details? }
 */
export function parseYouTubeHistory(raw: string): ShadowEvent[] {
    try {
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : [];
        return items
            .filter((item: any) => item.title)
            .map((item: any) => {
                const title = (item.title || '').replace(/^Watched\s+/i, '');
                const channel = item.subtitles?.[0]?.name || '';
                const timestamp = item.time
                    ? new Date(item.time).getTime()
                    : Date.now();
                return {
                    id: genId(),
                    timestamp,
                    source: 'youtube' as const,
                    category: 'video' as const,
                    title,
                    details: channel ? `Channel: ${channel}` : '',
                    entities: channel ? [channel] : [],
                };
            })
            .filter((e: ShadowEvent) => !isNaN(e.timestamp));
    } catch {
        console.warn('Failed to parse YouTube history');
        return [];
    }
}
