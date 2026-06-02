import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { PLANET_LABELS, type PlanetName, type SubBalasData, type AvasthasData, type BaladiState, type JagradadiState, type DeeptadiState } from '@/lib/astro/types';

type Depth = 'visual' | 'explain' | 'math';

const BALA_KEYS = ['sthanaBala', 'digBala', 'kalaBala', 'cheshtaBala', 'naisargikaBala', 'drikBala'] as const;
type BalaKey = typeof BALA_KEYS[number];
const BALA_LABELS: Record<BalaKey, string> = {
  sthanaBala: 'Sthana', digBala: 'Dig', kalaBala: 'Kala', cheshtaBala: 'Cheshta', naisargikaBala: 'Naisargika', drikBala: 'Drik',
};
const BALA_HUES = ['var(--planet-sun)', 'var(--planet-moon)', 'var(--planet-mars)', 'var(--planet-mercury)', 'var(--planet-jupiter)', 'var(--planet-venus)'];
const PLANET_KEYS: PlanetName[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

const BALA_FORMULAS: Record<BalaKey, { name: string; components: string; formula: string }> = {
  sthanaBala: {
    name: 'Sthana Bala (Positional Strength)',
    components: 'Uchcha Bala + Saptavargeeya Bala + Ojhayugma Bala + Kendra Bala + Drekkana Bala',
    formula: 'Sum of five sub-balas based on exaltation proximity, dignity in 7 vargas, odd/even sign-house parity, angular placement, and decanate position.',
  },
  digBala: {
    name: 'Dig Bala (Directional Strength)',
    components: 'Based on cardinal direction of planet from the four angles (Lagna, 4th, 7th, 10th).',
    formula: 'Dig Bala = (angular distance from point of weakness) / 3 Virupas per degree. Ju & Me strongest in Lagna (East), Su & Ma in 10th (South), Sa in 7th (West), Mo & Ve in 4th (North).',
  },
  kalaBala: {
    name: 'Kala Bala (Temporal Strength)',
    components: 'Nathonnatha + Paksha + Tribhaga + Varsha-Masa-Vara-Hora + Ayana Bala',
    formula: 'Temporal strength from day/night position, lunar phase (waxing/waning), tripart of day/night, lordship of year/month/weekday/hora, and declination.',
  },
  cheshtaBala: {
    name: 'Cheshta Bala (Motional Strength)',
    components: 'Based on the planet\'s true daily motion relative to its mean motion.',
    formula: 'Cheshta = f(speed). Retrograde and stationary planets gain maximum Cheshta (60 Virupas); fast-moving planets gain less. Sun and Moon use Ayana Bala instead.',
  },
  naisargikaBala: {
    name: 'Naisargika Bala (Natural Strength)',
    components: 'Fixed, inherent strength: Su 60, Mo 51.43, Ve 42.86, Ju 34.29, Me 25.71, Ma 17.14, Sa 8.57 Virupas.',
    formula: 'Immutable natural luminosity values assigned to each graha; does not vary by chart.',
  },
  drikBala: {
    name: 'Drik Bala (Aspectual Strength)',
    components: 'Net benefic/malefic aspects received by the planet.',
    formula: 'Drik = Σ (benefic aspect strengths) − Σ (malefic aspect strengths). Benefic aspects from Ju, Ve, unafflicted Me/Mo add; malefic aspects from Sa, Ma, Su, Rahu subtract.',
  },
};

const NAISARGIKA_VALUES: Record<string, number> = {
  sun: 60, moon: 51.43, venus: 42.86, jupiter: 34.29, mercury: 25.71, mars: 17.14, saturn: 8.57,
};

// ── Sub-bala labels, formulas, and BPHS citations ──────────────────────────

interface SubBalaEntry { label: string; formula: string; citation: string }

const SUB_BALA_MAP: Record<BalaKey, { entries: (sb: SubBalasData) => SubBalaEntry[] | null; getter: (sb: SubBalasData) => [string, number][] | null }> = {
  sthanaBala: {
    entries: () => [
      { label: 'Uchcha Bala', formula: 'dist(debilitation) / 3', citation: 'BPHS Ch.27 śl.2–3' },
      { label: 'Saptavargeeya Bala', formula: 'Dignity in 7 vargas (D1–D30)', citation: 'BPHS Ch.27 śl.4–7' },
      { label: 'Ojhayugma Bala', formula: 'Odd/even sign–navamsa parity', citation: 'BPHS Ch.27 śl.8' },
      { label: 'Kendra Bala', formula: 'Angular: 60V, Panapara: 30V, Apoklima: 15V', citation: 'BPHS Ch.27 śl.9' },
      { label: 'Drekkana Bala', formula: 'Decanate gender match: 15V or 0', citation: 'BPHS Ch.27 śl.10–12' },
    ],
    getter: (sb) => sb.sthana ? [
      ['Uchcha', sb.sthana.uchcha],
      ['Saptavargeeya', sb.sthana.saptavargeeya],
      ['Ojhayugma', sb.sthana.ojhayugma],
      ['Kendra', sb.sthana.kendra],
      ['Drekkana', sb.sthana.drekkana],
    ] : null,
  },
  digBala: {
    entries: (sb) => sb.dig ? [
      { label: 'Directional Strength', formula: `dist(weak point) / 3; ideal = ${sb.dig.idealDirection}`, citation: 'BPHS Ch.27 śl.13–17' },
    ] : null,
    getter: (sb) => sb.dig ? [['Directional', sb.dig.fromCardinal]] : null,
  },
  kalaBala: {
    entries: () => [
      { label: 'Nathonnatha Bala', formula: 'Distance from midnight × 60/12', citation: 'BPHS Ch.27 śl.18–19' },
      { label: 'Paksha Bala', formula: '|Sun − Moon| / 3; malefics inverted', citation: 'BPHS Ch.27 śl.20–21' },
      { label: 'Tribhaga Bala', formula: 'Day/night trisection ruler: 60V or 0', citation: 'BPHS Ch.27 śl.22–23' },
      { label: 'Varsha (Abdadhipathi)', formula: 'Year-lord gets 15V', citation: 'BPHS Ch.27 śl.24' },
      { label: 'Masa (Masadhipathi)', formula: 'Month-lord gets 30V', citation: 'BPHS Ch.27 śl.25' },
      { label: 'Vara (Vaaradhipathi)', formula: 'Weekday-lord gets 45V', citation: 'BPHS Ch.27 śl.26' },
      { label: 'Hora', formula: 'Hora-lord gets 60V', citation: 'BPHS Ch.27 śl.27–28' },
      { label: 'Ayana Bala', formula: 'Declination via Surya Siddhanta bhuja', citation: 'BPHS Ch.27 śl.29–33' },
      { label: 'Yuddha Bala', formula: 'Planetary war adjustment (if applicable)', citation: 'BPHS Ch.27 śl.34–36' },
    ],
    getter: (sb) => sb.kala ? [
      ['Nathonnatha', sb.kala.nathonnatha],
      ['Paksha', sb.kala.paksha],
      ['Tribhaga', sb.kala.tribhaga],
      ['Varsha', sb.kala.varsha],
      ['Masa', sb.kala.masa],
      ['Vara', sb.kala.vara],
      ['Hora', sb.kala.hora],
      ['Ayana', sb.kala.ayana],
      ['Yuddha', sb.kala.yuddha],
    ] : null,
  },
  cheshtaBala: {
    entries: () => [
      { label: 'Motion Factor', formula: 'Cheshta Kendra / 3', citation: 'BPHS Ch.27 śl.37–40' },
    ],
    getter: (sb) => sb.cheshta ? [['Motion Factor', sb.cheshta.motionFactor]] : null,
  },
  naisargikaBala: {
    entries: (sb) => sb.naisargika ? [
      { label: 'Natural Luminosity', formula: sb.naisargika.source, citation: 'BPHS Ch.27 śl.41' },
    ] : null,
    getter: (sb) => sb.naisargika ? [['Luminosity', NAISARGIKA_VALUES[Object.keys(NAISARGIKA_VALUES)[0]] ?? 0]] : null,
  },
  drikBala: {
    entries: () => [
      { label: 'Per-planet aspect contributions', formula: 'Σ(benefic) − Σ(malefic) aspects / 4', citation: 'BPHS Ch.27 śl.42–45' },
    ],
    getter: (sb) => sb.drik ? Object.entries(sb.drik.fromPlanet).map(([p, v]) => [p, v]) : null,
  },
};

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
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);
  const [tab, setTab] = useState<'shadbala' | 'bhava' | 'vargeeya' | 'vimsopaka' | 'avasthas'>('shadbala');

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
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
          ['avasthas', 'Avasthas'],
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
        {tab === 'avasthas' && <AvasthasSection data={data} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Interactive Shadbala
   ───────────────────────────────────────────────────────────── */
interface ShadbalaFocus {
  planet: PlanetName;
  bala: BalaKey;
}

function ShadbalaSection({ data }: { data: NonNullable<ReturnType<typeof useKundli>['data']>['shadbala'] & {} }) {
  const rows = PLANET_KEYS.filter((p) => data.planets[p]);
  const strongest = data.rank?.[0];
  const weakest = data.rank?.[data.rank.length - 1];
  const [focus, setFocus] = useState<ShadbalaFocus | null>(null);
  const [depth, setDepth] = useState<Depth>('visual');

  const focusRow = focus ? data.planets[focus.planet] : null;

  return (
    <div className="space-y-6">
      {/* Ranking */}
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

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: stacked bars */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-eyebrow text-text-tertiary">Tap a segment to explore its bala</div>
          {rows.map((p) => {
            const row = data.planets[p];
            const isStrong = p === strongest;
            const isWeak = p === weakest;
            const below = row.ratio < 1;
            const totalV = BALA_KEYS.reduce((s, k) => s + row[k], 0) || 1;
            return (
              <div key={p} className={`rounded-md border p-4 ${
                isStrong ? 'border-semantic-positive/30 bg-semantic-positive/[0.03]'
                : isWeak ? 'border-semantic-negative/30 bg-semantic-negative/[0.03]'
                : 'border-hairline-subtle bg-surface'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(var(--planet-${p}))` }} />
                    <span className="font-display text-sm capitalize text-text-primary">{PLANET_LABELS[p].full}</span>
                    {isStrong && <span className="rounded-sm bg-semantic-positive/15 px-1.5 py-0.5 text-[10px] font-medium text-semantic-positive">Strongest</span>}
                    {isWeak && <span className="rounded-sm bg-semantic-negative/15 px-1.5 py-0.5 text-[10px] font-medium text-semantic-negative">Weakest</span>}
                  </span>
                  <span className="text-xs font-mono text-text-secondary">
                    {toRupas(row.totalVirupas)} R
                    <span className={`ml-2 ${below ? 'text-semantic-negative' : 'text-semantic-positive'}`}>
                      ×{row.ratio.toFixed(2)}
                    </span>
                  </span>
                </div>

                {/* Stacked horizontal bar */}
                <div className="flex h-6 w-full overflow-hidden rounded-sm border border-hairline-subtle">
                  {BALA_KEYS.map((k, i) => {
                    const pct = (row[k] / totalV) * 100;
                    const isFocused = focus?.planet === p && focus.bala === k;
                    return (
                      <button
                        key={k}
                        title={`${BALA_LABELS[k]}: ${toRupas(row[k])} Rupas`}
                        className={`relative h-full transition-opacity ${isFocused ? 'ring-2 ring-inset ring-text-primary' : 'hover:opacity-80'}`}
                        style={{ width: `${pct}%`, background: `hsl(${BALA_HUES[i]})` }}
                        onClick={() => {
                          if (isFocused) {
                            setFocus(null);
                          } else {
                            setFocus({ planet: p, bala: k });
                          }
                        }}
                      />
                    );
                  })}
                </div>

                {/* Labels under bar */}
                <div className="mt-1 flex justify-between text-[10px] text-text-tertiary font-mono">
                  <span>Req: {(row.required / 60).toFixed(2)} R</span>
                  <span>Ishta: {(row.ishtaPhala ?? 0).toFixed(2)} · Kashta: {(row.kashtaPhala ?? 0).toFixed(2)}</span>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-text-tertiary">
            {BALA_KEYS.map((k, i) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: `hsl(${BALA_HUES[i]})` }} />
                {BALA_LABELS[k]} Bala
              </span>
            ))}
          </div>
        </div>

        {/* Right: focus panel */}
        <aside className="lg:col-span-5 space-y-4">
          {/* Depth toggle */}
          <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
            {([['visual', '👁️ Visual'], ['explain', '👆 Explain'], ['math', '🔬 Math Proof']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setDepth(k)}
                className={`flex-1 rounded-sm px-3 py-1.5 transition-colors ${depth === k ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary hover:text-text-primary'}`}>
                {label}
              </button>
            ))}
          </div>

          {!focus ? (
            <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-8 text-center text-sm text-text-tertiary">
              Tap a colored segment in any planet's bar to see that bala's formula and value.
            </div>
          ) : focusRow && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: `hsl(var(--planet-${focus.planet}))` }} />
                  <span className="font-display text-h3 capitalize text-text-primary">{PLANET_LABELS[focus.planet].full}</span>
                  <span className="text-xs text-text-tertiary">→</span>
                  <span className="font-display text-h3 text-text-primary">{BALA_LABELS[focus.bala]} Bala</span>
                </div>
              </div>

              {/* Visual: value cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border border-hairline-subtle bg-elevated/50 p-3 text-center">
                  <div className="text-eyebrow text-text-tertiary text-[10px]">Virupas</div>
                  <div className="font-mono text-lg text-text-primary">{focusRow[focus.bala].toFixed(2)}</div>
                </div>
                <div className="rounded-sm border border-hairline-subtle bg-elevated/50 p-3 text-center">
                  <div className="text-eyebrow text-text-tertiary text-[10px]">Rupas</div>
                  <div className="font-mono text-lg text-text-primary">{toRupas(focusRow[focus.bala])}</div>
                </div>
                <div className="rounded-sm border border-hairline-subtle bg-elevated/50 p-3 text-center">
                  <div className="text-eyebrow text-text-tertiary text-[10px]">% of Total</div>
                  <div className="font-mono text-lg text-text-primary">
                    {((focusRow[focus.bala] / (focusRow.totalVirupas || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-sm border border-hairline-subtle bg-elevated/50 p-3 text-center">
                  <div className="text-eyebrow text-text-tertiary text-[10px]">Ratio</div>
                  <div className={`font-mono text-lg ${focusRow.ratio >= 1 ? 'text-semantic-positive' : 'text-semantic-negative'}`}>
                    {focusRow.ratio.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-text-tertiary">{focusRow.ratio >= 1 ? 'Sufficient' : 'Deficient'}</div>
                </div>
              </div>

              {/* All 6 balas breakdown for this planet */}
              <div className="space-y-1.5">
                <div className="text-eyebrow text-text-tertiary">All 6 balas — {PLANET_LABELS[focus.planet].full}</div>
                {BALA_KEYS.map((k, i) => {
                  const v = focusRow[k];
                  const isCurrent = k === focus.bala;
                  return (
                    <button
                      key={k}
                      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1 text-xs transition-colors ${isCurrent ? 'bg-brand-maroon/10 ring-1 ring-brand-maroon/30' : 'hover:bg-elevated'}`}
                      onClick={() => setFocus({ planet: focus.planet, bala: k })}
                    >
                      <span className="h-2 w-2 rounded-sm" style={{ background: `hsl(${BALA_HUES[i]})` }} />
                      <span className={`flex-1 text-left ${isCurrent ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{BALA_LABELS[k]}</span>
                      <span className="font-mono text-text-primary">{toRupas(v)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-bala breakdown (drill-down into the focused bala's internal sub-components) */}
              {(() => {
                const sb = focusRow.subBalas;
                if (!sb) return null;
                const map = SUB_BALA_MAP[focus.bala];
                const entries = map.entries(sb);
                const values = map.getter(sb);
                if (!entries || !values) return null;

                const isDrik = focus.bala === 'drikBala';
                const isNaisargika = focus.bala === 'naisargikaBala';

                return (
                  <div className="space-y-1.5 border-t border-hairline-subtle pt-3">
                    <div className="text-eyebrow text-text-tertiary">
                      Sub-bala breakdown — {BALA_LABELS[focus.bala]}
                    </div>
                    {isDrik && sb.drik ? (
                      <div className="space-y-1">
                        <div className="text-[10px] text-text-tertiary italic">{entries[0].citation}: {entries[0].formula}</div>
                        {Object.entries(sb.drik.fromPlanet).map(([p, v]) => (
                          <div key={p} className="flex items-center gap-2 rounded-sm px-2 py-1 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${p}))` }} />
                            <span className="flex-1 capitalize text-text-secondary">{PLANET_LABELS[p as PlanetName]?.full ?? p}</span>
                            <span className={`font-mono ${v >= 0 ? 'text-semantic-positive' : 'text-semantic-negative'}`}>
                              {v >= 0 ? '+' : ''}{v.toFixed(2)} V
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : isNaisargika && sb.naisargika ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 rounded-sm px-2 py-1 text-xs">
                          <span className="flex-1 text-text-secondary">{entries[0].label}</span>
                          <span className="font-mono text-text-primary">{focusRow.naisargikaBala.toFixed(2)} V</span>
                        </div>
                        <div className="text-[10px] text-text-tertiary italic px-2">{sb.naisargika.source}</div>
                        <div className="text-[10px] text-text-muted px-2">{entries[0].citation}</div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {entries.map((e, i) => {
                          const val = values[i]?.[1] ?? 0;
                          return (
                            <div key={e.label} className="rounded-sm px-2 py-1.5 text-xs hover:bg-elevated/50">
                              <div className="flex items-center justify-between">
                                <span className="text-text-secondary">{e.label}</span>
                                <span className="font-mono text-text-primary">{val.toFixed(2)} V</span>
                              </div>
                              <div className="text-[10px] text-text-tertiary mt-0.5">
                                {e.formula} <span className="text-text-muted">— {e.citation}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Explain layer */}
              {depth !== 'visual' && (
                <div className="space-y-2 border-t border-hairline-subtle pt-3 text-sm text-text-secondary">
                  <p>
                    <span className="font-medium text-text-primary">{BALA_FORMULAS[focus.bala].name}</span> measures{' '}
                    {focus.bala === 'sthanaBala' && 'positional dignity based on exaltation, varga placements, and angular strength.'}
                    {focus.bala === 'digBala' && 'directional strength based on angular placement from the planet\'s point of maximum directional power.'}
                    {focus.bala === 'kalaBala' && 'temporal strength from day/night, lunar phase, and rulership of time units.'}
                    {focus.bala === 'cheshtaBala' && 'motional strength from the planet\'s speed — retrograde and stationary planets are strongest.'}
                    {focus.bala === 'naisargikaBala' && 'inherent natural luminosity — fixed values that do not change between charts.'}
                    {focus.bala === 'drikBala' && 'net aspectual strength from benefic and malefic aspects received.'}
                  </p>
                  <p>
                    {PLANET_LABELS[focus.planet].full}'s {BALA_LABELS[focus.bala]} Bala is{' '}
                    <span className="font-mono font-semibold">{toRupas(focusRow[focus.bala])} Rupas</span> ({focusRow[focus.bala].toFixed(2)} Virupas),
                    contributing <span className="font-mono font-semibold">{((focusRow[focus.bala] / (focusRow.totalVirupas || 1)) * 100).toFixed(1)}%</span> of its total Shadbala.
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Overall ratio: {focusRow.ratio.toFixed(2)} — {focusRow.ratio >= 1 ? 'planet meets its required minimum strength.' : 'planet is below required minimum; may underperform.'}
                  </p>
                </div>
              )}

              {/* Math Proof layer */}
              {depth === 'math' && (
                <div className="space-y-3 rounded-sm bg-elevated/50 p-3 text-xs border-t border-hairline-subtle">
                  <div className="text-eyebrow text-text-tertiary">Math proof — BPHS Ch. 27</div>

                  <div>
                    <div className="text-text-secondary font-medium">{BALA_FORMULAS[focus.bala].name}</div>
                    <div className="mt-1 font-mono text-text-tertiary leading-relaxed">
                      {BALA_FORMULAS[focus.bala].components}
                    </div>
                  </div>

                  <div>
                    <div className="text-text-secondary font-medium">Formula:</div>
                    <div className="mt-1 font-mono text-text-tertiary leading-relaxed">
                      {BALA_FORMULAS[focus.bala].formula}
                    </div>
                  </div>

                  <div>
                    <div className="text-text-secondary font-medium">Computed value ({PLANET_LABELS[focus.planet].full}):</div>
                    <code className="block font-mono text-text-primary mt-1">
                      {BALA_LABELS[focus.bala]} = {focusRow[focus.bala].toFixed(2)} Virupas = {toRupas(focusRow[focus.bala])} Rupas
                    </code>
                  </div>

                  <div>
                    <div className="text-text-secondary font-medium">Shadbala total:</div>
                    <code className="block font-mono text-text-primary mt-1">
                      Total = {BALA_KEYS.map((k) => focusRow[k].toFixed(2)).join(' + ')}
                    </code>
                    <code className="block font-mono text-text-primary">
                      = {focusRow.totalVirupas.toFixed(2)} Virupas = {toRupas(focusRow.totalVirupas)} Rupas
                    </code>
                  </div>

                  <div>
                    <div className="text-text-secondary font-medium">Sufficiency:</div>
                    <code className="block font-mono text-text-primary mt-1">
                      Required = {focusRow.required.toFixed(2)} Virupas = {(focusRow.required / 60).toFixed(2)} Rupas
                    </code>
                    <code className="block font-mono mt-0.5">
                      <span className={focusRow.ratio >= 1 ? 'text-semantic-positive' : 'text-semantic-negative'}>
                        Ratio = {toRupas(focusRow.totalVirupas)} / {(focusRow.required / 60).toFixed(2)} = {focusRow.ratio.toFixed(2)} {focusRow.ratio >= 1 ? '≥ 1 (sufficient)' : '< 1 (deficient)'}
                      </span>
                    </code>
                  </div>

                  {focus.bala === 'naisargikaBala' && (
                    <div className="border-t border-hairline-subtle pt-2">
                      <div className="text-text-secondary font-medium">Fixed natural strengths:</div>
                      <table className="mt-1 w-full font-mono text-text-tertiary">
                        <tbody>
                          {Object.entries(NAISARGIKA_VALUES).map(([pl, val]) => (
                            <tr key={pl}>
                              <td className="py-0.5 capitalize" style={{ color: `hsl(var(--planet-${pl}))` }}>{PLANET_LABELS[pl as PlanetName].full}</td>
                              <td className="py-0.5 text-right text-text-primary">{val.toFixed(2)} Virupas</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="text-text-muted italic pt-1">
                    Ref: Brihat Parashara Hora Shastra, Ch. 27 (Shadbaladhyaya).
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Bhava Bala Section (unchanged)
   ───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   Vargeeya Bala Section (unchanged)
   ───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   Vimsopaka Section (unchanged)
   ───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   Avasthas — Planetary States (BPHS Ch. 45)
   ───────────────────────────────────────────────────────────── */

const BALADI_TOOLTIPS: Record<BaladiState, string> = {
  bala: 'Infant — planet is very young and immature, giving weak results',
  kumara: 'Adolescent — growing in strength, moderate results',
  yuva: 'Youth — peak vitality, strongest results',
  vriddha: 'Old — declining strength, weakening results',
  mrita: 'Dead — planet gives negligible results',
};

const JAGRADADI_TOOLTIPS: Record<JagradadiState, string> = {
  jagrat: 'Awake — planet is fully alert in own/exalted/mooltrikona sign, delivers full results',
  swapna: 'Dreaming — planet is in a neutral/friend sign, delivers moderate results',
  sushupti: 'Sleeping — planet is debilitated or in enemy sign, delivers minimal results',
};

const DEEPTADI_TOOLTIPS: Record<DeeptadiState, string> = {
  deepta: 'Blazing — exalted, maximum brilliance and auspicious results',
  swastha: 'Healthy — in own sign, comfortable and strong',
  pramudita: 'Delighted — in friend\'s sign, giving good results',
  shanta: 'Peaceful — in neutral/benefic placement, calm and moderate',
  shakta: 'Powerful — retrograde, gains extra force and assertiveness',
  peedita: 'Tormented — in enemy sign, results are obstructed',
  dina: 'Distressed — conjunct a malefic, weakened and afflicted',
  vikala: 'Disabled — combust (too close to Sun), results are burnt away',
  khala: 'Wicked — debilitated, gives the worst results',
};

const BALADI_COLORS: Record<BaladiState, string> = {
  yuva: 'hsl(var(--semantic-positive))',
  kumara: 'hsl(var(--brand-saffron))',
  bala: 'hsl(var(--brand-gold))',
  vriddha: 'hsl(var(--text-tertiary))',
  mrita: 'hsl(var(--semantic-negative))',
};

const JAGRADADI_COLORS: Record<JagradadiState, string> = {
  jagrat: 'hsl(var(--semantic-positive))',
  swapna: 'hsl(var(--brand-saffron))',
  sushupti: 'hsl(var(--semantic-negative))',
};

const DEEPTADI_COLORS: Record<DeeptadiState, string> = {
  deepta: 'hsl(var(--semantic-positive))',
  swastha: 'hsl(142 71% 45%)',
  pramudita: 'hsl(var(--brand-saffron))',
  shanta: 'hsl(var(--brand-gold))',
  shakta: 'hsl(210 80% 55%)',
  peedita: 'hsl(var(--text-tertiary))',
  dina: 'hsl(30 80% 50%)',
  vikala: 'hsl(0 60% 50%)',
  khala: 'hsl(var(--semantic-negative))',
};

function StateBadge({ label, color, tooltip }: { label: string; color: string; tooltip: string }) {
  return (
    <span
      title={tooltip}
      className="inline-block cursor-help rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ borderColor: color, color }}
    >
      {label}
    </span>
  );
}

function AvasthasSection({ data }: { data: NonNullable<ReturnType<typeof useKundli>['data']> }) {
  const d1 = data.divisionalCharts?.find((c) => c.varga === 'D1');
  const planets = d1?.planets?.filter((p) => !['rahu', 'ketu', 'ascendant'].includes(p.planet)) ?? [];
  const hasAvasthas = planets.some((p) => p.avasthas);

  if (!hasAvasthas) {
    return (
      <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">
        Recalculate this chart to generate Avasthas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <div className="text-eyebrow text-text-tertiary">Avasthas — Planetary States</div>
        <p className="mt-1 text-xs text-text-tertiary">
          Three classical state systems from BPHS Ch. 45 — Baladi (age), Jagradadi (alertness), and Deeptadi (condition).
          Hover over each state for its meaning.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline-subtle text-left text-xs text-text-tertiary">
                <th className="pb-2 pr-4 font-medium">Planet</th>
                <th className="pb-2 pr-4 font-medium">Baladi (Age)</th>
                <th className="pb-2 pr-4 font-medium">Jagradadi (Alertness)</th>
                <th className="pb-2 font-medium">Deeptadi (Condition)</th>
              </tr>
            </thead>
            <tbody>
              {planets.map((p) => {
                const av = p.avasthas as AvasthasData | undefined;
                if (!av) return null;
                return (
                  <tr key={p.planet} className="border-b border-hairline-subtle/50">
                    <td className="py-3 pr-4">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${p.planet}))` }} />
                        <span className="font-display capitalize text-text-primary">{PLANET_LABELS[p.planet as PlanetName]?.full ?? p.planet}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <StateBadge label={av.baladi} color={BALADI_COLORS[av.baladi]} tooltip={BALADI_TOOLTIPS[av.baladi]} />
                    </td>
                    <td className="py-3 pr-4">
                      <StateBadge label={av.jagradadi} color={JAGRADADI_COLORS[av.jagradadi]} tooltip={JAGRADADI_TOOLTIPS[av.jagradadi]} />
                    </td>
                    <td className="py-3">
                      <StateBadge label={av.deeptadi} color={DEEPTADI_COLORS[av.deeptadi]} tooltip={DEEPTADI_TOOLTIPS[av.deeptadi]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 space-y-2 text-xs text-text-tertiary">
          <p><strong>Baladi (śl. 3–4):</strong> 0–6° Bāla / 6–12° Kumāra / 12–18° Yuva / 18–24° Vriddha / 24–30° Mrita. Even signs reverse the order.</p>
          <p><strong>Jagradadi (śl. 10–15):</strong> Jāgrat = own/exalted/mooltrikona; Svapna = friend/neutral; Sushupti = debilitated/enemy.</p>
          <p><strong>Deeptadi (śl. 16–25):</strong> Dīpta (exalted) → Svastha (own) → Pramudita (friend) → Shānta (neutral) → Shakta (retro) → Pīdita (enemy) → Dīna (conj. malefic) → Vikala (combust) → Khala (debilitated).</p>
        </div>
      </div>
    </div>
  );
}
