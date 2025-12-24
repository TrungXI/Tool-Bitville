import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

// Types
type ProviderField = {
    key: string;
    label: string;
    required: boolean;
    placeholder?: string;
    type?: "text" | "number" | "json";
};

type ContextField = {
    key: string;
    label: string;
    required: boolean;
    placeholder?: string;
    type?: "text" | "number" | "json";
};

type Provider = {
    key: string;
    label: string;
    fields: ProviderField[];
    contextFields: ContextField[];
    defaults: Record<string, any>;
    contextDefaults: Record<string, any>;
};

type StepResult = {
    id: string;
    title: string;
    request: { method: string; url: string; headers: Record<string, string>; body?: any };
    response: { ok: boolean; status: number; elapsedMs: number; headers: Record<string, string>; text: string; json?: any };
    extracts: Record<string, any>;
    assertions: Array<{ rule: any; passed: boolean; message?: string }>;
    passed: boolean;
    error?: string;
};

type CaseRunResult = {
    caseId: string;
    title: string;
    passed: boolean;
    message?: string;
    expected?: string;
    steps: StepResult[];
};

type RunAllResult = {
    ok: boolean;
    summary: { total: number; passed: number; failed: number };
    results: CaseRunResult[];
};

type TestCaseMeta = {
    id: string;
    title: string;
    expected?: string;
};

function App() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token && typeof window !== "undefined") {
        window.location.href = "/login";
        return null;
    }

    const [providers, setProviders] = useState<Provider[]>([]);
    const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
    const [providerInput, setProviderInput] = useState<Record<string, any>>({});
    const [contextInput, setContextInput] = useState<Record<string, any>>({});
    const [lastRun, setLastRun] = useState<RunAllResult | null>(null);
    const [status, setStatus] = useState("Loading...");
    const [hint, setHint] = useState("");
    const [filter, setFilter] = useState<"all" | "pass" | "fail">("all");
    const [isLoading , setIsLoading] = useState(false);
    const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
    const [testCasesMeta, setTestCasesMeta] = useState<TestCaseMeta[]>([]);
    const contextInputRefs = useRef<Record<string, HTMLInputElement>>({});
    const providerInputRefs = useRef<Record<string, HTMLInputElement>>({});

    function pretty(x: any) {
        return JSON.stringify(x, null, 2);
    }

    async function api(path: string, options: RequestInit = {}) {
        const res = await fetch(path, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await res.json().catch(() => ({}));
        return { res, data };
    }

    function ctx() {
        return { ...contextInput };
    }

    function validate() {
        if (!currentProvider) return { ok: false, msg: "No provider selected" };

        const missingCtx = (currentProvider.contextFields || [])
            .filter((f) => f.required)
            .filter((f) => {
                const v = contextInput[f.key];
                return v === undefined || v === null || String(v).trim() === "";
            })
            .map((f) => f.label || f.key);

        if (missingCtx.length)
            return { ok: false, msg: `Missing required context: ${missingCtx.join(", ")}` };

        const missingProvider = (currentProvider.fields || [])
            .filter((f) => f.required)
            .filter((f) => {
                const v = providerInput[f.key];
                return v === undefined || v === null || String(v).trim() === "";
            })
            .map((f) => f.label || f.key);

        if (missingProvider.length)
            return { ok: false, msg: `Missing required inputs: ${missingProvider.join(", ")}` };

        return { ok: true, msg: "Ready" };
    }

    const validation = validate();
    const canRun = validation.ok;

    useEffect(() => {
        if (!canRun) {
            setHint(validation.msg);
        } else {
            setHint("");
        }
    }, [canRun, validation.msg]);

    async function loadProviders() {
        setStatus("Loading providers...");
        const { res, data } = await api("/api/providers");

        if (!res.ok) {
            setStatus("Failed to load providers");
            return;
        }

        const loadedProviders = (data as any).providers || [];
        setProviders(loadedProviders);

        if (loadedProviders.length > 0) {
            const firstProvider = loadedProviders[0];
            setCurrentProvider(firstProvider);
            
            // Load test cases metadata
            loadTestCases(firstProvider.key);
            
            // Load defaults
            if (firstProvider.defaults) {
                const newProviderInput: Record<string, any> = {};
                firstProvider.fields.forEach((f: ProviderField) => {
                    const defaultValue = firstProvider.defaults[f.key];
                    if (defaultValue !== undefined) {
                        newProviderInput[f.key] = defaultValue;
                    }
                });
                setProviderInput(newProviderInput);
            }

            if (firstProvider.contextDefaults) {
                setContextInput(firstProvider.contextDefaults);
            }
        }

        setStatus("Ready");
    }

    useEffect(() => {
        loadProviders();
    }, []);

    async function loadTestCases(providerKey: string) {
        const { res, data } = await api(`/api/testcases?provider=${providerKey}`);
        if (res.ok && data.ok) {
            setTestCasesMeta(data.cases || []);
        } else {
            setTestCasesMeta([]);
        }
    }

    function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const provider = providers.find((p) => p.key === (e.target as HTMLSelectElement).value);
        setCurrentProvider(provider || null);
        setLastRun(null);
        setTestCasesMeta([]);

        if (provider) {
            // Load test cases metadata
            loadTestCases(provider.key);

            // Load defaults
            const newProviderInput: Record<string, any> = {};
            provider.fields.forEach((f) => {
                const defaultValue = provider.defaults?.[f.key];
                if (defaultValue !== undefined) {
                    newProviderInput[f.key] = defaultValue;
                    // Update ref value
                    const ref = providerInputRefs.current[`p_${f.key}`];
                    if (ref) (ref as HTMLInputElement).value = String(defaultValue);
                }
            });
            setProviderInput(newProviderInput);

            if (provider.contextDefaults) {
                setContextInput(provider.contextDefaults);
                // Update ref values
                Object.entries(provider.contextDefaults).forEach(([key, value]) => {
                    const ref = contextInputRefs.current[`ctx_${key}`];
                    if (ref) (ref as HTMLInputElement).value = String(value);
                });
            }
        }
    }

    function handleContextInputChange(key: string, value: any) {
        setContextInput((prev) => ({ ...prev, [key]: value }));
    }

    function handleProviderInputChange(key: string, value: any) {
        setProviderInput((prev) => ({ ...prev, [key]: value }));
    }

    async function handleRunAll() {
        if (!canRun || !currentProvider || isLoading) return;
        setIsLoading(true);
        setStatus("Running all testcases...");
        setRunningCaseId(null);
        setLastRun(null);

        const payload = {
            provider: currentProvider.key,
            context: ctx(),
            providerInput,
        };

        // Ensure test cases metadata is loaded
        if (testCasesMeta.length === 0) {
            await loadTestCases(currentProvider.key);
        }

        // Initialize results structure with placeholder cases
        const currentMeta = testCasesMeta.length > 0 ? testCasesMeta : [];
        const initialResults: CaseRunResult[] = currentMeta.map(tc => ({
            caseId: tc.id,
            title: tc.title,
            passed: false,
            expected: tc.expected,
            steps: []
        }));
        const initialSummary = { total: currentMeta.length, passed: 0, failed: 0 };
        setLastRun({ ok: true, summary: initialSummary, results: initialResults });

        try {
            const response = await fetch("/api/run-all-stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                setStatus("Run failed");
                setIsLoading(false);
                return;
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                setStatus("Failed to start stream");
                setIsLoading(false);
                return;
            }

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const { type, data } = JSON.parse(line.slice(6));

                            if (type === "start") {
                                setStatus(`Running ${data.total} testcases...`);
                            } else if (type === "running") {
                                setRunningCaseId(data.caseId);
                                setStatus(`Running: ${data.title}...`);
                            } else if (type === "completed") {
                                setRunningCaseId(null);
                                setLastRun((prev) => {
                                    if (!prev) return prev;
                                    const newResults = [...prev.results];
                                    const index = newResults.findIndex(r => r.caseId === data.result.caseId);
                                    if (index >= 0) {
                                        // Replace existing case
                                        newResults[index] = data.result;
                                    } else {
                                        // Add new case if not found (shouldn't happen but just in case)
                                        newResults.push(data.result);
                                    }
                                    return {
                                        ...prev,
                                        summary: data.summary,
                                        results: newResults,
                                    };
                                });
                            } else if (type === "end") {
                                setStatus("Done");
                                setRunningCaseId(null);
                                setIsLoading(false);
                            } else if (type === "error") {
                                setStatus(`Error: ${data.message}`);
                                setRunningCaseId(null);
                                setIsLoading(false);
                            }
                        } catch (e) {
                            console.error("Failed to parse SSE message:", e);
                        }
                    }
                }
            }
        } catch (error: any) {
            setStatus(`Error: ${error?.message || String(error)}`);
            setIsLoading(false);
            setRunningCaseId(null);
        }
    }

    function handleExport() {
        if (!lastRun) return;

        const blob = new Blob([JSON.stringify(lastRun, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `test-results-${currentProvider?.key || "provider"}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleLogout() {
        if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
    }

    function matchFilter(caseRun: CaseRunResult) {
        if (filter === "all") return true;
        if (filter === "pass") return caseRun.passed === true;
        if (filter === "fail") return caseRun.passed === false;
        return true;
    }

    function setSummary(total: number, passed: number, failed: number) {
        // This will be handled by rendering
    }

    const filteredResults = lastRun?.results.filter(matchFilter) || [];
    const summary = lastRun?.summary || { total: 0, passed: 0, failed: 0 };
    const pct = summary.total ? Math.round((summary.passed / summary.total) * 100) : 0;

    return (
        <div>
            <div className="header">
                <h1>API Test Tool</h1>
                <div className="header-actions">
                    <button className="btn" onClick={handleLogout}>Logout</button>
                </div>
            </div>

            <div className="container">
                <div className="left-panel">
                    <div className="left-panel-content">
                        <h2 className="panel-title">Context</h2>

                        <div className="field">
                            <label>Provider <span className="req">*</span></label>
                            <select id="provider" value={currentProvider?.key || ""} onChange={handleProviderChange}>
                                <option value="">Select provider...</option>
                                {providers.map((p) => (
                                    <option key={p.key} value={p.key}>
                                        {p.label} ({p.key})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="fields-wrapper">
                            <div id="contextFields">
                                {currentProvider?.contextFields.map((f) => (
                                    <div key={f.key} className="field">
                                        <label>
                                            {f.label}
                                            {f.required && <span className="req">*</span>}
                                        </label>
                                        <input
                                            type={f.type === "number" ? "number" : "text"}
                                            id={`ctx_${f.key}`}
                                            className="context-field"
                                            placeholder={f.placeholder || ""}
                                            defaultValue={currentProvider.contextDefaults?.[f.key] || ""}
                                            ref={(el) => {
                                                if (el) contextInputRefs.current[`ctx_${f.key}`] = el;
                                            }}
                                            onChange={(e) => {
                                                const target = e.target as HTMLInputElement;
                                                const value = f.type === "number" ? parseFloat(target.value) || 0 : target.value;
                                                handleContextInputChange(f.key, value);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="provider-fields" id="providerFields">
                                <div className="provider-fields-title">Provider Inputs</div>
                                {currentProvider?.fields.map((f) => (
                                    <div key={f.key} className="field">
                                        <label>
                                            {f.label}
                                            {f.required && <span className="req">*</span>}
                                        </label>
                                        <input
                                            type={f.type === "number" ? "number" : "text"}
                                            id={`p_${f.key}`}
                                            placeholder={f.placeholder || ""}
                                            defaultValue={currentProvider.defaults?.[f.key] || ""}
                                            ref={(el) => {
                                                if (el) providerInputRefs.current[`p_${f.key}`] = el;
                                            }}
                                            onChange={(e) => {
                                                const target = e.target as HTMLInputElement;
                                                const value = f.type === "number" ? parseFloat(target.value) || 0 : target.value;
                                                handleProviderInputChange(f.key, value);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="run-section">
                        <button className="btn primary" id="runAll" disabled={!canRun || isLoading} onClick={handleRunAll}>
                            Run All
                        </button>
                        <div className="validation-hint" id="hint">{hint}</div>
                    </div>
                </div>

                <div className="right-panel">
                    <div className="status" id="status">{status}</div>

                    {lastRun && (
                        <div className="summary-header" id="summaryHeader">
                            <div className="donut" id="donut" style={{ "--deg": `${Math.round((pct / 100) * 360)}deg` } as React.CSSProperties}>
                                <div className="donut-text" id="donutText">{pct}%</div>
                            </div>
                            <div className="summary-stats">
                                <h3 id="kpi_total">Result ({summary.total})</h3>
                                <div className="stats">
                                    <div className="stat">
                                        <span className="value" id="kpi_pass">{summary.passed}</span> Passed
                                    </div>
                                    <div className="stat">
                                        <span className="value" id="kpi_fail">{summary.failed}</span> Failed
                                    </div>
                                </div>
                            </div>
                            <div className="summary-actions">
                                <select className="filter" id="filter" value={filter} onChange={(e) => setFilter((e.target as HTMLSelectElement).value as "all" | "pass" | "fail")}>
                                    <option value="all">All</option>
                                    <option value="pass">Passed</option>
                                    <option value="fail">Failed</option>
                                </select>
                                <button className="btn" id="export" onClick={handleExport}>Export</button>
                            </div>
                        </div>
                    )}

                    <div id="suiteTitle" style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                        {currentProvider && `Provider suite: ${currentProvider.label || currentProvider.key}`}
                    </div>

                    <div id="results">
                        {filteredResults.map((cr) => (
                            <CaseCard 
                                key={cr.caseId} 
                                caseRun={cr} 
                                isRunning={runningCaseId === cr.caseId}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CaseCard({ caseRun, isRunning }: { caseRun: CaseRunResult; isRunning?: boolean }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`case-card ${isRunning ? "running" : ""}`}>
            <div className="case-head" onClick={() => setExpanded(!expanded)}>
                <div className="case-head-left">
                    <h4>
                        {caseRun.title}
                        {isRunning && <span className="loading-indicator">⏳ Running...</span>}
                    </h4>
                    {caseRun.message && (
                        <div className="case-msg">
                            Expected: {caseRun.expected || "N/A"} / Actual: {caseRun.message}
                        </div>
                    )}
                </div>
                <div>
                    {isRunning ? (
                        <span className="badge running">RUNNING</span>
                    ) : (
                        <span className={`badge ${caseRun.passed ? "pass" : "fail"}`}>
                            {caseRun.passed ? "PASS" : "FAIL"}
                        </span>
                    )}
                </div>
            </div>
            {expanded && (
                <div className="case-body open">
                    {caseRun.steps.map((st) => (
                        <StepCard key={st.id} step={st} />
                    ))}
                </div>
            )}
        </div>
    );
}

function StepCard({ step }: { step: StepResult }) {
    function pretty(x: any) {
        return JSON.stringify(x, null, 2);
    }

    return (
        <div className="step">
            <div className="step-top">
                <div className="step-title">{step.title}</div>
                <div className="step-meta">
                    {step.passed ? "✅" : "❌"} {step.response?.status ?? 0} • {step.response?.elapsedMs ?? 0}ms
                </div>
            </div>

            <div className="row2">
                <div className="data-block">
                    <div className="data-block-title">Request URL</div>
                    <pre>{`${step.request.method} ${step.request.url}`}</pre>
                </div>
                <div className="data-block">
                    <div className="data-block-title">Request Headers</div>
                    <pre>{pretty(step.request.headers || {})}</pre>
                </div>
            </div>

            <div className="row2">
                <div className="data-block">
                    <div className="data-block-title">Request Data</div>
                    <pre>{pretty(step.request.body ?? {})}</pre>
                </div>
                <div className="data-block">
                    <div className="data-block-title">Response Data</div>
                    <pre>{step.response?.json ? pretty(step.response.json) : (step.response?.text ?? "")}</pre>
                </div>
            </div>

            <div className="assertions">
                <div className="data-block-title">Assertions</div>
                {step.assertions.map((a, idx) => (
                    <div key={idx} className={`assertion ${a.passed ? "passed" : "failed"}`}>
                        {a.passed ? "✅" : "❌"} {a.message || (a.passed ? "Passed" : "Failed")}
                    </div>
                ))}
                {step.error && (
                    <div className="assertion failed">
                        ❌ Error: {step.error}
                    </div>
                )}
            </div>
        </div>
    );
}

// Initialize app
if (typeof document !== "undefined") {
    const rootEl = document.getElementById("root");
    if (rootEl) {
        const root = createRoot(rootEl);
        root.render(<App />);
    }
}

