import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileJson, Sparkles, Database, X } from 'lucide-react';
import { useShadow } from '../store/shadowStore';
import { DataSource, UploadedFile, ShadowEvent } from '../core/types';
import { parseGoogleSearch } from '../core/parsers/googleSearchParser';
import { parseYouTubeHistory } from '../core/parsers/youtubeParser';
import { parseLocationHistory } from '../core/parsers/locationParser';
import { parseBrowserHistory } from '../core/parsers/browserHistoryParser';
import { parseEmailMetadata } from '../core/parsers/emailMetadataParser';
import { parseSocialMedia } from '../core/parsers/socialMediaParser';
import { buildEntityGraph } from '../core/entityGraph';
import { computeRiskScore } from '../core/riskScoring';
import { generateThreats, getDefaultThreats } from '../core/genai/threatGenerator';
import { sampleEvents } from '../sample/sampleData';

type FileSourceMapping = { pattern: RegExp; source: DataSource; parser: (raw: string) => ShadowEvent[] };

const FILE_MAPPINGS: FileSourceMapping[] = [
    { pattern: /search|my.?activity|query/i, source: 'google_search', parser: parseGoogleSearch },
    { pattern: /youtube|watch/i, source: 'youtube', parser: parseYouTubeHistory },
    { pattern: /location|timeline|places/i, source: 'location', parser: parseLocationHistory },
    { pattern: /browser|history|chrome|firefox/i, source: 'browser_history', parser: parseBrowserHistory },
    { pattern: /email|mail|mbox|message/i, source: 'email', parser: parseEmailMetadata },
    { pattern: /social|facebook|instagram|twitter|tweet|post/i, source: 'social_media', parser: parseSocialMedia },
];

function detectSource(filename: string): FileSourceMapping {
    for (const mapping of FILE_MAPPINGS) {
        if (mapping.pattern.test(filename)) return mapping;
    }
    // Default to Google Search parser for unknown JSON files
    return FILE_MAPPINGS[0];
}

export default function LandingPage() {
    const { state, dispatch } = useShadow();
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [dragging, setDragging] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const handleFiles = useCallback(async (fileList: FileList) => {
        const newFiles: UploadedFile[] = [];
        for (const file of Array.from(fileList)) {
            if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) continue;
            const text = await file.text();
            const mapping = detectSource(file.name);
            const events = mapping.parser(text);
            newFiles.push({
                name: file.name,
                source: mapping.source,
                events,
                size: file.size,
            });
        }
        setFiles(prev => [...prev, ...newFiles]);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const runAnalysis = async (events: ShadowEvent[]) => {
        dispatch({ type: 'SET_PROCESSING', step: 'Normalizing events...' });
        await sleep(400);

        const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
        dispatch({ type: 'SET_EVENTS', events: sortedEvents });

        dispatch({ type: 'SET_PROCESSING', step: 'Building entity graph...' });
        await sleep(400);
        const graph = buildEntityGraph(sortedEvents);
        dispatch({ type: 'SET_ENTITIES', entities: graph.nodes, edges: graph.edges });

        dispatch({ type: 'SET_PROCESSING', step: 'Computing risk scores...' });
        await sleep(400);
        const risk = computeRiskScore(sortedEvents, graph.nodes);
        dispatch({ type: 'SET_RISK_SCORE', score: risk });

        dispatch({ type: 'SET_PROCESSING', step: 'Generating threat narratives...' });
        const key = apiKey || state.apiKey;
        let threats;
        if (key) {
            threats = await generateThreats(key, sortedEvents, graph.nodes, risk);
        } else {
            await sleep(500);
            threats = getDefaultThreats(risk);
        }
        dispatch({ type: 'SET_THREATS', threats });

        dispatch({ type: 'SET_ANALYZED' });
        dispatch({ type: 'SET_DONE' });
        navigate('/dashboard');
    };

    const analyzeUploaded = async () => {
        if (files.length === 0) return;
        dispatch({ type: 'ADD_FILES', files });
        if (apiKey) dispatch({ type: 'SET_API_KEY', key: apiKey });

        const allEvents = files.flatMap(f => f.events);
        await runAnalysis(allEvents);
    };

    const loadDemo = async () => {
        dispatch({
            type: 'ADD_FILES',
            files: [{
                name: 'demo_data.json',
                source: 'unknown' as DataSource,
                events: sampleEvents,
                size: 0,
            }],
        });
        if (apiKey) dispatch({ type: 'SET_API_KEY', key: apiKey });
        await runAnalysis([...sampleEvents]);
    };

    const totalEvents = files.reduce((sum, f) => sum + f.events.length, 0);

    return (
        <div className="landing">
            {state.isProcessing && (
                <div className="processing-overlay">
                    <div className="processing-spinner" />
                    <div className="processing-text">Analyzing your digital shadow...</div>
                    <div className="processing-step">{state.currentStep}</div>
                </div>
            )}

            <div className="landing-hero fade-in">
                <h2>
                    Uncover Your <span className="gradient-text">Digital Shadow</span>
                </h2>
                <p>
                    Upload your data exports to discover what your digital footprint reveals —
                    and how attackers could exploit it. All processing happens locally in your browser.
                </p>
            </div>

            <div className="landing-content fade-in" style={{ animationDelay: '0.15s' }}>
                <div
                    className={`upload-zone ${dragging ? 'dragging' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".json,.csv"
                        style={{ display: 'none' }}
                        onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    />
                    <div className="upload-icon">
                        <Upload size={48} strokeWidth={1.5} />
                    </div>
                    <h3>Drop your data exports here</h3>
                    <p>or click to browse — supports JSON and CSV files</p>
                    <div className="file-types">
                        <span>Google Takeout</span>
                        <span>YouTube History</span>
                        <span>Location Data</span>
                        <span>Browser History</span>
                        <span>Email Export</span>
                        <span>Social Media</span>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="file-list">
                        {files.map((file, i) => (
                            <div key={i} className="file-item slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                <FileJson size={18} className="file-icon" />
                                <span className="file-name">{file.name}</span>
                                <span className="file-source">{file.source.replace('_', ' ')}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                    {file.events.length} events
                                </span>
                                <button className="file-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', paddingTop: 4 }}>
                            Total: {totalEvents} events from {files.length} file{files.length > 1 ? 's' : ''}
                        </div>
                    </div>
                )}

                <div className="api-key-section">
                    <label>OpenAI API Key (optional)</label>
                    <div className="hint">
                        Required for AI-generated threat narratives. Without it, deterministic analysis + pre-built threats are used.
                        Your key stays in your browser — never stored on any server.
                    </div>
                    <input
                        type="password"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                </div>

                <div className="landing-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        disabled={files.length === 0 || state.isProcessing}
                        onClick={analyzeUploaded}
                    >
                        <Sparkles size={18} />
                        Analyze {totalEvents > 0 ? `${totalEvents} Events` : 'Data'}
                    </button>
                    <button
                        className="btn btn-secondary btn-lg"
                        disabled={state.isProcessing}
                        onClick={loadDemo}
                    >
                        <Database size={18} />
                        Load Demo Data
                    </button>
                </div>
            </div>
        </div>
    );
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
