import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Microscope } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { useChartStore } from '@/stores/useChartStore';
import { KundliChart, KundliFrame } from '@/components/kundli/KundliChart';
import type { VargaCode } from '@/lib/astro/types';

export default function DivisionalCharts() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const chartStyle = useChartStore((s) => s.chartStyle);
  const setChartStyle = useChartStore((s) => s.setChartStyle);
  const [focused, setFocused] = useState<VargaCode>('D1');
  const [compare, setCompare] = useState<VargaCode | null>('D9');

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const focusedChart = data.divisionalCharts.find((c) => c.varga === focused)!;
  const compareChart = compare ? data.divisionalCharts.find((c) => c.varga === compare) : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to chart
          </Link>
          <div className="mt-3 text-eyebrow text-brand-saffron">Vargas · D1 — D60</div>
          <h1 className="mt-1 font-display text-h1 text-text-primary">Divisional Charts</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            Each varga is a magnification of a specific area of life — a refraction of the natal Rasi through a different harmonic lens.
            Tap <Microscope className="inline h-3.5 w-3.5 text-brand-maroon" /> to explore any varga interactively.
          </p>
        </div>
        <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
          {(['north', 'south'] as const).map((s) => (
            <button key={s} onClick={() => setChartStyle(s)} className={`rounded-sm px-3 py-1 capitalize ${chartStyle === s ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Top: focused vs compare */}
      <div className="grid gap-6 lg:grid-cols-2">
        <KundliFrame title={`${focusedChart.varga} · ${focusedChart.vargaName}`} subtitle={focusedChart.significance}>
          <KundliChart chart={focusedChart} style={chartStyle} size={420} />
          <Link
            to={`/app/chart/${id}/charts/${focusedChart.varga}`}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-brand-maroon/30 bg-surface px-3 py-1.5 text-sm text-brand-maroon hover:bg-elevated transition-colors"
          >
            <Microscope className="h-4 w-4" /> Explore {focusedChart.varga} interactively
          </Link>
        </KundliFrame>
        {compareChart ? (
          <KundliFrame title={`${compareChart.varga} · ${compareChart.vargaName}`} subtitle={compareChart.significance}>
            <KundliChart chart={compareChart} style={chartStyle} size={420} />
            <Link
              to={`/app/chart/${id}/charts/${compareChart.varga}`}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-brand-maroon/30 bg-surface px-3 py-1.5 text-sm text-brand-maroon hover:bg-elevated transition-colors"
            >
              <Microscope className="h-4 w-4" /> Explore {compareChart.varga} interactively
            </Link>
          </KundliFrame>
        ) : (
          <div className="flex items-center justify-center rounded-md border border-dashed border-hairline-subtle bg-surface p-8 text-sm text-text-tertiary">
            Select a second varga below to compare side-by-side.
          </div>
        )}
      </div>

      {/* Switcher grid */}
      <div className="mt-10">
        <div className="text-eyebrow text-text-tertiary">All vargas</div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.divisionalCharts.map((c) => {
            const isFocus = c.varga === focused;
            const isCompare = c.varga === compare;
            return (
              <div key={c.varga} className={`rounded-md border bg-surface p-3 shadow-sm transition-colors ${isFocus ? 'border-brand-maroon' : isCompare ? 'border-brand-saffron' : 'border-hairline-subtle hover:border-border-default'}`}>
                <button onClick={() => setFocused(c.varga)} className="block w-full">
                  <KundliChart chart={c} style={chartStyle} size={200} />
                </button>
                <div className="mt-3 flex items-baseline justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-text-tertiary">{c.varga}</div>
                    <div className="font-display text-sm text-text-primary">{c.vargaName}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/app/chart/${id}/charts/${c.varga}`}
                      className="rounded-sm border border-hairline-subtle p-1 text-text-tertiary hover:border-brand-maroon/40 hover:text-brand-maroon transition-colors"
                      title={`Explore ${c.varga} interactively`}
                    >
                      <Microscope className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => setCompare(compare === c.varga ? null : c.varga)}
                      className={`rounded-sm border px-2 py-0.5 text-eyebrow ${isCompare ? 'border-brand-saffron bg-brand-saffron/10 text-brand-saffron' : 'border-hairline-subtle text-text-tertiary hover:text-text-primary'}`}
                    >
                      {isCompare ? 'Comparing' : 'Compare'}
                    </button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-text-tertiary">{c.significance}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
