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
     * Build a rich, chronological redacted summary of events to fully utilize the GenAI context window.
     */
    buildRedactedSummary(
        events: Array<{ timestamp: number; title: string; category: string; source: string }>,
        riskBreakdown: Record<string, number>
    ): string {
        const categoryCount = new Map<string, number>();
        const sourceCount = new Map<string, number>();

        // We can pass up to ~1000 events safely within even a small fraction of the 1M token window
        const maxTimelineEvents = 1000;
        const timeline: string[] = [];

        // Sort events chronologically to help the LLM understand behavioral flow
        const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

        for (let i = 0; i < sortedEvents.length; i++) {
            const event = sortedEvents[i];
            categoryCount.set(event.category, (categoryCount.get(event.category) || 0) + 1);
            sourceCount.set(event.source, (sourceCount.get(event.source) || 0) + 1);
            
            if (timeline.length < maxTimelineEvents) {
                const date = new Date(event.timestamp).toISOString().split('T');
                const timeStr = `${date[0]} ${date[1].slice(0, 5)}`; // YYYY-MM-DD HH:MM
                timeline.push(`[${timeStr}] [${event.source.toUpperCase()}] ${event.category}: ${this.redact(event.title)}`);
            }
        }

        const lines: string[] = [
            `Total events analyzed: ${events.length}`,
            '',
            'Risk scores:',
            ...Object.entries(riskBreakdown).map(([k, v]) => `  - ${k}: ${v}/100`),
            '',
            'Data sources breakdown:',
            ...Array.from(sourceCount.entries()).map(([k, v]) => `  - ${k}: ${v}`),
            '',
            `CHRONOLOGICAL EVENT TIMELINE (First ${timeline.length} events, redacted):`,
            ...timeline
        ];

        return lines.join('\n');
    }
}
