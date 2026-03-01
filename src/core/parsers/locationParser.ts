import { ShadowEvent } from '../types';

let eventCounter = 0;
const genId = () => `loc_${Date.now()}_${eventCounter++}`;

/**
 * Parses Google Location History / Timeline JSON.
 * Supports both old format (locations[]) and new semantic format (timelineObjects[]).
 */
export function parseLocationHistory(raw: string): ShadowEvent[] {
    try {
        const data = JSON.parse(raw);

        // Old format: { locations: [{ timestampMs, latitudeE7, longitudeE7 }] }
        if (data.locations && Array.isArray(data.locations)) {
            return data.locations
                .slice(0, 5000) // limit for performance
                .map((loc: any) => {
                    const lat = (loc.latitudeE7 || 0) / 1e7;
                    const lng = (loc.longitudeE7 || 0) / 1e7;
                    const timestamp = parseInt(loc.timestampMs || loc.timestamp || '0');
                    return {
                        id: genId(),
                        timestamp,
                        source: 'location' as const,
                        category: 'location' as const,
                        title: `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                        details: `Accuracy: ${loc.accuracy || 'unknown'}m`,
                        entities: [`${lat.toFixed(2)},${lng.toFixed(2)}`],
                    };
                })
                .filter((e: ShadowEvent) => e.timestamp > 0);
        }

        // New format: { timelineObjects: [{ placeVisit: { location: { name, address } } }] }
        if (data.timelineObjects && Array.isArray(data.timelineObjects)) {
            return data.timelineObjects
                .filter((obj: any) => obj.placeVisit)
                .map((obj: any) => {
                    const visit = obj.placeVisit;
                    const name = visit.location?.name || 'Unknown Place';
                    const address = visit.location?.address || '';
                    const timestamp = visit.duration?.startTimestampMs
                        ? parseInt(visit.duration.startTimestampMs)
                        : Date.now();
                    return {
                        id: genId(),
                        timestamp,
                        source: 'location' as const,
                        category: 'location' as const,
                        title: name,
                        details: address,
                        entities: [name],
                    };
                });
        }

        // Semantic location history (array of places)
        if (Array.isArray(data)) {
            return data.map((item: any) => ({
                id: genId(),
                timestamp: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
                source: 'location' as const,
                category: 'location' as const,
                title: item.name || item.place || 'Unknown',
                details: item.address || '',
                entities: [item.name || item.place || 'Unknown'].filter(Boolean),
            }));
        }

        return [];
    } catch {
        console.warn('Failed to parse Location History');
        return [];
    }
}
