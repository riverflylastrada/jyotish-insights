import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Info, Compass, MapPin } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { getAstroProvider } from '@/lib/astro/factory';
import { PLANET_LABELS, type PlanetPosition } from '@/lib/astro/types';
import { KundliBiWheel } from '@/components/kundli/KundliBiWheel';
import { useChartStore } from '@/stores/useChartStore';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';

export default function Transits() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const [transits, setTransits] = useState<PlanetPosition[]>([]);
  const [loading, setLoading] = useState(true);
  
  const chartStyle = useChartStore((s) => s.chartStyle);
  const setChartStyle = useChartStore((s) => s.setChartStyle);

  // Use current location for transit computation, fallback to birth place
  const birthLat = (data?.birthDetails as any)?.placeOfBirth?.latitude as number | undefined;
  const birthLon = (data?.birthDetails as any)?.placeOfBirth?.longitude as number | undefined;
  const birthTz  = (data?.birthDetails as any)?.placeOfBirth?.timezone as string | undefined;
  const { location: transitLoc, isFromProfile: transitUsingProfile } = useCurrentLocation(birthLat, birthLon, birthTz);

  useEffect(() => {
    const lat = transitLoc?.lat ?? 0;
    const lon = transitLoc?.lon ?? 0;
    getAstroProvider().getCurrentTransits(lat, lon).then((t) => {
      setTransits(t);
      setLoading(false);
    });
  }, [transitLoc?.lat, transitLoc?.lon]);

  if (isLoading || !data || loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const natal = data.divisionalCharts.find(c => c.varga === 'D1')!;
  const moonNatal = natal.planets.find(p => p.planet === 'moon')!;

  // Compute transit house relative to natal Lagna
  const lagnaSign = natal.ascendantSign;
  const houseFromLagna = (sign: number) => ((sign - lagnaSign + 12) % 12) + 1;
  const houseFromMoon  = (sign: number) => ((sign - moonNatal.signNumber + 12) % 12) + 1;

  // Sade Sati check: Saturn in 12, 1 or 2 from natal Moon
  const sat = transits.find(p => p.planet === 'saturn');
  const satFromMoon = sat ? houseFromMoon(sat.signNumber) : 0;
  const sadeSati = [12, 1, 2].includes(satFromMoon);

  // Notable: Jupiter in kendra/trikona from Lagna
  const jup = transits.find(p => p.planet === 'jupiter');
  const jupHouse = jup ? houseFromLagna(jup.signNumber) : 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron flex items-center gap-1"><Compass className="h-3.5 w-3.5 text-brand-saffron" /> Gochara · Sky vs natal</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Current Transits</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        How today's planetary sky activates the natal chart. Houses are reckoned from the natal Lagna and natal Moon — both perspectives matter in classical Gochara.
      </p>
      {transitLoc && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-elevated px-3 py-1.5 text-xs text-text-secondary">
          <MapPin className="h-3 w-3" />
          computed for <span className="font-semibold text-text-primary">{transitUsingProfile ? (transitLoc.placeName ?? 'Current location') : ((data.birthDetails as any)?.placeOfBirth?.name ?? `${transitLoc.lat.toFixed(2)}°, ${transitLoc.lon.toFixed(2)}°`)}</span>
        </div>
      )}

      {/* Bi-Wheel & Info Grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Left: Interactive Bi-Wheel Visual */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-h3 text-text-primary">Interactive Bi-Wheel</h3>
                <p className="text-xs text-text-tertiary mt-0.5">Click houses to highlight alignments</p>
              </div>
              <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
                {(['north', 'south'] as const).map(s => (
                  <button key={s} onClick={() => setChartStyle(s)}
                    className={`rounded-sm px-3 py-1.5 capitalize transition-colors ${chartStyle === s ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center p-2 rounded bg-canvas/30 border border-hairline-subtle/50">
              <KundliBiWheel natalChart={natal} transits={transits} style={chartStyle} />
            </div>

            {/* Legend */}
            <div className="mt-4 flex justify-between items-center text-xs border-t border-hairline-subtle pt-4">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-brand-maroon" />
                <span className="text-text-secondary font-medium">Natal Planets</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-brand-saffron" />
                <span className="text-text-secondary font-medium">Transit Planets (<sub>t</sub>)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Gochara Highlights & Planet comparisons */}
        <div className="lg:col-span-7 space-y-6">
          {/* Headline cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Headline
              title="Sade Sati"
              tone={sadeSati ? 'warn' : 'calm'}
              value={sadeSati ? 'Active' : 'Inactive'}
              sub={sat ? `Saturn in ${sat.signName} · ${satFromMoon}H from Moon` : ''}
            />
            <Headline
              title="Guru transit"
              tone={[1,4,5,7,9,10,11].includes(jupHouse) ? 'good' : 'calm'}
              value={jup ? `${jup.signName}` : '—'}
              sub={jup ? `${jupHouse}H from Lagna` : ''}
            />
            <Headline
              title="Lunar mansion"
              tone="calm"
              value={transits.find(p=>p.planet==='moon')?.nakshatra ?? '—'}
              sub="Today's nakshatra"
            />
          </div>

          {/* Comparison table */}
          <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-4 w-4 text-brand-saffron" />
              <h2 className="font-display text-h3 text-text-primary">Natal vs. Transit Alignments</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] text-sm text-left">
                <thead className="border-b border-hairline-subtle text-xs uppercase tracking-wider text-text-tertiary">
                  <tr>
                    <th className="pb-3">Planet</th>
                    <th className="pb-3">Natal</th>
                    <th className="pb-3">Transit</th>
                    <th className="pb-3 text-right">Change</th>
                    <th className="pb-3 text-right">Lagna H</th>
                    <th className="pb-3 text-right">Moon H</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-subtle/50">
                  {transits.map(t => {
                    const n = natal.planets.find(p => p.planet === t.planet);
                    if (!n) return null;
                    const delta = ((t.signNumber - n.signNumber + 12) % 12);
                    const hL = houseFromLagna(t.signNumber);
                    const hM = houseFromMoon(t.signNumber);
                    return (
                      <tr key={t.planet} className="hover:bg-elevated/20">
                        <td className="py-2.5 flex items-center gap-2">
                          <span className="font-mono text-xs font-bold" style={{ color: `hsl(var(--planet-${t.planet}))` }}>
                            {PLANET_LABELS[t.planet].short}
                          </span>
                          <span className="text-text-primary text-xs">{PLANET_LABELS[t.planet].full}</span>
                        </td>
                        <td className="py-2.5 text-text-tertiary text-xs">{n.signName}</td>
                        <td className="py-2.5 text-text-primary font-medium text-xs">{t.signName}</td>
                        <td className="py-2.5 text-right font-mono text-text-tertiary text-xs">{delta === 0 ? 'Conjunction' : `+${delta} signs`}</td>
                        <td className="py-2.5 text-right font-mono text-text-secondary text-xs">{hL}H</td>
                        <td className="py-2.5 text-right font-mono text-text-secondary text-xs">{hM}H</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Headline({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone: 'good' | 'warn' | 'calm' }) {
  const map = {
    good: 'border-semantic-positive/30 bg-semantic-positive/5',
    warn: 'border-brand-maroon/30 bg-brand-maroon/5',
    calm: 'border-hairline-subtle bg-surface',
  } as const;
  
  return (
    <div className={`rounded-md border p-5 shadow-sm ${map[tone]}`}>
      <div className="text-eyebrow text-text-tertiary">{title}</div>
      <div className="mt-1.5 font-display text-h2 text-text-primary">{value}</div>
      {sub && <div className="mt-1 font-mono text-[10px] text-text-tertiary">{sub}</div>}
    </div>
  );
}