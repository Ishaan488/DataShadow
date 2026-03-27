import { useState } from 'react';
import { useShadow } from '../store/shadowStore';
import { ThreatNarrative } from '../core/types';
import { AlertTriangle, Mail, Phone, Shield, ChevronDown, ChevronUp } from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#8b5cf6',
    low: '#10b981',
};

const SEVERITY_BG: Record<string, string> = {
    critical: 'rgba(239, 68, 68, 0.1)',
    high: 'rgba(245, 158, 11, 0.1)',
    medium: 'rgba(139, 92, 246, 0.1)',
    low: 'rgba(16, 185, 129, 0.1)',
};

export default function ThreatsView() {
    const { state } = useShadow();
    const { threats } = state;

    if (threats.length === 0) {
        return (
            <div className="threats-empty">
                <AlertTriangle size={40} strokeWidth={1.5} />
                <p>No threat narratives generated yet.</p>
            </div>
        );
    }

    return (
        <div className="threats-view">
            <div className="threats-header">
                <h3><AlertTriangle size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Threat Analysis</h3>
                <p className="text-muted">{threats.length} attack scenarios identified from your data</p>
            </div>
            <div className="threats-list">
                {threats.map((threat, i) => (
                    <ThreatCard key={threat.id || i} threat={threat} index={i} />
                ))}
            </div>
        </div>
    );
}

function ThreatCard({ threat, index }: { threat: ThreatNarrative; index: number }) {
    const [expanded, setExpanded] = useState(index === 0);
    const [activeTab, setActiveTab] = useState<'email' | 'script'>('email');
    const color = SEVERITY_COLORS[threat.severity] || '#6b7280';

    return (
        <div
            className="threat-card fade-in"
            style={{ animationDelay: `${index * 0.1}s`, borderLeftColor: color }}
        >
            <div className="threat-card-header" onClick={() => setExpanded(!expanded)}>
                <div className="threat-title-row">
                    <span
                        className="severity-badge"
                        style={{ background: SEVERITY_BG[threat.severity], color }}
                    >
                        {threat.severity.toUpperCase()}
                    </span>
                    <h4>{threat.title}</h4>
                </div>
                <div className="threat-meta-row">
                    <span className="attack-vector-badge">{threat.attackVector}</span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {expanded && (
                <div className="threat-card-body slide-in">
                    {/* Narrative */}
                    <div className="threat-narrative">
                        <p>{threat.narrative}</p>
                    </div>

                    {/* Artifact Tabs */}
                    <div className="artifact-tabs">
                        <button
                            className={`artifact-tab ${activeTab === 'email' ? 'active' : ''}`}
                            onClick={() => setActiveTab('email')}
                        >
                            <Mail size={14} /> Phishing Email
                        </button>
                        <button
                            className={`artifact-tab ${activeTab === 'script' ? 'active' : ''}`}
                            onClick={() => setActiveTab('script')}
                        >
                            <Phone size={14} /> Social Eng. Script
                        </button>
                    </div>

                    {/* Email Artifact */}
                    {activeTab === 'email' && threat.simulatedEmail && (
                        <div className="email-artifact">
                            <EmailDisplay content={threat.simulatedEmail} />
                        </div>
                    )}

                    {/* Script Artifact */}
                    {activeTab === 'script' && threat.socialEngScript && (
                        <div className="script-artifact">
                            <div className="script-header">
                                <Phone size={14} />
                                <span>Incoming Call — Social Engineering Script</span>
                            </div>
                            <div className="script-body">
                                {threat.socialEngScript}
                            </div>
                        </div>
                    )}

                    {/* Mitigations */}
                    {threat.mitigations && threat.mitigations.length > 0 && (
                        <div className="mitigations">
                            <div className="mitigations-header">
                                <Shield size={14} />
                                <span>Recommended Mitigations</span>
                            </div>
                            <ul>
                                {threat.mitigations.map((m, i) => (
                                    <li key={i}>{m}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function EmailDisplay({ content }: { content: string }) {
    // Parse subject and body from the email content
    const lines = content.split('\n');
    let subject = '';
    let from = '';
    const bodyLines: string[] = [];
    let inBody = false;

    for (const line of lines) {
        if (line.startsWith('Subject:')) {
            subject = line.replace('Subject:', '').trim();
        } else if (line.startsWith('From:')) {
            from = line.replace('From:', '').trim();
        } else if (subject && (line.trim() === '' || inBody)) {
            inBody = true;
            bodyLines.push(line);
        } else if (!subject) {
            bodyLines.push(line);
        }
    }

    const body = bodyLines.join('\n').trim() || content;

    return (
        <div className="email-display">
            <div className="email-chrome">
                <div className="email-dot red" />
                <div className="email-dot yellow" />
                <div className="email-dot green" />
                <span className="email-app-title">Mail</span>
            </div>
            {subject && (
                <div className="email-subject-line">
                    <strong>Subject:</strong> {subject}
                </div>
            )}
            {from && (
                <div className="email-from-line">
                    <strong>From:</strong> <span className="suspicious-sender">{from}</span>
                </div>
            )}
            <div className="email-to-line">
                <strong>To:</strong> <span>you@example.com</span>
            </div>
            <div className="email-divider" />
            <div className="email-body">
                {body.split('\n').map((line, i) => {
                    // Highlight malicious links
                    if (line.includes('[MALICIOUS_LINK]')) {
                        const parts = line.split('[MALICIOUS_LINK]');
                        return (
                            <p key={i}>
                                {parts[0]}
                                <span className="malicious-link">https://secure-verify.example.com/auth</span>
                                {parts[1]}
                            </p>
                        );
                    }
                    return <p key={i}>{line || '\u00A0'}</p>;
                })}
            </div>
            <div className="email-warning">
                <AlertTriangle size={12} />
                <span>This is a simulated phishing email based on your data profile</span>
            </div>
        </div>
    );
}
