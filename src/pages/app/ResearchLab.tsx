import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { InteractiveVargaView, type Depth, type Graha } from '@/components/research/InteractiveVargaView';
import type { DivisionalChart } from '@/lib/astro/types';

/**
 * Interactive Research Lab — the D1 chart you can interrogate.
 *
 * Now delegates to the shared InteractiveVargaView so the interaction model
 * stays in sync with divisional varga explorers.
 */

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

      <div className="mt-6">
        <InteractiveVargaView
          chart={d1}
          chartId={id}
          selected={selected}
          onSelectPlanet={setSelected}
          depth={depth}
          onSetDepth={setDepth}
          showCrossNav
          currentVarga="D1"
          autoInsights={data.autoInsights}
        />
      </div>
    </div>
  );
}
