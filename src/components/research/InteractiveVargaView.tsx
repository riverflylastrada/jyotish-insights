import { Link } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PLANET_LABELS, SIGN_NAMES, SIGN_NAMES_DEVA, type DivisionalChart, type PlanetName, type VargaCode } from '@/lib/astro/types';
import { VARGA_META, VARGA_CODES } from './vargaData';
import { PLANET_IN_HOUSE, type HouseNumber } from '@/lib/astro/planetInHouse';
import { FocusedGuruAnswer } from './FocusedGuruAnswer';

/**
 * Shared interactive chart component used by both the D1 ResearchLab and
 * the per-varga focused explorer. Provides tappable planets with
 * lordship/aspect/conjunction arrows and three depth layers
 * (Visual / Explain / Math Proof).
 */

type Graha = Exclude<PlanetName, 'ascendant'>;
const PLANETS: Graha[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

const SIGN_LORDS: Record<number, Graha> = {
  1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon', 5: 'sun', 6: 'mercury',
  7: 'venus', 8: 'mars', 9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
};

function aspectOffsets(p: Graha): number[] {
  switch (p) {
    case 'mars': return [3, 6, 7];
    case 'jupiter': return [4, 6, 8];
    case 'saturn': return [2, 6, 9];
    case 'rahu': case 'ketu': return [4, 6, 8];
    default: return [6];
  }
}

const ASPECT_LABEL: Record<Graha, string> = {
  sun: '7th', moon: '7th', mercury: '7th', venus: '7th',
  mars: '4th, 7th & 8th', jupiter: '5th, 7th & 9th', saturn: '3rd, 7th & 10th',
  rahu: '5th, 7th & 9th', ketu: '5th, 7th & 9th',
};

const HC: Record<number, { x: number; y: number }> = {
  1: { x: 200, y: 108 }, 2: { x: 108, y: 58 }, 3: { x: 58, y: 108 }, 4: { x: 108, y: 200 },
  5: { x: 58, y: 292 }, 6: { x: 108, y: 342 }, 7: { x: 200, y: 292 }, 8: { x: 292, y: 342 },
  9: { x: 342, y: 292 }, 10: { x: 292, y: 200 }, 11: { x: 342, y: 108 }, 12: { x: 292, y: 58 },
};

function signOfHouse(ascSign: number, house: number): number {
  return ((ascSign - 1 + house - 1) % 12) + 1;
}

type Role = 'placed' | 'owned' | 'aspected' | null;
const ROLE_FILL: Record<Exclude<Role, null>, string> = {
  placed: 'hsl(var(--semantic-positive) / 0.16)',
  owned: 'hsl(var(--brand-gold) / 0.16)',
  aspected: 'hsl(var(--planet-mercury) / 0.12)',
};
const ROLE_TAG: Record<Exclude<Role, null>, string> = { placed: '📍 HERE', owned: '👑 OWNS', aspected: '🏹 ASPECTS' };

export type Depth = 'visual' | 'explain' | 'math';

interface InteractiveVargaViewProps {
  chart: DivisionalChart;
  chartId: string;
  selected: Graha | null;
  onSelectPlanet: (p: Graha | null) => void;
  depth: Depth;
  onSetDepth: (d: Depth) => void;
  /** When true, show cross-chart "See in Dn →" links (omitted for D1 ResearchLab). */
  showCrossNav?: boolean;
  /** Current varga code (for cross-nav link generation). */
  currentVarga?: VargaCode;
  /** Cached auto-insights planet readings (optional). */
  autoInsights?: { planets?: Record<string, { brief: string; full: string }> };
}

export function InteractiveVargaView({
  chart,
  chartId,
  selected,
  onSelectPlanet,
  depth,
  onSetDepth,
  showCrossNav = false,
  currentVarga,
  autoInsights,
}: InteractiveVargaViewProps) {
  const chartLink = useChartLink();
  const ascSign = chart.ascendantSign;

  const planetsByHouse = new Map<number, { p: Graha; retro: boolean }[]>();
  chart.planets.forEach((p) => {
    if (p.planet === 'ascendant') return;
    const arr = planetsByHouse.get(p.houseNumber) ?? [];
    arr.push({ p: p.planet as Graha, retro: p.isRetrograde });
    planetsByHouse.set(p.houseNumber, arr);
  });

  const sel = selected ? chart.planets.find((p) => p.planet === selected) : undefined;
  const placedHouse = sel?.houseNumber ?? null;
  const ownedHouses: number[] = [];
  const aspectedHouses: number[] = [];
  if (selected && placedHouse) {
    for (let h = 1; h <= 12; h++) {
      if (SIGN_LORDS[signOfHouse(ascSign, h)] === selected) ownedHouses.push(h);
    }
    for (const off of aspectOffsets(selected)) {
      aspectedHouses.push(((placedHouse - 1 + off) % 12) + 1);
    }
  }
  const roleOf = (h: number): Role => {
    if (!selected) return null;
    if (h === placedHouse) return 'placed';
    if (ownedHouses.includes(h)) return 'owned';
    if (aspectedHouses.includes(h)) return 'aspected';
    return null;
  };

  const meta = VARGA_META[chart.varga];

  // Cross-nav targets: top vargas excluding the current one.
  const crossNavTargets: VargaCode[] = showCrossNav
    ? VARGA_CODES.filter((v) => v !== currentVarga)
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Chart */}
      <div className="lg:col-span-7">
        {/* Planet selector */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PLANETS.map((p) => {
            const isSel = selected === p;
            return (
              <button key={p} onClick={() => onSelectPlanet(isSel ? null : p)}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm capitalize transition-colors ${
                  isSel ? 'border-brand-maroon bg-brand-maroon text-primary-foreground' : 'border-hairline-subtle bg-surface text-text-secondary hover:border-brand-maroon/40'
                }`}>
                <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${p}))` }} />
                {PLANET_LABELS[p].full}
              </button>
            );
          })}
        </div>

        <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
          <svg viewBox="0 0 400 400" className="block w-full max-w-xl mx-auto" role="img" aria-label={`Interactive ${chart.varga} chart`}>
            <rect x="4" y="4" width="392" height="392" fill="hsl(var(--bg-surface))" stroke="hsl(var(--brand-maroon))" strokeWidth="1.5" />
            <g fill="none" stroke="hsl(var(--brand-maroon))" strokeWidth="1">
              <line x1="4" y1="4" x2="396" y2="396" />
              <line x1="396" y1="4" x2="4" y2="396" />
              <polygon points="200,4 396,200 200,396 4,200" />
            </g>

            {selected && placedHouse && aspectedHouses.map((h, i) => (
              <line key={`asp-${i}`} x1={HC[placedHouse].x} y1={HC[placedHouse].y} x2={HC[h].x} y2={HC[h].y}
                stroke="hsl(var(--planet-mercury))" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" markerEnd="url(#arrow)" />
            ))}
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="hsl(var(--planet-mercury))" />
              </marker>
            </defs>

            {Object.entries(HC).map(([hs, pos]) => {
              const house = Number(hs);
              const role = roleOf(house);
              const sign = signOfHouse(ascSign, house);
              const planets = planetsByHouse.get(house) ?? [];
              return (
                <g key={hs}>
                  {role && <circle cx={pos.x} cy={pos.y} r="36" fill={ROLE_FILL[role]} />}
                  <text x={pos.x - 30} y={pos.y - 26} className="font-mono" fontSize="9" fill="hsl(var(--text-tertiary))">{sign}</text>
                  <text x={pos.x + 30} y={pos.y - 26} textAnchor="end" className="font-mono" fontSize="9" fill="hsl(var(--text-muted))">H{house}</text>
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="11" fontWeight={500}>
                    {planets.map(({ p, retro }, i) => (
                      <tspan key={i} dx={i === 0 ? 0 : 6} fill={`hsl(var(--planet-${p}))`}
                        fontWeight={selected === p ? 700 : 500}>
                        {PLANET_LABELS[p].short}{retro ? '℞' : ''}
                      </tspan>
                    ))}
                  </text>
                  {role && <text x={pos.x} y={pos.y + 22} textAnchor="middle" fontSize="8" fill="hsl(var(--text-secondary))">{ROLE_TAG[role]}</text>}
                </g>
              );
            })}
          </svg>

          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'hsl(var(--semantic-positive) / 0.5)' }} /> Placed</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'hsl(var(--brand-gold) / 0.6)' }} /> Owns</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'hsl(var(--planet-mercury) / 0.5)' }} /> Aspects (dashed)</span>
          </div>
        </div>
      </div>

      {/* Panel */}
      <aside className="lg:col-span-5 space-y-4">
        {/* Depth toggle */}
        <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
          {([['visual', '👁️ Visual'], ['explain', '👆 Explain'], ['math', '🔬 Math Proof']] as const).map(([k, label]) => (
            <button key={k} onClick={() => onSetDepth(k)}
              className={`flex-1 rounded-sm px-3 py-1.5 transition-colors ${depth === k ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary hover:text-text-primary'}`}>
              {label}
            </button>
          ))}
        </div>

        {!selected ? (
          <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-8 text-center text-sm text-text-tertiary">
            Select a planet above to light up its placement, ownership, and aspects.
          </div>
        ) : (
          <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: `hsl(var(--planet-${selected}))` }} />
              <span className="font-display text-h3 capitalize text-text-primary">{PLANET_LABELS[selected].full}</span>
              <span className="font-deva text-sm text-text-tertiary">{PLANET_LABELS[selected].deva}</span>
            </div>

            {/* Auto-insight brief — the free teaser; its full reading expands below. */}
            {selected && autoInsights?.planets?.[selected] ? (
              <div className="rounded-sm border border-brand-gold/20 bg-brand-gold/5 p-3">
                <div className="flex items-center gap-1.5 text-xs text-brand-gold font-medium mb-1">
                  <Sparkles className="h-3.5 w-3.5" /> Guru Insight
                </div>
                <p className="text-sm text-text-secondary">{autoInsights.planets[selected].brief}</p>
              </div>
            ) : null}

            {/* Explain layer */}
            {depth !== 'visual' && sel && (
              <div className="space-y-2 text-sm text-text-secondary">
                <p>
                  <span className="text-semantic-positive font-medium">Placed</span> in House {placedHouse} — {SIGN_NAMES[sel.signNumber - 1]}{' '}
                  <span className="font-deva text-text-tertiary">{SIGN_NAMES_DEVA[sel.signNumber - 1]}</span> at {sel.signDegree.toFixed(2)}°
                  {sel.dignity ? ` (${sel.dignity.replace('_', ' ')})` : ''}.
                </p>
                {ownedHouses.length > 0 ? (
                  <p><span className="text-brand-gold font-medium">Owns</span> House{ownedHouses.length > 1 ? 's' : ''} {ownedHouses.join(' & ')} (rules {ownedHouses.map((h) => SIGN_NAMES[signOfHouse(ascSign, h) - 1]).join(' & ')}).</p>
                ) : (
                  <p className="text-text-tertiary">{PLANET_LABELS[selected].full} is a node — it owns no sign.</p>
                )}
                <p><span className="text-planet-mercury font-medium">Aspects</span> House{aspectedHouses.length > 1 ? 's' : ''} {[...new Set(aspectedHouses)].sort((a, b) => a - b).join(', ')} — its {ASPECT_LABEL[selected]} drishti.</p>
              </div>
            )}

            {/* D1 Planet-in-House classical interpretation (Explain depth only) */}
            {depth === 'explain' && sel && placedHouse && (!currentVarga || currentVarga === 'D1') && (() => {
              const entry = PLANET_IN_HOUSE[selected]?.[placedHouse as HouseNumber];
              if (!entry) return null;
              return (
                <div className="space-y-3 rounded-sm border border-hairline-subtle bg-elevated/30 p-4">
                  <p className="font-display text-base text-text-primary leading-snug">{entry.brief}</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{entry.full}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.keywords.map((kw) => (
                      <span key={kw} className="inline-block rounded-sm border border-hairline-subtle bg-surface px-2 py-0.5 text-xs text-text-tertiary">{kw}</span>
                    ))}
                  </div>
                  <p className="font-mono text-xs text-text-tertiary">{entry.citation}</p>
                </div>
              );
            })()}

            {/* Math Proof layer */}
            {depth === 'math' && sel && (
              <div className="space-y-3 rounded-sm bg-elevated/50 p-3 text-xs">
                <div className="text-eyebrow text-text-tertiary">Math proof</div>
                <div>
                  <div className="text-text-secondary">House from sign (Whole Sign):</div>
                  <code className="font-mono text-text-primary">House = ((sign − ascSign + 12) mod 12) + 1</code>
                  <div className="mt-1 font-mono text-text-tertiary">= (({sel.signNumber} − {ascSign} + 12) mod 12) + 1 = {placedHouse}</div>
                </div>
                {ownedHouses.length > 0 && (
                  <div>
                    <div className="text-text-secondary">Ownership (sign-lord rule):</div>
                    <div className="font-mono text-text-tertiary">
                      {ownedHouses.map((h) => `${SIGN_NAMES[signOfHouse(ascSign, h) - 1]} → ${PLANET_LABELS[selected].full} ⇒ H${h}`).join('  ·  ')}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-text-secondary">Graha drishti (inclusive count from H{placedHouse}):</div>
                  <div className="font-mono text-text-tertiary">
                    {aspectOffsets(selected).map((o) => `H${placedHouse}+${o + 1}th → H${((placedHouse! - 1 + o) % 12) + 1}`).join('  ·  ')}
                  </div>
                </div>

                {/* Division formula (varga-specific) */}
                {meta && chart.varga !== 'D1' && (
                  <div className="mt-2 border-t border-hairline-subtle pt-3">
                    <div className="text-eyebrow text-text-tertiary">{chart.varga} division formula</div>
                    <div className="mt-1 text-text-secondary">{meta.formula}</div>
                    <div className="mt-1 font-mono text-text-tertiary">Factor: ÷{meta.factor} → each arc = {meta.arcDeg}</div>
                    <div className="mt-2 text-text-muted italic">{meta.cite}</div>
                  </div>
                )}
              </div>
            )}

            {/* Cross-chart navigation */}
            {showCrossNav && selected && crossNavTargets.length > 0 && (
              <div className="border-t border-hairline-subtle pt-3">
                <div className="text-eyebrow text-text-tertiary mb-2">See {PLANET_LABELS[selected].full} in other vargas</div>
                <div className="flex flex-wrap gap-1.5">
                  {crossNavTargets.map((v) => (
                    <Link
                      key={v}
                      to={chartLink(`/app/chart/${chartId}/charts/${v}?planet=${selected}`)}
                      className="inline-flex items-center gap-1 rounded-sm border border-hairline-subtle px-2 py-1 text-xs text-text-secondary hover:border-brand-maroon/40 hover:text-brand-maroon transition-colors"
                    >
                      See in {v} <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <FocusedGuruAnswer
              key={selected}
              chartId={chartId}
              topic="planet"
              subject={PLANET_LABELS[selected].full}
              cachedFull={autoInsights?.planets?.[selected]?.full}
            />
          </div>
        )}
      </aside>
    </div>
  );
}

export { PLANETS };
export type { Graha };
