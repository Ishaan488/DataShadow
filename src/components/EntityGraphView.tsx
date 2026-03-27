import { useState, useRef, useEffect, useMemo } from 'react';
import { useShadow } from '../store/shadowStore';
import { Entity } from '../core/types';
import { Network, Search, X } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';

const TYPE_COLORS: Record<string, string> = {
    person: '#e4e4e7',
    location: '#a1a1aa',
    organization: '#71717a',
    topic: '#52525b',
    financial: '#3b82f6',
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
    
    // Auto-resizing for the Canvas
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const filteredEntities = useMemo(() => entities.filter(e => {
        const matchSearch = !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === 'all' || e.type === filterType;
        return matchSearch && matchType;
    }), [entities, searchTerm, filterType]);

    // Get events for selected entity
    const selectedEvents = useMemo(() => selectedEntity
        ? events.filter(ev =>
            ev.entities.some(eid =>
                eid.toLowerCase() === selectedEntity.id.toLowerCase() ||
                eid.toLowerCase() === selectedEntity.name.toLowerCase()
            )
        )
        : [], [selectedEntity, events]);

    // Get connected entities
    const connectedIds = useMemo(() => selectedEntity
        ? new Set(
            edges
                .filter(e => e.source === selectedEntity.id || e.target === selectedEntity.id)
                .flatMap(e => [e.source, e.target])
                .filter(id => id !== selectedEntity.id)
        )
        : new Set<string>(), [selectedEntity, edges]);

    const connectedEntities = useMemo(() => entities.filter(e => connectedIds.has(e.id)), [entities, connectedIds]);

    // Entity type stats
    const typeStats = useMemo(() => {
        const stats = new Map<string, number>();
        for (const e of entities) {
            stats.set(e.type, (stats.get(e.type) || 0) + 1);
        }
        return stats;
    }, [entities]);

    const validLinks = useMemo(() => edges.filter(l => 
        filteredEntities.some(e => e.id === l.source) && 
        filteredEntities.some(e => e.id === l.target)
    ), [edges, filteredEntities]);

    const linkedNodeIds = useMemo(() => {
        const ids = new Set<string>();
        validLinks.forEach(l => { ids.add(l.source); ids.add(l.target); });
        return ids;
    }, [validLinks]);

    // Filter dust bounds: must be connected OR mentioned multiple times OR searched
    const displayNodes = useMemo(() => filteredEntities.filter(e => 
        linkedNodeIds.has(e.id) || e.mentions >= 3 || searchTerm !== ''
    ), [filteredEntities, linkedNodeIds, searchTerm]);

    const graphData = useMemo(() => ({
        nodes: displayNodes.map(e => ({
            ...e,
            val: Math.max(3, Math.min(24, e.mentions)), // Larger nodes based on mentions
            color: TYPE_COLORS[e.type] || '#6b7280'
        })),
        links: validLinks.map(l => ({ ...l }))
    }), [displayNodes, validLinks]);

    // Tune the Physics Engine to group communities cleanly
    useEffect(() => {
        if (fgRef.current) {
            fgRef.current.d3Force('charge').strength(-300);
            fgRef.current.d3Force('link').distance(45);
        }
    }, [displayNodes.length, fgRef.current]);

    return (
        <div className="entity-graph-view">
            <div className="entity-graph-header">
                <div>
                    <h3><Network size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Entity Network</h3>
                    <p className="text-muted">{displayNodes.length} active nodes, {validLinks.length} connections</p>
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
                {/* Hardware-Accelerated 2D Force Graph (Obsidian Style) */}
                <div ref={containerRef} className="entity-list" style={{ padding: 0, overflow: 'hidden', background: '#0a0a0a', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                        {dimensions.width > 0 && (
                            <ForceGraph2D
                                ref={fgRef}
                                width={dimensions.width}
                                height={dimensions.height}
                                graphData={graphData}
                                nodeColor="color"
                                linkWidth={0.5}
                                linkColor={() => 'rgba(255,255,255,0.1)'}
                                linkDirectionalParticles={2} 
                                linkDirectionalParticleWidth={1.5}
                                nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
                                    const size = Math.max(1.5, node.val);
                                    const isSelected = node.id === selectedEntity?.id;

                                    if (isSelected) {
                                        // Draw beautiful glowing halo for selected node
                                        ctx.beginPath();
                                        ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI, false);
                                        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                                        ctx.fill();
                                        ctx.strokeStyle = '#ffffff';
                                        ctx.lineWidth = 1.5;
                                        ctx.stroke();
                                    }

                                    // Draw node circle
                                    ctx.beginPath();
                                    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                                    ctx.fillStyle = node.color;
                                    ctx.fill();

                                    // Dynamic LOD Text Rendering
                                    const showText = globalScale > 1.8 || node.mentions > 6 || isSelected;
                                    if (showText) {
                                        const label = node.name;
                                        const fontSize = Math.max(12 / globalScale, 4);
                                        ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px Sans-Serif`;
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.85)';
                                        ctx.fillText(label, node.x, node.y + size + 3);
                                    }
                                }}
                                onNodeClick={(node: any) => {
                                    const org = entities.find(e => e.id === node.id);
                                    if (org) setSelectedEntity(org);
                                }}
                                backgroundColor="#0a0a0a"
                            />
                        )}
                    </div>
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
