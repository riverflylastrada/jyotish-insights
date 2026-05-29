import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck, ChevronRight, FlaskConical } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import type { Dosha } from '@/lib/astro/types';

const DOSHA_LABEL: Record<Dosha['name'], { title: string; deva: string; classical: string }> = {
  mangal:       { title: 'Mangal Dosha',     deva: 'मंगल दोष',      classical: 'Mars in 1, 4, 7, 8, or 12 from Lagna or Moon — Brihat Parashara Hora Sastra, Ch. 80' },
  kaal_sarp:    { title: 'Kaal Sarp Dosha',  deva: 'काल सर्प दोष',  classical: 'All grahas hemmed between Rahu and Ketu axis — Phaladeepika' },
  sade_sati:    { title: 'Sade Sati',        deva: 'साढ़े साती',     classical: 'Saturn transiting 12th, 1st, 2nd from natal Moon — Saravali, Ch. 35' },
  pitra:        { title: 'Pitra Dosha',      deva: 'पितृ दोष',      classical: 'Sun afflicted by Rahu/Saturn, or 9th lord debilitated — classical commentaries' },
  guru_chandal: { title: 'Guru Chandala',    deva: 'गुरु चांडाल',    classical: 'Jupiter conjunct Rahu — Phaladeepika' },
  shakat:       { title: 'Shakat Yoga',      deva: 'शकट योग',       classical: 'Moon in 6/8/12 from Jupiter — Brihat Jataka' },
};

const SEVERITY_BARS: Record<NonNullable<Dosha['severity']>, { bars: number; color: string; label: string }> = {
  low:       { bars: 1, color: 'hsl(var(--semantic-info))',      label: 'Low' },
  medium:    { bars: 2, color: 'hsl(var(--brand-saffron))',      label: 'Medium' },
  high:      { bars: 3, color: 'hsl(var(--semantic-negative))',  label: 'High' },
  cancelled: { bars: 0, color: 'hsl(var(--semantic-positive))',  label: 'Cancelled' },
};

/** A dosha's display state — afflicting, present-but-cancelled, or condition absent. */
type DoshaState = 'active' | 'cancelled' | 'absent';
function doshaState(d: Dosha): DoshaState {
  if (!d.isPresent) return 'absent';
  return d.severity === 'cancelled' ? 'cancelled' : 'active';
}

export default function Doshas() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
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
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const filtered = data.doshas.filter((d) => filter === 'all' || (filter === 'present' ? d.isPresent : !d.isPresent));
  const activeCount = data.doshas.filter((d) => doshaState(d) === 'active').length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-eyebrow text-brand-saffron">Configurations · checkable conditions</div>
          <h1 className="mt-1 font-display text-h1 text-text-primary">Doshas</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            A dosha is a <em>mathematical condition</em>, not a curse. {activeCount} of {data.doshas.length} classical
            doshas are active in this chart — tap any to see the rule, its classical source, and why it does or doesn't fire.
          </p>
        </div>
        <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
          {(['all', 'present', 'absent'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-sm px-3 py-1 capitalize ${filter === f ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary'}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Anti-fear banner */}
      <div className="mt-6 flex items-start gap-3 rounded-md border border-hairline-subtle bg-elevated px-5 py-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-semantic-positive" />
        <p className="text-sm text-text-secondary">
          <span className="font-display text-text-primary">Doshas are not curses.</span> They are mechanical
          configurations, and many are cancelled or mitigated by other placements. Detection is deterministic;
          severity and remedy belong to the astrologer's judgment.
        </p>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {filtered.map((d) => {
          const meta = DOSHA_LABEL[d.name];
          const state = doshaState(d);
          const sev = d.severity ? SEVERITY_BARS[d.severity] : null;
          const isOpen = open.has(d.name);
          return (
            <article key={d.name} className={`rounded-md border bg-surface shadow-sm transition-colors ${state === 'active' ? 'border-hairline-subtle' : 'border-hairline-subtle opacity-80'}`}>
              {/* Condition header — tap to expand */}
              <button onClick={() => toggle(d.name)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${state === 'active' ? 'bg-brand-saffron/15 text-brand-saffron' : 'bg-semantic-positive/15 text-semantic-positive'}`}>
                  {state === 'active' ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display text-h3 text-text-primary">{meta.title}</span>
                  <span className="ml-2 font-deva text-sm text-text-tertiary">{meta.deva}</span>
                  <span className="ml-2 text-xs text-text-tertiary">
                    {state === 'active' ? 'condition met' : state === 'cancelled' ? 'present · cancelled' : 'not present'}
                  </span>
                </span>
                {state === 'active' && (
                  <span className="flex shrink-0 gap-0.5">
                    {[1, 2, 3].map((b) => (
                      <span key={b} className="h-1.5 w-1.5 rounded-full" style={{ background: sev && b <= sev.bars ? sev.color : 'hsl(var(--border-subtle))' }} />
                    ))}
                  </span>
                )}
                <ChevronRight className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </button>

              {isOpen && (
                <div className="border-t border-hairline-subtle px-5 py-4 space-y-4">
                  {/* The rule + classical source */}
                  <div>
                    <div className="text-eyebrow text-text-tertiary">The rule</div>
                    <p className="mt-1 font-mono text-xs text-text-tertiary">{meta.classical}</p>
                    <p className="mt-2 text-sm text-text-secondary">{d.explanation}</p>
                  </div>

                  {/* Affected areas */}
                  {d.affectedAreas.length > 0 && (
                    <div>
                      <div className="text-eyebrow text-text-tertiary">Affected areas</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.affectedAreas.map((a) => (
                          <span key={a} className="rounded-sm border border-hairline-subtle bg-elevated px-2 py-0.5 text-xs text-text-secondary">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remedies */}
                  {d.remedies.length > 0 && (
                    <div>
                      <div className="text-eyebrow text-text-tertiary">Remedies</div>
                      <ul className="mt-2 divide-y divide-hairline-subtle">
                        {d.remedies.map((r) => (
                          <li key={r.title} className="flex items-start justify-between gap-4 py-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display text-sm text-text-primary">{r.title}</span>
                                <span className="rounded-sm border border-hairline-subtle px-1.5 py-0.5 text-eyebrow capitalize text-text-tertiary">{r.type}</span>
                              </div>
                              <p className="mt-1 text-sm text-text-tertiary">{r.description}</p>
                            </div>
                            <span className={`text-eyebrow capitalize ${r.priority === 'high' ? 'text-brand-maroon' : r.priority === 'medium' ? 'text-brand-saffron' : 'text-text-tertiary'}`}>{r.priority}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link to={`/app/chart/${id}/lab`} className="inline-flex items-center gap-1.5 text-xs text-brand-maroon hover:underline">
                    <FlaskConical className="h-3.5 w-3.5" /> Explore the planets in the Research Lab
                  </Link>
                </div>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="md:col-span-2 rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">No doshas match this filter.</div>
        )}
      </div>
    </div>
  );
}
