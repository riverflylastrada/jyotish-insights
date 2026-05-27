import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { PLANET_LABELS, SIGN_NAMES, type PlanetName } from '@/lib/astro/types';

const BALA_KEYS = ['sthanaBala', 'digBala', 'kalaBala', 'cheshtaBala', 'naisargikaBala', 'drikBala'] as const;
const BALA_LABELS: Record<typeof BALA_KEYS[number], string> = {
  sthanaBala: 'Sthana', digBala: 'Dig', kalaBala: 'Kala', cheshtaBala: 'Cheshta', naisargikaBala: 'Naisargika', drikBala: 'Drik',
};
const BALA_HUES = ['var(--planet-sun)', 'var(--planet-moon)', 'var(--planet-mars)', 'var(--planet-mercury)', 'var(--planet-jupiter)', 'var(--planet-venus)'];
const PLANET_KEYS: PlanetName[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

function toRupas(v: number) {
  return (v / 60).toFixed(2);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">
      Recalculate this chart to generate {label}.
    </div>
  );
}

export default function Strengths() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const [tab, setTab] = useState<'shadbala' | 'bhava' | 'vargeeya' | 'vimsopaka'>('shadbala');

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Strength & Bala</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Strengths</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Quantitative strength of planets, houses, and divisional placements — the foundations classical authors used to judge what a chart can actually deliver.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-hairline-subtle">
        {([
          ['shadbala', 'Shadbala'],
          ['bhava', 'Bhava Bala'],
          ['vargeeya', 'Vargeeya Bala'],
          ['vimsopaka', 'Vimsopaka Bala'],
        ] as const).map(([key, label]) => {
          const isActive = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              className={`relative px-4 py-3 text-sm transition-colors ${isActive ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}>
              {label}
              {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-saffron" />}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {tab === 'shadbala' && (data.shadbala ? <ShadbalaSection data={data.shadbala} /> : <EmptyState label="Shadbala" />)}
        {tab === 'bhava' && (data.bhavaBala ? <BhavaBalaSection data={data.bhavaBala} /> : <EmptyState label="Bhava Bala" />)}
        {tab === 'vargeeya' && (data.vargeeyaBala ? <VargeeyaBalaSection data={data.vargeeyaBala} /> : <EmptyState label="Vargeeya Bala" />)}
        {tab === 'vimsopaka' && (data.vimsopakaBala ? <VimsopakaSection data={data.vimsopakaBala} /> : <EmptyState label="Vimsopaka Bala" />)}
      </div>
    </div>
  );
}

function ShadbalaSection({ data }: { data: NonNullable<ReturnType<typeof useKundli>['data']>['shadbala'] & {} }) {
  const rows = PLANET_KEYS.filter((p) => data.planets[p]);
  const strongest = data.rank?.[0];
  const weakest = data.rank?.[data.rank.length - 1];

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
        <div className="text-eyebrow text-text-tertiary">Ranking</div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {data.rank?.map((p, i) => (
            <span key={p} className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 ${
              i === 0 ? 'border-semantic-positive/40 text-semantic-positive bg-semantic-positive/5'
              : i === data.rank.length - 1 ? 'border-semantic-negative/40 text-semantic-negative bg-semantic-negative/5'
              : 'border-hairline-subtle text-text-secondary'
            }`}>
              <span className="font-mono opacity-60">#{i + 1}</span>
              <span className="capitalize">{p}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">Planet</th>
              {BALA_KEYS.map((k) => <th key={k} className="px-3 py-2 text-right font-medium">{BALA_LABELS[k]}</th>)}
              <th className="px-4 py-2 text-right font-medium">Total (Rupas)</th>
              <th className="px-3 py-2 text-right font-medium">Ishta</th>
              <th className="px-3 py-2 text-right font-medium">Kashta</th>
              <th className="px-3 py-2 text-right font-medium">Required</th>
              <th className="px-3 py-2 text-right font-medium">Ratio</th>
              <th className="px-3 py-2 font-medium">Composition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {rows.map((p) => {
              const row = data.planets[p];
              const isStrong = p === strongest;
              const isWeak = p === weakest;
              const below = row.ratio < 1;
              const sum = BALA_KEYS.reduce((s, k) => s + row[k], 0) || 1;
              return (
                <tr key={p} className={isStrong ? 'bg-semantic-positive/5' : isWeak ? 'bg-semantic-negative/5' : ''}>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(var(--planet-${p}))` }} />
                      <span className="font-display capitalize text-text-primary">{PLANET_LABELS[p].full}</span>
                      {isStrong && <span className="rounded-sm bg-semantic-positive/15 px-1.5 py-0.5 text-[10px] font-medium text-semantic-positive">Strongest</span>}
                      {isWeak && <span className="rounded-sm bg-semantic-negative/15 px-1.5 py-0.5 text-[10px] font-medium text-semantic-negative">Weakest</span>}
                    </span>
                  </td>
                  {BALA_KEYS.map((k) => (
                    <td key={k} className="px-3 py-3 text-right font-mono text-xs text-text-secondary">{toRupas(row[k])}</td>
                  ))}
                  <td className="px-4 py-3 text-right font-mono text-text-primary">{toRupas(row.totalVirupas)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-text-secondary">{(row.ishtaPhala ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-text-secondary">{(row.kashtaPhala ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-text-tertiary">{(row.required / 60).toFixed(2)}</td>
                  <td className={`px-3 py-3 text-right font-mono text-xs ${below ? 'text-semantic-negative' : 'text-semantic-positive'}`}>
                    {row.ratio.toFixed(2)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex h-2.5 w-40 overflow-hidden rounded-sm border border-hairline-subtle">
                      {BALA_KEYS.map((k, i) => (
                        <div key={k} title={`${BALA_LABELS[k]}: ${toRupas(row[k])}`}
                          style={{ width: `${(row[k] / sum) * 100}%`, background: `hsl(${BALA_HUES[i]})` }} />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-text-tertiary">
        {BALA_KEYS.map((k, i) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: `hsl(${BALA_HUES[i]})` }} />
            {BALA_LABELS[k]} Bala
          </span>
        ))}
      </div>
    </div>
  );
}

function BhavaBalaSection({ data }: { data: NonNullable<ReturnType<typeof useKundli>['data']>['bhavaBala'] & {} }) {
  const max = Math.max(...data.houses.map((h) => h.totalRupas), 1);
  const strongest = data.rank?.[0];
  const weakest = data.rank?.[data.rank.length - 1];

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <div className="text-eyebrow text-text-tertiary">House strength (Rupas)</div>
        <div className="mt-4 space-y-2">
          {data.houses.map((h) => {
            const pct = (h.totalRupas / max) * 100;
            const isStrong = h.house === strongest;
            const isWeak = h.house === weakest;
            const color = isStrong ? 'hsl(var(--semantic-positive))' : isWeak ? 'hsl(var(--semantic-negative))' : 'hsl(var(--brand-saffron))';
            return (
              <div key={h.house} className="flex items-center gap-3">
                <div className="w-10 font-mono text-xs text-text-tertiary">H{h.house}</div>
                <div className="relative h-5 flex-1 overflow-hidden rounded-sm border border-hairline-subtle bg-canvas">
                  <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
                </div>
                <div className="w-20 text-right font-mono text-xs text-text-secondary">{h.totalRupas.toFixed(2)}</div>
                {isStrong && <span className="text-[10px] font-medium text-semantic-positive">Strongest</span>}
                {isWeak && <span className="text-[10px] font-medium text-semantic-negative">Weakest</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">House</th>
              <th className="px-3 py-2 text-right font-medium">Bhavadhipathi</th>
              <th className="px-3 py-2 text-right font-medium">Bhava Dig</th>
              <th className="px-3 py-2 text-right font-medium">Bhava Drik</th>
              <th className="px-3 py-2 text-right font-medium">Total (Rupas)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {data.houses.map((h) => (
              <tr key={h.house}>
                <td className="px-4 py-2 font-mono text-text-primary">H{h.house}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-text-secondary">{toRupas(h.bhavadhipathiBala)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-text-secondary">{toRupas(h.bhavaDigBala)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-text-secondary">{toRupas(h.bhavaDrikBala)}</td>
                <td className="px-3 py-2 text-right font-mono text-text-primary">{h.totalRupas.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VargeeyaBalaSection({ data }: { data: NonNullable<ReturnType<typeof useKundli>['data']>['vargeeyaBala'] & {} }) {
  const planets = PLANET_KEYS.filter((p) => data.panchaVargeeya[p] !== undefined || data.dwadasaVargeeya[p] !== undefined);
  const maxPancha = Math.max(...Object.values(data.panchaVargeeya), 1);

  return (
    <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
      <div className="text-eyebrow text-text-tertiary">Vargeeya strength</div>
      <p className="mt-1 text-xs text-text-tertiary">Pancha-vargeeya (5 vargas) and Dwadasa-vargeeya (count out of 12) — share of dignified placements across divisional charts.</p>
      <div className="mt-5 space-y-4">
        {planets.map((p) => {
          const pancha = data.panchaVargeeya[p] ?? 0;
          const dwadasa = data.dwadasaVargeeya[p] ?? 0;
          return (
            <div key={p} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[110px_1fr] sm:items-center sm:gap-3">
              <div className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${p}))` }} />
                <span className="font-display text-sm capitalize text-text-primary">{PLANET_LABELS[p].full}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
                <div className="relative h-3 overflow-hidden rounded-sm border border-hairline-subtle bg-canvas">
                  <div className="absolute inset-y-0 left-0" style={{ width: `${(pancha / maxPancha) * 100}%`, background: 'hsl(var(--brand-saffron))', opacity: 0.85 }} />
                </div>
                <div className="w-14 text-right font-mono text-xs text-text-secondary">{pancha.toFixed(2)}</div>
                <div className="relative h-3 overflow-hidden rounded-sm border border-hairline-subtle bg-canvas">
                  <div className="absolute inset-y-0 left-0" style={{ width: `${(dwadasa / 12) * 100}%`, background: 'hsl(var(--brand-gold))', opacity: 0.85 }} />
                </div>
                <div className="w-14 text-right font-mono text-xs text-text-secondary">{dwadasa}/12</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex gap-4 text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-saffron" /> Pancha-vargeeya</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-brand-gold" /> Dwadasa-vargeeya (out of 12)</span>
      </div>
    </div>
  );
}

function VimsopakaSection({ data }: { data: NonNullable<ReturnType<typeof useKundli>['data']>['vimsopakaBala'] & {} }) {
  const planets = PLANET_KEYS.filter((p) => data.planets[p]);

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <div className="text-eyebrow text-text-tertiary">Shodhasavarga Vimsopaka (16 vargas, out of 20)</div>
        <p className="mt-1 text-xs text-text-tertiary">
          Weighted dignity score across 16 divisional charts (D1–D60). A score near 20 means the planet is
          dignified across most vargas; near 10 means neutral or mixed placements.
        </p>
        <div className="mt-5 space-y-3">
          {planets.map((p) => {
            const entry = data.planets[p];
            if (!entry) return null;
            const pct = (entry.score / 20) * 100;
            const color = entry.score >= 15 ? 'hsl(var(--semantic-positive))' : entry.score < 10 ? 'hsl(var(--semantic-negative))' : 'hsl(var(--brand-saffron))';
            return (
              <div key={p} className="grid grid-cols-1 gap-1 sm:grid-cols-[110px_1fr] sm:items-center sm:gap-3">
                <div className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${p}))` }} />
                  <span className="font-display text-sm capitalize text-text-primary">{PLANET_LABELS[p].full}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative h-4 flex-1 overflow-hidden rounded-sm border border-hairline-subtle bg-canvas">
                    <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
                  </div>
                  <div className="w-14 text-right font-mono text-xs text-text-secondary">{entry.score.toFixed(2)}</div>
                  <div className="w-8 text-right font-mono text-xs text-text-tertiary">{entry.count}</div>
                  {entry.charts && (
                    <div className="hidden text-xs text-text-tertiary sm:block">{entry.charts}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex gap-4 text-xs text-text-tertiary">
          <span>Score = weighted dignity (0–20)</span>
          <span>Count = # of vargas where planet is in own/exalted/mooltrikona</span>
        </div>
      </div>
    </div>
  );
}