import { ShadowEvent, Entity, RiskScore } from './types';

/**
 * Calibrated risk scoring engine.
 * Computes 4 risk dimensions + weighted overall composite score (0-100).
 *
 * Dimension weights:
 *   - PII Density:        30%
 *   - Location Leakage:   30%
 *   - Financial Exposure:  20%
 *   - Social Mapping:      20%
 */
export function computeRiskScore(events: ShadowEvent[], entities: Entity[]): RiskScore {
    const piiDensity = computePIIDensity(events, entities);
    const locationLeakage = computeLocationLeakage(events);
    const financialExposure = computeFinancialExposure(events);
    const socialMapping = computeSocialMapping(events, entities);

    const overall = Math.round(
        piiDensity * 0.3 +
        locationLeakage * 0.3 +
        financialExposure * 0.2 +
        socialMapping * 0.2
    );

    return {
        overall: clamp(overall),
        piiDensity,
        locationLeakage,
        financialExposure,
        socialMapping,
    };
}

/**
 * PII Density: Weighted scoring of personal identifiers.
 * SSN > Phone > Email > Person name > Username
 */
function computePIIDensity(events: ShadowEvent[], entities: Entity[]): number {
    const emailRe = /[\w.+-]+@[\w.-]+\.\w+/g;
    const phoneRe = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    const ssnRe = /\b\d{3}-\d{2}-\d{4}\b/g;
    const creditCardRe = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

    const uniqueEmails = new Set<string>();
    const uniquePhones = new Set<string>();
    let ssnCount = 0;
    let ccCount = 0;

    for (const event of events) {
        const text = `${event.title} ${event.details}`;
        const emails = text.match(emailRe);
        if (emails) emails.forEach(e => uniqueEmails.add(e.toLowerCase()));
        const phones = text.match(phoneRe);
        if (phones) phones.forEach(p => uniquePhones.add(p.replace(/[\s.-]/g, '')));
        ssnCount += (text.match(ssnRe) || []).length;
        ccCount += (text.match(creditCardRe) || []).length;
    }

    const personCount = entities.filter(e => e.type === 'person').length;

    let score = 0;
    // SSNs are critical — any presence is severe
    score += Math.min(35, ssnCount * 35);
    // Credit card numbers
    score += Math.min(25, ccCount * 25);
    // Unique phone numbers
    score += Math.min(20, uniquePhones.size * 6);
    // Unique email addresses
    score += Math.min(15, uniqueEmails.size * 2);
    // Person names identified
    score += Math.min(10, personCount * 1.5);

    return clamp(Math.round(score));
}

/**
 * Location Leakage: Entropy-based scoring + home/work anchor detection.
 *
 * Key signals:
 * - Shannon entropy of location distribution (more unique = more revealing)
 * - Home anchor: most frequent evening/night/early morning location
 * - Work anchor: most frequent weekday 9-17 location
 * - Temporal span of location data
 * - Unusual travel (locations far from centroid)
 */
function computeLocationLeakage(events: ShadowEvent[]): number {
    const locationEvents = events.filter(e => e.category === 'location' || e.source === 'location');
    if (locationEvents.length === 0) return 0;

    let score = 0;
    const locationTitles = locationEvents.map(e => e.title);
    const uniqueLocations = new Set(locationTitles);

    // 1. Shannon Entropy of locations (0-30 pts)
    const locationFreq = new Map<string, number>();
    for (const title of locationTitles) {
        locationFreq.set(title, (locationFreq.get(title) || 0) + 1);
    }
    const total = locationTitles.length;
    let entropy = 0;
    for (const count of locationFreq.values()) {
        const p = count / total;
        if (p > 0) entropy -= p * Math.log2(p);
    }
    // Entropy of 3+ bits means significant location diversity
    score += Math.min(30, entropy * 8);

    // 2. Home anchor detection (0-20 pts)
    const eveningLocations = new Map<string, number>();
    for (const e of locationEvents) {
        const hour = new Date(e.timestamp).getHours();
        if (hour >= 20 || hour <= 6) {
            eveningLocations.set(e.title, (eveningLocations.get(e.title) || 0) + 1);
        }
    }
    if (eveningLocations.size > 0) {
        const topEvening = [...eveningLocations.entries()].sort((a, b) => b[1] - a[1])[0];
        if (topEvening[1] >= 3) score += 20; // Home likely identified
    }

    // 3. Work anchor detection (0-15 pts)
    const workLocations = new Map<string, number>();
    for (const e of locationEvents) {
        const d = new Date(e.timestamp);
        const day = d.getDay();
        const hour = d.getHours();
        if (day >= 1 && day <= 5 && hour >= 9 && hour <= 17) {
            workLocations.set(e.title, (workLocations.get(e.title) || 0) + 1);
        }
    }
    if (workLocations.size > 0) {
        const topWork = [...workLocations.entries()].sort((a, b) => b[1] - a[1])[0];
        if (topWork[1] >= 5) score += 15; // Workplace likely identified
    }

    // 4. Temporal span (0-15 pts) — longer span = more data
    const timestamps = locationEvents.map(e => e.timestamp).sort();
    const daySpan = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24);
    score += Math.min(15, daySpan * 0.3);

    // 5. Number of unique locations (0-20 pts)
    score += Math.min(20, uniqueLocations.size * 0.5);

    return clamp(Math.round(score));
}

/**
 * Financial Exposure: Service-specific pattern detection with sensitivity weighting.
 *
 * Sensitivity tiers:
 *  Tax/SSN info > Crypto/Investment > Banking > Credit card > General financial
 */
function computeFinancialExposure(events: ShadowEvent[]): number {
    const financialEvents = events.filter(e => e.category === 'financial');
    if (financialEvents.length === 0) return 0;

    let score = 0;

    // Base score from volume
    score += Math.min(20, financialEvents.length * 2);

    const allText = events.map(e => `${e.title} ${e.details}`).join(' ').toLowerCase();

    // Tier 1: Critical (tax, SSN, W-2)
    if (/\b(tax|irs|w-?2|1099|tax.?return)\b/i.test(allText)) score += 20;

    // Tier 2: High (crypto, investment, 401k)
    if (/\b(crypto|bitcoin|ethereum|coinbase|binance)\b/i.test(allText)) score += 15;
    if (/\b(invest|stock|portfolio|401k|fidelity|vanguard|schwab)\b/i.test(allText)) score += 15;

    // Tier 3: Medium (banking)
    if (/\b(bank|chase|wells.?fargo|bofa|citibank|checking|savings|statement)\b/i.test(allText)) score += 12;

    // Tier 4: Lower (credit, payments)
    if (/\b(credit.?card|credit.?score|credit.?karma)\b/i.test(allText)) score += 10;
    if (/\b(paypal|venmo|zelle|payment)\b/i.test(allText)) score += 8;

    // Specific dollar amounts in text (strong signal)
    const dollarAmounts = allText.match(/\$[\d,]+\.?\d*/g);
    if (dollarAmounts && dollarAmounts.length > 0) score += Math.min(10, dollarAmounts.length * 3);

    return clamp(Math.round(score));
}

/**
 * Social Mapping: Contact graph density and communication patterns.
 *
 * Signals:
 * - Number of unique person entities
 * - Communication frequency
 * - Cross-source contact appearances (same person in multiple data sources)
 * - High-frequency contacts reveal close relationships
 */
function computeSocialMapping(events: ShadowEvent[], entities: Entity[]): number {
    const personEntities = entities.filter(e => e.type === 'person');
    const commEvents = events.filter(e => e.category === 'communication' || e.category === 'social');
    if (personEntities.length === 0 && commEvents.length === 0) return 0;

    let score = 0;

    // 1. Unique contacts identified (0-25 pts)
    score += Math.min(25, personEntities.length * 2.5);

    // 2. Communication volume (0-20 pts)
    score += Math.min(20, commEvents.length * 1.5);

    // 3. High-frequency contacts — top contacts with many mentions (0-25 pts)
    const topContacts = personEntities.sort((a, b) => b.mentions - a.mentions).slice(0, 10);
    if (topContacts.length > 0) {
        const avgMentions = topContacts.reduce((s, e) => s + e.mentions, 0) / topContacts.length;
        score += Math.min(25, avgMentions * 4);
    }

    // 4. Cross-source appearances (0-30 pts)
    // Track which sources each person entity appears in
    const personSources = new Map<string, Set<string>>();
    for (const event of events) {
        for (const entityId of event.entities) {
            const entity = personEntities.find(e => e.id === entityId || e.name.toLowerCase() === entityId.toLowerCase());
            if (entity) {
                if (!personSources.has(entity.id)) personSources.set(entity.id, new Set());
                personSources.get(entity.id)!.add(event.source);
            }
        }
    }
    const multiSourceContacts = [...personSources.values()].filter(s => s.size >= 2).length;
    score += Math.min(30, multiSourceContacts * 8);

    return clamp(Math.round(score));
}

function clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
}
