import { useState } from 'react';
import { useShadow } from '../store/shadowStore';
import { Entity } from '../core/types';
import { Network, Search, X } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
    person: '#3b82f6',
    location: '#10b981',
    organization: '#8b5cf6',
    topic: '#6b7280',
    financial: '#f59e0b',
};

const TYPE_LABELS: Record<string, string> = {
    person: 'Person',
    location: 'Location',
    organization: 'Organization',
    topic: 'Topic',
    financial: 'Financial',
};

export default function EntityGraphView() {
    const { state } = useShadow();
    const { entities, edges, events } = state;
    const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    const filteredEntities = entities.filter(e => {
        const matchSearch = !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === 'all' || e.type === filterType;
        return matchSearch && matchType;
    });

    // Get events for selected entity
    const selectedEvents = selectedEntity
        ? events.filter(ev =>
            ev.entities.some(eid =>
                eid.toLowerCase() === selectedEntity.id.toLowerCase() ||
                eid.toLowerCase() === selectedEntity.name.toLowerCase()
            )
        )
        : [];

    // Get connected entities
    const connectedIds = selectedEntity
        ? new Set(
            edges
                .filter(e => e.source === selectedEntity.id || e.target === selectedEntity.id)
                .flatMap(e => [e.source, e.target])
                .filter(id => id !== selectedEntity.id)
        )
        : new Set<string>();

    const connectedEntities = entities.filter(e => connectedIds.has(e.id));

    // Entity type stats
    const typeStats = new Map<string, number>();
    for (const e of entities) {
        typeStats.set(e.type, (typeStats.get(e.type) || 0) + 1);
    }

    return (
        <div className="entity-graph-view">
            <div className="entity-graph-header">
                <div>
                    <h3><Network size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Entity Network</h3>
                    <p className="text-muted">{entities.length} entities, {edges.length} connections</p>
                </div>
                <div className="entity-search">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search entities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Type filter pills */}
            <div className="entity-type-filters">
                <button
                    className={`type-pill ${filterType === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterType('all')}
                >
                    All ({entities.length})
                </button>
                {[...typeStats.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <button
                        key={type}
                        className={`type-pill ${filterType === type ? 'active' : ''}`}
                        onClick={() => setFilterType(type)}
                        style={{
                            '--pill-color': TYPE_COLORS[type] || '#6b7280',
                        } as React.CSSProperties}
                    >
                        <span className="pill-dot" style={{ background: TYPE_COLORS[type] || '#6b7280' }} />
                        {TYPE_LABELS[type] || type} ({count})
                    </button>
                ))}
            </div>

            <div className="entity-layout">
                {/* Entity List */}
                <div className="entity-list">
                    {filteredEntities
                        .sort((a, b) => b.mentions - a.mentions)
                        .slice(0, 80)
                        .map(entity => (
                            <div
                                key={entity.id}
                                className={`entity-card ${selectedEntity?.id === entity.id ? 'selected' : ''}`}
                                onClick={() => setSelectedEntity(entity)}
                            >
                                <div
                                    className="entity-type-dot"
                                    style={{ background: TYPE_COLORS[entity.type] || '#6b7280' }}
                                />
                                <div className="entity-info">
                                    <div className="entity-name">{entity.name}</div>
                                    <div className="entity-meta">
                                        {TYPE_LABELS[entity.type] || entity.type} · {entity.mentions} mentions
                                    </div>
                                </div>
                                <div className="entity-mentions">{entity.mentions}</div>
                            </div>
                        ))}
                    {filteredEntities.length === 0 && (
                        <div className="empty-state">No entities match your search</div>
                    )}
                </div>

                {/* Entity Detail Panel */}
                <div className={`entity-detail-panel ${selectedEntity ? 'open' : ''}`}>
                    {selectedEntity ? (
                        <>
                            <div className="detail-header">
                                <div>
                                    <h4>{selectedEntity.name}</h4>
                                    <span
                                        className="entity-type-badge"
                                        style={{
                                            background: `${TYPE_COLORS[selectedEntity.type]}22`,
                                            color: TYPE_COLORS[selectedEntity.type],
                                        }}
                                    >
                                        {TYPE_LABELS[selectedEntity.type] || selectedEntity.type}
                                    </span>
                                </div>
                                <button className="close-btn" onClick={() => setSelectedEntity(null)}>
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="detail-stats">
                                <div className="detail-stat">
                                    <div className="detail-stat-value">{selectedEntity.mentions}</div>
                                    <div className="detail-stat-label">Mentions</div>
                                </div>
                                <div className="detail-stat">
                                    <div className="detail-stat-value">{selectedEvents.length}</div>
                                    <div className="detail-stat-label">Events</div>
                                </div>
                                <div className="detail-stat">
                                    <div className="detail-stat-value">{connectedEntities.length}</div>
                                    <div className="detail-stat-label">Connections</div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h5>Date Range</h5>
                                <p className="text-muted" style={{ fontSize: 12 }}>
                                    {new Date(selectedEntity.firstSeen).toLocaleDateString()} — {new Date(selectedEntity.lastSeen).toLocaleDateString()}
                                </p>
                            </div>

                            {/* Data sources this entity appears in */}
                            <div className="detail-section">
                                <h5>Data Sources</h5>
                                <div className="source-tags">
                                    {[...new Set(selectedEvents.map(e => e.source))].map(src => (
                                        <span key={src} className="source-tag">{src.replace('_', ' ')}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Connected entities */}
                            {connectedEntities.length > 0 && (
                                <div className="detail-section">
                                    <h5>Connected To</h5>
                                    <div className="connected-list">
                                        {connectedEntities.slice(0, 10).map(ce => (
                                            <div
                                                key={ce.id}
                                                className="connected-item"
                                                onClick={() => setSelectedEntity(ce)}
                                            >
                                                <span
                                                    className="pill-dot"
                                                    style={{ background: TYPE_COLORS[ce.type] }}
                                                />
                                                {ce.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent events */}
                            <div className="detail-section">
                                <h5>Recent Events ({selectedEvents.length})</h5>
                                <div className="event-list">
                                    {selectedEvents.slice(0, 15).map(ev => (
                                        <div key={ev.id} className="event-item">
                                            <div className="event-title">{ev.title}</div>
                                            <div className="event-meta">
                                                {ev.source.replace('_', ' ')} · {new Date(ev.timestamp).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state" style={{ padding: '40px 20px' }}>
                            <Network size={32} strokeWidth={1.5} />
                            <p>Click an entity to see details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
