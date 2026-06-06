import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import {
  Loader2, Sparkles, UploadCloud, ExternalLink, RefreshCw, RotateCcw,
  Pencil, Trash2, Plus, FileText,
} from 'lucide-react';

const CATEGORIES = [
  'guides', 'nakshatras', 'dashas', 'yogas', 'doshas', 'planets', 'houses', 'compatibility',
] as const;

interface Article { category: string; slug: string; path: string; chars: number; title: string; publishedAt: string }
interface PublishResult { url: string; commitUrl: string | null; updated: boolean; path: string }
type Tab = 'overview' | 'articles' | 'editor';

/** Pull the edge function's JSON {error} out of a failed invoke. */
async function invokeErr(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = await ctx.json(); if (j?.error) return String(j.error); } catch { /* ignore */ }
  }
  return (error as { message?: string })?.message ?? fallback;
}

const invoke = (body: Record<string, unknown>) => supabase.functions.invoke('learn-content', { body });

export default function AdminLearnContent() {
  const [tab, setTab] = useState<Tab>('overview');

  // Article list
  const [items, setItems] = useState<Article[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Editor (generate / edit)
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<string>('guides');
  const [keyword, setKeyword] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [slug, setSlug] = useState('');
  const [editingExisting, setEditingExisting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [meta, setMeta] = useState<{ model?: string; tokens?: number; cost?: number } | null>(null);
  const [published, setPublished] = useState<PublishResult | null>(null);

  async function loadList() {
    setLoadingList(true); setListError(null);
    const { data, error } = await invoke({ action: 'list' });
    setLoadingList(false);
    if (error) { setListError(await invokeErr(error, 'Failed to load articles')); return; }
    setItems((data?.items ?? []) as Article[]);
  }
  useEffect(() => { loadList(); }, []);

  // ─── Overview stats ───────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of CATEGORIES) m[c] = 0;
    for (const a of items) m[a.category] = (m[a.category] ?? 0) + 1;
    return m;
  }, [items]);

  // ─── Editor actions ───────────────────────────────────────────────────────
  function newArticle() {
    setTopic(''); setKeyword(''); setMarkdown(''); setSlug(''); setCategory('guides');
    setEditingExisting(false); setMeta(null); setPublished(null); setTab('editor');
  }

  async function handleGenerate() {
    if (!topic.trim()) { toast.error('Enter a topic first.'); return; }
    setGenerating(true); setPublished(null);
    const { data, error } = await invoke({ action: 'generate', topic: topic.trim(), category, primaryKeyword: keyword.trim() });
    setGenerating(false);
    if (error) { toast.error(await invokeErr(error, 'Generation failed')); return; }
    setMarkdown(data.markdown ?? '');
    if (!editingExisting) setSlug(data.suggestedSlug ?? '');
    setMeta({ model: data.model, tokens: data.tokens, cost: data.cost });
    toast.success('Draft generated — review before publishing.');
  }

  async function handlePublish() {
    if (!slug.trim()) { toast.error('A slug is required.'); return; }
    if (markdown.trim().length < 50) { toast.error('The article is empty.'); return; }
    setPublishing(true);
    const { data, error } = await invoke({ action: 'publish', category, slug: slug.trim(), markdown });
    setPublishing(false);
    if (error) { toast.error(await invokeErr(error, 'Publish failed')); return; }
    setPublished(data as PublishResult);
    toast.success(data.updated ? 'Updated — deploying.' : 'Published — deploying.');
    loadList();
  }

  async function handleEdit(a: Article) {
    setTab('editor'); setEditingExisting(true); setPublished(null); setMeta(null);
    setCategory(a.category); setSlug(a.slug); setTopic(a.title); setMarkdown('// loading…');
    const { data, error } = await invoke({ action: 'get', category: a.category, slug: a.slug });
    if (error) { toast.error(await invokeErr(error, 'Could not load article')); setMarkdown(''); return; }
    setMarkdown(data.markdown ?? '');
  }

  async function handleRegenerate(a: Article) {
    setTab('editor'); setEditingExisting(true); setPublished(null);
    setCategory(a.category); setSlug(a.slug); setTopic(a.title); setKeyword('');
    setGenerating(true); setMarkdown('');
    const { data, error } = await invoke({ action: 'generate', topic: a.title, category: a.category, primaryKeyword: '' });
    setGenerating(false);
    if (error) { toast.error(await invokeErr(error, 'Regeneration failed')); return; }
    setMarkdown(data.markdown ?? '');
    setMeta({ model: data.model, tokens: data.tokens, cost: data.cost });
    toast.success('Regenerated — review, then Publish to overwrite.');
  }

  async function handleDelete(a: Article) {
    if (!confirm(`Delete "${a.title}"? This removes /learn/${a.category}/${a.slug}/ from the site.`)) return;
    const { error } = await invoke({ action: 'delete', category: a.category, slug: a.slug });
    if (error) { toast.error(await invokeErr(error, 'Delete failed')); return; }
    toast.success('Deleted — deploying.');
    loadList();
  }

  const filtered = filter === 'all' ? items : items.filter((a) => a.category === filter);
  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'articles', label: 'Articles' }, { id: 'editor', label: 'Generate' },
  ];
  const inputCls = 'rounded-md border border-hairline-subtle bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-maroon';

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 text-text-primary">Learn Content</h1>
          <p className="mt-1 text-sm text-text-tertiary">Manage learn.acharyajyotish.com — draft with AI, review, and publish. Changes auto-deploy.</p>
        </div>
        <button onClick={loadList} disabled={loadingList}
          className="inline-flex items-center gap-2 rounded-md border border-hairline-subtle px-3 py-2 text-sm text-text-secondary hover:bg-elevated/50">
          <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="mb-6 flex gap-1 border-b border-hairline-subtle">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.id ? 'border-brand-maroon font-medium text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {listError && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {listError} — set the <strong>GitHub Content Token</strong> in Admin → API Keys to manage articles.
        </div>
      )}

      {/* ─── Overview ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total articles" value={items.length} icon={<FileText className="h-5 w-5 text-brand-maroon" />} />
            <Stat label="Categories" value={CATEGORIES.length} />
            <Stat label="Total characters" value={items.reduce((s, a) => s + a.chars, 0).toLocaleString()} />
            <Stat label="Largest" value={items.length ? Math.max(...items.map((a) => a.chars)).toLocaleString() : 0} />
          </div>
          <div className="mt-6 rounded-xl border border-hairline-subtle bg-surface p-5">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-brand-maroon">Articles by category</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => { setFilter(c); setTab('articles'); }}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-elevated/50">
                  <span className="capitalize text-text-secondary">{c}</span>
                  <span className="font-semibold text-text-primary">{counts[c]}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Articles ─────────────────────────────────────────────────────── */}
      {tab === 'articles' && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-tertiary">Filter:</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls}>
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="text-text-tertiary">{filtered.length} articles</span>
            </div>
            <button onClick={newArticle} className="inline-flex items-center gap-2 rounded-md bg-brand-maroon px-3 py-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> New article
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-hairline-subtle bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline-subtle text-left text-xs uppercase tracking-wide text-text-tertiary">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Chars</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingList && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-text-tertiary"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                )}
                {!loadingList && filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-text-tertiary">No articles. Use “New article” to create one.</td></tr>
                )}
                {filtered.map((a) => (
                  <tr key={a.path} className="border-b border-hairline-subtle last:border-0">
                    <td className="px-4 py-3">
                      <a href={`https://learn.acharyajyotish.com/learn/${a.category}/${a.slug}/`} target="_blank" rel="noreferrer"
                        className="font-medium text-text-primary hover:text-brand-maroon">{a.title}</a>
                      <div className="text-xs text-text-tertiary">/{a.category}/{a.slug}/</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-text-secondary">{a.category}</td>
                    <td className="px-4 py-3 text-text-secondary">{(a.chars / 1000).toFixed(1)}K</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Edit" onClick={() => handleEdit(a)}><Pencil className="h-4 w-4" /></IconBtn>
                        <IconBtn title="Regenerate with AI" onClick={() => handleRegenerate(a)}><RotateCcw className="h-4 w-4" /></IconBtn>
                        <IconBtn title="Delete" onClick={() => handleDelete(a)} danger><Trash2 className="h-4 w-4" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── Editor (generate / edit) ─────────────────────────────────────── */}
      {tab === 'editor' && (
        <section>
          <div className="rounded-xl border border-hairline-subtle bg-surface p-5">
            {editingExisting && <div className="mb-3 text-xs font-medium uppercase tracking-wide text-brand-maroon">Editing /{category}/{slug}/</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Topic</span>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Pitra Dosha: causes, effects and remedies" className={`mt-1 w-full ${inputCls}`} />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`mt-1 w-full ${inputCls}`}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Primary keyword <span className="normal-case text-text-tertiary">(optional)</span></span>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="defaults to the topic" className={`mt-1 w-full ${inputCls}`} />
              </label>
            </div>
            <button onClick={handleGenerate} disabled={generating}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-maroon px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Drafting…' : editingExisting ? 'Regenerate draft' : 'Generate draft'}
            </button>
          </div>

          {markdown && (
            <div className="mt-5 rounded-xl border border-hairline-subtle bg-surface p-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Slug → URL</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-text-tertiary">/learn/{category}/</span>
                    <input value={slug} onChange={(e) => setSlug(e.target.value)} className={`w-56 ${inputCls} py-1.5`} disabled={editingExisting} />
                    <span className="text-sm text-text-tertiary">/</span>
                  </div>
                </label>
                {meta && <span className="text-xs text-text-tertiary">{meta.model} · {meta.tokens} tokens · ${Number(meta.cost ?? 0).toFixed(4)}</span>}
              </div>
              <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} spellCheck={false}
                className="h-[28rem] w-full rounded-md border border-hairline-subtle bg-canvas p-3 font-mono text-xs leading-relaxed text-text-primary outline-none focus:border-brand-maroon" />
              <div className="mt-4 flex items-center gap-3">
                <button onClick={handlePublish} disabled={publishing}
                  className="inline-flex items-center gap-2 rounded-md bg-brand-maroon px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {publishing ? 'Publishing…' : 'Publish'}
                </button>
                <span className="text-xs text-text-tertiary">Review the draft — AI can be wrong. Publishing commits to the repo.</span>
              </div>
              {published && (
                <div className="mt-4 rounded-md border border-hairline-subtle bg-canvas p-3 text-sm">
                  <p className="text-text-primary">{published.updated ? 'Updated' : 'Published'} · <code className="text-text-tertiary">{published.path}</code></p>
                  <div className="mt-1 flex flex-wrap gap-4">
                    <a href={published.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-maroon hover:underline">Live URL <ExternalLink className="h-3 w-3" /></a>
                    {published.commitUrl && <a href={published.commitUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-maroon hover:underline">Commit <ExternalLink className="h-3 w-3" /></a>}
                    <span className="text-text-tertiary">Deploy ~1–2 min.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-hairline-subtle bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-text-tertiary">{label}</span>{icon}
      </div>
      <div className="mt-2 font-display text-h3 text-text-primary">{value}</div>
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick}
      className={`rounded-md p-1.5 hover:bg-elevated ${danger ? 'text-red-600 hover:text-red-700' : 'text-text-tertiary hover:text-text-primary'}`}>
      {children}
    </button>
  );
}
