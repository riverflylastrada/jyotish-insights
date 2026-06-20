import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  Loader2, RefreshCw, CalendarPlus, Plus, Send, Trash2, Sparkles, X,
} from 'lucide-react';

const sb = supabase as unknown as SupabaseClient;

type ContentType = 'panchang' | 'rashifal' | 'transit' | 'rashi_effect';
type Status = 'pending' | 'posted' | 'failed' | 'cancelled';

interface Tweet {
  id: string; scheduled_at: string; content_type: ContentType; variant: string | null;
  rashi: string | null; language: string; status: Status; body: string | null;
  thread: string[] | null; tweet_id: string | null; impressions: number; likes: number;
  error: string | null; generated_by: string;
}

const RASHIS = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
const VARIANTS: Record<ContentType, { value: string; label: string }[]> = {
  panchang: [{ value: 'panchang', label: 'Panchang' }, { value: 'muhurat', label: 'Muhurat' }],
  rashifal: [{ value: 'rashifal_hook', label: 'Hook' }, { value: 'rashifal_thread', label: 'Thread (12 signs)' }],
  transit: [{ value: 'ingress', label: 'Ingress' }],
  rashi_effect: [{ value: 'rashi_effect', label: 'Rashi effect' }, { value: 'proof_flex', label: 'Proof flex' }],
};

async function invokeErr(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = await ctx.json(); if (j?.error) return String(j.error); } catch { /* ignore */ }
  }
  return (error as { message?: string })?.message ?? fallback;
}

const TABS: (Status | 'all')[] = ['all', 'pending', 'posted', 'failed', 'cancelled'];
const TYPE_COLOR: Record<ContentType, string> = {
  panchang: 'bg-brand-saffron/10 text-brand-saffron', rashifal: 'bg-brand-maroon/10 text-brand-maroon',
  transit: 'bg-semantic-info/10 text-semantic-info', rashi_effect: 'bg-brand-gold/15 text-brand-gold',
};
const STATUS_COLOR: Record<Status, string> = {
  pending: 'bg-amber-100 text-amber-800', posted: 'bg-semantic-positive/10 text-semantic-positive',
  failed: 'bg-semantic-negative/10 text-semantic-negative', cancelled: 'bg-muted text-text-tertiary',
};

export default function AdminTweetScheduler() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [modal, setModal] = useState(false);

  async function load() {
    setError(null);
    const { data, error: err } = await sb.from('scheduled_tweets').select('*').order('scheduled_at', { ascending: true });
    if (err) { setError(err.message); setLoading(false); return; }
    setTweets((data ?? []) as Tweet[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 3600_000;
    return {
      pending: tweets.filter((t) => t.status === 'pending').length,
      postedWeek: tweets.filter((t) => t.status === 'posted' && new Date(t.scheduled_at).getTime() >= weekAgo).length,
      impressions: tweets.reduce((s, t) => s + (t.impressions ?? 0), 0),
      likes: tweets.reduce((s, t) => s + (t.likes ?? 0), 0),
    };
  }, [tweets]);

  const filtered = filter === 'all' ? tweets : tweets.filter((t) => t.status === filter);

  async function generateWeek() {
    setGeneratingWeek(true);
    const { data, error: err } = await supabase.functions.invoke('social-generate-week', { body: {} });
    setGeneratingWeek(false);
    if (err) { toast.error(await invokeErr(err, 'Generate Week failed')); return; }
    const d = data as { inserted?: number; skipped?: number };
    toast.success(`Generated week — ${d?.inserted ?? 0} new, ${d?.skipped ?? 0} already queued`);
    load();
  }

  async function sendNow(t: Tweet) {
    const { error: err } = await supabase.functions.invoke('social-post-now', { body: { id: t.id } });
    if (err) { toast.error(await invokeErr(err, 'Send failed')); load(); return; }
    toast.success('Posted to X');
    load();
  }

  async function remove(t: Tweet) {
    if (t.status === 'pending') {
      if (!confirm('Delete this pending tweet?')) return;
      const { error: err } = await sb.from('scheduled_tweets').delete().eq('id', t.id);
      if (err) { toast.error(err.message); return; }
    } else {
      if (!confirm('Cancel this tweet?')) return;
      const { error: err } = await sb.from('scheduled_tweets').update({ status: 'cancelled' }).eq('id', t.id);
      if (err) { toast.error(err.message); return; }
    }
    toast.success('Removed');
    load();
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-saffron" /></div>;
  if (error) return <div className="rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">{error}</div>;

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-h2 text-text-primary">Tweet Scheduler</h1>
          <p className="mt-1 text-sm text-text-tertiary">Schedule auto-posts from @AcharyaJyotish</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-md border border-hairline-subtle px-3 py-2 text-sm text-text-secondary hover:bg-elevated/50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={generateWeek} disabled={generatingWeek}
            className="inline-flex items-center gap-2 rounded-md border border-hairline-subtle px-3 py-2 text-sm text-text-secondary hover:bg-elevated/50 disabled:opacity-60">
            {generatingWeek ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Generate Week
          </button>
          <button onClick={() => setModal(true)} className="inline-flex items-center gap-2 rounded-md bg-brand-maroon px-3 py-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Create Tweet
          </button>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Posted This Week" value={stats.postedWeek} />
        <Stat label="Total Impressions" value={stats.impressions.toLocaleString()} />
        <Stat label="Total Likes" value={stats.likes.toLocaleString()} />
      </div>

      <div className="mb-4 flex gap-1 border-b border-hairline-subtle">
        {TABS.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm capitalize ${filter === t ? 'border-brand-maroon font-medium text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-hairline-subtle bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline-subtle text-left text-xs uppercase tracking-wide text-text-tertiary">
              <th className="px-4 py-3 font-medium">Scheduled</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Rashi</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Preview</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-text-tertiary">No tweets. Use “Generate Week” or “Create Tweet”.</td></tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-hairline-subtle last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                  {new Date(t.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  <div className="text-[10px] uppercase text-text-muted">{t.language}{t.thread ? ` · ${t.thread.length}🧵` : ''}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[t.content_type]}`}>{t.variant ?? t.content_type}</span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{t.rashi ?? '—'}</td>
                <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}>{t.status}</span></td>
                <td className="max-w-sm px-4 py-3">
                  <div className="line-clamp-2 whitespace-pre-wrap text-text-secondary">{t.body ?? '—'}</div>
                  {t.error && <div className="mt-1 text-xs text-semantic-negative">{t.error}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {(t.status === 'pending' || t.status === 'failed') && (
                      <IconBtn title="Send now" onClick={() => sendNow(t)}><Send className="h-4 w-4" /></IconBtn>
                    )}
                    {t.status !== 'cancelled' && (
                      <IconBtn title={t.status === 'pending' ? 'Delete' : 'Cancel'} onClick={() => remove(t)} danger><Trash2 className="h-4 w-4" /></IconBtn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <CreateTweetModal onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />}
    </div>
  );
}

function CreateTweetModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [contentType, setContentType] = useState<ContentType>('panchang');
  const [variant, setVariant] = useState<string>('panchang');
  const [when, setWhen] = useState<string>(() => {
    const d = new Date(Date.now() + 3600_000);
    d.setSeconds(0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const [language, setLanguage] = useState<'en' | 'hi'>('hi');
  const [rashi, setRashi] = useState<string>('Mesha');
  const [gen, setGen] = useState<{ body?: string; thread?: string[] } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const showRashi = contentType === 'rashi_effect';

  function pickType(ct: ContentType) {
    setContentType(ct);
    setVariant(VARIANTS[ct][0].value);
    setGen(null);
  }

  async function generate() {
    setGenerating(true);
    const date = when.slice(0, 10);
    const { data, error: err } = await supabase.functions.invoke('social-generate', {
      body: { content_type: contentType, variant, date, language, rashi: showRashi ? rashi : null },
    });
    setGenerating(false);
    if (err) { toast.error(await invokeErr(err, 'Generation failed')); return; }
    const d = data as { body?: string; thread?: string[] };
    setGen({ body: d.body, thread: d.thread });
  }

  async function save() {
    if (!gen || (!gen.body && !gen.thread)) { toast.error('Generate content first.'); return; }
    setSaving(true);
    const thread = gen.thread && gen.thread.length ? gen.thread : null;
    const body = thread ? thread[0] : (gen.body ?? null);
    const { error: err } = await sb.from('scheduled_tweets').insert({
      scheduled_at: new Date(when).toISOString(),
      content_type: contentType, variant, rashi: showRashi ? rashi : null,
      language, status: 'pending', generated_by: 'manual', body, thread,
    });
    setSaving(false);
    if (err) { toast.error(err.message); return; }
    toast.success('Tweet queued');
    onSaved();
  }

  const parts = gen?.thread ?? (gen?.body ? [gen.body] : []);
  const inputCls = 'mt-1 w-full rounded-md border border-hairline-subtle bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-maroon';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-hairline-subtle bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-h3 text-text-primary">Create Tweet</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">Type</span>
            <select value={contentType} onChange={(e) => pickType(e.target.value as ContentType)} className={inputCls}>
              <option value="panchang">Panchang</option>
              <option value="rashifal">Rashifal</option>
              <option value="transit">Transit</option>
              <option value="rashi_effect">Rashi effect</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">Variant</span>
            <select value={variant} onChange={(e) => { setVariant(e.target.value); setGen(null); }} className={inputCls}>
              {VARIANTS[contentType].map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">When</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">Language</span>
            <select value={language} onChange={(e) => { setLanguage(e.target.value as 'en' | 'hi'); setGen(null); }} className={inputCls}>
              <option value="hi">Hindi</option>
              <option value="en">English</option>
            </select>
          </label>
          {showRashi && (
            <label className="block sm:col-span-2">
              <span className="text-xs uppercase tracking-wide text-text-tertiary">Rashi</span>
              <select value={rashi} onChange={(e) => { setRashi(e.target.value); setGen(null); }} className={inputCls}>
                {RASHIS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          )}
        </div>

        <button onClick={generate} disabled={generating}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-maroon px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate
        </button>

        {parts.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs uppercase tracking-wide text-text-tertiary">Preview {parts.length > 1 ? `(${parts.length} tweets)` : ''}</div>
            {parts.map((p, i) => (
              <div key={i} className="rounded-md border border-hairline-subtle bg-canvas p-3">
                <p className="whitespace-pre-wrap text-sm text-text-primary">{p}</p>
                <p className={`mt-1 text-right text-xs ${p.length > 280 ? 'text-semantic-negative' : 'text-text-muted'}`}>{p.length} / 280</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-hairline-subtle px-3 py-2 text-sm text-text-secondary">Cancel</button>
          <button onClick={save} disabled={saving || !gen} className="inline-flex items-center gap-2 rounded-md bg-brand-maroon px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-hairline-subtle bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-text-tertiary">{label}</div>
      <div className="mt-2 font-display text-h3 text-text-primary">{value}</div>
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick}
      className={`rounded-md p-1.5 hover:bg-elevated ${danger ? 'text-red-600 hover:text-red-700' : 'text-text-tertiary hover:text-text-primary'}`}>
      {children}
    </button>
  );
}
