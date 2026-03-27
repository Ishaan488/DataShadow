import { ShadowEvent, ParseError } from '../types';

let eventCounter = 0;
const genId = () => `soc_${Date.now()}_${eventCounter++}`;

export interface SocialMediaResult {
    events: ShadowEvent[];
    errors: ParseError[];
}

// Parses social media archive exports.
// Supports:
//  - Facebook: your_posts_1.json (data[].post), messages/inbox/name/message_1.json
//  - Instagram: liked_posts.json, comments.json
//  - Twitter/X: tweets.js (strips window.YTD prefix), tweet.json
//  - Generic: array of { text/content, timestamp/created_at, sender_name/author }
export function parseSocialMedia(raw: string, filename = 'posts.json'): SocialMediaResult {
    const errors: ParseError[] = [];

    // Twitter exports wrap JSON in a JS variable assignment
    let cleaned = raw.trim();
    const twitterPrefixRe = /^window\.YTD\.\w+\.part\d+\s*=\s*/;
    if (twitterPrefixRe.test(cleaned)) {
        cleaned = cleaned.replace(twitterPrefixRe, '');
        // Strip trailing semicolon
        if (cleaned.endsWith(';')) cleaned = cleaned.slice(0, -1);
    }

    let data: unknown;
    try {
        data = JSON.parse(cleaned);
    } catch {
        return {
            events: [],
            errors: [{
                source: 'social_media',
                filename,
                message: 'File is not valid JSON.',
                suggestion: 'Upload your social media archive JSON. For Twitter, use tweets.js from your data export. For Facebook, use your_posts_1.json.',
            }],
        };
    }

    const obj = data as any;
    const results: ShadowEvent[] = [];

    // Facebook posts format: array of { timestamp, data: [{ post }], title }
    if (Array.isArray(obj) && obj[0]?.data?.[0]?.post !== undefined) {
        for (const item of obj) {
            const text = item.data?.[0]?.post || item.title || '';
            if (!text) continue;
            const ts = item.timestamp
                ? (item.timestamp > 1e12 ? item.timestamp : item.timestamp * 1000)
                : Date.now();
            results.push(makeSocialEvent(text, ts, 'Facebook User', filename));
        }
        return { events: results, errors };
    }

    // Twitter tweet objects: array of { tweet: { full_text, created_at, id_str } }
    if (Array.isArray(obj) && obj[0]?.tweet) {
        for (const item of obj) {
            const tw = item.tweet;
            const text = tw.full_text || tw.text || '';
            if (!text) continue;
            const ts = tw.created_at ? new Date(tw.created_at).getTime() : Date.now();
            results.push(makeSocialEvent(text, ts, 'Twitter User', filename));
        }
        return { events: results, errors };
    }

    // Generic array of posts/messages
    const items = Array.isArray(obj)
        ? obj
        : obj.posts || obj.messages || obj.tweets || obj.media || obj.comments || [];

    if (!Array.isArray(items) || items.length === 0) {
        errors.push({
            source: 'social_media',
            filename,
            message: 'No social media entries found.',
            suggestion: 'Expected a JSON array of posts/messages with "text" or "content" fields.',
        });
        return { events: [], errors };
    }

    for (const item of items) {
        const text = item.text || item.content || item.title || item.data?.[0]?.post || item.body || '';
        if (!text) continue;

        let timestamp: number;
        if (item.timestamp) {
            if (typeof item.timestamp === 'number') {
                timestamp = item.timestamp > 1e12 ? item.timestamp : item.timestamp * 1000;
            } else {
                timestamp = new Date(item.timestamp).getTime();
            }
        } else if (item.created_at) {
            timestamp = new Date(item.created_at).getTime();
        } else if (item.date) {
            timestamp = new Date(item.date).getTime();
        } else {
            timestamp = Date.now();
        }

        const sender = item.sender_name || item.author || item.user?.name || item.screen_name || '';
        results.push(makeSocialEvent(text, timestamp, sender, filename));
    }

    return { events: results.filter(e => !isNaN(e.timestamp)), errors };
}

function makeSocialEvent(text: string, timestamp: number, sender: string, _filename: string): ShadowEvent {
    const entities: string[] = [];
    if (sender) entities.push(sender);

    // Extract @mentions
    const mentions = text.match(/@[\w.]+/g);
    if (mentions) entities.push(...mentions.map((m: string) => m.slice(1)));

    // Extract #hashtags as topics
    const hashtags = text.match(/#\w+/g);
    if (hashtags) entities.push(...hashtags.map((h: string) => h.slice(1)));

    // Extract URLs for domain entities
    const urls = text.match(/https?:\/\/[\w.-]+/g);
    if (urls) {
        for (const url of urls) {
            try {
                entities.push(new URL(url).hostname.replace(/^www\./, ''));
            } catch { /* skip */ }
        }
    }

    return {
        id: genId(),
        timestamp,
        source: 'social_media',
        category: 'social',
        title: text.slice(0, 200),
        details: sender ? `By: ${sender}` : '',
        entities: [...new Set(entities)],
    };
}
