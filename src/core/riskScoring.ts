import { ShadowEvent, Entity, RiskScore } from './types';

/**
 * Deterministic risk scoring engine.
 * Computes 5 risk dimensions + overall composite score (0-100).
 */
export function computeRiskScore(events: ShadowEvent[], entities: Entity[]): RiskScore {
    const piiDensity = computePIIDensity(events, entities);
    const locationLeakage = computeLocationLeakage(events);
    const financialExposure = computeFinancialExposure(events);
    const socialMapping = computeSocialMapping(events, entities);

    // Weighted composite
    const overall = Math.round(
        piiDensity * 0.3 +
        locationLeakage * 0.3 +
        financialExposure * 0.2 +
        socialMapping * 0.2
    );

    return {
        overall: Math.min(100, overall),
        piiDensity,
        locationLeakage,
        financialExposure,
        socialMapping,
    };
}

/**
 * PII Density: How many personal identifiers are found in the data.
 */
function computePIIDensity(events: ShadowEvent[], entities: Entity[]): number {
    let score = 0;
    const emailRe = /[\w.+-]+@[\w.-]+\.\w+/g;
    const phoneRe = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const ssnRe = /\b\d{3}-\d{2}-\d{4}\b/g;

    let emailCount = 0;
    let phoneCount = 0;
    let ssnCount = 0;
    let nameCount = 0;

    for (const event of events) {
        const text = `${event.title} ${event.details}`;
        emailCount += (text.match(emailRe) || []).length;
        phoneCount += (text.match(phoneRe) || []).length;
        ssnCount += (text.match(ssnRe) || []).length;
    }

    nameCount = entities.filter(e => e.type === 'person').length;

    // Scale: each type contributes proportionally
    score += Math.min(30, emailCount * 3);  // emails
    score += Math.min(25, phoneCount * 8);  // phones are more sensitive
    score += Math.min(30, ssnCount * 30);   // SSNs are critical
    score += Math.min(15, nameCount * 2);   // contact names

    return Math.min(100, score);
}

/**
 * Location Leakage: Uniqueness of locations, home/work inference potential.
 */
function computeLocationLeakage(events: ShadowEvent[]): number {
    const locationEvents = events.filter(e => e.category === 'location' || e.source === 'location');
    if (locationEvents.length === 0) return 0;

    let score = 0;
    const uniqueLocations = new Set(locationEvents.map(e => e.title));

    // More unique locations = more leakage
    score += Math.min(30, uniqueLocations.size * 2);

    // High frequency at any location suggests home/work (identifiable)
    const locationFreq = new Map<string, number>();
    for (const e of locationEvents) {
        locationFreq.set(e.title, (locationFreq.get(e.title) || 0) + 1);
    }
    const maxFreq = Math.max(...locationFreq.values());
    if (maxFreq > 5) score += 25; // likely home or work
    if (maxFreq > 20) score += 15;

    // Date span of location data
    const timestamps = locationEvents.map(e => e.timestamp).sort();
    const daySpan = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24);
    score += Math.min(30, daySpan * 0.5);

    return Math.min(100, Math.round(score));
}

/**
 * Financial Exposure: Financial service usage patterns.
 */
function computeFinancialExposure(events: ShadowEvent[]): number {
    const financialEvents = events.filter(e => e.category === 'financial');
    if (financialEvents.length === 0) return 0;

    let score = 0;
    score += Math.min(40, financialEvents.length * 4);

    // Check for specific financial patterns
    const allText = financialEvents.map(e => `${e.title} ${e.details}`).join(' ');
    if (/bank/i.test(allText)) score += 15;
    if (/credit/i.test(allText)) score += 15;
    if (/crypto|bitcoin|ethereum/i.test(allText)) score += 15;
    if (/invest|stock|portfolio/i.test(allText)) score += 10;
    if (/tax|irs|w-?2|1099/i.test(allText)) score += 15;

    return Math.min(100, Math.round(score));
}

/**
 * Social Mapping: Contact graph density and communication patterns.
 */
function computeSocialMapping(events: ShadowEvent[], entities: Entity[]): number {
    const personEntities = entities.filter(e => e.type === 'person');
    const commEvents = events.filter(e => e.category === 'communication' || e.category === 'social');
    if (personEntities.length === 0 && commEvents.length === 0) return 0;

    let score = 0;
    score += Math.min(35, personEntities.length * 3);
    score += Math.min(30, commEvents.length * 2);

    // High-frequency contacts are more revealing
    const topContacts = personEntities.sort((a, b) => b.mentions - a.mentions).slice(0, 5);
    const avgMentions = topContacts.reduce((s, e) => s + e.mentions, 0) / (topContacts.length || 1);
    score += Math.min(35, avgMentions * 5);

    return Math.min(100, Math.round(score));
}

