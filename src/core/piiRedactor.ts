/**
 * PII Redactor — sanitizes data before sending to GenAI.
 * Replaces emails, phone numbers, names, and locations with consistent placeholders.
 */

const emailRe = /[\w.+-]+@[\w.-]+\.\w+/g;
const phoneRe = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const ssnRe = /\b\d{3}-\d{2}-\d{4}\b/g;
const coordRe = /\b-?\d{1,3}\.\d{4,},?\s*-?\d{1,3}\.\d{4,}\b/g;
const ipRe = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

export class PIIRedactor {
    private personMap = new Map<string, string>();
    private locationMap = new Map<string, string>();
    private emailMap = new Map<string, string>();
    private personCounter = 1;
    private locationCounter = 1;
    private emailCounter = 1;

    /**
     * Redact PII from text, returning sanitized version.
     */
    redact(text: string): string {
        let result = text;

        // Redact SSNs first (most sensitive)
        result = result.replace(ssnRe, '[SSN_REDACTED]');

        // Redact emails with consistent mapping
        result = result.replace(emailRe, (match) => {
            if (!this.emailMap.has(match)) {
                this.emailMap.set(match, `[EMAIL_${this.emailCounter++}]`);
            }
            return this.emailMap.get(match)!;
        });

        // Redact phone numbers
        result = result.replace(phoneRe, '[PHONE_REDACTED]');

        // Redact coordinates
        result = result.replace(coordRe, '[COORDS_REDACTED]');

        // Redact IP addresses
        result = result.replace(ipRe, '[IP_REDACTED]');

        return result;
    }

    /**
     * Redact a person name with consistent placeholder.
     */
    redactName(name: string): string {
        const key = name.toLowerCase();
        if (!this.personMap.has(key)) {
            this.personMap.set(key, `PERSON_${this.personCounter++}`);
        }
        return `[${this.personMap.get(key)}]`;
    }

    /**
     * Redact a location with consistent placeholder.
     */
    redactLocation(location: string): string {
        const key = location.toLowerCase();
        if (!this.locationMap.has(key)) {
            this.locationMap.set(key, `LOCATION_${this.locationCounter++}`);
        }
        return `[${this.locationMap.get(key)}]`;
    }

    /**
     * Build a redacted summary of events for GenAI consumption.
     */
    buildRedactedSummary(
        events: Array<{ title: string; category: string; source: string }>,
        riskBreakdown: Record<string, number>
    ): string {
        const categoryCount = new Map<string, number>();
        const sourceCount = new Map<string, number>();
        const redactedTopics: string[] = [];

        for (const event of events) {
            categoryCount.set(event.category, (categoryCount.get(event.category) || 0) + 1);
            sourceCount.set(event.source, (sourceCount.get(event.source) || 0) + 1);
            if (redactedTopics.length < 30) {
                redactedTopics.push(this.redact(event.title));
            }
        }

        const lines: string[] = [
            `Total events analyzed: ${events.length}`,
            '',
            'Event categories:',
            ...Array.from(categoryCount.entries()).map(([k, v]) => `  - ${k}: ${v}`),
            '',
            'Data sources:',
            ...Array.from(sourceCount.entries()).map(([k, v]) => `  - ${k}: ${v}`),
            '',
            'Risk scores:',
            ...Object.entries(riskBreakdown).map(([k, v]) => `  - ${k}: ${v}/100`),
            '',
            'Sample topics (redacted):',
            ...redactedTopics.map(t => `  - ${t}`),
        ];

        return lines.join('\n');
    }
}
