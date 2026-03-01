import { ThreatNarrative, RiskScore, ShadowEvent, Entity } from '../types';
import { PIIRedactor } from '../piiRedactor';

const redactor = new PIIRedactor();

/**
 * Generate threat narratives using OpenAI-compatible API.
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

    const entitySummary = entities
        .slice(0, 20)
        .map(e => `${e.type}: ${redactor.redact(e.name)} (${e.mentions} mentions)`)
        .join('\n');

    const prompt = `You are a cybersecurity analyst for a privacy audit tool called MyShadow. 
Based on the following REDACTED user data profile, generate a threat analysis report.

USER DATA PROFILE (all PII redacted):
${summary}

KEY ENTITIES (redacted):
${entitySummary}

Generate exactly 4 threat narratives in the following JSON array format. Each item must have:
- "id": unique string
- "title": short descriptive title
- "severity": one of "critical", "high", "medium", "low"
- "narrative": 2-3 sentence description of the threat
- "attackVector": the type of attack (phishing, social engineering, credential stuffing, etc.)
- "simulatedEmail": a redacted example phishing email body that an attacker could craft using this data (use [NAME], [COMPANY], etc as placeholders)
- "socialEngScript": a brief social engineering phone script
- "mitigations": array of 3-4 specific remediation steps

Respond with ONLY the JSON array, no other text.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 3000,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return getDefaultThreats(riskScore);

        const threats: ThreatNarrative[] = JSON.parse(jsonMatch[0]);
        return threats;
    } catch (error) {
        console.warn('GenAI threat generation failed:', error);
        return getDefaultThreats(riskScore);
    }
}

/**
 * Default threat narratives when GenAI is unavailable.
 */
export function getDefaultThreats(riskScore: RiskScore): ThreatNarrative[] {
    const threats: ThreatNarrative[] = [];

    if (riskScore.piiDensity > 20) {
        threats.push({
            id: 'threat_pii',
            title: 'Personal Information Harvesting',
            severity: riskScore.piiDensity > 60 ? 'critical' : 'high',
            narrative: `Your data exports contain a significant density of personal identifiers including email addresses and contact information. An attacker who obtains this data could cross-reference multiple sources to build a comprehensive identity profile. This profile enables highly targeted attacks.`,
            attackVector: 'Identity Compilation & Targeted Phishing',
            simulatedEmail: `Subject: Urgent: Verify Your Account Information\n\nDear [NAME],\n\nWe noticed unusual activity on your account associated with [EMAIL]. As a security measure, we need you to verify your identity.\n\nPlease click the link below to confirm your details:\n[MALICIOUS_LINK]\n\nThis email was generated based on publicly available information from your digital footprint.\n\nBest regards,\nSecurity Team`,
            socialEngScript: `"Hello, is this [NAME]? I'm calling from [ORGANIZATION] regarding your account ending in [LAST_4]. We've detected suspicious activity and need to verify your identity. Can you confirm your date of birth and the email address on file?"`,
            mitigations: [
                'Use unique email aliases for different services',
                'Enable two-factor authentication on all accounts',
                'Regularly audit which services have your personal information',
                'Use a password manager with unique passwords per service',
            ],
        });
    }

    if (riskScore.locationLeakage > 20) {
        threats.push({
            id: 'threat_location',
            title: 'Location Pattern Exploitation',
            severity: riskScore.locationLeakage > 60 ? 'critical' : 'high',
            narrative: `Your location data reveals predictable patterns including frequent visits to specific locations, likely including home and workplace. An adversary could use this information for physical surveillance, stalking, or to craft location-aware social engineering attacks.`,
            attackVector: 'Physical Surveillance & Location-Based Phishing',
            simulatedEmail: `Subject: Special Offer at [FREQUENT_LOCATION]!\n\nHi [NAME],\n\nAs a regular visitor to [AREA], we'd like to offer you an exclusive deal at our new location near [NEARBY_LANDMARK].\n\nClaim your offer: [MALICIOUS_LINK]\n\nThis message demonstrates how location data can be weaponized for targeted attacks.`,
            socialEngScript: `"Hi [NAME], this is [FAKE_NAME] from [LOCAL_BUSINESS] near [HOME_AREA]. We're offering a free security assessment for residents in your neighborhood. I just need to confirm your address to schedule the visit."`,
            mitigations: [
                'Disable location history in Google account settings',
                'Review and delete old location data regularly',
                'Turn off location services when not needed',
                'Be cautious of location-specific offers from unknown senders',
            ],
        });
    }

    if (riskScore.financialExposure > 20) {
        threats.push({
            id: 'threat_financial',
            title: 'Financial Profile Attack',
            severity: riskScore.financialExposure > 60 ? 'critical' : 'high',
            narrative: `Your digital footprint reveals financial service usage patterns including banking, investment, or cryptocurrency activities. This information allows attackers to craft convincing financial fraud schemes tailored to the specific services you use.`,
            attackVector: 'Financial Fraud & Account Takeover',
            simulatedEmail: `Subject: Important Update to Your [BANK_NAME] Account\n\nDear Valued Customer,\n\nWe've updated our security protocols. Your account requires immediate verification to continue uninterrupted service.\n\nVerify now: [MALICIOUS_LINK]\n\nIf you did not request this change, please call us at [SPOOFED_NUMBER].`,
            socialEngScript: `"Hello [NAME], I'm calling from [BANK_NAME]'s fraud department. We've detected a suspicious transaction of [AMOUNT] on your account. I need to verify your identity to freeze the transaction. Can you provide your account number?"`,
            mitigations: [
                'Never click financial links in emails — always navigate directly to your bank\'s website',
                'Set up transaction alerts for all financial accounts',
                'Use dedicated email addresses for financial services',
                'Enable multi-factor authentication on all financial accounts',
            ],
        });
    }

    if (riskScore.socialMapping > 20) {
        threats.push({
            id: 'threat_social',
            title: 'Social Network Exploitation',
            severity: riskScore.socialMapping > 60 ? 'high' : 'medium',
            narrative: `Your contact network and communication patterns reveal close relationships that could be exploited through impersonation or trust-based attacks. An attacker could pose as a known contact to extract sensitive information or initiate fraudulent transactions.`,
            attackVector: 'Contact Impersonation & Trust Exploitation',
            simulatedEmail: `Subject: Hey, quick favor?\n\nHey [NAME],\n\nIt's [FRIEND_NAME]. I'm in a bit of a bind — lost my wallet while traveling and need a quick wire transfer. Can you help me out? I'll pay you back Monday.\n\nThanks,\n[FRIEND_NAME]`,
            socialEngScript: `"Hey [NAME], it's [FRIEND_NAME]'s assistant. [FRIEND_NAME] is in a meeting but asked me to reach out — there's an urgent payment that needs to go through. Can you authorize it?"`,
            mitigations: [
                'Always verify unusual requests through a separate communication channel',
                'Be skeptical of urgent financial requests, even from known contacts',
                'Limit publicly visible contact lists on social media',
                'Establish verification codes with close contacts for emergencies',
            ],
        });
    }



    // Always include at least one general threat
    if (threats.length === 0) {
        threats.push({
            id: 'threat_general',
            title: 'Digital Footprint Awareness',
            severity: 'low',
            narrative: `While your current data exposure is relatively low, any digital footprint provides some information that could be used in targeted attacks. Maintaining good security hygiene is essential to prevent future exposure.`,
            attackVector: 'General Social Engineering',
            simulatedEmail: `Subject: Account Security Update\n\nDear User,\n\nPlease review your account security settings. Click here to verify: [MALICIOUS_LINK]`,
            socialEngScript: `"Hello, I'm calling from your service provider. We're conducting a routine security check..."`,
            mitigations: [
                'Regularly review your privacy settings across all platforms',
                'Use strong, unique passwords for each service',
                'Enable two-factor authentication everywhere possible',
                'Periodically request and review your data exports',
            ],
        });
    }

    return threats;
}
