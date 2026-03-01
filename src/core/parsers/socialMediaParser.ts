import { ShadowEvent } from '../types';

let eventCounter = 0;
const genId = () => `soc_${Date.now()}_${eventCounter++}`;

/**
 * Parses social media archive exports (Facebook/Instagram/Twitter JSON).
 */
export function parseSocialMedia(raw: string): ShadowEvent[] {
    try {
        const data = JSON.parse(raw);

        // Facebook format: posts_v2, messages, comments, etc.
        const results: ShadowEvent[] = [];

        // Generic array of posts/messages
        const items = Array.isArray(data)
            ? data
            : data.posts || data.messages || data.tweets || data.media || [];

        for (const item of items) {
            const text = item.text || item.content || item.title || item.data?.[0]?.post || '';
            if (!text) continue;

            const timestamp = item.timestamp
                ? (typeof item.timestamp === 'number'
                    ? (item.timestamp > 1e12 ? item.timestamp : item.timestamp * 1000)
                    : new Date(item.timestamp).getTime())
                : item.created_at
                    ? new Date(item.created_at).getTime()
                    : item.date
                        ? new Date(item.date).getTime()
                        : Date.now();

            const sender = item.sender_name || item.author || item.user?.name || '';
            const entities: string[] = [];
            if (sender) entities.push(sender);

            // Extract @mentions
            const mentions = text.match(/@[\w.]+/g);
            if (mentions) entities.push(...mentions.map((m: string) => m.slice(1)));

            results.push({
                id: genId(),
                timestamp,
                source: 'social_media',
                category: 'social',
                title: text.slice(0, 120),
                details: sender ? `By: ${sender}` : '',
                entities: [...new Set(entities)],
            });
        }

        return results.filter(e => !isNaN(e.timestamp));
    } catch {
        console.warn('Failed to parse Social Media data');
        return [];
    }
}
