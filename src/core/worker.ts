import { parseGoogleSearch } from './parsers/googleSearchParser';
import { parseYouTubeHistory } from './parsers/youtubeParser';
import { parseLocationHistory } from './parsers/locationParser';
import { parseBrowserHistory } from './parsers/browserHistoryParser';
import { parseEmailMetadata } from './parsers/emailMetadataParser';
import { parseSocialMedia } from './parsers/socialMediaParser';
import { buildEntityGraph } from './entityGraph';
import { computeRiskScore } from './riskScoring';

const parsers: Record<string, Function> = {
    google_search: parseGoogleSearch,
    youtube: parseYouTubeHistory,
    location: parseLocationHistory,
    browser_history: parseBrowserHistory,
    email: parseEmailMetadata,
    social_media: parseSocialMedia,
};

console.log("DataShadow Web Worker initialized successfully.");

self.onmessage = async (e) => {
    const { action, payload, msgId } = e.data;

    try {
        if (action === 'PARSE_FILE') {
            const { file, source } = payload;
            let events = [];
            let errors = [];

            // Massive File Handling (OOM Prevention)
            // If the file is huge (e.g. Google Takeout Records.json > 50MB), we use chunked regex parsing
            if (source === 'location' && file.size > 50 * 1024 * 1024) {
                const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
                let offset = 0;
                let buf = '';
                const blockRegex = /\{[^{}]*"latitudeE7"[^{}]*\}/g;
                let parsedCount = 0;

                while (offset < file.size) {
                    const slice = file.slice(offset, offset + CHUNK_SIZE);
                    const text = await slice.text();
                    buf += text;

                    let match;
                    let lastIndex = 0;
                    
                    while ((match = blockRegex.exec(buf)) !== null) {
                        try {
                            const loc = JSON.parse(match[0]);
                            const lat = (loc.latitudeE7 || 0) / 1e7;
                            const lng = (loc.longitudeE7 || 0) / 1e7;
                            let timestamp = 0;
                            
                            if (loc.timestamp && typeof loc.timestamp === 'string') {
                                timestamp = new Date(loc.timestamp).getTime();
                            } else if (loc.timestampMs) {
                                timestamp = parseInt(loc.timestampMs);
                            }

                            if (timestamp > 0) {
                                events.push({
                                    id: `loc_${Date.now()}_${parsedCount++}`,
                                    timestamp,
                                    source: 'location',
                                    category: 'location',
                                    title: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                                    details: `Accuracy: ${loc.accuracy || 'unknown'}m`,
                                    entities: [`${lat.toFixed(2)},${lng.toFixed(2)}`],
                                });
                            }
                        } catch (err) {
                            // Silently ignore malformed objects at chunk boundaries
                        }
                        lastIndex = match.index + match[0].length;
                    }

                    // Keep unparsed remainder to join with next chunk
                    buf = buf.substring(lastIndex);
                    offset += CHUNK_SIZE;

                    // Progress update for UI
                    self.postMessage({ type: 'PROGRESS', msgId, payload: { percent: Math.round((offset / file.size) * 100) } });
                }
            } else {
                // Standard Fast Memory Parsing for normal files
                const text = await file.text();
                const parser = parsers[source] || (() => ({ events: [], errors: [] }));
                const result = parser(text, file.name);
                events = result.events;
                errors = result.errors;
            }

            self.postMessage({ type: 'SUCCESS', msgId, payload: { events, errors, file: { name: file.name, source, size: file.size } } });
        }

        if (action === 'PROCESS_GRAPHS') {
            const { events } = payload;
            
            self.postMessage({ type: 'PROGRESS', msgId, payload: { step: 'Building entity graph...' } });
            const graph = buildEntityGraph(events);
            
            self.postMessage({ type: 'PROGRESS', msgId, payload: { step: 'Computing risk scores...' } });
            const risk = computeRiskScore(events, graph.nodes);
            
            self.postMessage({ type: 'SUCCESS', msgId, payload: { graph, risk } });
        }
    } catch (error: any) {
        self.postMessage({ type: 'ERROR', msgId, error: error.message || String(error) });
    }
};
