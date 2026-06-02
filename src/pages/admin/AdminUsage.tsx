import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, DollarSign, Cpu, MessageSquare, Users,
  Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiUsageRow {
  id: string;
  created_at: string;
  user_id: string | null;
  function: string | null;
  mode: string | null;
  guru: string | null;
  chart_id: string | null;
  question: string | null;
  model: string | null;
  provider: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  language: string | null;
  success: boolean;
  error: string | null;
  latency_ms: number | null;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USD_TO_INR = 85;

function fmtCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(2)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function truncate(s: string, len: number): string {
  return s.length <= len ? s : s.slice(0, len) + '…';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminUsage() {
  const [rows, setRows] = useState<AiUsageRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recent table filters
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // Top-users sort
  const [topSort, setTopSort] = useState<{ col: 'questions' | 'tokens' | 'cost'; dir: 'asc' | 'desc' }>({ col: 'cost', dir: 'desc' });
  const [topPage, setTopPage] = useState(0);

  // Expanded question rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [usageRes, profilesRes] = await Promise.all([
        supabase.from('ai_usage').select('*').order('created_at', { ascending: false }).limit(10000),
        supabase.from('profiles').select('user_id, display_name'),
      ]);
      if (usageRes.error) { setError(usageRes.error.message); setLoading(false); return; }
      setRows((usageRes.data ?? []) as AiUsageRow[]);
      setProfiles((profilesRes.data ?? []) as Profile[]);
      setLoading(false);
    })();
  }, []);

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profiles) if (p.display_name) m.set(p.user_id, p.display_name);
    return m;
  }, [profiles]);

  // ─── Summary stats ────────────────────────────────────────────────────────

  const computeStats = (period: '7d' | '30d' | 'all') => {
    const cutoff = period === 'all' ? null : daysAgo(period === '7d' ? 7 : 30);
    const filtered = cutoff ? rows.filter(r => r.created_at >= cutoff) : rows;
    const totalCost = filtered.reduce((s, r) => s + Number(r.cost_usd), 0);
    const totalTokens = filtered.reduce((s, r) => s + r.total_tokens, 0);
    const totalQuestions = filtered.filter(r => r.mode !== 'auto-insights' && r.mode !== 'voice').length;
    const distinctUsers = new Set(filtered.map(r => r.user_id).filter(Boolean)).size;
    return { totalCost, totalTokens, totalQuestions, distinctUsers };
  };

  const stats7 = useMemo(() => computeStats('7d'), [rows]);
  const stats30 = useMemo(() => computeStats('30d'), [rows]);
  const statsAll = useMemo(() => computeStats('all'), [rows]);

  // ─── By-mode table ────────────────────────────────────────────────────────

  const byMode = useMemo(() => {
    const map = new Map<string, { count: number; tokens: number; cost: number }>();
    for (const r of rows) {
      const mode = r.mode ?? 'unknown';
      const entry = map.get(mode) ?? { count: 0, tokens: 0, cost: 0 };
      entry.count++;
      entry.tokens += r.total_tokens;
      entry.cost += Number(r.cost_usd);
      map.set(mode, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cost - a[1].cost);
  }, [rows]);

  // ─── Top users table ──────────────────────────────────────────────────────

  const topUsers = useMemo(() => {
    const map = new Map<string, { questions: number; tokens: number; cost: number }>();
    for (const r of rows) {
      const uid = r.user_id ?? 'anonymous';
      const entry = map.get(uid) ?? { questions: 0, tokens: 0, cost: 0 };
      if (r.mode !== 'auto-insights' && r.mode !== 'voice') entry.questions++;
      entry.tokens += r.total_tokens;
      entry.cost += Number(r.cost_usd);
      map.set(uid, entry);
    }
    const arr = Array.from(map.entries()).map(([uid, stats]) => ({
      uid, name: profileMap.get(uid) ?? null, ...stats,
    }));
    arr.sort((a, b) => {
      const mul = topSort.dir === 'asc' ? 1 : -1;
      return mul * (a[topSort.col] - b[topSort.col]);
    });
    return arr;
  }, [rows, profileMap, topSort]);

  const topUsersPage = topUsers.slice(topPage * PAGE_SIZE, (topPage + 1) * PAGE_SIZE);

  // ─── Recent questions ─────────────────────────────────────────────────────

  const recentRows = useMemo(() => {
    const cutoff = dateRange === 'all' ? null : daysAgo(dateRange === '7d' ? 7 : 30);
    let filtered = cutoff ? rows.filter(r => r.created_at >= cutoff) : rows;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        (r.question?.toLowerCase().includes(q)) ||
        (r.mode?.toLowerCase().includes(q)) ||
        (r.guru?.toLowerCase().includes(q)) ||
        (profileMap.get(r.user_id ?? '')?.toLowerCase().includes(q)) ||
        (r.user_id?.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [rows, dateRange, search, profileMap]);

  const recentPage = recentRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(recentRows.length / PAGE_SIZE);

  // ─── Cost per question ────────────────────────────────────────────────────

  const costPerQuestion = useMemo(() => {
    const questions = rows.filter(r => r.mode !== 'auto-insights' && r.mode !== 'voice');
    const total = questions.reduce((s, r) => s + Number(r.cost_usd), 0);
    const count = questions.length;
    const perMode = new Map<string, { cost: number; count: number }>();
    for (const r of questions) {
      const mode = r.mode ?? 'unknown';
      const e = perMode.get(mode) ?? { cost: 0, count: 0 };
      e.cost += Number(r.cost_usd);
      e.count++;
      perMode.set(mode, e);
    }
    return {
      overall: count > 0 ? total / count : 0,
      byMode: Array.from(perMode.entries()).map(([mode, { cost, count: c }]) => ({
        mode, avg: c > 0 ? cost / c : 0,
      })),
    };
  }, [rows]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-saffron" /></div>;
  if (error) return <div className="rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">{error}</div>;

  const SortIcon = ({ col }: { col: 'questions' | 'tokens' | 'cost' }) =>
    topSort.col === col
      ? (topSort.dir === 'desc' ? <ChevronDown className="inline h-3 w-3" /> : <ChevronUp className="inline h-3 w-3" />)
      : null;

  function toggleSort(col: 'questions' | 'tokens' | 'cost') {
    setTopSort(prev => ({ col, dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc' }));
    setTopPage(0);
  }

  function renderSummaryCards(label: string, s: { totalCost: number; totalTokens: number; totalQuestions: number; distinctUsers: number }) {
    const cards = [
      { name: 'Cost', value: `${fmtCost(s.totalCost)} / ₹${(s.totalCost * USD_TO_INR).toFixed(2)}`, icon: DollarSign, color: 'text-brand-maroon' },
      { name: 'Tokens', value: s.totalTokens.toLocaleString(), icon: Cpu, color: 'text-brand-saffron' },
      { name: 'Questions', value: s.totalQuestions.toLocaleString(), icon: MessageSquare, color: 'text-semantic-positive' },
      { name: 'Users', value: s.distinctUsers.toLocaleString(), icon: Users, color: 'text-semantic-info' },
    ];
    return (
      <div>
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</span>
        <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(({ name, value, icon: Icon, color }) => (
            <div key={name} className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-text-muted">{name}</span>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className={`mt-1 font-display text-lg font-semibold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-h2 text-text-primary">AI Usage &amp; Costs</h1>
      <p className="mt-1 text-sm text-text-muted">
        Per-user question &amp; token tracking, cost analytics, and recent queries.
      </p>

      {/* Privacy note */}
      <div className="mt-4 rounded-md border border-brand-saffron/30 bg-brand-saffron/5 px-4 py-2 text-xs text-text-secondary">
        <strong>Privacy:</strong> The <em>question</em> field contains personal user data and is visible only to admins (RLS-enforced). Handle with care.
      </div>

      {/* Summary cards */}
      <div className="mt-6 space-y-6">
        {renderSummaryCards('Last 7 days', stats7)}
        {renderSummaryCards('Last 30 days', stats30)}
        {renderSummaryCards('All time', statsAll)}
      </div>

      {/* Cost per question */}
      <div className="mt-8">
        <h2 className="font-display text-h3 text-text-primary">Cost per Question</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline-subtle text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3 text-right">Avg Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-hairline-subtle font-medium">
                <td className="px-4 py-3">Overall</td>
                <td className="px-4 py-3 text-right font-mono">{fmtCost(costPerQuestion.overall)}</td>
              </tr>
              {costPerQuestion.byMode.map(({ mode, avg }) => (
                <tr key={mode} className="border-b border-hairline-subtle last:border-0">
                  <td className="px-4 py-3 capitalize">{mode}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtCost(avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By-mode table */}
      <div className="mt-8">
        <h2 className="font-display text-h3 text-text-primary">Usage by Mode</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline-subtle text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3 text-right">Count</th>
                <th className="px-4 py-3 text-right">Tokens</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {byMode.map(([mode, { count, tokens, cost }]) => (
                <tr key={mode} className="border-b border-hairline-subtle last:border-0">
                  <td className="px-4 py-3 capitalize">{mode}</td>
                  <td className="px-4 py-3 text-right font-mono">{count}</td>
                  <td className="px-4 py-3 text-right font-mono">{tokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtCost(cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top users */}
      <div className="mt-8">
        <h2 className="font-display text-h3 text-text-primary">Top Users</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline-subtle text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">User</th>
                <th className="cursor-pointer px-4 py-3 text-right" onClick={() => toggleSort('questions')}>
                  Questions <SortIcon col="questions" />
                </th>
                <th className="cursor-pointer px-4 py-3 text-right" onClick={() => toggleSort('tokens')}>
                  Tokens <SortIcon col="tokens" />
                </th>
                <th className="cursor-pointer px-4 py-3 text-right" onClick={() => toggleSort('cost')}>
                  Cost <SortIcon col="cost" />
                </th>
              </tr>
            </thead>
            <tbody>
              {topUsersPage.map(u => (
                <tr key={u.uid} className="border-b border-hairline-subtle last:border-0">
                  <td className="px-4 py-3">
                    {u.name ? <span>{u.name}</span> : <span className="font-mono text-xs text-text-muted">{truncate(u.uid, 12)}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{u.questions}</td>
                  <td className="px-4 py-3 text-right font-mono">{u.tokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtCost(u.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topUsers.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-hairline-subtle px-4 py-2 text-xs text-text-muted">
              <span>Page {topPage + 1} of {Math.ceil(topUsers.length / PAGE_SIZE)}</span>
              <div className="flex gap-2">
                <button disabled={topPage === 0} onClick={() => setTopPage(p => p - 1)} className="rounded border border-hairline-subtle px-2 py-1 disabled:opacity-30"><ChevronLeft className="h-3 w-3" /></button>
                <button disabled={(topPage + 1) * PAGE_SIZE >= topUsers.length} onClick={() => setTopPage(p => p + 1)} className="rounded border border-hairline-subtle px-2 py-1 disabled:opacity-30"><ChevronRight className="h-3 w-3" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent questions */}
      <div className="mt-8">
        <h2 className="font-display text-h3 text-text-primary">Recent Queries</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search question, mode, guru, user…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full rounded-md border border-hairline-subtle bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-saffron focus:outline-none focus:ring-1 focus:ring-brand-saffron"
            />
          </div>
          <div className="flex gap-1">
            {(['7d', '30d', 'all'] as const).map(r => (
              <button key={r}
                onClick={() => { setDateRange(r); setPage(0); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${dateRange === r ? 'bg-brand-maroon text-white' : 'bg-surface text-text-tertiary border border-hairline-subtle hover:bg-elevated'}`}>
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline-subtle text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Guru</th>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3 text-right">Tokens</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-center">OK</th>
              </tr>
            </thead>
            <tbody>
              {recentPage.map(r => {
                const isExpanded = expanded.has(r.id);
                const q = r.question ?? '—';
                return (
                  <tr key={r.id} className="border-b border-hairline-subtle last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.user_id ? (profileMap.get(r.user_id) ?? truncate(r.user_id, 8)) : '—'}
                    </td>
                    <td className="px-4 py-3 capitalize">{r.mode ?? '—'}</td>
                    <td className="px-4 py-3 capitalize">{r.guru ?? '—'}</td>
                    <td className="max-w-xs px-4 py-3 text-xs">
                      {q.length > 60 ? (
                        <span
                          className="cursor-pointer text-text-secondary hover:text-text-primary"
                          onClick={() => setExpanded(prev => {
                            const next = new Set(prev);
                            isExpanded ? next.delete(r.id) : next.add(r.id);
                            return next;
                          })}>
                          {isExpanded ? q : truncate(q, 60)}
                        </span>
                      ) : (
                        <span className="text-text-secondary">{q}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs">{r.total_tokens.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs">{fmtCost(Number(r.cost_usd))}</td>
                    <td className="px-4 py-3 text-center">
                      {r.success
                        ? <span className="text-semantic-positive">yes</span>
                        : <span className="text-semantic-negative" title={r.error ?? ''}>no</span>}
                    </td>
                  </tr>
                );
              })}
              {recentPage.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">No matching records.</td></tr>
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-hairline-subtle px-4 py-2 text-xs text-text-muted">
              <span>{recentRows.length} row{recentRows.length !== 1 ? 's' : ''} — page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded border border-hairline-subtle px-2 py-1 disabled:opacity-30"><ChevronLeft className="h-3 w-3" /></button>
                <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border border-hairline-subtle px-2 py-1 disabled:opacity-30"><ChevronRight className="h-3 w-3" /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
