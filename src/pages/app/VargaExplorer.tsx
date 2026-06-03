import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useKundli } from '@/hooks/useKundli';
import { InteractiveVargaView, PLANETS, type Depth, type Graha } from '@/components/research/InteractiveVargaView';
import { VARGA_META, VARGA_CODES, VARGA_SCHEME_OPTIONS } from '@/components/research/vargaData';
import { CURRENT_SNAPSHOT_VERSION } from '@/lib/astro/types';
import type { DivisionalChart, DivisionalScheme, VargaCode } from '@/lib/astro/types';
import { recomputeDivisionalChart } from '@/lib/astro/vargaSchemes';

/**
 * Focused interactive explorer for a single varga chart.
 * Route: /app/chart/:id/charts/:varga
 * Supports ?planet=<name> query param for cross-chart navigation.
 */
export default function VargaExplorer() {
  const { id = 'demo', varga: vargaParam } = useParams<{ id: string; varga: string }>();
  const chartLink = useChartLink();
  const [searchParams] = useSearchParams();
  const { data, isLoading } = useKundli(id);
  const queryClient = useQueryClient();

  const varga = (vargaParam ?? 'D1') as VargaCode;
  const meta = VARGA_META[varga];

  // Pre-select planet from URL search params (cross-chart navigation).
  const planetParam = searchParams.get('planet') as Graha | null;
  const initialPlanet = planetParam && PLANETS.includes(planetParam) ? planetParam : null;

  const [selected, setSelected] = useState<Graha | null>(initialPlanet);
  const [depth, setDepth] = useState<Depth>('explain');
  const [scheme, setScheme] = useState<DivisionalScheme>('parashari');

  // Reset scheme to parashari when switching vargas
  useEffect(() => { setScheme('parashari'); }, [varga]);

  // Sync selected planet when navigating between vargas with ?planet=
  useEffect(() => {
    if (planetParam && PLANETS.includes(planetParam)) {
      setSelected(planetParam);
    }
  }, [planetParam, varga]);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const chart: DivisionalChart | undefined = data.divisionalCharts.find((c) => c.varga === varga);
  if (!chart) {
    const isStale = (data.snapshotVersion ?? 0) < CURRENT_SNAPSHOT_VERSION;
    const handleRecalculate = () => {
      void queryClient.invalidateQueries({ queryKey: ['chart', id] });
    };
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        {isStale ? (
          <>
            <p className="text-text-primary font-display text-h3">This chart predates {varga}.</p>
            <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
              The engine has gained new vargas since this chart was last computed (snapshot
              v{data.snapshotVersion ?? '?'} → current v{CURRENT_SNAPSHOT_VERSION}).
              Recalculate to populate the new ones.
            </p>
            <button
              onClick={handleRecalculate}
              className="mt-5 inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" /> Recalculate now
            </button>
          </>
        ) : (
          <p className="text-text-secondary">Chart {varga} not found in this kundli.</p>
        )}
        <Link to={chartLink(`/app/chart/${id}/charts`)} className="mt-6 inline-flex items-center gap-1 text-sm text-brand-maroon hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to all vargas
        </Link>
      </div>
    );
  }

  // Available scheme options for this varga
  const schemeOptions = VARGA_SCHEME_OPTIONS[varga];
  const activeScheme = schemeOptions?.find(s => s.key === scheme);

  // Recompute chart if alternate scheme selected
  const d1Chart = data.divisionalCharts.find(c => c.varga === 'D1');
  const d1Asc = d1Chart
    ? { signNumber: d1Chart.ascendantSign, signDegree: d1Chart.planets.find(p => p.planet === 'ascendant')?.signDegree ?? 0 }
    : { signNumber: 1, signDegree: 0 };

  const activeChart: DivisionalChart = useMemo(() => {
    if (scheme === 'parashari' || !d1Chart || !schemeOptions) return chart;
    return recomputeDivisionalChart(varga, d1Chart, d1Asc, scheme, chart);
  }, [chart, d1Chart, d1Asc, scheme, varga, schemeOptions]);

  // Quick nav: previous / next varga
  const vargaIdx = VARGA_CODES.indexOf(varga);
  const prevVarga = vargaIdx > 0 ? VARGA_CODES[vargaIdx - 1] : null;
  const nextVarga = vargaIdx < VARGA_CODES.length - 1 ? VARGA_CODES[vargaIdx + 1] : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to={chartLink(`/app/chart/${id}/charts`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" /> All vargas
        </Link>

        {/* Varga quick switcher */}
        <div className="mt-3 flex items-center gap-3">
          {prevVarga && (
            <Link
              to={chartLink(`/app/chart/${id}/charts/${prevVarga}${selected ? `?planet=${selected}` : ''}`)}
              className="rounded-sm border border-hairline-subtle px-2 py-0.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              ← {prevVarga}
            </Link>
          )}
          <div>
            <div className="text-eyebrow text-brand-saffron">{chart.varga} · {chart.vargaName}</div>
            <h1 className="mt-1 font-display text-h1 text-text-primary">{meta?.name ?? chart.vargaName}</h1>
          </div>
          {nextVarga && (
            <Link
              to={chartLink(`/app/chart/${id}/charts/${nextVarga}${selected ? `?planet=${selected}` : ''}`)}
              className="rounded-sm border border-hairline-subtle px-2 py-0.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              {nextVarga} →
            </Link>
          )}
        </div>

        {/* Varga purpose line */}
        {meta && (
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            {meta.purpose}
          </p>
        )}

        {/* Scheme selector (D-2, D-3, D-4, D-8 only) */}
        {schemeOptions && schemeOptions.length > 1 && (
          <div className="mt-4 rounded-md border border-hairline-subtle bg-surface p-3">
            <div className="text-xs font-medium text-text-tertiary mb-2">
              Calculation Scheme / गणना पद्धति
            </div>
            <div className="flex flex-wrap gap-2">
              {schemeOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setScheme(opt.key)}
                  className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                    scheme === opt.key
                      ? 'bg-brand-maroon text-primary-foreground'
                      : 'border border-hairline-subtle text-text-secondary hover:text-text-primary hover:border-border-default'
                  }`}
                >
                  {opt.en}
                </button>
              ))}
            </div>
            {activeScheme && scheme !== 'parashari' && (
              <p className="mt-2 text-xs text-text-tertiary">
                <span className="font-medium">{activeScheme.cite}:</span>{' '}
                {activeScheme.formula}
              </p>
            )}
          </div>
        )}
      </div>

      <InteractiveVargaView
        chart={activeChart}
        chartId={id}
        selected={selected}
        onSelectPlanet={setSelected}
        depth={depth}
        onSetDepth={setDepth}
        showCrossNav
        currentVarga={varga}
      />
    </div>
  );
}
