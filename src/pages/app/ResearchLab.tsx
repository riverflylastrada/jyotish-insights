import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { PLANET_LABELS, SIGN_NAMES, SIGN_NAMES_DEVA, type DivisionalChart, type PlanetName } from '@/lib/astro/types';

/**
 * Interactive Research Lab — the D1 chart you can interrogate.
 *
 * Tap a planet → its placed / owned / aspected houses light up with cause→effect
 * arrows, and three depth layers (Visual → Explain → Math Proof) reveal the
 * classical rule and its computation. Nothing here is AI — it's deterministic
 * Jyotish math, shown rather than asserted.
 */

type Graha = Exclude<PlanetName, 'ascendant'>;
const PLANETS: Graha[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

/** Sign rulerships (1 = Mesha … 12 = Meena). Rahu/Ketu own no sign. */
const SIGN_LORDS: Record<number, Graha> = {
  1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon', 5: 'sun', 6: 'mercury',
  7: 'venus', 8: 'mars', 9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
};

/**
 * Graha drishti as forward house offsets (inclusive count: the Nth house = offset
 * N−1). Every planet aspects the 7th (offset 6). Special aspects:
 * Mars 4th/8th, Jupiter 5th/9th, Saturn 3rd/10th. Nodes: 5th/7th/9th (common usage).
 */
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

// North-Indian diamond house centroids in a 400×400 box (House 1 = top centre).
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

type Depth = 'visual' | 'explain' | 'math';

export default function ResearchLab() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const [selected, setSelected] = useState<Graha | null>(null);
  const [depth, setDepth] = useState<Depth>('explain');

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const d1 = data.divisionalCharts.find((c) => c.varga === 'D1') as DivisionalChart;
  const ascSign = d1.ascendantSign;

  // Group planets by house for rendering.
  const planetsByHouse = new Map<number, { p: Graha; retro: boolean }[]>();
  d1.planets.forEach((p) => {
    if (p.planet === 'ascendant') return;
    const arr = planetsByHouse.get(p.houseNumber) ?? [];
    arr.push({ p: p.planet as Graha, retro: p.isRetrograde });
    planetsByHouse.set(p.houseNumber, arr);
  });

  // Compute the selected planet's roles.
  const sel = selected ? d1.planets.find((p) => p.planet === selected) : undefined;
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Research Lab · Interactive D1</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Interrogate the chart</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Tap a planet to see where it sits, what it owns, and what it aspects — with the
        classical rule and its math, not just a label. Astrology is mathematics, not superstition.
      </p>

      {/* Planet selector */}
      <div className="mt-6 flex flex-wrap gap-2">
        {PLANETS.map((p) => {
          const isSel = selected === p;
          return (
            <button key={p} onClick={() => setSelected(isSel ? null : p)}
              className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm capitalize transition-colors ${
                isSel ? 'border-brand-maroon bg-brand-maroon text-primary-foreground' : 'border-hairline-subtle bg-surface text-text-secondary hover:border-brand-maroon/40'
              }`}>
              <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${p}))` }} />
              {PLANET_LABELS[p].full}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Chart */}
        <div className="lg:col-span-7">
          <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
            <svg viewBox="0 0 400 400" className="block w-full max-w-xl mx-auto" role="img" aria-label="Interactive D1 chart">
              <rect x="4" y="4" width="392" height="392" fill="hsl(var(--bg-surface))" stroke="hsl(var(--brand-maroon))" strokeWidth="1.5" />
              <g fill="none" stroke="hsl(var(--brand-maroon))" strokeWidth="1">
                <line x1="4" y1="4" x2="396" y2="396" />
                <line x1="396" y1="4" x2="4" y2="396" />
                <polygon points="200,4 396,200 200,396 4,200" />
              </g>

              {/* Aspect arrows from the placed house → each aspected house */}
              {selected && placedHouse && aspectedHouses.map((h, i) => (
                <line key={`asp-${i}`} x1={HC[placedHouse].x} y1={HC[placedHouse].y} x2={HC[h].x} y2={HC[h].y}
                  stroke="hsl(var(--planet-mercury))" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" markerEnd="url(#arrow)" />
              ))}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="hsl(var(--planet-mercury))" />
                </marker>
              </defs>

              {/* Houses */}
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

            {/* Legend */}
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
              <button key={k} onClick={() => setDepth(k)}
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
                </div>
              )}

              <Link to={`/app/chart/${id}/debate`} className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-brand-maroon/30 bg-surface px-4 py-2 text-sm text-brand-maroon hover:bg-elevated">
                <MessageSquare className="h-4 w-4" /> Ask the Gurus about {PLANET_LABELS[selected].full}
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
