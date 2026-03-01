import { RiskScore } from '../core/types';

interface Props {
    score: RiskScore;
}

function getColor(score: number): string {
    if (score >= 70) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#8b5cf6';
    return '#10b981';
}

function getLabel(score: number): string {
    if (score >= 70) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 30) return 'Moderate';
    return 'Low';
}

export default function RiskGauge({ score }: Props) {
    const value = score.overall;
    const color = getColor(value);
    const label = getLabel(value);

    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="risk-gauge">
            <svg viewBox="0 0 200 200">
                <circle
                    className="gauge-bg"
                    cx="100"
                    cy="100"
                    r={radius}
                />
                <circle
                    className="gauge-fill"
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke={color}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="gauge-center">
                <div className="gauge-score" style={{ color }}>{value}</div>
                <div className="gauge-label">Risk Score</div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span
                    className="risk-level-badge"
                    style={{
                        background: `${color}22`,
                        color: color,
                    }}
                >
                    {label}
                </span>
            </div>
        </div>
    );
}
