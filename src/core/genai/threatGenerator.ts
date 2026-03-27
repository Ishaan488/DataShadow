import { GoogleGenerativeAI } from '@google/generative-ai';
import { ThreatNarrative, RiskScore, ShadowEvent, Entity } from '../types';
import { PIIRedactor } from '../piiRedactor';

const redactor = new PIIRedactor();

/**
 * Generate threat narratives using Google Gemini API.
 * All data is redacted before transmission.
 */
export async function generateThreats(
    apiKey: string,
    events: ShadowEvent[],
    entities: Entity[],
    riskScore: RiskScore
): Promise<ThreatNarrative[]> {
    const summary = redactor.buildRedactedSummary(
        events.map(e => ({ title: e.title, category: e.category, source: e.source })),
        {
            overall: riskScore.overall,
            piiDensity: riskScore.piiDensity,
            locationLeakage: riskScore.locationLeakage,
            financialExposure: riskScore.financialExposure,
            socialMapping: riskScore.socialMapping,
        }
    );

    // Build richer entity summary with relationship context
    const entityByType = new Map<string, Entity[]>();
    for (const e of entities.slice(0, 30)) {
        const list = entityByType.get(e.type) || [];
        list.push(e);
        entityByType.set(e.type, list);
    }

    const entitySummary = [...entityByType.entries()]
        .map(([type, ents]) => {
            const items = ents
                .slice(0, 8)
                .map(e => `  - ${redactor.redact(e.name)} (${e.mentions} mentions, seen in ${formatDateRange(e.firstSeen, e.lastSeen)})`)
                .join('\n');
            return `${type.toUpperCase()} entities:\n${items}`;
        })
        .join('\n\n');

    // Identify behavioral patterns for richer prompt context
    const patterns = identifyPatterns(events, entities);

    const prompt = `You are an elite red-team cybersecurity analyst conducting a privacy audit for a tool called DataShadow.
Based on the following REDACTED user data profile, generate realistic attack scenarios that demonstrate how leaked personal data can be weaponized.

USER DATA PROFILE (all PII has been redacted with placeholders):
${summary}

KEY ENTITIES BY TYPE:
${entitySummary}

BEHAVIORAL PATTERNS DETECTED:
${patterns}

INSTRUCTIONS:
Generate exactly 3 distinct threat narratives targeting this user. Each must use a DIFFERENT attack vector.
Make each attack scenario feel disturbingly realistic — reference the user's actual patterns, routines, and interests (using redacted placeholders).

Required attack vectors (one each):
1. SPEAR PHISHING EMAIL — Craft a complete, formatted email that uses the user's real interests, services, and routines to appear legitimate
2. PRETEXTING PHONE CALL — Write a social engineering script for a phone call exploiting the user's organizational relationships
3. PHYSICAL/OSINT ATTACK — Describe how location patterns and social connections could enable a physical-world attack

Respond with ONLY a JSON array. Each object must have:
- "id": unique string (threat_1, threat_2, threat_3)
- "title": short attack name
- "severity": "critical" | "high" | "medium" | "low" (based on feasibility and impact)
- "narrative": 3-4 sentence description of the attack, what data enables it, and potential impact
- "attackVector": the attack technique name
- "simulatedEmail": a complete realistic phishing email (with Subject, From, Body). Use [PLACEHOLDER] for redacted items
- "socialEngScript": a realistic phone script an attacker would use
- "mitigations": array of 4 specific, actionable remediation steps

CRITICAL: Output ONLY the JSON array. No markdown, no explanation, no code fences.`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent(prompt);
        const content = result.response.text();

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.warn('Failed to extract JSON from Gemini response:', content.slice(0, 200));
            return getDefaultThreats(riskScore, events, entities);
        }

        const threats: ThreatNarrative[] = JSON.parse(jsonMatch[0]);

        // Validate structure
        const valid = threats.every(t =>
            t.id && t.title && t.severity && t.narrative &&
            t.attackVector && t.mitigations && Array.isArray(t.mitigations)
        );
        if (!valid) {
            console.warn('Gemini response had invalid threat structure, using defaults');
            return getDefaultThreats(riskScore, events, entities);
        }

        return threats;
    } catch (error: any) {
        console.warn('Gemini threat generation failed:', error);

        // Provide user-friendly error messages
        if (error?.message?.includes('API_KEY_INVALID') || error?.status === 400) {
            console.error('Invalid Gemini API key. Get one from https://aistudio.google.com/apikey');
        } else if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
            console.error('Gemini API rate limit exceeded (429 Too Many Requests). This is expected on the free tier. Falling back to default threat narratives.');
            alert('Gemini API rate limit exceeded (Too Many Requests). Falling back to default threat narratives.');
        } else {
            console.error('An unexpected error occurred with Gemini. Falling back to default threat narratives.');
        }

        return getDefaultThreats(riskScore, events, entities);
    }
}

/**
 * Identify behavioral patterns from events for richer prompt context.
 */
function identifyPatterns(events: ShadowEvent[], entities: Entity[]): string {
    const lines: string[] = [];

    // Location routine
    const locationEvents = events.filter(e => e.category === 'location');
    if (locationEvents.length > 0) {
        const locFreq = new Map<string, number>();
        for (const e of locationEvents) {
            locFreq.set(e.title, (locFreq.get(e.title) || 0) + 1);
        }
        const topLocs = [...locFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        lines.push(`Top locations visited: ${topLocs.map(([name, count]) => `${redactor.redact(name)} (${count}x)`).join(', ')}`);
    }

    // Financial services
    const financialEvents = events.filter(e => e.category === 'financial');
    if (financialEvents.length > 0) {
        const services = new Set<string>();
        const allText = financialEvents.map(e => `${e.title} ${e.details}`).join(' ');
        if (/chase/i.test(allText)) services.add('Chase Bank');
        if (/coinbase|crypto|bitcoin/i.test(allText)) services.add('Cryptocurrency');
        if (/fidelity|401k|vanguard/i.test(allText)) services.add('Retirement/Investment');
        if (/credit.?karma|credit.?score/i.test(allText)) services.add('Credit Monitoring');
        if (services.size > 0) lines.push(`Financial services used: ${[...services].join(', ')}`);
    }

    // Communication frequency
    const topPeople = entities.filter(e => e.type === 'person').sort((a, b) => b.mentions - a.mentions).slice(0, 5);
    if (topPeople.length > 0) {
        lines.push(`Most frequent contacts: ${topPeople.map(p => `${redactor.redact(p.name)} (${p.mentions} interactions)`).join(', ')}`);
    }

    // Interests from search/video
    const searchEvents = events.filter(e => e.source === 'google_search' || e.source === 'youtube');
    const interests = new Set<string>();
    for (const e of searchEvents.slice(0, 50)) {
        if (/travel|flight|hotel|airbnb|tokyo|japan/i.test(e.title)) interests.add('Travel');
        if (/invest|stock|crypto|financial/i.test(e.title)) interests.add('Finance');
        if (/react|typescript|coding|programming|github/i.test(e.title)) interests.add('Software Development');
        if (/health|fitness|gym|running/i.test(e.title)) interests.add('Health & Fitness');
    }
    if (interests.size > 0) lines.push(`Key interests: ${[...interests].join(', ')}`);

    // Temporal patterns
    if (events.length > 0) {
        const timestamps = events.map(e => e.timestamp).sort();
        const daySpan = Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24));
        lines.push(`Data spans ${daySpan} days with ${events.length} total events`);
    }

    return lines.length > 0 ? lines.join('\n') : 'Insufficient data for pattern analysis.';
}

function formatDateRange(start: number, end: number): string {
    const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return s === e ? s : `${s} – ${e}`;
}

/**
 * Data-driven default threat narratives when GenAI is unavailable.
 * Uses actual data patterns to fill in placeholders.
 */
export function getDefaultThreats(riskScore: RiskScore, events?: ShadowEvent[], entities?: Entity[]): ThreatNarrative[] {
    const threats: ThreatNarrative[] = [];

    // Extract real data points for more relevant defaults
    const topOrg = entities?.find(e => e.type === 'organization')?.name || 'your employer';
    const topPerson = entities?.find(e => e.type === 'person')?.name || 'a known contact';
    const topLocation = events?.find(e => e.category === 'location')?.title || 'your frequent location';

    if (riskScore.piiDensity > 20) {
        threats.push({
            id: 'threat_pii',
            title: 'Targeted Identity Theft via Data Aggregation',
            severity: riskScore.piiDensity > 60 ? 'critical' : 'high',
            narrative: `Your data exports contain ${riskScore.piiDensity > 50 ? 'a significant concentration' : 'multiple instances'} of personal identifiers including email addresses, contact names, and organizational affiliations. An attacker aggregating these across sources could build a comprehensive identity profile enabling account takeover, fraudulent applications, or precise impersonation attacks.`,
            attackVector: 'Identity Compilation & Targeted Phishing',
            simulatedEmail: `Subject: Urgent: Verify Your ${topOrg} Account\n\nDear [NAME],\n\nWe've detected unusual sign-in activity on your account from a new device in [LOCATION]. As part of our enhanced security protocol, we need you to verify your identity within 24 hours to avoid account suspension.\n\nPlease confirm your information here:\n[MALICIOUS_LINK]\n\nThis verification request was generated because your account at ${topOrg} is flagged for review.\n\nBest regards,\nIT Security Team\n${topOrg}`,
            socialEngScript: `"Hello, is this [NAME]? I'm calling from ${topOrg}'s IT security team. We've detected unauthorized access to your work email from a location in [CITY]. I need to verify your identity before I can secure the account. Can you confirm the email address associated with your ${topOrg} account?"`,
            mitigations: [
                'Use unique email aliases for different services (e.g., Gmail + aliases)',
                'Enable hardware security keys (YubiKey) for critical accounts',
                'Regularly audit which services have your personal information via privacy dashboards',
                'Set up breach monitoring with Have I Been Pwned or similar services',
            ],
        });
    }

    if (riskScore.locationLeakage > 20) {
        threats.push({
            id: 'threat_location',
            title: 'Location Pattern Exploitation & Physical Targeting',
            severity: riskScore.locationLeakage > 60 ? 'critical' : 'high',
            narrative: `Your location history reveals predictable daily routines including likely home and workplace locations. With ${riskScore.locationLeakage > 50 ? 'high confidence' : 'moderate confidence'}, an adversary could identify where you live, work, exercise, and socialize. This enables physical surveillance, burglary timing, stalking, or hyper-targeted location-aware phishing.`,
            attackVector: 'Physical Surveillance & Location-Based Social Engineering',
            simulatedEmail: `Subject: Exclusive Offer for Residents Near ${topLocation}\n\nHi [NAME],\n\nAs a valued community member near ${topLocation}, you've been selected for a complimentary home security assessment.\n\nOur team will be in your neighborhood this week. Schedule your free consultation:\n[MALICIOUS_LINK]\n\nLimited to 10 households — first come, first served.\n\nBest,\n[FAKE_SECURITY_COMPANY]`,
            socialEngScript: `"Hi [NAME], this is [FAKE_NAME] from [LOCAL_BUSINESS] near ${topLocation}. We're doing a neighborhood outreach program and I noticed you're a regular in the area. We have a special offer for local residents — I just need to confirm your home address to send the details."`,
            mitigations: [
                'Disable location history in Google Account → Data & Privacy → Location History',
                'Audit and delete historical location data via Google Timeline',
                'Disable location services when not actively needed for navigation',
                'Review which apps have "Always" location permission and restrict to "While Using"',
            ],
        });
    }

    if (riskScore.financialExposure > 20) {
        threats.push({
            id: 'threat_financial',
            title: 'Financial Service Impersonation Attack',
            severity: riskScore.financialExposure > 60 ? 'critical' : 'high',
            narrative: `Your digital footprint reveals usage of specific financial services including banking, investment, and possibly cryptocurrency platforms. An attacker knowing which institutions you use can craft convincing service-specific fraud — from fake transaction alerts to fraudulent account recovery flows.`,
            attackVector: 'Financial Fraud & Account Takeover',
            simulatedEmail: `Subject: Action Required: Suspicious Transaction Alert\n\nDear Valued Customer,\n\nWe detected an unauthorized transaction of $3,247.00 from your account on ${new Date().toLocaleDateString()}.\n\nIf you did NOT authorize this transaction, click below immediately to secure your account:\n[MALICIOUS_LINK]\n\nFailure to respond within 2 hours may result in permanent loss of funds.\n\nFraud Prevention Team\n[FINANCIAL_INSTITUTION]`,
            socialEngScript: `"Hello [NAME], I'm calling from [BANK]'s fraud prevention department. We've flagged a suspicious wire transfer of $3,247 from your account. I need to verify your identity before I can block it. Can you confirm your date of birth and the last four digits of your account number?"`,
            mitigations: [
                'Never click financial links in emails — always navigate directly to your bank\'s official website',
                'Enable transaction alerts for all amounts on all financial accounts',
                'Use a dedicated email address exclusively for financial services',
                'Enable multi-factor authentication (preferably hardware key) on all financial accounts',
            ],
        });
    }

    if (riskScore.socialMapping > 20) {
        threats.push({
            id: 'threat_social',
            title: 'Contact Network Exploitation via Impersonation',
            severity: riskScore.socialMapping > 60 ? 'high' : 'medium',
            narrative: `Your contact network reveals ${riskScore.socialMapping > 50 ? 'detailed' : 'meaningful'} relationship patterns. Close contacts like ${topPerson} appear across multiple data sources, revealing professional and personal relationships. An attacker could impersonate these trusted contacts for BEC (Business Email Compromise) or personal manipulation.`,
            attackVector: 'Contact Impersonation & Business Email Compromise',
            simulatedEmail: `Subject: Quick favor — urgent\n\nHey [NAME],\n\nIt's ${topPerson}. I'm traveling and my phone died — using a temp email. Can you do me a huge favor? I need to pay for something urgently but my cards are locked. Could you send $500 via Zelle/Venmo? I'll pay you back first thing Monday.\n\nSorry to bother you with this!\n\n${topPerson}`,
            socialEngScript: `"Hey [NAME], it's ${topPerson}'s assistant. ${topPerson} is in a meeting but asked me to reach out urgently. There's a vendor payment that needs authorization today and ${topPerson} can't access email. Can you approve the invoice I'm about to send?"`,
            mitigations: [
                'Always verify unusual requests through a SEPARATE communication channel (call the person directly)',
                'Establish a verbal passphrase with close contacts for emergency financial requests',
                'Limit publicly visible contact lists and friend lists on social media',
                'Be extremely skeptical of urgency in any financial request, even from known contacts',
            ],
        });
    }

    // Always include at least one threat
    if (threats.length === 0) {
        threats.push({
            id: 'threat_general',
            title: 'Digital Footprint Awareness',
            severity: 'low',
            narrative: 'While your current data exposure is relatively limited, any digital footprint provides some information that could be used in targeted attacks. Maintaining good security hygiene prevents future exposure escalation.',
            attackVector: 'General Social Engineering',
            simulatedEmail: `Subject: Account Security Update Required\n\nDear User,\n\nAs part of our annual security review, we require all users to re-verify their account credentials.\n\nComplete verification: [MALICIOUS_LINK]\n\nThis is a routine security measure.`,
            socialEngScript: `"Hello, I'm calling from your service provider's security team. We're conducting a routine verification of accounts in your area. Can I confirm some details?"`,
            mitigations: [
                'Regularly review privacy settings across all platforms',
                'Use strong, unique passwords with a password manager',
                'Enable two-factor authentication everywhere possible',
                'Periodically request and review your data exports to understand your exposure',
            ],
        });
    }

    return threats;
}
