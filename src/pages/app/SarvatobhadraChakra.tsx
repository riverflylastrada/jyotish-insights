import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import type {
  SarvatobhadraData, SbcCell, JhoraTypeData, TaraGroupData,
} from '@/lib/astro/types';

const PLANET_SHORT: Record<string, string> = {
  sun: 'Su', moon: 'Mo', mars: 'Ma', mercury: 'Me',
  jupiter: 'Ju', venus: 'Ve', saturn: 'Sa', rahu: 'Ra', ketu: 'Ke',
};

const CELL_TYPE_COLORS: Record<string, string> = {
  nakshatra: 'bg-brand-maroon/10 border-brand-maroon/30',
  rashi: 'bg-brand-saffron/10 border-brand-saffron/30',
  vowel: 'bg-brand-gold/10 border-brand-gold/30',
  consonant: 'bg-surface border-hairline-subtle',
  weekday: 'bg-semantic-warning/10 border-semantic-warning/30',
  tithi: 'bg-semantic-positive/10 border-semantic-positive/30',
  empty: 'bg-canvas border-hairline-subtle',
};

type Panel = 'grid' | 'details';

// ─── Grid Cell ──────────────────────────────────────────────────────────────

function GridCell({ cell }: { cell: SbcCell }) {
  const colors = CELL_TYPE_COLORS[cell.type] ?? CELL_TYPE_COLORS.empty;
  const hasPlanets = cell.planets.length > 0;

  return (
    <div className={`relative flex flex-col items-center justify-center rounded border p-0.5 text-center ${colors} ${hasPlanets ? 'ring-1 ring-brand-saffron' : ''}`}
      style={{ minHeight: '48px' }}>
      <span className="text-[9px] leading-tight text-text-primary font-medium truncate max-w-full px-0.5">
        {cell.label || '\u00A0'}
      </span>
      {cell.type !== 'empty' && (
        <span className="text-[7px] leading-none text-text-muted uppercase tracking-wide">
          {cell.type === 'nakshatra' ? 'Nk' : cell.type === 'rashi' ? 'Ra' : cell.type.slice(0, 2)}
        </span>
      )}
      {hasPlanets && (
        <div className="absolute -top-1 -right-1 flex gap-px">
          {cell.planets.map(p => (
            <span key={p} className="rounded-full bg-brand-saffron px-1 text-[7px] font-bold text-primary-foreground leading-tight">
              {PLANET_SHORT[p] ?? p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 9×9 Grid ───────────────────────────────────────────────────────────────

function SbcGrid({ data }: { data: SarvatobhadraData }) {
  return (
    <div className="overflow-auto">
      <div className="grid gap-0.5" style={{
        gridTemplateColumns: 'repeat(9, minmax(52px, 1fr))',
        gridTemplateRows: 'repeat(9, auto)',
      }}>
        {data.grid.flat().map(cell => (
          <GridCell key={`${cell.row}-${cell.col}`} cell={cell} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-text-tertiary">
        {[
          ['Nakshatra', 'bg-brand-maroon/10'],
          ['Rashi', 'bg-brand-saffron/10'],
          ['Vowel', 'bg-brand-gold/10'],
          ['Consonant', 'bg-surface'],
          ['Weekday', 'bg-semantic-warning/10'],
          ['Tithi', 'bg-semantic-positive/10'],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded border border-hairline-subtle ${color}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Details Panel ──────────────────────────────────────────────────────────

function DetailsPanel({ data }: { data: SarvatobhadraData }) {
  return (
    <div className="space-y-6">
      {/* JHora Types table */}
      <div>
        <h3 className="font-display text-h3 text-text-primary">Classification Types</h3>
        <p className="mt-1 text-xs text-text-tertiary">
          JHora-style type classification from Moon and Lagna
        </p>
        <div className="mt-3 overflow-auto rounded-md border border-hairline-subtle">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline-subtle bg-surface">
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">From Moon</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">From Lagna</th>
              </tr>
            </thead>
            <tbody>
              {data.jhoraTypes.map((jt: JhoraTypeData) => (
                <tr key={jt.type} className="border-b border-hairline-subtle last:border-0 hover:bg-surface/50">
                  <td className="px-3 py-2 font-medium text-text-primary">{jt.type}</td>
                  <td className="px-3 py-2 text-text-secondary">{jt.fromMoon.nakshatraName}</td>
                  <td className="px-3 py-2 text-text-secondary">{jt.fromLagna.nakshatraName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tara Groups */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-eyebrow text-brand-saffron">Tara from Moon</h4>
          <div className="mt-2 space-y-1">
            {data.taraFromMoon.map((tg: TaraGroupData) => (
              <div key={tg.group} className="flex items-center justify-between rounded border border-hairline-subtle bg-surface px-3 py-1.5 text-xs">
                <span className="font-medium text-text-primary">{tg.group}</span>
                <span className="text-text-secondary">{tg.nakshatraName}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-eyebrow text-brand-saffron">Tara from Lagna</h4>
          <div className="mt-2 space-y-1">
            {data.taraFromLagna.map((tg: TaraGroupData) => (
              <div key={tg.group} className="flex items-center justify-between rounded border border-hairline-subtle bg-surface px-3 py-1.5 text-xs">
                <span className="font-medium text-text-primary">{tg.group}</span>
                <span className="text-text-secondary">{tg.nakshatraName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Natal placements */}
      <div>
        <h4 className="text-eyebrow text-brand-saffron">Planet Placements</h4>
        <div className="mt-2 overflow-auto rounded-md border border-hairline-subtle">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-hairline-subtle bg-surface">
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Planet</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Nakshatra</th>
                <th className="px-3 py-2 text-left font-semibold text-text-primary">Grid Pos</th>
              </tr>
            </thead>
            <tbody>
              {data.natalPlacements.map(p => (
                <tr key={p.planet} className="border-b border-hairline-subtle last:border-0">
                  <td className="px-3 py-2 font-medium text-text-primary capitalize">{p.planet}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.nakshatraName}</td>
                  <td className="px-3 py-2 font-mono text-text-tertiary">({p.row}, {p.col})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vedha */}
      {data.vedha.length > 0 && (
        <div>
          <h4 className="text-eyebrow text-semantic-negative">Vedha (Obstructions)</h4>
          <div className="mt-2 space-y-1">
            {data.vedha.map((v, i) => (
              <div key={i} className="rounded border border-semantic-negative/30 bg-semantic-negative/5 px-3 py-2 text-xs">
                <span className="font-medium capitalize">{v.transitPlanet}</span>
                <span className="text-text-tertiary"> ({v.transitNakshatra})</span>
                {' → '}
                <span className="font-medium capitalize">{v.natalPoint}</span>
                <span className="text-text-tertiary"> ({v.natalNakshatra})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function SarvatobhadraChakra() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const [panel, setPanel] = useState<Panel>('grid');

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const sbc = data.sarvatobhadra;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>

      <div className="mt-4">
        <div className="text-eyebrow text-brand-saffron">Sarvatobhadra Chakra</div>
        <h1 className="mt-2 font-display text-h1 text-text-primary">
          सर्वतोभद्र चक्र
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          The 9×9 nakshatra-based transit grid with planet placement, Vedha analysis,
          Tara groups, and JHora-style type classification.
        </p>
      </div>

      {!sbc ? (
        <div className="mt-8 rounded-md border border-dashed border-hairline-subtle p-12 text-center">
          <p className="text-sm text-text-tertiary">
            Sarvatobhadra Chakra data not available. Recalculate the chart to generate this data.
          </p>
        </div>
      ) : (
        <>
          {/* Panel toggle */}
          <div className="mt-6 flex border-b border-hairline-subtle">
            {([
              ['grid', '9×9 Grid'],
              ['details', 'Details'],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setPanel(key)}
                className={`relative px-4 py-3 text-sm transition-colors ${panel === key ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}>
                {label}
                {panel === key && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-saffron" />}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {panel === 'grid' && <SbcGrid data={sbc} />}
            {panel === 'details' && <DetailsPanel data={sbc} />}
          </div>

          {/* Citation + Classical info */}
          <div className="mt-8 space-y-3">
            <div className="rounded-md border border-hairline-subtle bg-surface/50 p-3">
              <div className="flex items-start gap-2 text-xs text-text-tertiary">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Muhurta Chintamani:</strong> The SBC is the primary tool for nakshatra-based
                  transit analysis. Vedha (obstruction) occurs when a transiting planet shares a row,
                  column, or diagonal with a natal point on the grid. The 9 Tara groups (Janma through
                  Parama Mitra) classify nakshatras by their relationship to the birth nakshatra.
                </span>
              </div>
            </div>
            <div className="rounded-md border border-hairline-subtle bg-surface/50 p-4 text-xs text-text-tertiary">
              <strong>Sources:</strong> {sbc.citation}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
