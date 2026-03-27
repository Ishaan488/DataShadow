import { jsPDF } from 'jspdf';
import { RiskScore, ShadowEvent, Entity, ThreatNarrative } from '../core/types';

/**
 * Generate a comprehensive PDF privacy audit report.
 */
export async function generatePDFReport(
    events: ShadowEvent[],
    entities: Entity[],
    riskScore: RiskScore,
    threats: ThreatNarrative[]
): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    try {
        // Fetch Unicode font (Noto Sans) to prevent international character corruption
        const res = await fetch('https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSans/NotoSans-Regular.ttf');
        const blob = await res.blob();
        const base64Font = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });
        
        doc.addFileToVFS('NotoSans.ttf', base64Font);
        doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
        doc.addFont('NotoSans.ttf', 'NotoSans', 'bold'); // Treat same file as bold to prevent crashes when bold is requested
    } catch (e) {
        console.warn('Failed to load Unicode font, falling back to Helvetica', e);
    }

    // Default to NotoSans if loaded, otherwise helvetica
    const fontFamily = doc.getFontList()['NotoSans'] ? 'NotoSans' : 'helvetica';

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const colors = {
        primary: [139, 92, 246] as [number, number, number],
        dark: [10, 10, 15] as [number, number, number],
        text: [51, 51, 60] as [number, number, number],
        muted: [120, 120, 140] as [number, number, number],
        green: [16, 185, 129] as [number, number, number],
        red: [239, 68, 68] as [number, number, number],
        orange: [245, 158, 11] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
    };

    function getRiskColor(score: number): [number, number, number] {
        if (score >= 70) return colors.red;
        if (score >= 50) return colors.orange;
        if (score >= 30) return colors.primary;
        return colors.green;
    }

    function getRiskLabel(score: number): string {
        if (score >= 70) return 'Critical';
        if (score >= 50) return 'Moderate';
        if (score >= 30) return 'Low';
        return 'Minimal';
    }

    function checkPage(needed: number) {
        if (y + needed > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
        }
    }

    function drawSectionTitle(title: string) {
        checkPage(15);
        doc.setFontSize(14);
        doc.setTextColor(...colors.primary);
        doc.setFont(fontFamily, 'bold');
        doc.text(title, margin, y);
        y += 2;
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + contentWidth, y);
        y += 8;
    }

    function drawText(text: string, fontSize = 10, color = colors.text, style: 'normal' | 'bold' = 'normal') {
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        doc.setFont('helvetica', style);
        const lines = doc.splitTextToSize(text, contentWidth);
        checkPage(lines.length * (fontSize * 0.4 + 1));
        doc.text(lines, margin, y);
        y += lines.length * (fontSize * 0.4 + 1);
    }

    function drawRiskBar(label: string, score: number, barY: number) {
        const barWidth = 80;
        const barHeight = 5;
        const barX = margin + 55;
        const riskColor = getRiskColor(score);

        doc.setFontSize(9);
        doc.setTextColor(...colors.text);
        doc.setFont(fontFamily, 'normal');
        doc.text(label, margin, barY + 4);

        // Track
        doc.setFillColor(230, 230, 235);
        doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');

        // Fill
        const fillWidth = (score / 100) * barWidth;
        doc.setFillColor(...riskColor);
        doc.roundedRect(barX, barY, fillWidth, barHeight, 2, 2, 'F');

        // Score
        doc.setFontSize(10);
        doc.setTextColor(...riskColor);
        doc.setFont(fontFamily, 'bold');
        doc.text(`${score}/100`, barX + barWidth + 5, barY + 4);
    }

    // ═══════════════════════════════════════════════════
    // COVER SECTION
    // ═══════════════════════════════════════════════════
    doc.setFillColor(...colors.dark);
    doc.rect(0, 0, pageWidth, 80, 'F');

    doc.setFontSize(28);
    doc.setTextColor(...colors.white);
    doc.setFont('helvetica', 'bold');
    doc.text('DataShadow', margin, 35);

    doc.setFontSize(12);
    doc.setTextColor(180, 180, 200);
    doc.setFont('helvetica', 'normal');
    doc.text('Privacy Audit Report', margin, 48);

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 140);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 60);
    doc.text(`Events Analyzed: ${events.length} | Entities Found: ${entities.length} | Data Sources: ${new Set(events.map(e => e.source)).size}`, margin, 68);

    y = 95;

    // ═══════════════════════════════════════════════════
    // OVERALL RISK SCORE
    // ═══════════════════════════════════════════════════
    drawSectionTitle('Overall Risk Assessment');

    const scoreColor = getRiskColor(riskScore.overall);
    doc.setFontSize(36);
    doc.setTextColor(...scoreColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`${riskScore.overall}`, margin, y + 8);

    doc.setFontSize(14);
    doc.text(` / 100`, margin + 22, y + 8);

    doc.setFontSize(12);
    doc.setTextColor(...scoreColor);
    doc.text(`Risk Level: ${getRiskLabel(riskScore.overall)}`, margin + 55, y + 5);

    y += 18;

    // Risk dimension bars
    drawRiskBar('PII Density', riskScore.piiDensity, y);
    y += 12;
    drawRiskBar('Location Leak', riskScore.locationLeakage, y);
    y += 12;
    drawRiskBar('Financial Exp.', riskScore.financialExposure, y);
    y += 12;
    drawRiskBar('Social Map', riskScore.socialMapping, y);
    y += 20;

    // ═══════════════════════════════════════════════════
    // DATA SOURCES ANALYZED
    // ═══════════════════════════════════════════════════
    drawSectionTitle('Data Sources Analyzed');

    const sourceMap = new Map<string, number>();
    for (const e of events) {
        sourceMap.set(e.source, (sourceMap.get(e.source) || 0) + 1);
    }

    const sourceLabels: Record<string, string> = {
        google_search: 'Google Search',
        youtube: 'YouTube',
        location: 'Location History',
        browser_history: 'Browser History',
        email: 'Email',
        social_media: 'Social Media',
    };

    for (const [source, count] of sourceMap.entries()) {
        const label = sourceLabels[source] || source;
        drawText(`• ${label}: ${count} events`, 10, colors.text);
        y += 1;
    }
    y += 5;

    // ═══════════════════════════════════════════════════
    // KEY ENTITIES
    // ═══════════════════════════════════════════════════
    drawSectionTitle('Key Entities Identified');

    const typeLabels: Record<string, string> = {
        person: 'Person',
        organization: 'Organization',
        location: 'Location',
        financial: 'Financial',
        topic: 'Topic',
    };

    const byType = new Map<string, Entity[]>();
    for (const e of entities) {
        const list = byType.get(e.type) || [];
        list.push(e);
        byType.set(e.type, list);
    }

    for (const [type, ents] of byType.entries()) {
        const topEnts = ents.sort((a, b) => b.mentions - a.mentions).slice(0, 5);
        drawText(`${typeLabels[type] || type} (${ents.length} total)`, 10, colors.primary, 'bold');
        y += 1;
        for (const ent of topEnts) {
            drawText(`    ${ent.name} — ${ent.mentions} mentions`, 9, colors.text);
        }
        y += 3;
    }

    // ═══════════════════════════════════════════════════
    // THREAT SCENARIOS
    // ═══════════════════════════════════════════════════
    doc.addPage();
    y = margin;
    drawSectionTitle('Threat Scenarios');

    for (let i = 0; i < threats.length; i++) {
        const threat = threats[i];
        checkPage(50);

        // Severity badge
        const sevColor = getRiskColor(
            threat.severity === 'critical' ? 90 : threat.severity === 'high' ? 65 : threat.severity === 'medium' ? 40 : 20
        );
        doc.setFillColor(...sevColor);
        doc.roundedRect(margin, y - 3, 18, 6, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setTextColor(...colors.white);
        doc.setFont(fontFamily, 'bold');
        doc.text(threat.severity.toUpperCase(), margin + 2, y + 1);

        // Title
        doc.setFontSize(12);
        doc.setTextColor(...colors.text);
        doc.setFont('helvetica', 'bold');
        doc.text(threat.title, margin + 22, y + 1);
        y += 8;

        // Attack vector
        drawText(`Attack Vector: ${threat.attackVector}`, 9, colors.muted);
        y += 2;

        // Narrative
        drawText(threat.narrative, 10, colors.text);
        y += 4;

        // Mitigations
        if (threat.mitigations && threat.mitigations.length > 0) {
            drawText('Recommended Mitigations:', 9, colors.green, 'bold');
            y += 1;
            for (const m of threat.mitigations) {
                drawText(`  - ${m}`, 9, colors.text);
            }
        }

        y += 10;
    }

    // ═══════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════
    checkPage(20);
    y += 10;
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    drawText('This report was generated by DataShadow — a client-side privacy audit tool.', 8, colors.muted);
    drawText('All data processing was performed locally in your browser. No personal data was transmitted to any server.', 8, colors.muted);
    drawText('For AI-generated threat scenarios, data was redacted before being sent to the Gemini API.', 8, colors.muted);

    // Save
    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`DataShadow_Report_${dateStr}.pdf`);
}
