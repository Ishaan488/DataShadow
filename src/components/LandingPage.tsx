import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileJson, Sparkles, Database, X, AlertCircle } from 'lucide-react';
import { useShadow } from '../store/shadowStore';
import { DataSource, UploadedFile, ShadowEvent, ParseError } from '../core/types';
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

type ParserFn = (raw: string, filename?: string) => { events: ShadowEvent[]; errors: ParseError[] };

type FileSourceMapping = { pattern: RegExp; source: DataSource; parser: ParserFn };

const FILE_MAPPINGS: FileSourceMapping[] = [
    { pattern: /search|my.?activity|query/i, source: 'google_search', parser: parseGoogleSearch },
    { pattern: /youtube|watch/i, source: 'youtube', parser: parseYouTubeHistory },
    { pattern: /location|timeline|places|records/i, source: 'location', parser: parseLocationHistory },
    { pattern: /browser|history|chrome|firefox/i, source: 'browser_history', parser: parseBrowserHistory },
    { pattern: /email|mail|mbox|message/i, source: 'email', parser: parseEmailMetadata },
    { pattern: /social|facebook|instagram|twitter|tweet|post/i, source: 'social_media', parser: parseSocialMedia },
];

function detectSource(filename: string): FileSourceMapping {
    for (const mapping of FILE_MAPPINGS) {
        if (mapping.pattern.test(filename)) return mapping;
    }
    return FILE_MAPPINGS[0];
}

export default function LandingPage() {
    const { state, dispatch } = useShadow();
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
    const [dragging, setDragging] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const workerRef = useRef<Worker | null>(null);

    // Initialize Web Worker once
    if (!workerRef.current) {
        try {
            workerRef.current = new Worker(new URL('../core/worker.ts', import.meta.url), { type: 'module' });
            workerRef.current.onerror = (e) => {
                console.error("Web Worker Initialization Error:", e);
                setParseErrors(prev => [...prev, { source: 'unknown', filename: 'worker', message: `Worker crashed: ${e.message}`, suggestion: 'Reload app.' }]);
            };
        } catch (err) {
            console.error("Failed to create Web Worker", err);
        }
    }

    const runWorkerTask = (action: string, payload: any, onProgress?: (data: any) => void): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!workerRef.current) return reject(new Error('Worker not initialized'));
            
            const msgId = Math.random().toString(36).substring(7);
            const timeout = setTimeout(() => {
                workerRef.current?.removeEventListener('message', handler);
                reject(new Error(`Worker task timed out after 30 seconds [Action: ${action}]`));
            }, 30000);

            const handler = (e: MessageEvent) => {
                const data = e.data;
                if (data.msgId !== msgId) return;
                if (data.type === 'PROGRESS' && onProgress) onProgress(data.payload);
                if (data.type === 'SUCCESS') {
                    clearTimeout(timeout);
                    workerRef.current?.removeEventListener('message', handler);
                    resolve(data.payload);
                }
                if (data.type === 'ERROR') {
                    clearTimeout(timeout);
                    workerRef.current?.removeEventListener('message', handler);
                    reject(new Error(data.error));
                }
            };
            workerRef.current.addEventListener('message', handler);
            workerRef.current.postMessage({ action, payload, msgId });
        });
    };

    const handleFiles = useCallback(async (fileList: FileList) => {
        setDragging(false);
        const newFiles: UploadedFile[] = [];
        const errors: ParseError[] = [];

        dispatch({ type: 'SET_PROCESSING', step: 'Parsing files off-thread...' });
        let totalFiles = 0;
        let completed = 0;

        for (const file of Array.from(fileList)) {
            if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
                errors.push({ source: 'unknown', filename: file.name, message: `Unsupported file type.`, suggestion: 'Upload JSON/CSV' });
                continue;
            }
            totalFiles++;
        }

        for (const file of Array.from(fileList)) {
            if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) continue;
            
            const mapping = detectSource(file.name);
            
            try {
                // Pass native File object to Web Worker for chunking
                const result = await runWorkerTask('PARSE_FILE', { file, source: mapping.source }, (prog) => {
                    dispatch({
                        type: 'SET_PROGRESS',
                        progress: { stage: 'parse', stageLabel: `Parsing ${file.name} (${prog.percent}%)`, percent: prog.percent / totalFiles + (completed/totalFiles)*100 }
                    });
                });

                if (result.errors.length > 0) errors.push(...result.errors);
                if (result.events.length > 0) {
                    newFiles.push({
                        name: file.name,
                        source: mapping.source,
                        events: result.events,
                        size: file.size,
                    });
                }
            } catch (err: any) {
                errors.push({ source: mapping.source, filename: file.name, message: err.message || 'Worker crash', suggestion: 'Try smaller sizes' });
            }
            completed++;
        }

        setFiles(prev => [...prev, ...newFiles]);
        if (errors.length > 0) setParseErrors(prev => [...prev, ...errors]);
        
        dispatch({ type: 'SET_DONE' }); // properly clears processing state
    }, [dispatch]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const dismissError = (index: number) => {
        setParseErrors(prev => prev.filter((_, i) => i !== index));
    };

    const runAnalysis = async (events: ShadowEvent[]) => {
        dispatch({ type: 'SET_PROCESSING', step: 'Sorting events...' });
        dispatch({ type: 'SET_PROGRESS', progress: { stage: 'parse', stageLabel: 'Processing events', percent: 10 } });
        await sleep(100);

        const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
        dispatch({ type: 'SET_EVENTS', events: sortedEvents });

        dispatch({ type: 'SET_PROCESSING', step: 'Building graphs via Worker...' });
        dispatch({ type: 'SET_PROGRESS', progress: { stage: 'entity-graph', stageLabel: 'Building entity graph', percent: 30 } });
        
        // Execute graph processing in Web Worker
        const { graph, risk } = await runWorkerTask('PROCESS_GRAPHS', { events }, (prog) => {
            if (prog.step) dispatch({ type: 'SET_PROCESSING', step: prog.step });
        });
        
        dispatch({ type: 'SET_ENTITIES', entities: graph.nodes, edges: graph.edges });
        dispatch({ type: 'SET_RISK_SCORE', score: risk });

        dispatch({ type: 'SET_PROCESSING', step: 'Generating threat narratives...' });
        dispatch({ type: 'SET_PROGRESS', progress: { stage: 'threat-gen', stageLabel: 'Generating threat analysis', percent: 70 } });

        const key = apiKey || state.apiKey;
        let threats;
        if (key) {
            threats = await generateThreats(key, sortedEvents, graph.nodes, risk);
        } else {
            await sleep(500);
            threats = getDefaultThreats(risk, sortedEvents, graph.nodes);
        }
        dispatch({ type: 'SET_THREATS', threats });

        dispatch({ type: 'SET_PROGRESS', progress: { stage: 'done', stageLabel: 'Analysis complete', percent: 100 } });
        await sleep(400);

        dispatch({ type: 'SET_ANALYZED' });
        dispatch({ type: 'SET_DONE' });
        navigate('/dashboard');
    };

    const analyzeUploaded = async () => {
        if (files.length === 0) return;
        dispatch({ type: 'ADD_FILES', files });
        if (apiKey) {
            dispatch({ type: 'SET_API_KEY', key: apiKey });
        }

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
        if (apiKey) {
            dispatch({ type: 'SET_API_KEY', key: apiKey });
            localStorage.setItem('datashadow_apikey', apiKey);
        }
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
                    {state.progress && (
                        <div className="progress-bar-container">
                            <div className="progress-bar-track">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${state.progress.percent}%` }}
                                />
                            </div>
                            <div className="progress-label">{state.progress.stageLabel}</div>
                        </div>
                    )}
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

                {/* Parse Errors */}
                {parseErrors.length > 0 && (
                    <div className="parse-errors">
                        {parseErrors.map((err, i) => (
                            <div key={i} className="parse-error-item slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                <AlertCircle size={16} className="error-icon" />
                                <div className="error-content">
                                    <div className="error-filename">{err.filename}</div>
                                    <div className="error-message">{err.message}</div>
                                    <div className="error-suggestion">{err.suggestion}</div>
                                </div>
                                <button className="file-remove" onClick={() => dismissError(i)}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

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
                    <label>Gemini API Key (optional)</label>
                    <div className="hint">
                        Required for AI-generated threat narratives. Get one free from <a href="https://aistudio.google.com/apikey" target="_blank" style={{color: 'var(--accent-purple-light)'}}>Google AI Studio</a>.
                        Without it, deterministic analysis + pre-built threats are used. Your key stays in volatile memory only and vanishes on refresh.
                    </div>
                    <input
                        type="password"
                        placeholder="AIza..."
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
