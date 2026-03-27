import { ShadowEvent, Entity, EntityEdge, EntityGraph, EntityType } from './types';

/**
 * Builds an entity graph from all parsed events.
 * Extracts entities, deduplicates, and creates relationship edges.
 */
export function buildEntityGraph(events: ShadowEvent[]): EntityGraph {
    const entityMap = new Map<string, Entity>();
    const edgePairs = new Map<string, EntityEdge>();

    // Type inference from context
    function inferType(name: string, event: ShadowEvent): EntityType {
        if (name.includes('@')) return 'person';
        if (/^\d+\.\d+,\s*-?\d+\.\d+$/.test(name)) return 'location';
        if (event.category === 'location' || event.source === 'location') return 'location';
        if (event.category === 'financial') return 'financial';
        if (/\b(Inc|Corp|LLC|Ltd|Co|Company|Bank|University|Google|Apple|Microsoft|Amazon|Facebook|Meta)\b/i.test(name)) return 'organization';
        if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(name)) return 'person';
        return 'topic';
    }

    // Extract and register entities from each event
    for (const event of events) {
        const eventEntities: string[] = [];

        for (const raw of event.entities) {
            const key = raw.toLowerCase().trim();
            if (!key || key.length < 2) continue;

            if (!entityMap.has(key)) {
                entityMap.set(key, {
                    id: key,
                    type: inferType(raw, event),
                    name: raw,
                    mentions: 0,
                    firstSeen: event.timestamp,
                    lastSeen: event.timestamp,
                });
            }

            const entity = entityMap.get(key)!;
            entity.mentions++;
            entity.firstSeen = Math.min(entity.firstSeen, event.timestamp);
            entity.lastSeen = Math.max(entity.lastSeen, event.timestamp);
            eventEntities.push(key);
        }

        // Also extract entities from event title
        const titleEntities = extractTopicEntities(event.title);
        for (const name of titleEntities) {
            const key = name.toLowerCase().trim();
            if (!key || key.length < 3) continue;
            if (!entityMap.has(key)) {
                entityMap.set(key, {
                    id: key,
                    type: 'topic',
                    name,
                    mentions: 0,
                    firstSeen: event.timestamp,
                    lastSeen: event.timestamp,
                });
            }
            entityMap.get(key)!.mentions++;
            eventEntities.push(key);
        }

        // Create edges between co-occurring entities
        for (let i = 0; i < eventEntities.length; i++) {
            for (let j = i + 1; j < eventEntities.length; j++) {
                const a = eventEntities[i];
                const b = eventEntities[j];
                if (a === b) continue;
                const edgeKey = [a, b].sort().join('||');
                if (!edgePairs.has(edgeKey)) {
                    edgePairs.set(edgeKey, {
                        source: a,
                        target: b,
                        relationship: 'co-occurrence',
                        weight: 0,
                    });
                }
                edgePairs.get(edgeKey)!.weight++;
            }
        }
    }

    // Filter to top entities by mention count (keep graph manageable)
    const nodes = Array.from(entityMap.values())
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 150);

    const nodeSet = new Set(nodes.map(n => n.id));
    const edges = Array.from(edgePairs.values())
        .filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 300);

    return { nodes, edges };
}

/**
 * Extract topic entities from text using simple heuristics.
 */
function extractTopicEntities(text: string): string[] {
    const topics: string[] = [];

    // Extract quoted phrases
    const quoted = text.match(/"([^"]+)"/g);
    if (quoted) topics.push(...quoted.map(q => q.replace(/"/g, '')));

    // Extract domain-like patterns
    const domains = text.match(/[\w-]+\.(com|org|net|io|gov|edu)/g);
    if (domains) topics.push(...domains);

    return [...new Set(topics)];
}
