import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, Sparkles, UploadCloud, ExternalLink } from 'lucide-react';

const CATEGORIES = [
  'guides', 'nakshatras', 'dashas', 'yogas', 'doshas', 'planets', 'houses', 'compatibility',
] as const;

interface PublishResult { url: string; commitUrl: string | null; updated: boolean; path: string }

/** Best-effort extraction of the edge function's JSON {error} from a failed invoke. */
async function invokeErrorMessage(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = await ctx.json(); if (j?.error) return String(j.error); } catch { /* ignore */ }
  }
  return (error as { message?: string })?.message ?? fallback;
}

export default function AdminLearnContent() {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<string>('guides');
  const [keyword, setKeyword] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [slug, setSlug] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [meta, setMeta] = useState<{ model?: string; tokens?: number; cost?: number } | null>(null);
  const [published, setPublished] = useState<PublishResult | null>(null);

  async function handleGenerate() {
    if (!topic.trim()) { toast.error('Enter a topic first.'); return; }
    setGenerating(true);
    setPublished(null);
    const { data, error } = await supabase.functions.invoke('learn-content', {
      body: { action: 'generate', topic: topic.trim(), category, primaryKeyword: keyword.trim() },
    });
    setGenerating(false);
    if (error) { toast.error(await invokeErrorMessage(error, 'Generation failed')); return; }
    setMarkdown(data.markdown ?? '');
    setSlug(data.suggestedSlug ?? '');
    setMeta({ model: data.model, tokens: data.tokens, cost: data.cost });
    toast.success('Draft generated — review and edit before publishing.');
  }

  async function handlePublish() {
    if (!slug.trim()) { toast.error('A slug is required.'); return; }
    if (markdown.trim().length < 50) { toast.error('The article is empty.'); return; }
    setPublishing(true);
    const { data, error } = await supabase.functions.invoke('learn-content', {
      body: { action: 'publish', category, slug: slug.trim(), markdown },
    });
    setPublishing(false);
    if (error) { toast.error(await invokeErrorMessage(error, 'Publish failed')); return; }
    setPublished(data as PublishResult);
    toast.success(data.updated ? 'Article updated — deploying.' : 'Article published — deploying.');
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-display text-h2 text-text-primary">Learn Content</h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Draft an SEO article for learn.acharyajyotish.com with AI, review it, then publish.
          Publishing commits to the learn repo and auto-deploys.
        </p>
      </header>

      {/* Generate */}
      <section className="rounded-xl border border-hairline-subtle bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Topic</span>
            <input
              value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Pitra Dosha: causes, effects and remedies"
              className="mt-1 w-full rounded-md border border-hairline-subtle bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-maroon"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Category</span>
            <select
              value={category} onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline-subtle bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-maroon"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Primary keyword <span className="normal-case text-text-tertiary">(optional)</span></span>
            <input
              value={keyword} onChange={(e) => setKeyword(e.target.value)}
              placeholder="defaults to the topic"
              className="mt-1 w-full rounded-md border border-hairline-subtle bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-maroon"
            />
          </label>
        </div>
        <button
          onClick={handleGenerate} disabled={generating}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-maroon px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? 'Drafting…' : 'Generate draft'}
        </button>
      </section>

      {/* Review + publish */}
      {markdown && (
        <section className="mt-6 rounded-xl border border-hairline-subtle bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Slug → URL</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-text-tertiary">/learn/{category}/</span>
                <input
                  value={slug} onChange={(e) => setSlug(e.target.value)}
                  className="w-56 rounded-md border border-hairline-subtle bg-canvas px-2 py-1.5 text-sm text-text-primary outline-none focus:border-brand-maroon"
                />
                <span className="text-sm text-text-tertiary">/</span>
              </div>
            </label>
            {meta && (
              <span className="text-xs text-text-tertiary">
                {meta.model} · {meta.tokens} tokens · ${Number(meta.cost ?? 0).toFixed(4)}
              </span>
            )}
          </div>
          <textarea
            value={markdown} onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            className="h-[28rem] w-full rounded-md border border-hairline-subtle bg-canvas p-3 font-mono text-xs leading-relaxed text-text-primary outline-none focus:border-brand-maroon"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handlePublish} disabled={publishing}
              className="inline-flex items-center gap-2 rounded-md bg-brand-maroon px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {publishing ? 'Publishing…' : 'Publish to learn site'}
            </button>
            <span className="text-xs text-text-tertiary">Review the draft above — AI can be wrong. Publishing commits to the repo.</span>
          </div>

          {published && (
            <div className="mt-4 rounded-md border border-hairline-subtle bg-canvas p-3 text-sm">
              <p className="text-text-primary">{published.updated ? 'Updated' : 'Published'} · <code className="text-text-tertiary">{published.path}</code></p>
              <div className="mt-1 flex flex-wrap gap-4">
                <a href={published.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-maroon hover:underline">
                  Live URL <ExternalLink className="h-3 w-3" />
                </a>
                {published.commitUrl && (
                  <a href={published.commitUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-maroon hover:underline">
                    Commit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <span className="text-text-tertiary">Deploy takes ~1–2 min.</span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
