import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import type { KalachakraDirectionData, DirectionInfo, KalachakraDirection } from '@/lib/astro/types';

const PLANET_SHORT: Record<string, string> = {
  sun: 'Su', moon: 'Mo', mars: 'Ma', mercury: 'Me',
  jupiter: 'Ju', venus: 'Ve', saturn: 'Sa', rahu: 'Ra', ketu: 'Ke',
};

const DIR_ANGLE: Record<KalachakraDirection, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

const DIR_LABEL: Record<KalachakraDirection, string> = {
  E: 'East', SE: 'South-East', S: 'South', SW: 'South-West',
  W: 'West', NW: 'North-West', N: 'North', NE: 'North-East',
};

// ─── Compass Diagram ────────────────────────────────────────────────────────

function CompassDiagram({ data }: { data: KalachakraDirectionData }) {
  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 190;
  const innerR = 60;
  const labelR = 155;
  const deityR = 125;
  const nkR = 95;

  return (
    <div className="flex justify-center overflow-auto">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[420px]" style={{ minWidth: '300px' }}>
        {/* Outer circle */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="currentColor"
          className="text-hairline-subtle" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="currentColor"
          className="text-hairline-subtle" strokeWidth="1" />

        {/* Direction spokes and sectors */}
        {data.directions.map((d: DirectionInfo) => {
          const angle = DIR_ANGLE[d.direction];
          const rad = (angle - 90) * (Math.PI / 180);
          const spokeX = cx + outerR * Math.cos(rad);
          const spokeY = cy + outerR * Math.sin(rad);
          const labelX = cx + labelR * Math.cos(rad);
          const labelY = cy + labelR * Math.sin(rad);
          const deityX = cx + deityR * Math.cos(rad);
          const deityY = cy + deityR * Math.sin(rad);
          const nkX = cx + nkR * Math.cos(rad);
          const nkY = cy + nkR * Math.sin(rad);

          // Spoke between sectors (at angle - 22.5)
          const spokeRad = ((angle - 22.5) - 90) * (Math.PI / 180);
          const sX = cx + outerR * Math.cos(spokeRad);
          const sY = cy + outerR * Math.sin(spokeRad);

          return (
            <g key={d.direction}>
              {/* Sector divider line */}
              <line x1={cx} y1={cy} x2={sX} y2={sY}
                stroke="currentColor" className="text-hairline-subtle" strokeWidth="0.5" />

              {/* Direction label */}
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central"
                className="fill-text-primary text-[10px] font-bold">
                {d.direction}
              </text>

              {/* Deity label */}
              <text x={deityX} y={deityY} textAnchor="middle" dominantBaseline="central"
                className="fill-brand-saffron text-[8px] font-medium">
                {d.deity}
              </text>

              {/* Nakshatra count */}
              <text x={nkX} y={nkY} textAnchor="middle" dominantBaseline="central"
                className="fill-text-tertiary text-[7px]">
                {d.nakshatras.length}nk
              </text>

              {/* Planet chips along this direction */}
              {d.planets.length > 0 && d.planets.map((p, i) => {
                const chipR = outerR - 15 - i * 14;
                const chipRad = ((angle + 10) - 90) * (Math.PI / 180);
                const chipX = cx + chipR * Math.cos(chipRad);
                const chipY = cy + chipR * Math.sin(chipRad);
                return (
                  <g key={p}>
                    <circle cx={chipX} cy={chipY} r={8}
                      className="fill-brand-maroon" />
                    <text x={chipX} y={chipY} textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-primary-foreground text-[6px] font-bold">
                      {PLANET_SHORT[p] ?? p.slice(0, 2)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Center label */}
        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central"
          className="fill-text-primary text-[10px] font-display font-bold">
          कालचक्र
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="central"
          className="fill-text-tertiary text-[7px]">
          Kalachakra
        </text>
      </svg>
    </div>
  );
}

// ─── Details Table ──────────────────────────────────────────────────────────

function DirectionDetails({ data }: { data: KalachakraDirectionData }) {
  return (
    <div className="space-y-6">
      {/* Direction summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.directions.map((d: DirectionInfo) => (
          <div key={d.direction}
            className={`rounded-md border p-3 ${d.planets.length > 0 ? 'border-brand-saffron/50 bg-brand-saffron/5' : 'border-hairline-subtle bg-surface'}`}>
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-text-primary">
                {d.direction} — {DIR_LABEL[d.direction]}
              </span>
            </div>
            <div className="mt-1 text-xs text-brand-saffron font-medium">
              {d.deity} <span className="text-text-tertiary font-normal">({d.deityDeva})</span>
            </div>
            <div className="mt-2 text-[10px] text-text-tertiary leading-relaxed">
              {d.nakshatras.join(', ')}
            </div>
            {d.planets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {d.planets.map(p => (
                  <span key={p}
                    className="rounded-full bg-brand-maroon px-2 py-0.5 text-[9px] font-bold text-primary-foreground capitalize">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Planet placements table */}
      <div>
        <h4 className="text-eyebrow text-brand-saffron">Planet Placements</h4>
        <div className="mt-2 overflow-auto rounded-md border border-hairline-subtle">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline-subtle bg-surface">
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Planet</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Nakshatra</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Direction</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Deity</th>
              </tr>
            </thead>
            <tbody>
              {data.planetPlacements.map(p => (
                <tr key={p.planet} className="border-b border-hairline-subtle last:border-0">
                  <td className="px-3 py-2 font-medium text-text-primary capitalize">{p.planet}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.nakshatraName}</td>
                  <td className="px-3 py-2 font-medium text-text-primary">{p.direction}</td>
                  <td className="px-3 py-2 text-brand-saffron">{p.deity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function KalachakraChakra() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const kcd = data.kalachakraDirection;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>

      <div className="mt-4">
        <div className="text-eyebrow text-brand-saffron">Kalachakra Chakra</div>
        <h1 className="mt-2 font-display text-h1 text-text-primary">
          कालचक्र दिशा चक्र
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Directional placement of planets across 8 cardinal directions by nakshatra,
          with deity governance (Indra, Agni, Yama, Nirriti, Varuna, Vayu, Kubera, Isana).
        </p>
      </div>

      {!kcd ? (
        <div className="mt-8 rounded-md border border-dashed border-hairline-subtle p-12 text-center">
          <p className="text-sm text-text-tertiary">
            Kalachakra direction data not available. Recalculate the chart to generate this data.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <CompassDiagram data={kcd} />
          </div>

          <div className="mt-8">
            <DirectionDetails data={kcd} />
          </div>

          {/* Citation */}
          <div className="mt-8 space-y-3">
            <div className="rounded-md border border-hairline-subtle bg-surface/50 p-3">
              <div className="flex items-start gap-2 text-xs text-text-tertiary">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Muhurta Chintamani / Narada Samhita:</strong> Each nakshatra is assigned to one
                  of 8 directions cyclically (nakshatra index mod 8). Each direction is governed by a Dikpala
                  (guardian deity). Planets occupying nakshatras in a given direction inherit the qualities
                  and influences of that direction's deity.
                </span>
              </div>
            </div>
            <div className="rounded-md border border-hairline-subtle bg-surface/50 p-4 text-xs text-text-tertiary">
              <strong>Sources:</strong> {kcd.citation}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
