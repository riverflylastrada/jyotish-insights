import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Star, ChevronRight, Sparkles } from 'lucide-react';
import { useChartLink } from '@/hooks/useChartLink';
import { useKundli } from '@/hooks/useKundli';
import { FocusedGuruAnswer } from '@/components/research/FocusedGuruAnswer';
import { PLANET_LABELS, type PlanetPosition, type PlanetName } from '@/lib/astro/types';
import { nakshatraInfo, type NakshatraInfo } from '@/lib/astro/nakshatraData';

/** Fixed display order: Lagna first, then the grahas. */
const PLANET_ORDER: PlanetName[] = [
  'ascendant', 'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu',
];

export default function Nakshatras() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const d1 = data.divisionalCharts.find((c) => c.varga === 'D1');
  const placements = (d1?.planets ?? [])
    .slice()
    .sort((a, b) => PLANET_ORDER.indexOf(a.planet) - PLANET_ORDER.indexOf(b.planet));
  const moon = placements.find((p) => p.planet === 'moon');
  const moonInfo = moon ? nakshatraInfo(moon.nakshatra) : undefined;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>

      <div className="mt-3">
        <div className="text-eyebrow text-brand-saffron">Lunar mansions · 27 nakshatras</div>
        <h1 className="mt-1 font-display text-h1 text-text-primary">Nakshatras</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          The nakshatra is the star the Moon (and each planet) occupies — a finer, 27-fold
          division of the zodiac. Your <em>Janma Nakshatra</em> (the Moon's star at birth) shapes
          temperament and instinct; every other placement colours its part of the chart.
        </p>
      </div>

      {/* ── Janma (birth) Nakshatra hero ── */}
      {moon && (
        <section className="mt-8 rounded-md border border-planet-moon/30 bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-1.5 text-eyebrow text-planet-moon">
            <Star className="h-3.5 w-3.5" /> Janma Nakshatra · birth star
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h2 className="font-display text-h1 text-text-primary">{moon.nakshatra}</h2>
            {moonInfo && <span className="font-deva text-h3 text-text-tertiary">{moonInfo.deva}</span>}
            <span className="rounded-sm border border-hairline-subtle bg-elevated px-2 py-0.5 text-xs text-text-secondary">
              Pada {moon.nakshatraPada}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-tertiary">
            Moon in {moon.signName}{moonInfo ? ` · ${moonInfo.range}` : ''}
          </p>

          {moonInfo ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Field label="Ruling lord" value={moonInfo.lord} />
                <Field label="Deity" value={moonInfo.deity} deva={moonInfo.deityDeva} />
                <Field label="Symbol" value={moonInfo.symbol} />
                <Field label="Gana" value={moonInfo.gana} />
                <Field label="Yoni" value={moonInfo.yoni} />
                <Field label="Nadi" value={moonInfo.nadi} />
              </div>

              <p className="mt-5 text-sm leading-relaxed text-text-secondary">{moonInfo.traits}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ChipRow label="Strengths" items={moonInfo.strengths} tone="positive" />
                <ChipRow label="Tendencies to watch" items={moonInfo.challenges} tone="neutral" />
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-text-tertiary">Reference details for this nakshatra are unavailable.</p>
          )}

          <div className="mt-5">
            <FocusedGuruAnswer chartId={id} topic="nakshatra" subject={moon.nakshatra} variant="button" />
          </div>
        </section>
      )}

      {/* ── All placements ── */}
      <div className="mt-10">
        <div className="mb-2 text-eyebrow text-text-tertiary">All placements</div>
        <div className="grid gap-3 md:grid-cols-2">
          {placements.map((p) => (
            <PlacementCard
              key={p.planet}
              p={p}
              id={id}
              info={nakshatraInfo(p.nakshatra)}
              isOpen={open.has(p.planet)}
              toggle={toggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlacementCard({ p, id, info, isOpen, toggle }: {
  p: PlanetPosition;
  id: string;
  info?: NakshatraInfo;
  isOpen: boolean;
  toggle: (key: string) => void;
}) {
  return (
    <article className="rounded-md border border-hairline-subtle bg-surface shadow-sm transition-colors">
      <button onClick={() => toggle(p.planet)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="font-mono text-xs font-medium" style={{ color: p.planet === 'ascendant' ? 'hsl(var(--brand-maroon))' : `hsl(var(--planet-${p.planet}))` }}>
          {PLANET_LABELS[p.planet].short}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display text-h3 text-text-primary">{PLANET_LABELS[p.planet].full}</span>
          <span className="ml-2 text-sm text-text-secondary">{p.nakshatra}</span>
          <span className="ml-2 text-xs text-text-tertiary">Pada {p.nakshatraPada}{info ? ` · ${info.lord}` : ''}</span>
        </span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-hairline-subtle px-5 py-4 space-y-4">
          {info ? (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <Field label="Lord" value={info.lord} />
                <Field label="Deity" value={info.deity} deva={info.deityDeva} />
                <Field label="Symbol" value={info.symbol} />
                <Field label="Gana" value={info.gana} />
                <Field label="Yoni" value={info.yoni} />
                <Field label="Nadi" value={info.nadi} />
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">{info.traits}</p>
            </>
          ) : (
            <p className="text-sm text-text-tertiary">Reference details for {p.nakshatra} are unavailable.</p>
          )}
          <FocusedGuruAnswer chartId={id} topic="nakshatra" subject={p.nakshatra} variant="link" />
        </div>
      )}
    </article>
  );
}

function Field({ label, value, deva }: { label: string; value: string; deva?: string }) {
  return (
    <div>
      <div className="text-eyebrow text-text-tertiary">{label}</div>
      <div className="mt-0.5 text-sm text-text-primary">
        {value}
        {deva && <span className="ml-1.5 font-deva text-text-tertiary">{deva}</span>}
      </div>
    </div>
  );
}

function ChipRow({ label, items, tone }: { label: string; items: string[]; tone: 'positive' | 'neutral' }) {
  if (items.length === 0) return null;
  const chip = tone === 'positive'
    ? 'border-semantic-positive/30 bg-semantic-positive/10 text-semantic-positive'
    : 'border-hairline-subtle bg-elevated text-text-secondary';
  return (
    <div>
      <div className="text-eyebrow text-text-tertiary">{label}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className={`rounded-sm border px-2 py-0.5 text-xs ${chip}`}>{it}</span>
        ))}
      </div>
    </div>
  );
}
