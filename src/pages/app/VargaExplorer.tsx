import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { InteractiveVargaView, PLANETS, type Depth, type Graha } from '@/components/research/InteractiveVargaView';
import { VARGA_META, VARGA_CODES } from '@/components/research/vargaData';
import type { DivisionalChart, VargaCode } from '@/lib/astro/types';

/**
 * Focused interactive explorer for a single varga chart.
 * Route: /app/chart/:id/charts/:varga
 * Supports ?planet=<name> query param for cross-chart navigation.
 */
export default function VargaExplorer() {
  const { id = 'demo', varga: vargaParam } = useParams<{ id: string; varga: string }>();
  const [searchParams] = useSearchParams();
  const { data, isLoading } = useKundli(id);

  const varga = (vargaParam ?? 'D1') as VargaCode;
  const meta = VARGA_META[varga];

  // Pre-select planet from URL search params (cross-chart navigation).
  const planetParam = searchParams.get('planet') as Graha | null;
  const initialPlanet = planetParam && PLANETS.includes(planetParam) ? planetParam : null;

  const [selected, setSelected] = useState<Graha | null>(initialPlanet);
  const [depth, setDepth] = useState<Depth>('explain');

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
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <p className="text-text-secondary">Chart {varga} not found in this kundli.</p>
        <Link to={`/app/chart/${id}/charts`} className="mt-4 inline-flex items-center gap-1 text-sm text-brand-maroon hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to all vargas
        </Link>
      </div>
    );
  }

  // Quick nav: previous / next varga
  const vargaIdx = VARGA_CODES.indexOf(varga);
  const prevVarga = vargaIdx > 0 ? VARGA_CODES[vargaIdx - 1] : null;
  const nextVarga = vargaIdx < VARGA_CODES.length - 1 ? VARGA_CODES[vargaIdx + 1] : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link to={`/app/chart/${id}/charts`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" /> All vargas
        </Link>

        {/* Varga quick switcher */}
        <div className="mt-3 flex items-center gap-3">
          {prevVarga && (
            <Link
              to={`/app/chart/${id}/charts/${prevVarga}${selected ? `?planet=${selected}` : ''}`}
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
              to={`/app/chart/${id}/charts/${nextVarga}${selected ? `?planet=${selected}` : ''}`}
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
      </div>

      <InteractiveVargaView
        chart={chart}
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
