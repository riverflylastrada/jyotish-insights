import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import type {
  TripatakiData, TripatakiPosition, TripatakiLine,
  TripatakiTransitResult,
} from '@/lib/astro/types';

const PLANET_SHORT: Record<string, string> = {
  sun: 'Su', moon: 'Mo', mars: 'Ma', mercury: 'Me',
  jupiter: 'Ju', venus: 'Ve', saturn: 'Sa', rahu: 'Ra', ketu: 'Ke',
};

// ─── SVG Diamond Diagram ────────────────────────────────────────────────────

/** Map PyJHora grid coords (1-5, 1-5) to SVG pixel positions. */
function gridToSvg(gx: number, gy: number, size: number): [number, number] {
  const pad = 50;
  const step = (size - 2 * pad) / 4;
  return [pad + (gx - 1) * step, pad + (5 - gy) * step];
}

function DiamondDiagram({ data }: { data: TripatakiData }) {
  const size = 440;

  return (
    <div className="flex justify-center overflow-auto">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[440px]" style={{ minWidth: '300px' }}>
        {/* Vedha lines */}
        {data.lines.map((line: TripatakiLine, i: number) => {
          const [x1, y1] = gridToSvg(line.from[0], line.from[1], size);
          const [x2, y2] = gridToSvg(line.to[0], line.to[1], size);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="currentColor" className="text-hairline-subtle" strokeWidth="1" />
          );
        })}

        {/* Rashi nodes */}
        {data.positions.map((pos: TripatakiPosition) => {
          const [cx, cy] = gridToSvg(pos.gridX, pos.gridY, size);
          const isMoon = pos.rashiIdx === data.moonRashi;
          const hasPlanets = pos.planets.length > 0;

          return (
            <g key={pos.rashiIdx}>
              {/* Node circle */}
              <circle cx={cx} cy={cy} r={22}
                className={
                  isMoon
                    ? 'fill-brand-saffron/20 stroke-brand-saffron'
                    : hasPlanets
                      ? 'fill-brand-maroon/10 stroke-brand-maroon/60'
                      : 'fill-surface stroke-hairline-subtle'
                }
                strokeWidth={isMoon ? 2 : 1} />

              {/* Rashi label */}
              <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="central"
                className="fill-text-primary text-[9px] font-bold">
                {pos.rashiName.slice(0, 4)}
              </text>

              {/* Planet chips below rashi name */}
              {hasPlanets && (
                <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="central"
                  className="fill-brand-maroon text-[7px] font-bold">
                  {pos.planets.map(p => PLANET_SHORT[p] ?? p.slice(0, 2)).join(' ')}
                </text>
              )}

              {/* Moon indicator */}
              {isMoon && (
                <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="central"
                  className="fill-brand-saffron text-[6px] font-medium">
                  ☽ Moon
                </text>
              )}
            </g>
          );
        })}

        {/* Center label */}
        <text x={size / 2} y={size / 2 - 10} textAnchor="middle" dominantBaseline="central"
          className="fill-text-primary text-[11px] font-display font-bold">
          त्रिपताकी
        </text>
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle" dominantBaseline="central"
          className="fill-text-tertiary text-[8px]">
          Tripataki
        </text>
      </svg>
    </div>
  );
}

// ─── Transit Results Table ──────────────────────────────────────────────────

function TransitResults({ data }: { data: TripatakiData }) {
  return (
    <div className="space-y-6">
      {/* Moon info */}
      <div className="rounded-md border border-brand-saffron/30 bg-brand-saffron/5 p-3">
        <span className="text-xs font-medium text-text-primary">
          Natal Moon: {data.moonRashiName} (Rashi {data.moonRashi})
        </span>
        <span className="ml-2 text-xs text-text-tertiary">
          — Nakshatra: {data.moonNakshatraName}
        </span>
      </div>

      {/* Transit verdict table */}
      <div>
        <h4 className="text-eyebrow text-brand-saffron">Transit Verdict (Vedha Analysis)</h4>
        <p className="mt-1 text-[10px] text-text-tertiary">
          Planets whose rashi is connected to the Moon's rashi via a vedha line are
          deemed malefic; others are benefic.
        </p>
        <div className="mt-3 overflow-auto rounded-md border border-hairline-subtle">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline-subtle bg-surface">
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Planet</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Rashi</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Nakshatra</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Vedha</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {data.transitResults.map((tr: TripatakiTransitResult) => (
                <tr key={tr.planet} className="border-b border-hairline-subtle last:border-0">
                  <td className="px-3 py-2 font-medium text-text-primary capitalize">{tr.planet}</td>
                  <td className="px-3 py-2 text-text-secondary">{tr.rashiName}</td>
                  <td className="px-3 py-2 text-text-secondary">{tr.nakshatraName}</td>
                  <td className="px-3 py-2">
                    {tr.hasVedha
                      ? <span className="text-semantic-negative font-medium">Yes</span>
                      : <span className="text-text-tertiary">No</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      tr.verdict === 'benefic'
                        ? 'bg-semantic-positive/10 text-semantic-positive'
                        : 'bg-semantic-negative/10 text-semantic-negative'
                    }`}>
                      {tr.verdict}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Planet placements */}
      <div>
        <h4 className="text-eyebrow text-brand-saffron">All Planet Placements</h4>
        <div className="mt-2 overflow-auto rounded-md border border-hairline-subtle">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline-subtle bg-surface">
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Planet</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Rashi</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Nakshatra</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Grid Pos</th>
              </tr>
            </thead>
            <tbody>
              {data.natalPlacements.map(p => (
                <tr key={p.planet} className="border-b border-hairline-subtle last:border-0">
                  <td className="px-3 py-2 font-medium text-text-primary capitalize">{p.planet}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.rashiName}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.nakshatraName}</td>
                  <td className="px-3 py-2 font-mono text-text-tertiary">({p.gridX}, {p.gridY})</td>
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

export default function TripatakiChakra() {
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

  const tri = data.tripataki;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>

      <div className="mt-4">
        <div className="text-eyebrow text-brand-saffron">Tripataki Chakra</div>
        <h1 className="mt-2 font-display text-h1 text-text-primary">
          त्रिपताकी चक्र
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Triangular transit-analysis chakra: 12 rashis in a diamond layout with vedha
          (obstruction) lines. Determines whether each planet's transit is benefic or
          malefic relative to the natal Moon.
        </p>
      </div>

      {!tri ? (
        <div className="mt-8 rounded-md border border-dashed border-hairline-subtle p-12 text-center">
          <p className="text-sm text-text-tertiary">
            Tripataki Chakra data not available. Recalculate the chart to generate this data.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <DiamondDiagram data={tri} />
          </div>

          <div className="mt-8">
            <TransitResults data={tri} />
          </div>

          {/* Citation */}
          <div className="mt-8 space-y-3">
            <div className="rounded-md border border-hairline-subtle bg-surface/50 p-3">
              <div className="flex items-start gap-2 text-xs text-text-tertiary">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Uttar Kalamrit (Tripataki Chakra):</strong> The 12 rashis are arranged in a
                  diamond pattern forming three interlocking triangles. Vedha lines connect opposing
                  positions; a transiting planet at a position connected to the natal Moon's rashi
                  is deemed malefic (obstructive), while unconnected positions indicate benefic
                  (supportive) transits. Especially used for judging Saturn and Jupiter transits.
                </span>
              </div>
            </div>
            <div className="rounded-md border border-hairline-subtle bg-surface/50 p-4 text-xs text-text-tertiary">
              <strong>Sources:</strong> {tri.citation}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
