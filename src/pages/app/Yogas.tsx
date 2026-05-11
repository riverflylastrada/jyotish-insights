import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import type { Yoga } from '@/lib/astro/types';

const CATEGORY_LABELS: Record<Yoga['category'], string> = {
  raja: 'Raja Yogas',
  dhana: 'Dhana Yogas',
  pancha_mahapurusha: 'Pancha Mahapurusha',
  nabhasa: 'Nabhasa Yogas',
  chandra: 'Chandra Yogas',
  sun: 'Surya Yogas',
  other: 'Other',
};

const STRENGTH_DOTS: Record<Yoga['strength'], number> = { weak: 1, moderate: 2, strong: 3 };

export default function Yogas() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('present');

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const filtered = data.yogas.filter((y) => filter === 'all' || (filter === 'present' ? y.isPresent : !y.isPresent));
  const grouped = filtered.reduce<Record<string, Yoga[]>>((acc, y) => {
    (acc[y.category] ??= []).push(y);
    return acc;
  }, {});

  const presentCount = data.yogas.filter((y) => y.isPresent).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-eyebrow text-brand-saffron">Combinations</div>
          <h1 className="mt-1 font-display text-h1 text-text-primary">Yogas</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            {presentCount} of {data.yogas.length} classical yogas are formed in this chart.
          </p>
        </div>
        <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
          {(['present', 'absent', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-sm px-3 py-1 capitalize ${filter === f ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {Object.entries(grouped).map(([cat, yogas]) => (
          <section key={cat}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-display text-h3 text-text-primary">{CATEGORY_LABELS[cat as Yoga['category']]}</h2>
              <div className="h-px flex-1 bg-hairline-subtle" />
              <span className="font-mono text-xs text-text-tertiary">{yogas.length}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {yogas.map((y) => (
                <article key={y.name} className={`rounded-md border bg-surface p-5 shadow-sm ${y.isPresent ? 'border-hairline-subtle' : 'border-hairline-subtle opacity-70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {y.isPresent && <Sparkles className="h-3.5 w-3.5 text-brand-gold" />}
                        <h3 className="font-display text-h3 text-text-primary">{y.name}</h3>
                      </div>
                    </div>
                    {y.isPresent && (
                      <div className="flex gap-0.5">
                        {[1,2,3].map((d) => (
                          <span key={d} className="h-1.5 w-1.5 rounded-full" style={{ background: d <= STRENGTH_DOTS[y.strength] ? 'hsl(var(--brand-saffron))' : 'hsl(var(--border-subtle))' }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">{y.explanation}</p>
                  {y.formedBy.length > 0 && (
                    <div className="mt-4">
                      <div className="text-eyebrow text-text-tertiary">Formed by</div>
                      <ul className="mt-2 space-y-1">
                        {y.formedBy.map((f) => (
                          <li key={f} className="font-mono text-xs text-text-secondary">· {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {y.effects.length > 0 && (
                    <div className="mt-4">
                      <div className="text-eyebrow text-text-tertiary">Effects</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {y.effects.map((e) => (
                          <span key={e} className="rounded-sm border border-hairline-subtle bg-elevated px-2 py-0.5 text-xs text-text-secondary">{e}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">No yogas match this filter.</div>
        )}
      </div>
    </div>
  );
}