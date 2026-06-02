import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { useChartStore } from '@/stores/useChartStore';
import { KundliChart, KundliFrame } from '@/components/kundli/KundliChart';
import {
  SIGN_NAMES, PLANET_LABELS,
  type SudarshanaData, type SudarshanaHouse, type DivisionalChart, type PlanetPosition,
} from '@/lib/astro/types';

// ─── helpers ────────────────────────────────────────────────────────────────

const PLANET_SHORT: Record<string, string> = {
  sun: 'Su', moon: 'Mo', mars: 'Ma', mercury: 'Me',
  jupiter: 'Ju', venus: 'Ve', saturn: 'Sa', rahu: 'Ra', ketu: 'Ke',
};

function refLabel(ref: 'lagna' | 'moon' | 'sun'): string {
  return ref === 'lagna' ? 'Lagna' : ref === 'moon' ? 'Moon' : 'Sun';
}

/**
 * Build a DivisionalChart-shaped object from a reference wheel so we can
 * reuse the existing KundliChart component.
 */
function buildRefChart(
  refSign: number,
  planets: string[],
  allD1: DivisionalChart,
): DivisionalChart {
  const ps: PlanetPosition[] = planets
    .map(name => allD1.planets.find(p => p.planet === name))
    .filter((p): p is PlanetPosition => !!p)
    .map(p => ({
      ...p,
      // re-derive house relative to this reference's ascendant sign
      houseNumber: ((p.signNumber - refSign + 12) % 12) + 1,
    }));

  return {
    varga: 'D1',
    vargaName: 'Rasi',
    significance: '',
    ascendantSign: refSign,
    planets: ps,
  };
}

type Panel = 'wheels' | 'houses';

// ─── Confirmation badge ─────────────────────────────────────────────────────

function ConfirmBadge({ count }: { count: number }) {
  const color =
    count === 3 ? 'bg-semantic-positive/20 text-semantic-positive border-semantic-positive/40' :
    count === 2 ? 'bg-brand-saffron/20 text-brand-saffron border-brand-saffron/40' :
    count === 1 ? 'bg-brand-gold/20 text-brand-gold border-brand-gold/40' :
    'bg-surface text-text-muted border-hairline-subtle';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {count}/3
    </span>
  );
}

// ─── Houses table ───────────────────────────────────────────────────────────

function HousesPanel({ data }: { data: SudarshanaData }) {
  return (
    <div className="overflow-x-auto rounded-md border border-hairline-subtle">
      {/* min-width keeps the 5 columns from squishing on narrow screens; the
          wrapper scrolls horizontally on mobile instead of truncating. */}
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-hairline-subtle bg-elevated text-xs uppercase tracking-wide text-text-tertiary">
            <th className="whitespace-nowrap px-3 py-2 text-left">House</th>
            <th className="whitespace-nowrap px-3 py-2 text-left">Lagna ({data.lagnaSignName})</th>
            <th className="whitespace-nowrap px-3 py-2 text-left">Moon ({data.moonSignName})</th>
            <th className="whitespace-nowrap px-3 py-2 text-left">Sun ({data.sunSignName})</th>
            <th className="whitespace-nowrap px-3 py-2 text-center">Confirmed</th>
          </tr>
        </thead>
        <tbody>
          {data.houses.map((h: SudarshanaHouse) => (
            <tr key={h.house} className="border-b border-hairline-subtle last:border-0 hover:bg-surface/50">
              <td className="px-3 py-2 font-mono font-semibold text-text-primary">{h.house}</td>
              <td className="px-3 py-2 text-text-secondary">
                {h.lagnaPlanets.length > 0 ? h.lagnaPlanets.map(p => PLANET_SHORT[p] ?? p).join(', ') : '—'}
              </td>
              <td className="px-3 py-2 text-text-secondary">
                {h.moonPlanets.length > 0 ? h.moonPlanets.map(p => PLANET_SHORT[p] ?? p).join(', ') : '—'}
              </td>
              <td className="px-3 py-2 text-text-secondary">
                {h.sunPlanets.length > 0 ? h.sunPlanets.map(p => PLANET_SHORT[p] ?? p).join(', ') : '—'}
              </td>
              <td className="px-3 py-2 text-center">
                <ConfirmBadge count={h.confirmedCount} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Three wheels ───────────────────────────────────────────────────────────

function WheelsPanel({ data, d1 }: { data: SudarshanaData; d1: DivisionalChart }) {
  const chartStyle = useChartStore((s) => s.chartStyle);
  const setChartStyle = useChartStore((s) => s.setChartStyle);

  const allPlanets = d1.planets.map(p => p.planet).filter(n => n !== 'ascendant');
  const lagnaChart = buildRefChart(data.lagnaSign, allPlanets, d1);
  const moonChart = buildRefChart(data.moonSign, allPlanets, d1);
  const sunChart = buildRefChart(data.sunSign, allPlanets, d1);

  return (
    <div className="space-y-6">
      {/* Style toggle */}
      <div className="flex justify-end">
        <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
          {(['north', 'south'] as const).map(s => (
            <button key={s} onClick={() => setChartStyle(s)}
              className={`rounded-sm px-2.5 py-1 capitalize transition-colors ${chartStyle === s ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary hover:text-text-primary'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <KundliFrame title="Lagna Wheel" subtitle={`Asc: ${data.lagnaSignName}`}>
          <KundliChart chart={lagnaChart} style={chartStyle} size={280} />
        </KundliFrame>
        <KundliFrame title="Moon Wheel" subtitle={`Moon: ${data.moonSignName}`}>
          <KundliChart chart={moonChart} style={chartStyle} size={280} />
        </KundliFrame>
        <KundliFrame title="Sun Wheel" subtitle={`Sun: ${data.sunSignName}`}>
          <KundliChart chart={sunChart} style={chartStyle} size={280} />
        </KundliFrame>
      </div>

      {/* Confirmation row */}
      <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
        <div className="text-eyebrow text-text-tertiary mb-3">House confirmation strength</div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {data.houses.map(h => (
            <div key={h.house} className="flex flex-col items-center gap-1 rounded border border-hairline-subtle bg-canvas p-2">
              <span className="font-mono text-xs text-text-primary">{h.house}</span>
              <ConfirmBadge count={h.confirmedCount} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function SudarshanaChakra() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);
  const [panel, setPanel] = useState<Panel>('wheels');

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const sud = data.sudarshana;
  const d1 = data.divisionalCharts.find(c => c.varga === 'D1')!;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>

      <div className="mt-4">
        <div className="text-eyebrow text-brand-saffron">Sudarshana Chakra</div>
        <h1 className="mt-2 font-display text-h1 text-text-primary">
          सुदर्शन चक्र
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Tri-wheel overlay of D1 Rasi from Lagna, Moon, and Sun — a house is strong
          when confirmed from all three references.
        </p>
      </div>

      {!sud ? (
        <div className="mt-8 rounded-md border border-dashed border-hairline-subtle p-12 text-center">
          <p className="text-sm text-text-tertiary">
            Sudarshana Chakra data not available. Recalculate the chart to generate this data.
          </p>
        </div>
      ) : (
        <>
          {/* Panel toggle */}
          <div className="mt-6 flex border-b border-hairline-subtle">
            {([
              ['wheels', 'Tri-Wheel'],
              ['houses', 'House Table'],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setPanel(key)}
                className={`relative px-4 py-3 text-sm transition-colors ${panel === key ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}>
                {label}
                {panel === key && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-saffron" />}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {panel === 'wheels' && <WheelsPanel data={sud} d1={d1} />}
            {panel === 'houses' && <HousesPanel data={sud} />}
          </div>

          {/* Citation */}
          <div className="mt-8 space-y-3">
            <div className="rounded-md border border-hairline-subtle bg-surface/50 p-3">
              <div className="flex items-start gap-2 text-xs text-text-tertiary">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Classical source:</strong> The Sudarshana Chakra is described in
                  BPHS Ch. 31. A house or event is judged strong when confirmed from all
                  three vantage points (Lagna, Moon, Sun). PVR Narasimha Rao popularised its
                  modern use in his "Integrated Approach to Vedic Astrology".
                </span>
              </div>
            </div>
            <div className="rounded-md border border-hairline-subtle bg-surface/50 p-4 text-xs text-text-tertiary">
              <strong>Sources:</strong> {sud.citation}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
