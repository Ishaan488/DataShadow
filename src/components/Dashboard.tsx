import { useShadow } from '../store/shadowStore';
import RiskGauge from './RiskGauge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Database, Users, MapPin, Clock, Calendar } from 'lucide-react';

const SOURCE_COLORS: Record<string, string> = {
    google_search: '#8b5cf6',
    youtube: '#ef4444',
    location: '#10b981',
    browser_history: '#3b82f6',
    email: '#06b6d4',
    social_media: '#ec4899',
    unknown: '#6b7280',
};

const SOURCE_LABELS: Record<string, string> = {
    google_search: 'Google Search',
    youtube: 'YouTube',
    location: 'Location',
    browser_history: 'Browser History',
    email: 'Email',
    social_media: 'Social Media',
    unknown: 'Other',
};

function getRiskColor(score: number): string {
    if (score >= 70) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#8b5cf6';
    return '#10b981';
}

export default function Dashboard() {
    const { state } = useShadow();
    const { events, entities, riskScore } = state;

    if (!riskScore) {
        return (
            <div className="page">
                <div className="page-header">
                    <h2>Dashboard</h2>
                    <p>No analysis data yet. Go back to upload and analyze data.</p>
                </div>
            </div>
        );
    }

    // Stats
    const uniqueEntities = entities.length;
    const dataSources = new Set(events.map(e => e.source)).size;
    const timestamps = events.map(e => e.timestamp).sort();
    const dateRange = timestamps.length > 1
        ? `${new Date(timestamps[0]).toLocaleDateString()} — ${new Date(timestamps[timestamps.length - 1]).toLocaleDateString()}`
        : 'N/A';

    // Source distribution for chart
    const sourceMap = new Map<string, number>();
    for (const e of events) {
        sourceMap.set(e.source, (sourceMap.get(e.source) || 0) + 1);
    }
    const sourceData = Array.from(sourceMap.entries()).map(([name, count]) => ({
        name: SOURCE_LABELS[name] || name,
        count,
        fill: SOURCE_COLORS[name] || '#6b7280',
    }));

    // Category distribution
    const catMap = new Map<string, number>();
    for (const e of events) {
        catMap.set(e.category, (catMap.get(e.category) || 0) + 1);
    }
    const catData = Array.from(catMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

    // Timeline sparkline (events per day)
    const dayMap = new Map<string, number>();
    for (const e of events) {
        const day = new Date(e.timestamp).toISOString().slice(0, 10);
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
    const timelineData = Array.from(dayMap.entries())
        .sort()
        .map(([date, count]) => ({ date: date.slice(5), count }));

    // Risk dimensions
    const riskDims = [
        { label: 'PII Density', value: riskScore.piiDensity, desc: 'Personal identifiers found' },
        { label: 'Location Leakage', value: riskScore.locationLeakage, desc: 'Location patterns exposed' },
        { label: 'Financial Exposure', value: riskScore.financialExposure, desc: 'Financial data visible' },
        { label: 'Social Mapping', value: riskScore.socialMapping, desc: 'Contact network revealed' },
    ];

    return (
        <div className="page">
            <div className="page-header">
                <h2>Privacy Risk Dashboard</h2>
                <p>Analysis of your digital shadow across {dataSources} data sources</p>
            </div>

            <div className="dashboard-grid">
                {/* Risk Gauge */}
                <div className="card risk-gauge-card fade-in">
                    <RiskGauge score={riskScore} />
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                            Composite risk from {events.length} events
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="stats-grid fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="card stat-card">
                        <div className="stat-value">{events.length.toLocaleString()}</div>
                        <div className="stat-label"><Database size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Total Events</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-value">{uniqueEntities}</div>
                        <div className="stat-label"><Users size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Entities Found</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-value">{dataSources}</div>
                        <div className="stat-label"><MapPin size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Data Sources</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-value" style={{ fontSize: 16, lineHeight: 1.8 }}>{dateRange}</div>
                        <div className="stat-label"><Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Date Range</div>
                    </div>
                </div>

                {/* Risk Breakdown */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <div className="card-title" style={{ marginBottom: 16 }}>Risk Breakdown</div>
                    <div className="risk-breakdown fade-in" style={{ animationDelay: '0.2s' }}>
                        {riskDims.map((dim) => (
                            <div key={dim.label} className="card risk-bar-card">
                                <div className="risk-bar-header">
                                    <span className="risk-bar-label">{dim.label}</span>
                                    <span className="risk-bar-value" style={{ color: getRiskColor(dim.value) }}>{dim.value}</span>
                                </div>
                                <div className="risk-bar-track">
                                    <div
                                        className="risk-bar-fill"
                                        style={{
                                            width: `${dim.value}%`,
                                            background: getRiskColor(dim.value),
                                        }}
                                    />
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{dim.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                {/* Activity Timeline */}
                <div className="card chart-card fade-in" style={{ animationDelay: '0.3s' }}>
                    <div className="card-header">
                        <span className="card-title"><Clock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Activity Timeline</span>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineData}>
                                <defs>
                                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#55556a' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#55556a' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                    labelStyle={{ color: '#8888a0' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#grad1)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="card chart-card fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="card-header">
                        <span className="card-title">Event Categories</span>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={catData} layout="vertical">
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#55556a' }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#8888a0' }} axisLine={false} tickLine={false} width={100} />
                                <Tooltip
                                    contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                    labelStyle={{ color: '#8888a0' }}
                                />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Data Sources */}
            <div className="card fade-in" style={{ marginTop: 24, animationDelay: '0.5s' }}>
                <div className="card-header">
                    <span className="card-title">Data Sources Analyzed</span>
                </div>
                <div className="sources-list">
                    {sourceData.map((src) => (
                        <div key={src.name} className="source-badge">
                            <div className="source-dot" style={{ background: src.fill }} />
                            {src.name}
                            <span className="source-count">{src.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
