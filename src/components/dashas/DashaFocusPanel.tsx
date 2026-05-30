import { PLANET_LABELS, SIGN_NAMES, SIGN_NAMES_DEVA, type DivisionalChart } from '@/lib/astro/types';
import {
  type Graha, type FunctionalStatus,
  SIGN_LORDS, HOUSE_CENTERS, aspectOffsets, ASPECT_LABEL,
  signOfHouse, functionalStatus,
  FUNCTIONAL_STATUS_LABEL, FUNCTIONAL_STATUS_BORDER,
  dignityLabel,
} from '@/lib/astro/dashaUtils';

type Depth = 'visual' | 'explain' | 'math';

interface Props {
  d1: DivisionalChart;
  dashaLordKey: Graha;
  dashaLabel: string;
  depth: Depth;
}

const ROLE_FILL: Record<string, string> = {
  placed: 'hsl(var(--semantic-positive) / 0.16)',
  owned: 'hsl(var(--brand-gold) / 0.16)',
  aspected: 'hsl(var(--planet-mercury) / 0.12)',
};

export function DashaFocusPanel({ d1, dashaLordKey, dashaLabel, depth }: Props) {
  const ascSign = d1.ascendantSign;

  const lordPos = d1.planets.find((p) => p.planet === dashaLordKey);
  if (!lordPos) return null;

  const placedHouse = lordPos.houseNumber;

  const ownedHouses: number[] = [];
  for (let h = 1; h <= 12; h++) {
    if (SIGN_LORDS[signOfHouse(ascSign, h)] === dashaLordKey) ownedHouses.push(h);
  }

  const aspectedHouses: number[] = [];
  for (const off of aspectOffsets(dashaLordKey)) {
    aspectedHouses.push(((placedHouse - 1 + off) % 12) + 1);
  }

  const conjunctions = d1.planets
    .filter((p) => p.planet !== 'ascendant' && p.planet !== dashaLordKey && p.houseNumber === placedHouse)
    .map((p) => p.planet as Graha);

  const status: FunctionalStatus = functionalStatus(dashaLordKey, ascSign);

  type Role = 'placed' | 'owned' | 'aspected' | null;
  const roleOf = (h: number): Role => {
    if (h === placedHouse) return 'placed';
    if (ownedHouses.includes(h)) return 'owned';
    if (aspectedHouses.includes(h)) return 'aspected';
    return null;
  };

  const planetsByHouse = new Map<number, { p: Graha; retro: boolean }[]>();
  d1.planets.forEach((pl) => {
    if (pl.planet === 'ascendant') return;
    const arr = planetsByHouse.get(pl.houseNumber) ?? [];
    arr.push({ p: pl.planet as Graha, retro: pl.isRetrograde });
    planetsByHouse.set(pl.houseNumber, arr);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: `hsl(var(--planet-${dashaLordKey}))` }} />
        <span className="font-display text-h3 text-text-primary">{dashaLabel}</span>
      </div>

      {/* Functional status badge */}
      <span
        className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium"
        style={{
          borderLeft: `3px solid ${FUNCTIONAL_STATUS_BORDER[status]}`,
          background: `${FUNCTIONAL_STATUS_BORDER[status]}18`,
          color: FUNCTIONAL_STATUS_BORDER[status],
        }}
      >
        {FUNCTIONAL_STATUS_LABEL[status]}
        <span className="text-text-tertiary font-normal">
          — Ref: PVR Narasimha Rao, <cite>Vedic Astrology Lessons</cite>
        </span>
      </span>

      {/* Mini D1 chart */}
      <div className="rounded-md border border-hairline-subtle bg-surface p-3">
        <svg viewBox="0 0 400 400" className="block w-full max-w-xs mx-auto" role="img" aria-label="Mini D1 — dasha lord focus">
          <rect x="4" y="4" width="392" height="392" fill="hsl(var(--bg-surface))" stroke="hsl(var(--brand-maroon))" strokeWidth="1.5" />
          <g fill="none" stroke="hsl(var(--brand-maroon))" strokeWidth="1">
            <line x1="4" y1="4" x2="396" y2="396" />
            <line x1="396" y1="4" x2="4" y2="396" />
            <polygon points="200,4 396,200 200,396 4,200" />
          </g>

          {/* Ownership arrows — gold solid */}
          {ownedHouses.filter((h) => h !== placedHouse).map((h, i) => (
            <line key={`own-${i}`}
              x1={HOUSE_CENTERS[placedHouse].x} y1={HOUSE_CENTERS[placedHouse].y}
              x2={HOUSE_CENTERS[h].x} y2={HOUSE_CENTERS[h].y}
              stroke="hsl(var(--brand-gold))" strokeWidth="1.4" opacity="0.6"
              markerEnd="url(#dasha-gold-arrow)" />
          ))}

          {/* Aspect arrows — blue dashed */}
          {aspectedHouses.map((h, i) => (
            <line key={`asp-${i}`}
              x1={HOUSE_CENTERS[placedHouse].x} y1={HOUSE_CENTERS[placedHouse].y}
              x2={HOUSE_CENTERS[h].x} y2={HOUSE_CENTERS[h].y}
              stroke="hsl(var(--planet-mercury))" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7"
              markerEnd="url(#dasha-blue-arrow)" />
          ))}

          <defs>
            <marker id="dasha-blue-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="hsl(var(--planet-mercury))" />
            </marker>
            <marker id="dasha-gold-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="hsl(var(--brand-gold))" />
            </marker>
          </defs>

          {/* Houses */}
          {Object.entries(HOUSE_CENTERS).map(([hs, pos]) => {
            const house = Number(hs);
            const role = roleOf(house);
            const sign = signOfHouse(ascSign, house);
            const planets = planetsByHouse.get(house) ?? [];
            const hasConj = house === placedHouse && conjunctions.length > 0;
            return (
              <g key={hs}>
                {role && <circle cx={pos.x} cy={pos.y} r="36" fill={ROLE_FILL[role]} />}
                {hasConj && (
                  <circle cx={pos.x} cy={pos.y} r="36" stroke="hsl(280, 60%, 55%)" strokeWidth="1.5"
                    fill="hsl(280, 60%, 55%, 0.08)" strokeDasharray="3 2" />
                )}
                {house === placedHouse && (
                  <circle cx={pos.x} cy={pos.y} r="38"
                    stroke={`hsl(var(--planet-${dashaLordKey}))`} strokeWidth="2" fill="none" opacity="0.5" />
                )}
                <text x={pos.x - 30} y={pos.y - 26} className="font-mono" fontSize="9" fill="hsl(var(--text-tertiary))">{sign}</text>
                <text x={pos.x + 30} y={pos.y - 26} textAnchor="end" className="font-mono" fontSize="9" fill="hsl(var(--text-muted))">H{house}</text>
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="11" fontWeight={500}>
                  {planets.map(({ p, retro }, i) => (
                    <tspan key={i} dx={i === 0 ? 0 : 6}
                      fill={`hsl(var(--planet-${p}))`}
                      fontWeight={p === dashaLordKey ? 700 : 500}
                      fontSize={p === dashaLordKey ? 13 : 11}>
                      {PLANET_LABELS[p].short}{retro ? '℞' : ''}
                    </tspan>
                  ))}
                </text>
                {role && (
                  <text x={pos.x} y={pos.y + 22} textAnchor="middle" fontSize="7" fill="hsl(var(--text-secondary))">
                    {role === 'placed' ? '📍 HERE' : role === 'owned' ? '👑 OWNS' : '🏹 ASPECTS'}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-text-tertiary">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(var(--semantic-positive) / 0.5)' }} /> Placed</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(var(--brand-gold) / 0.6)' }} /> Owns</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(var(--planet-mercury) / 0.5)' }} /> Aspects</span>
          {conjunctions.length > 0 && (
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: 'hsl(280, 60%, 55%, 0.5)' }} /> Conjunct</span>
          )}
        </div>
      </div>

      {/* Explain + Math layers */}
      {depth !== 'visual' && (
        <div className="space-y-2 text-sm text-text-secondary">
          <p>
            <span className="text-semantic-positive font-medium">Placed</span> in House {placedHouse} —{' '}
            {SIGN_NAMES[lordPos.signNumber - 1]}{' '}
            <span className="font-deva text-text-tertiary">{SIGN_NAMES_DEVA[lordPos.signNumber - 1]}</span>
            {' '}at {lordPos.signDegree.toFixed(2)}°
            {lordPos.dignity ? ` (${dignityLabel(lordPos.dignity)})` : ''}.
          </p>

          {ownedHouses.length > 0 ? (
            <p>
              <span className="text-brand-gold font-medium">Owns</span> House{ownedHouses.length > 1 ? 's' : ''}{' '}
              {ownedHouses.join(' & ')} (rules{' '}
              {ownedHouses.map((h) => SIGN_NAMES[signOfHouse(ascSign, h) - 1]).join(' & ')}).
            </p>
          ) : (
            <p className="text-text-tertiary">{PLANET_LABELS[dashaLordKey].full} is a node — owns no sign.</p>
          )}

          <p>
            <span className="text-planet-mercury font-medium">Aspects</span> House{aspectedHouses.length > 1 ? 's' : ''}{' '}
            {[...new Set(aspectedHouses)].sort((a, b) => a - b).join(', ')} — {ASPECT_LABEL[dashaLordKey]} drishti.
          </p>

          {conjunctions.length > 0 && (
            <p>
              <span className="font-medium" style={{ color: 'hsl(280, 60%, 55%)' }}>Conjunct</span> with{' '}
              {conjunctions.map((c) => PLANET_LABELS[c].full).join(', ')} in House {placedHouse}.
            </p>
          )}

          {/* Cross-reference text */}
          <div className="mt-3 rounded-sm bg-elevated/50 p-3 text-xs text-text-secondary italic">
            {ownedHouses.length > 0
              ? ownedHouses.map((h) => (
                  <p key={h}>
                    During {PLANET_LABELS[dashaLordKey].full} Mahadasha, themes of House {h} activate because{' '}
                    {PLANET_LABELS[dashaLordKey].full} rules H{h}.
                  </p>
                ))
              : (
                <p>
                  During {PLANET_LABELS[dashaLordKey].full} Mahadasha, themes of House {placedHouse} activate as{' '}
                  {PLANET_LABELS[dashaLordKey].full} is placed there.
                </p>
              )}
          </div>
        </div>
      )}

      {/* Math Proof layer */}
      {depth === 'math' && (
        <div className="space-y-3 rounded-sm bg-elevated/50 p-3 text-xs">
          <div className="text-eyebrow text-text-tertiary">Math proof — placement & lordship</div>
          <div>
            <div className="text-text-secondary">House from sign (Whole Sign):</div>
            <code className="font-mono text-text-primary">House = ((sign − ascSign + 12) mod 12) + 1</code>
            <div className="mt-1 font-mono text-text-tertiary">
              = (({lordPos.signNumber} − {ascSign} + 12) mod 12) + 1 = {placedHouse}
            </div>
          </div>
          {ownedHouses.length > 0 && (
            <div>
              <div className="text-text-secondary">Ownership (sign-lord rule):</div>
              <div className="font-mono text-text-tertiary">
                {ownedHouses.map((h) => `${SIGN_NAMES[signOfHouse(ascSign, h) - 1]} → ${PLANET_LABELS[dashaLordKey].full} ⇒ H${h}`).join('  ·  ')}
              </div>
            </div>
          )}
          <div>
            <div className="text-text-secondary">Graha drishti (from H{placedHouse}):</div>
            <div className="font-mono text-text-tertiary">
              {aspectOffsets(dashaLordKey).map((o) => `H${placedHouse}+${o + 1}th → H${((placedHouse - 1 + o) % 12) + 1}`).join('  ·  ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
