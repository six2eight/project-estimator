import { useState, useEffect, useCallback } from 'react';
import './ResourceMonitor.css';

// ─── Types ────────────────────────────────────────────────────────────────────

// taskCompletion is a percentage: 0 | 10 | 20 | ... | 100
interface DailyEntry {
    id: string;
    date: string; // ISO date string YYYY-MM-DD
    resourceName: string;
    taskCompletion: number; // 0 – 100 in steps of 10
    issue: string;
    comments: string;
    solution: string;
}

interface WeeklyData {
    weekKey: string; // e.g. "2026-W14"
    weekLabel: string; // e.g. "Week 14 (Apr 1 – Apr 7, 2026)"
    entries: DailyEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPLETION_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/** Returns a colour tier for a completion percentage */
function completionTier(pct: number): 'danger' | 'warning' | 'info' | 'success' {
    if (pct <= 20) return 'danger';
    if (pct <= 50) return 'warning';
    if (pct <= 80) return 'info';
    return 'success';
}

/** Emoji indicator */
function completionEmoji(pct: number): string {
    if (pct === 100) return '✅';
    if (pct >= 70) return '🔵';
    if (pct >= 40) return '⚠️';
    return '❌';
}

function getISOWeek(date: Date): number {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = getISOWeek(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

function getWeekRange(weekKey: string): { start: Date; end: Date } {
    const [yearStr, weekStr] = weekKey.split('-W');
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);
    const jan4 = new Date(year, 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: monday, end: sunday };
}

function formatDateRange(weekKey: string): string {
    const { start, end } = getWeekRange(weekKey);
    const fmt = (d: Date) =>
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const weekNum = weekKey.split('-W')[1];
    return `Week ${parseInt(weekNum)} (${fmt(start)} – ${fmt(end)})`;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function genId(): string {
    return Math.random().toString(36).slice(2, 11);
}

function todayISO(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Ranking ─────────────────────────────────────────────────────────────────

interface ResourceRank {
    name: string;
    entryCount: number;
    avgCompletion: number; // 0–100
    totalScore: number;    // sum of all completion % values
    issueCount: number;
    rank: number;
    badge: string;
}

function computeRanking(entries: DailyEntry[]): ResourceRank[] {
    const map: Record<string, { totalPct: number; count: number; issues: number }> = {};
    entries.forEach((e) => {
        if (!map[e.resourceName]) map[e.resourceName] = { totalPct: 0, count: 0, issues: 0 };
        map[e.resourceName].totalPct += e.taskCompletion;
        map[e.resourceName].count++;
        if (e.issue.trim()) map[e.resourceName].issues++;
    });

    const sorted = Object.entries(map)
        .map(([name, d]) => ({
            name,
            entryCount: d.count,
            avgCompletion: d.count > 0 ? Math.round(d.totalPct / d.count) : 0,
            totalScore: d.totalPct,
            issueCount: d.issues,
        }))
        .sort((a, b) => b.avgCompletion - a.avgCompletion || a.issueCount - b.issueCount);

    const badges = ['🥇', '🥈', '🥉'];
    return sorted.map((r, i) => ({ ...r, rank: i + 1, badge: badges[i] || `#${i + 1}` }));
}

// ─── XLSX Export ─────────────────────────────────────────────────────────────

async function exportWeeklyExcel(weeklyData: WeeklyData[], allEntries: DailyEntry[]) {
    const XLSX = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();

    // ── Summary sheet ──────────────────────────────────────────────────────────
    const summaryRows: (string | number)[][] = [
        ['Resource Performance Monitor – Summary'],
        [],
        ['Week', 'Resource', 'Entries', 'Avg Completion (%)', 'Total Score', 'Issues Raised', 'Rank'],
    ];

    weeklyData.forEach((wd) => {
        const ranks = computeRanking(wd.entries);
        ranks.forEach((r) => {
            summaryRows.push([
                wd.weekLabel, r.name, r.entryCount,
                r.avgCompletion, r.totalScore, r.issueCount, r.rank,
            ]);
        });
        summaryRows.push([]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 40 }, { wch: 22 }, { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // ── Per-week sheets ────────────────────────────────────────────────────────
    weeklyData.forEach((wd) => {
        const sheetRows: (string | number)[][] = [
            [wd.weekLabel],
            [],
            ['Date', 'Resource Name', 'Completion %', 'Issue', 'Comments', 'Solution'],
        ];

        wd.entries
            .sort((a, b) => a.date.localeCompare(b.date))
            .forEach((e) => {
                sheetRows.push([
                    formatDate(e.date), e.resourceName,
                    `${e.taskCompletion}%`, e.issue, e.comments, e.solution,
                ]);
            });

        sheetRows.push([]);
        sheetRows.push(['── Weekly Ranking ──']);
        sheetRows.push(['Rank', 'Resource', 'Avg Completion (%)', 'Total Score', 'Entries', 'Issues']);

        computeRanking(wd.entries).forEach((r) => {
            sheetRows.push([r.rank, r.name, r.avgCompletion, r.totalScore, r.entryCount, r.issueCount]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetRows);
        ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
        const safeName = wd.weekKey.replace(/[^a-zA-Z0-9\-]/g, '');
        XLSX.utils.book_append_sheet(wb, ws, safeName);
    });

    // ── All entries sheet ──────────────────────────────────────────────────────
    const allRows: (string | number)[][] = [
        ['All Daily Entries'],
        [],
        ['Date', 'Week', 'Resource Name', 'Completion %', 'Issue', 'Comments', 'Solution'],
    ];
    allEntries
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((e) => {
            allRows.push([
                formatDate(e.date),
                getWeekKey(new Date(e.date + 'T00:00:00')),
                e.resourceName,
                `${e.taskCompletion}%`,
                e.issue, e.comments, e.solution,
            ]);
        });
    const allSheet = XLSX.utils.aoa_to_sheet(allRows);
    allSheet['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, allSheet, 'All Entries');

    XLSX.writeFile(wb, `Resource_Performance_Monitor_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'resource_monitor_entries_v2';

function loadEntries(): DailyEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
        // Migrate from v1 if present
        const v1 = localStorage.getItem('resource_monitor_entries_v1');
        if (v1) {
            const old = JSON.parse(v1) as Array<Record<string, unknown>>;
            return old.map((e) => ({
                id: e.id as string,
                date: e.date as string,
                resourceName: e.resourceName as string,
                taskCompletion: e.taskStatus === 'completed' ? 100 : e.taskStatus === 'half_completed' ? 50 : 0,
                issue: e.issue as string,
                comments: e.comments as string,
                solution: e.solution as string,
            }));
        }
        return [];
    } catch {
        return [];
    }
}

function saveEntries(entries: DailyEntry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ─── Default form ─────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<DailyEntry, 'id'> = {
    date: todayISO(),
    resourceName: '',
    taskCompletion: 100,
    issue: '',
    comments: '',
    solution: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResourceMonitor() {
    const [entries, setEntries] = useState<DailyEntry[]>(loadEntries);
    const [form, setForm] = useState<Omit<DailyEntry, 'id'>>(EMPTY_FORM);
    const [editId, setEditId] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<string>('');
    const [filterResource, setFilterResource] = useState<string>('');
    const [activeView, setActiveView] = useState<'entries' | 'ranking'>('entries');
    const [showForm, setShowForm] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => { saveEntries(entries); }, [entries]);

    // Build weeks list
    const weeks: WeeklyData[] = (() => {
        const map: Record<string, DailyEntry[]> = {};
        entries.forEach((e) => {
            const k = getWeekKey(new Date(e.date + 'T00:00:00'));
            if (!map[k]) map[k] = [];
            map[k].push(e);
        });
        return Object.keys(map)
            .sort((a, b) => b.localeCompare(a))
            .map((k) => ({ weekKey: k, weekLabel: formatDateRange(k), entries: map[k] }));
    })();

    const currentWeekKey = getWeekKey(new Date());
    const defaultWeek = weeks.find((w) => w.weekKey === currentWeekKey)?.weekKey || weeks[0]?.weekKey || currentWeekKey;
    const activeWeekKey = selectedWeek || defaultWeek;
    const activeWeekData = weeks.find((w) => w.weekKey === activeWeekKey);

    const filteredEntries = (activeWeekData?.entries || [])
        .filter((e) => !filterResource || e.resourceName.toLowerCase().includes(filterResource.toLowerCase()))
        .sort((a, b) => b.date.localeCompare(a.date));

    const resourceNames = Array.from(new Set(entries.map((e) => e.resourceName).filter(Boolean))).sort();

    const handleFormChange = useCallback(<K extends keyof typeof EMPTY_FORM>(field: K, value: typeof EMPTY_FORM[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = () => {
        if (!form.resourceName.trim()) return;
        if (editId) {
            setEntries((prev) => prev.map((e) => (e.id === editId ? { ...form, id: editId } : e)));
            setEditId(null);
        } else {
            setEntries((prev) => [...prev, { ...form, id: genId() }]);
        }
        setForm({ ...EMPTY_FORM, date: form.date });
        setShowForm(false);
    };

    const handleEdit = (entry: DailyEntry) => {
        setForm({ date: entry.date, resourceName: entry.resourceName, taskCompletion: entry.taskCompletion, issue: entry.issue, comments: entry.comments, solution: entry.solution });
        setEditId(entry.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setDeleteConfirm(null);
    };

    const handleExport = async () => {
        setExportLoading(true);
        try { await exportWeeklyExcel(weeks, entries); }
        finally { setExportLoading(false); }
    };

    const ranking = computeRanking(
        (activeWeekData?.entries || []).filter((e) => !filterResource || e.resourceName.toLowerCase().includes(filterResource.toLowerCase()))
    );

    // Stats for the active week
    const weekEntries = activeWeekData?.entries || [];
    const avgCompletion = weekEntries.length
        ? Math.round(weekEntries.reduce((s, e) => s + e.taskCompletion, 0) / weekEntries.length)
        : 0;
    const fullCount = weekEntries.filter((e) => e.taskCompletion === 100).length;
    const partialCount = weekEntries.filter((e) => e.taskCompletion > 0 && e.taskCompletion < 100).length;
    const zeroCount = weekEntries.filter((e) => e.taskCompletion === 0).length;
    const issueCount = weekEntries.filter((e) => e.issue.trim()).length;

    return (
        <div className="rm-container animate-fade-in">

            {/* ── Header ─────────────────────────────────────────────────────────── */}
            <div className="rm-header">
                <div className="rm-header-left">
                    <div className="rm-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="rm-title">Resource Performance Monitor</h1>
                        <p className="rm-subtitle">Track daily completion %, issues &amp; weekly rankings</p>
                    </div>
                </div>
                <div className="rm-header-actions">
                    <button className="btn btn-secondary" onClick={() => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Add Entry
                    </button>
                    <button className="btn btn-primary" onClick={handleExport} disabled={exportLoading || entries.length === 0}>
                        {exportLoading
                            ? <span className="rm-spinner" />
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        }
                        Export Excel
                    </button>
                </div>
            </div>

            {/* ── Entry Form ─────────────────────────────────────────────────────── */}
            {showForm && (
                <div className="rm-form-card card animate-fade-in">
                    <div className="rm-form-header">
                        <h3>{editId ? '✏️ Edit Entry' : '➕ New Daily Entry'}</h3>
                        <button className="btn-icon" onClick={() => { setShowForm(false); setEditId(null); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>

                    <div className="rm-form-grid">
                        {/* Date */}
                        <div className="rm-field">
                            <label>Date</label>
                            <input type="date" value={form.date} onChange={(e) => handleFormChange('date', e.target.value)} />
                        </div>

                        {/* Resource Name */}
                        <div className="rm-field">
                            <label>Resource Name *</label>
                            <input
                                list="rm-resource-list"
                                type="text"
                                placeholder="e.g. John Doe"
                                value={form.resourceName}
                                onChange={(e) => handleFormChange('resourceName', e.target.value)}
                            />
                            <datalist id="rm-resource-list">
                                {resourceNames.map((n) => <option key={n} value={n} />)}
                            </datalist>
                        </div>

                        {/* Task Completion % */}
                        <div className="rm-field">
                            <label>Task Completion</label>
                            <div className="rm-completion-wrap">
                                <select
                                    className="rm-completion-select"
                                    value={form.taskCompletion}
                                    onChange={(e) => handleFormChange('taskCompletion', parseInt(e.target.value))}
                                >
                                    {COMPLETION_STEPS.map((p) => (
                                        <option key={p} value={p}>{p === 0 ? '0% – Not Started' : p === 100 ? '100% – Fully Done' : `${p}%`}</option>
                                    ))}
                                </select>
                                <div className="rm-completion-preview">
                                    <span className={`rm-pct-badge rm-pct-badge--${completionTier(form.taskCompletion)}`}>
                                        {completionEmoji(form.taskCompletion)} {form.taskCompletion}%
                                    </span>
                                    <div className="rm-mini-bar">
                                        <div className={`rm-mini-fill rm-mini-fill--${completionTier(form.taskCompletion)}`} style={{ width: `${form.taskCompletion}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Issue */}
                        <div className="rm-field rm-field--wide">
                            <label>Issue</label>
                            <input type="text" placeholder="Describe any blockers or problems..." value={form.issue} onChange={(e) => handleFormChange('issue', e.target.value)} />
                        </div>

                        {/* Comments */}
                        <div className="rm-field rm-field--wide">
                            <label>Comments</label>
                            <textarea rows={2} placeholder="Additional notes or observations..." value={form.comments} onChange={(e) => handleFormChange('comments', e.target.value)} />
                        </div>

                        {/* Solution */}
                        <div className="rm-field rm-field--wide">
                            <label>Solution</label>
                            <textarea rows={2} placeholder="How was the issue resolved or planned to be resolved..." value={form.solution} onChange={(e) => handleFormChange('solution', e.target.value)} />
                        </div>
                    </div>

                    <div className="rm-form-actions">
                        <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.resourceName.trim()}>
                            {editId ? 'Update Entry' : 'Save Entry'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Controls ───────────────────────────────────────────────────────── */}
            <div className="rm-controls">
                <div className="rm-controls-left">
                    <div className="rm-week-select-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        <select className="rm-week-select" value={activeWeekKey} onChange={(e) => setSelectedWeek(e.target.value)}>
                            {weeks.length === 0 && <option value={currentWeekKey}>{formatDateRange(currentWeekKey)}</option>}
                            {weeks.map((w) => (
                                <option key={w.weekKey} value={w.weekKey}>
                                    {w.weekLabel}{w.weekKey === currentWeekKey ? ' (Current)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="rm-resource-filter-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            type="text"
                            className="rm-filter-input"
                            placeholder="Filter by resource..."
                            value={filterResource}
                            onChange={(e) => setFilterResource(e.target.value)}
                        />
                    </div>
                </div>
                <div className="rm-tab-group">
                    <button className={`rm-tab ${activeView === 'entries' ? 'active' : ''}`} onClick={() => setActiveView('entries')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                        Entries
                    </button>
                    <button className={`rm-tab ${activeView === 'ranking' ? 'active' : ''}`} onClick={() => setActiveView('ranking')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        Rankings
                    </button>
                </div>
            </div>

            {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
            {activeWeekData && (
                <div className="rm-stats-bar">
                    <div className="rm-stat rm-stat--primary">
                        <span className="rm-stat-value">{weekEntries.length}</span>
                        <span className="rm-stat-label">Total Entries</span>
                    </div>
                    <div className="rm-stat rm-stat--accent">
                        <span className="rm-stat-value">{avgCompletion}%</span>
                        <span className="rm-stat-label">Avg Completion</span>
                    </div>
                    <div className="rm-stat rm-stat--success">
                        <span className="rm-stat-value">{fullCount}</span>
                        <span className="rm-stat-label">100% Done</span>
                    </div>
                    <div className="rm-stat rm-stat--warning">
                        <span className="rm-stat-value">{partialCount}</span>
                        <span className="rm-stat-label">Partial</span>
                    </div>
                    <div className="rm-stat rm-stat--error">
                        <span className="rm-stat-value">{zeroCount}</span>
                        <span className="rm-stat-label">0% / Not Started</span>
                    </div>
                    <div className="rm-stat rm-stat--issue">
                        <span className="rm-stat-value">{issueCount}</span>
                        <span className="rm-stat-label">Issues Raised</span>
                    </div>
                </div>
            )}

            {/* ── Entries View ───────────────────────────────────────────────────── */}
            {activeView === 'entries' && (
                <div className="rm-table-wrap card">
                    {filteredEntries.length === 0 ? (
                        <div className="rm-empty">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            <p>No entries for this week yet.</p>
                            <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); }}>Add First Entry</button>
                        </div>
                    ) : (
                        <div className="rm-table-scroll">
                            <table className="rm-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Resource</th>
                                        <th>Completion</th>
                                        <th>Issue</th>
                                        <th>Comments</th>
                                        <th>Solution</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEntries.map((entry) => {
                                        const tier = completionTier(entry.taskCompletion);
                                        return (
                                            <tr key={entry.id} className="rm-table-row">
                                                <td className="rm-date-cell">{formatDate(entry.date)}</td>
                                                <td className="rm-resource-cell">
                                                    <div className="rm-avatar">{entry.resourceName.charAt(0).toUpperCase()}</div>
                                                    {entry.resourceName}
                                                </td>
                                                <td>
                                                    <div className="rm-completion-cell">
                                                        <span className={`rm-pct-badge rm-pct-badge--${tier}`}>
                                                            {completionEmoji(entry.taskCompletion)} {entry.taskCompletion}%
                                                        </span>
                                                        <div className="rm-mini-bar">
                                                            <div className={`rm-mini-fill rm-mini-fill--${tier}`} style={{ width: `${entry.taskCompletion}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="rm-text-cell">{entry.issue || <span className="rm-empty-cell">—</span>}</td>
                                                <td className="rm-text-cell">{entry.comments || <span className="rm-empty-cell">—</span>}</td>
                                                <td className="rm-text-cell">{entry.solution || <span className="rm-empty-cell">—</span>}</td>
                                                <td className="rm-actions-cell">
                                                    <button className="btn-icon rm-action-btn rm-action-edit" onClick={() => handleEdit(entry)} title="Edit">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                    </button>
                                                    {deleteConfirm === entry.id ? (
                                                        <span className="rm-delete-confirm">
                                                            <button className="btn-icon rm-action-btn rm-action-delete-yes" onClick={() => handleDelete(entry.id)}>✓</button>
                                                            <button className="btn-icon rm-action-btn" onClick={() => setDeleteConfirm(null)}>✕</button>
                                                        </span>
                                                    ) : (
                                                        <button className="btn-icon rm-action-btn rm-action-delete" onClick={() => setDeleteConfirm(entry.id)} title="Delete">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Ranking View ───────────────────────────────────────────────────── */}
            {activeView === 'ranking' && (
                <div className="rm-ranking animate-fade-in">
                    {ranking.length === 0 ? (
                        <div className="rm-empty card">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                            <p>No data to rank for this week.</p>
                        </div>
                    ) : (
                        <>
                            {ranking.length >= 1 && (
                                <div className="rm-podium">
                                    {ranking.slice(0, 3).map((r, i) => (
                                        <div key={r.name} className={`rm-podium-item rm-podium-item--${i + 1}`}>
                                            <div className="rm-podium-badge">{r.badge}</div>
                                            <div className="rm-podium-avatar">{r.name.charAt(0).toUpperCase()}</div>
                                            <div className="rm-podium-name">{r.name}</div>
                                            <div className="rm-podium-score">{r.avgCompletion}% avg</div>
                                            <div className={`rm-podium-block rm-podium-block--${i + 1}`}>#{r.rank}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="rm-table-wrap card">
                                <div className="rm-table-scroll">
                                    <table className="rm-table">
                                        <thead>
                                            <tr>
                                                <th>Rank</th>
                                                <th>Resource</th>
                                                <th>Avg Completion</th>
                                                <th>Total Score</th>
                                                <th>Entries</th>
                                                <th>Issues Raised</th>
                                                <th>Performance Bar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ranking.map((r) => (
                                                <tr key={r.name} className={`rm-table-row ${r.rank <= 3 ? 'rm-rank-top' : ''}`}>
                                                    <td><span className="rm-rank-badge">{r.badge}</span></td>
                                                    <td className="rm-resource-cell">
                                                        <div className="rm-avatar">{r.name.charAt(0).toUpperCase()}</div>
                                                        {r.name}
                                                    </td>
                                                    <td>
                                                        <span className={`rm-pct-badge rm-pct-badge--${completionTier(r.avgCompletion)}`}>
                                                            {completionEmoji(r.avgCompletion)} {r.avgCompletion}%
                                                        </span>
                                                    </td>
                                                    <td><strong className="rm-score">{r.totalScore}</strong></td>
                                                    <td><span className="rm-count rm-count--primary">{r.entryCount}</span></td>
                                                    <td><span className="rm-count rm-count--accent">{r.issueCount}</span></td>
                                                    <td>
                                                        <div className="rm-progress-wrap">
                                                            <div className="rm-progress-bar">
                                                                <div
                                                                    className={`rm-progress-fill rm-progress-fill--${completionTier(r.avgCompletion)}`}
                                                                    style={{ width: `${r.avgCompletion}%` }}
                                                                />
                                                            </div>
                                                            <span className="rm-progress-label">{r.avgCompletion}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Legend ─────────────────────────────────────────────────────────── */}
            <div className="rm-legend card">
                <h4>📊 Completion Scale &amp; Ranking</h4>
                <div className="rm-legend-grid">
                    <div className="rm-legend-item"><span className="rm-pct-badge rm-pct-badge--danger">❌ 0–20%</span><span>Not Started / Critical</span></div>
                    <div className="rm-legend-item"><span className="rm-pct-badge rm-pct-badge--warning">⚠️ 30–50%</span><span>In Progress / Partial</span></div>
                    <div className="rm-legend-item"><span className="rm-pct-badge rm-pct-badge--info">🔵 60–80%</span><span>Mostly Done</span></div>
                    <div className="rm-legend-item"><span className="rm-pct-badge rm-pct-badge--success">✅ 90–100%</span><span>Completed</span></div>
                    <div className="rm-legend-item"><span className="rm-info-chip">Ranking</span><span>by Avg Completion %, ties broken by fewer issues</span></div>
                </div>
            </div>
        </div>
    );
}
