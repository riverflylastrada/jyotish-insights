import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2, Check, X, ChevronRight, FlaskConical, Sparkles, MessageSquare } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { PLANET_LABELS, type PlanetName, type Yoga } from '@/lib/astro/types';

const CATEGORY_LABELS: Record<Yoga['category'], string> = {
  raja: 'Raja Yogas',
  dhana: 'Dhana Yogas',
  pancha_mahapurusha: 'Pancha Mahapurusha',
  nabhasa: 'Nabhasa Yogas',
  chandra: 'Chandra Yogas',
  sun: 'Surya Yogas',
  aristha: 'Aristha Yogas',
  daridra: 'Daridra Yogas',
  sanyasa: 'Sanyasa Yogas',
  other: 'Other',
};

const STRENGTH_DOTS: Record<Yoga['strength'], number> = { weak: 1, moderate: 2, strong: 3 };

const PLANET_NAMES = Object.keys(PLANET_LABELS) as PlanetName[];
/** If a "formed by" string names a planet, return its key (for colour-coding). */
function planetIn(text: string): PlanetName | null {
  const lower = text.toLowerCase();
  return PLANET_NAMES.find((p) => p !== 'ascendant' && lower.includes(p)) ?? null;
}

export default function Yogas() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('present');
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const filtered = data.yogas.filter((y) => filter === 'all' || (filter === 'present' ? y.isPresent : !y.isPresent));
  const grouped = filtered.reduce<Record<string, Yoga[]>>((acc, y) => {
    (acc[y.category] ??= []).push(y);
    return acc;
  }, {});

  const presentCount = data.yogas.filter((y) => y.isPresent).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-eyebrow text-brand-saffron">Combinations · checkable conditions</div>
          <h1 className="mt-1 font-display text-h1 text-text-primary">Yogas</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            A yoga is a <em>mathematical condition</em>, not a fortune. {presentCount} of {data.yogas.length} classical
            yogas have their condition met in this chart — tap any to see the rule and why it does or doesn't fire.
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
            <div className="grid gap-3 md:grid-cols-2">
              {yogas.map((y) => {
                const isOpen = open.has(y.name);
                return (
                  <article key={y.name} className={`rounded-md border bg-surface shadow-sm transition-colors ${y.isPresent ? 'border-hairline-subtle' : 'border-hairline-subtle opacity-80'}`}>
                    {/* Condition header — tap to expand */}
                    <button onClick={() => toggle(y.name)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${y.isPresent ? 'bg-semantic-positive/15 text-semantic-positive' : 'bg-elevated text-text-muted'}`}>
                        {y.isPresent ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-display text-h3 text-text-primary">{y.name}</span>
                        <span className="ml-2 text-xs text-text-tertiary">{y.isPresent ? 'condition met' : 'not formed'}</span>
                      </span>
                      {y.isPresent && (
                        <span className="flex shrink-0 gap-0.5">
                          {[1, 2, 3].map((d) => (
                            <span key={d} className="h-1.5 w-1.5 rounded-full" style={{ background: d <= STRENGTH_DOTS[y.strength] ? 'hsl(var(--brand-saffron))' : 'hsl(var(--border-subtle))' }} />
                          ))}
                        </span>
                      )}
                      <ChevronRight className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="border-t border-hairline-subtle px-5 py-4 space-y-4">
                        {/* The rule */}
                        <div>
                          <div className="text-eyebrow text-text-tertiary">The rule</div>
                          <p className="mt-1 text-sm text-text-secondary">{y.explanation}</p>
                        </div>

                        {/* Formed-by planets as colour chips */}
                        {y.formedBy.length > 0 && (
                          <div>
                            <div className="text-eyebrow text-text-tertiary">Formed by</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {y.formedBy.map((f, i) => {
                                const pl = planetIn(f);
                                return (
                                  <span key={i} className="inline-flex items-center gap-1.5 rounded-sm border border-hairline-subtle bg-elevated px-2 py-0.5 text-xs text-text-secondary">
                                    {pl && <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${pl}))` }} />}
                                    {f}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Effects */}
                        {y.isPresent && y.effects.length > 0 && (
                          <div>
                            <div className="text-eyebrow text-text-tertiary">Effects</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {y.effects.map((e) => (
                                <span key={e} className="rounded-sm border border-hairline-subtle bg-elevated px-2 py-0.5 text-xs text-text-secondary">{e}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Auto-insight reading */}
                        {y.isPresent && data.autoInsights?.yogas?.[y.name] ? (
                          <div className="rounded-sm border border-brand-gold/20 bg-brand-gold/5 p-3">
                            <div className="flex items-center gap-1.5 text-xs text-brand-gold font-medium mb-1">
                              <Sparkles className="h-3.5 w-3.5" /> Guru Insight
                            </div>
                            <p className="text-sm text-text-secondary">{data.autoInsights.yogas[y.name]}</p>
                          </div>
                        ) : y.isPresent ? (
                          <Link to={chartLink(`/app/chart/${id}/debate`)} className="inline-flex items-center gap-1.5 text-xs text-brand-maroon hover:underline">
                            <MessageSquare className="h-3.5 w-3.5" /> Tap to ask a Guru &rarr;
                          </Link>
                        ) : null}

                        <Link to={chartLink(`/app/chart/${id}/lab`)} className="inline-flex items-center gap-1.5 text-xs text-brand-maroon hover:underline">
                          <FlaskConical className="h-3.5 w-3.5" /> Explore the planets in the Research Lab
                        </Link>
                      </div>
                    )}
                  </article>
                );
              })}
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
