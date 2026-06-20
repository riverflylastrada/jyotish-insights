import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  Loader2, RefreshCw, Play, Settings2, ExternalLink, CheckCircle2, XCircle, Clock, Activity,
} from 'lucide-react';

// New tables aren't in the generated Database type yet — use a relaxed client.
const sb = supabase as unknown as SupabaseClient;

interface FeatureFlag { key: string; label: string | null; description: string | null; enabled: boolean }
interface Settings {
  twitter_enabled: boolean; max_per_day: number; max_per_hour: number; poll_interval_min: number;
  default_city: string; default_lat: number | null; default_lon: number | null; default_tz: string;
  include_link: boolean; fetch_metrics: boolean; last_poll_at: string | null;
}
interface Run { id: string; ran_at: string; action: string; result: string; detail: Record<string, unknown> | null }

const X_KEYS = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];

async function invokeErr(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = await ctx.json(); if (j?.error) return String(j.error); } catch { /* ignore */ }
  }
  return (error as { message?: string })?.message ?? fallback;
}

export default function AdminSocialBot() {
  const [tab, setTab] = useState<'overview' | 'analytics'>('overview');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [hourCount, setHourCount] = useState(0);
  const [credsOk, setCredsOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState<Partial<Settings>>({});

  async function load() {
    setError(null);
    const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const dayStart = new Date(`${istDate}T00:00:00+05:30`).toISOString();
    const hourStart = new Date(Date.now() - 3600_000).toISOString();
    const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();

    const [flagsRes, settingsRes, runsRes, dayRes, hourRes, credsRes] = await Promise.all([
      sb.from('social_feature_flags').select('*').order('key'),
      sb.from('social_settings').select('*').eq('id', 1).maybeSingle(),
      sb.from('social_runs').select('*').gte('ran_at', since24h).order('ran_at', { ascending: false }).limit(40),
      sb.from('scheduled_tweets').select('id', { count: 'exact', head: true }).eq('status', 'posted').gte('posted_at', dayStart),
      sb.from('scheduled_tweets').select('id', { count: 'exact', head: true }).eq('status', 'posted').gte('posted_at', hourStart),
      sb.from('app_settings').select('key, value').in('key', X_KEYS),
    ]);
    if (flagsRes.error) { setError(flagsRes.error.message); setLoading(false); return; }
    setFlags((flagsRes.data ?? []) as FeatureFlag[]);
    setSettings((settingsRes.data ?? null) as Settings | null);
    setRuns((runsRes.data ?? []) as Run[]);
    setTodayCount(dayRes.count ?? 0);
    setHourCount(hourRes.count ?? 0);
    const creds = (credsRes.data ?? []) as { key: string; value: string | null }[];
    setCredsOk(X_KEYS.every((k) => creds.find((c) => c.key === k)?.value));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleFlag(f: FeatureFlag) {
    const next = !f.enabled;
    setFlags((fs) => fs.map((x) => x.key === f.key ? { ...x, enabled: next } : x));
    const { error: err } = await sb.from('social_feature_flags').update({ enabled: next }).eq('key', f.key);
    if (err) { toast.error(err.message); load(); } else { toast.success(`${f.label ?? f.key} ${next ? 'enabled' : 'disabled'}`); }
  }

  async function togglePlatform() {
    if (!settings) return;
    const next = !settings.twitter_enabled;
    setSettings({ ...settings, twitter_enabled: next });
    const { error: err } = await sb.from('social_settings').update({ twitter_enabled: next }).eq('id', 1);
    if (err) { toast.error(err.message); load(); } else { toast.success(`Platform ${next ? 'enabled' : 'disabled'}`); }
  }

  async function runNow() {
    setRunning(true);
    const { data, error: err } = await supabase.functions.invoke('social-scheduler-tick', { body: {} });
    setRunning(false);
    if (err) { toast.error(await invokeErr(err, 'Scheduler run failed')); return; }
    const d = data as { skipped?: boolean; reason?: string; posted?: number; due?: number };
    toast.success(d?.skipped ? `Skipped: ${d.reason}` : `Posted ${d?.posted ?? 0} of ${d?.due ?? 0} due`);
    load();
  }

  function openSettings() {
    if (!settings) return;
    setDraft({
      max_per_day: settings.max_per_day, max_per_hour: settings.max_per_hour,
      poll_interval_min: settings.poll_interval_min, default_city: settings.default_city,
      include_link: settings.include_link, fetch_metrics: settings.fetch_metrics,
    });
    setShowSettings(true);
  }
  async function saveSettings() {
    const { error: err } = await sb.from('social_settings').update(draft).eq('id', 1);
    if (err) { toast.error(err.message); return; }
    toast.success('Settings saved');
    setShowSettings(false);
    load();
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-saffron" /></div>;
  if (error) return <div className="rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">{error}</div>;

  const lastPoll = settings?.last_poll_at ? new Date(settings.last_poll_at).toLocaleTimeString() : '—';

  return (
    <div>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 text-text-primary">Social Bot</h1>
          <p className="mt-1 text-sm text-text-tertiary">X (Twitter) auto-post + scheduler management</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-md border border-hairline-subtle px-3 py-2 text-sm text-text-secondary hover:bg-elevated/50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      <div className="mb-6 flex gap-1 border-b border-hairline-subtle">
        {(['overview', 'analytics'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm capitalize ${tab === t ? 'border-brand-maroon font-medium text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Feature Flags */}
          <section className="rounded-xl border border-hairline-subtle bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-brand-maroon">Feature Flags</h2>
            <div className="mt-4 space-y-3">
              {flags.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{f.label ?? f.key}</div>
                    {f.description && <div className="text-xs text-text-tertiary">{f.description}</div>}
                  </div>
                  <Toggle on={f.enabled} onClick={() => toggleFlag(f)} />
                </div>
              ))}
            </div>
          </section>

          {/* Twitter / X */}
          <section className="rounded-xl border border-hairline-subtle bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-brand-maroon">Twitter / X</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-tertiary">Platform Enabled</span>
                <Toggle on={!!settings?.twitter_enabled} onClick={togglePlatform} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Today" value={`${todayCount} / ${settings?.max_per_day ?? 16}`} />
              <Stat label="This Hour" value={`${hourCount} / ${settings?.max_per_hour ?? 10}`} />
            </div>

            <p className="mt-3 text-xs text-text-tertiary">
              Poll interval: {settings?.poll_interval_min ?? 15} min · Last poll: {lastPoll}
            </p>

            <div className="mt-3">
              {credsOk === false && (
                <Link to="/admin/api-keys" className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs text-amber-900 hover:bg-amber-100">
                  <XCircle className="h-3.5 w-3.5" /> X credentials not set — add them in API Keys <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {credsOk === true && (
                <span className="inline-flex items-center gap-1.5 text-xs text-semantic-positive">
                  <CheckCircle2 className="h-3.5 w-3.5" /> X credentials configured
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button onClick={runNow} disabled={running}
                className="inline-flex items-center gap-2 rounded-md bg-brand-maroon px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run Scheduler Now
              </button>
              <button onClick={openSettings}
                className="inline-flex items-center gap-2 rounded-md border border-hairline-subtle px-3 py-2 text-sm text-text-secondary hover:bg-elevated/50">
                <Settings2 className="h-4 w-4" /> Settings
              </button>
            </div>

            {showSettings && settings && (
              <div className="mt-4 rounded-md border border-hairline-subtle bg-canvas p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumField label="Max per day" value={draft.max_per_day ?? 0} onChange={(v) => setDraft((d) => ({ ...d, max_per_day: v }))} />
                  <NumField label="Max per hour" value={draft.max_per_hour ?? 0} onChange={(v) => setDraft((d) => ({ ...d, max_per_hour: v }))} />
                  <NumField label="Poll interval (min)" value={draft.poll_interval_min ?? 0} onChange={(v) => setDraft((d) => ({ ...d, poll_interval_min: v }))} />
                  <label className="block">
                    <span className="text-xs uppercase tracking-wide text-text-tertiary">Default city</span>
                    <input value={draft.default_city ?? ''} onChange={(e) => setDraft((d) => ({ ...d, default_city: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-hairline-subtle bg-surface px-3 py-2 text-sm outline-none focus:border-brand-maroon" />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-5">
                  <CheckRow label="Include link (proof_flex only)" on={!!draft.include_link} onClick={() => setDraft((d) => ({ ...d, include_link: !d.include_link }))} />
                  <CheckRow label="Fetch metrics (costs reads)" on={!!draft.fetch_metrics} onClick={() => setDraft((d) => ({ ...d, fetch_metrics: !d.fetch_metrics }))} />
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={saveSettings} className="rounded-md bg-brand-maroon px-4 py-2 text-sm font-medium text-white">Save</button>
                  <button onClick={() => setShowSettings(false)} className="rounded-md border border-hairline-subtle px-3 py-2 text-sm text-text-secondary">Cancel</button>
                </div>
              </div>
            )}
          </section>

          {/* Last 24 Hours */}
          <section className="rounded-xl border border-hairline-subtle bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-brand-maroon">Last 24 Hours</h2>
            <div className="mt-3 space-y-1.5">
              {runs.length === 0 && <p className="py-4 text-center text-sm text-text-tertiary">No activity yet.</p>}
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-elevated/40">
                  <span className="flex items-center gap-2">
                    <ResultDot result={r.result} />
                    <span className="font-mono text-xs text-text-tertiary">{new Date(r.ran_at).toLocaleTimeString()}</span>
                    <span className="text-text-secondary">{r.action}</span>
                  </span>
                  <span className="truncate text-xs text-text-tertiary">{summarize(r)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'analytics' && (
        <section className="rounded-xl border border-hairline-subtle bg-surface p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-brand-maroon"><Activity className="h-4 w-4" /> Analytics</h2>
          <p className="mt-3 text-sm text-text-tertiary">
            Engagement metrics (impressions / likes) are <strong>off by default</strong> to avoid X read charges.
            Enable “Fetch metrics” in Settings, then run the metrics refresh. Per-tweet numbers appear in the Tweet Scheduler.
          </p>
        </section>
      )}
    </div>
  );
}

function summarize(r: Run): string {
  const d = r.detail ?? {};
  if (r.action === 'scheduler_tick') return (d as { reason?: string }).reason ?? `posted ${(d as { posted?: number }).posted ?? 0}`;
  if (r.action === 'generate_week') return `inserted ${(d as { inserted?: number }).inserted ?? 0}`;
  return r.result;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-brand-saffron' : 'bg-muted')}>
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', on ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline-subtle bg-canvas p-4">
      <div className="text-xs uppercase tracking-wide text-text-tertiary">{label}</div>
      <div className="mt-1 font-display text-h3 text-text-primary">{value}</div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-tertiary">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
        className="mt-1 w-full rounded-md border border-hairline-subtle bg-surface px-3 py-2 text-sm outline-none focus:border-brand-maroon" />
    </label>
  );
}

function CheckRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 text-sm text-text-secondary">
      <span className={cn('flex h-4 w-4 items-center justify-center rounded border', on ? 'border-brand-saffron bg-brand-saffron text-white' : 'border-hairline-subtle')}>
        {on && <CheckCircle2 className="h-3 w-3" />}
      </span>
      {label}
    </button>
  );
}

function ResultDot({ result }: { result: string }) {
  if (result === 'ok') return <CheckCircle2 className="h-3.5 w-3.5 text-semantic-positive" />;
  if (result === 'skipped') return <Clock className="h-3.5 w-3.5 text-text-muted" />;
  return <XCircle className="h-3.5 w-3.5 text-semantic-negative" />;
}
