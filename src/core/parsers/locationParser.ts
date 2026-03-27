import { ShadowEvent, ParseError } from '../types';

let eventCounter = 0;
const genId = () => `loc_${Date.now()}_${eventCounter++}`;

export interface LocationResult {
    events: ShadowEvent[];
    errors: ParseError[];
}

/**
 * Parses Google Location History / Timeline JSON.
 * Supports:
 *  - New format: { locations: [{ latitudeE7, longitudeE7, timestamp (ISO), timestampMs, accuracy, source }] }
 *  - Old format: { locations: [{ timestampMs, latitudeE7, longitudeE7 }] }
 *  - Semantic format: { timelineObjects: [{ placeVisit: { location, duration } }] }
 *  - Simple array: [{ name, address, timestamp, lat, lng }]
 */
export function parseLocationHistory(raw: string, filename = 'Records.json'): LocationResult {
    const errors: ParseError[] = [];

    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return {
            events: [],
            errors: [{
                source: 'location',
                filename,
                message: 'File is not valid JSON.',
                suggestion: 'Upload Records.json from Google Takeout. Look inside Takeout/Location History (Timeline)/',
            }],
        };
    }

    const obj = data as any;

    // Format 1: { locations: [...] } — both old and new Google format
    if (obj.locations && Array.isArray(obj.locations)) {
        const events = obj.locations
            .slice(0, 10000) // limit for browser performance
            .map((loc: any) => {
                const lat = (loc.latitudeE7 || 0) / 1e7;
                const lng = (loc.longitudeE7 || 0) / 1e7;

                // New format uses ISO timestamp string, old uses timestampMs
                let timestamp: number;
                if (loc.timestamp && typeof loc.timestamp === 'string') {
                    timestamp = new Date(loc.timestamp).getTime();
                } else if (loc.timestampMs) {
                    timestamp = parseInt(loc.timestampMs);
                } else {
                    timestamp = 0;
                }

                return {
                    id: genId(),
                    timestamp,
                    source: 'location' as const,
                    category: 'location' as const,
                    title: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    details: `Accuracy: ${loc.accuracy || 'unknown'}m | Source: ${loc.source || 'unknown'}`,
                    entities: [`${lat.toFixed(2)},${lng.toFixed(2)}`],
                };
            })
            .filter((e: ShadowEvent) => e.timestamp > 0);

        return { events, errors };
    }

    // Format 2: { timelineObjects: [{ placeVisit: { location, duration } }] }
    if (obj.timelineObjects && Array.isArray(obj.timelineObjects)) {
        const events = obj.timelineObjects
            .filter((o: any) => o.placeVisit)
            .map((o: any) => {
                const visit = o.placeVisit;
                const name = visit.location?.name || 'Unknown Place';
                const address = visit.location?.address || '';
                const lat = visit.location?.latitudeE7 ? visit.location.latitudeE7 / 1e7 : null;
                const lng = visit.location?.longitudeE7 ? visit.location.longitudeE7 / 1e7 : null;

                let timestamp: number;
                if (visit.duration?.startTimestamp) {
                    timestamp = new Date(visit.duration.startTimestamp).getTime();
                } else if (visit.duration?.startTimestampMs) {
                    timestamp = parseInt(visit.duration.startTimestampMs);
                } else {
                    timestamp = Date.now();
                }

                const entities = [name];
                if (lat && lng) entities.push(`${lat.toFixed(2)},${lng.toFixed(2)}`);

                return {
                    id: genId(),
                    timestamp,
                    source: 'location' as const,
                    category: 'location' as const,
                    title: name,
                    details: address,
                    entities,
                };
            });

        return { events, errors };
    }

    // Format 3: Simple array of places
    if (Array.isArray(obj)) {
        const events = obj.map((item: any) => ({
            id: genId(),
            timestamp: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
            source: 'location' as const,
            category: 'location' as const,
            title: item.name || item.place || 'Unknown',
            details: item.address || '',
            entities: [item.name || item.place || 'Unknown'].filter(Boolean),
        }));
        return { events, errors };
    }

    errors.push({
        source: 'location',
        filename,
        message: 'Unrecognized location history format.',
        suggestion: 'Expected Records.json with a "locations" array, or Semantic Location History with "timelineObjects".',
    });
    return { events: [], errors };
}
