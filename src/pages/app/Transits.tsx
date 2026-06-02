import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2, Info, Compass, MapPin } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { getAstroProvider } from '@/lib/astro/factory';
import { PLANET_LABELS, type PlanetPosition, type PlanetName } from '@/lib/astro/types';
import { KundliBiWheel } from '@/components/kundli/KundliBiWheel';
import { useChartStore } from '@/stores/useChartStore';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { aspectOffsets, ASPECT_LABEL, type Graha } from '@/lib/astro/dashaUtils';
import type { Depth } from '@/components/research/InteractiveVargaView';

type TransitGraha = Exclude<PlanetName, 'ascendant'>;

/* Depth toggle — matches Phase 3b InteractiveVargaView */
function DepthToggle({ depth, onSetDepth }: { depth: Depth; onSetDepth: (d: Depth) => void }) {
  return (
    <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
      {([['visual', '👁️ Visual'], ['explain', '👆 Explain'], ['math', '🔬 Math Proof']] as const).map(([k, label]) => (
        <button key={k} onClick={() => onSetDepth(k)}
          className={`flex-1 rounded-sm px-3 py-1.5 transition-colors ${depth === k ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary hover:text-text-primary'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Transits() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);
  const [transits, setTransits] = useState<PlanetPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransit, setSelectedTransit] = useState<TransitGraha | null>(null);
  const [depth, setDepth] = useState<Depth>('explain');
  
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

  // Selected transit planet data
  const selTransit = selectedTransit ? transits.find(p => p.planet === selectedTransit) : null;
  const selHouseL = selTransit ? houseFromLagna(selTransit.signNumber) : 0;

  // Bindu lookup from Bhinnashtakavarga
  const bhinna = data.ashtakavarga?.bhinna;
  const selBindu = selTransit && bhinna ? (bhinna[selTransit.planet]?.[selHouseL - 1] ?? null) : null;

  // Aspect arrows: from transit planet to natal planets it aspects
  const aspectedNatals: Array<{ planet: PlanetName; house: number }> = [];
  if (selTransit) {
    const offsets = aspectOffsets(selTransit.planet as Graha);
    for (const off of offsets) {
      const targetHouse = ((selHouseL - 1 + off) % 12) + 1;
      // find natal planets in that house
      for (const np of natal.planets) {
        if (np.planet === 'ascendant') continue;
        if (np.houseNumber === targetHouse) {
          aspectedNatals.push({ planet: np.planet, house: targetHouse });
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron flex items-center gap-1"><Compass className="h-3.5 w-3.5 text-brand-saffron" /> Gochara · Sky vs natal</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Current Transits</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Tap a transit planet to see its natal house, Bhinnashtakavarga bindu strength, and aspect arrows to natal planets.
      </p>
      {transitLoc && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-elevated px-3 py-1.5 text-xs text-text-secondary">
          <MapPin className="h-3 w-3" />
          computed for <span className="font-semibold text-text-primary">{transitUsingProfile ? (transitLoc.placeName ?? 'Current location') : ((data.birthDetails as any)?.placeOfBirth?.name ?? `${transitLoc.lat.toFixed(2)}°, ${transitLoc.lon.toFixed(2)}°`)}</span>
        </div>
      )}

      {/* Depth toggle */}
      <div className="mt-6">
        <DepthToggle depth={depth} onSetDepth={setDepth} />
      </div>

      {/* Bi-Wheel & Info Grid */}
      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        {/* Left: Interactive Bi-Wheel Visual */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-h3 text-text-primary">Interactive Bi-Wheel</h3>
                <p className="text-xs text-text-tertiary mt-0.5">Tap a planet below for details</p>
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

          {/* Transit planet selector pills */}
          <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
            <div className="text-eyebrow text-text-tertiary mb-3">Tap a transit planet</div>
            <div className="flex flex-wrap gap-2">
              {transits.filter(t => t.planet !== 'ascendant').map((t) => {
                const isSel = selectedTransit === t.planet;
                return (
                  <button key={t.planet}
                    onClick={() => setSelectedTransit(isSel ? null : t.planet as TransitGraha)}
                    className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm capitalize transition-colors ${
                      isSel ? 'border-brand-maroon bg-brand-maroon text-primary-foreground' : 'border-hairline-subtle bg-surface text-text-secondary hover:border-brand-maroon/40'
                    }`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${t.planet}))` }} />
                    {PLANET_LABELS[t.planet].full}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Focus Panel & Highlights */}
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

          {/* Transit focus panel */}
          {selTransit && depth !== 'visual' ? (
            <TransitFocusPanel
              transit={selTransit}
              houseFromLagna={selHouseL}
              bindu={selBindu}
              aspectedNatals={aspectedNatals}
              sadeSati={sadeSati && selTransit.planet === 'saturn'}
              satFromMoon={satFromMoon}
              depth={depth}
            />
          ) : !selectedTransit ? (
            <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-8 text-center text-sm text-text-tertiary">
              Select a transit planet to see its house placement, bindu strength, and aspect arrows.
            </div>
          ) : null}

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
                    const isSel = selectedTransit === t.planet;
                    return (
                      <tr key={t.planet}
                        onClick={() => setSelectedTransit(isSel ? null : t.planet as TransitGraha)}
                        className={`cursor-pointer transition-colors ${isSel ? 'bg-brand-maroon/10' : 'hover:bg-elevated/20'}`}>
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

/* ---------- Transit Focus Panel ---------- */

interface TransitFocusPanelProps {
  transit: PlanetPosition;
  houseFromLagna: number;
  bindu: number | null;
  aspectedNatals: Array<{ planet: PlanetName; house: number }>;
  sadeSati: boolean;
  satFromMoon: number;
  depth: Depth;
}

function TransitFocusPanel({ transit, houseFromLagna, bindu, aspectedNatals, sadeSati, satFromMoon, depth }: TransitFocusPanelProps) {
  const binduLabel = bindu != null
    ? bindu >= 5 ? 'Very favorable' : bindu >= 4 ? 'Favorable' : bindu >= 3 ? 'Moderate' : bindu >= 2 ? 'Constrained' : 'Weak'
    : null;
  const binduColor = bindu != null
    ? bindu >= 4 ? 'text-semantic-positive' : bindu >= 3 ? 'text-brand-gold' : 'text-semantic-negative'
    : '';

  return (
    <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: `hsl(var(--planet-${transit.planet}))` }} />
        <span className="font-display text-h3 capitalize text-text-primary">{PLANET_LABELS[transit.planet].full}</span>
        <span className="font-deva text-sm text-text-tertiary">{PLANET_LABELS[transit.planet].deva}</span>
        <span className="ml-auto text-xs font-mono text-text-tertiary">Transit {transit.signName} · H{houseFromLagna}</span>
      </div>

      {/* House & Bindu */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-sm border border-hairline-subtle bg-elevated/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary">Natal House Transited</div>
          <div className="mt-1 font-display text-h2 text-text-primary">H{houseFromLagna}</div>
          <div className="mt-0.5 text-xs text-text-secondary">{transit.signName} ({transit.signDegree.toFixed(1)}°)</div>
        </div>
        {bindu != null && (
          <div className="rounded-sm border border-hairline-subtle bg-elevated/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary">Bindu Strength (BAV)</div>
            <div className={`mt-1 font-display text-h2 ${binduColor}`}>{bindu}/8</div>
            <div className="mt-0.5 text-xs text-text-secondary">{binduLabel}</div>
          </div>
        )}
      </div>

      {/* Aspect arrows */}
      {aspectedNatals.length > 0 && (
        <div>
          <div className="text-eyebrow text-text-tertiary mb-2">Aspect Arrows ({ASPECT_LABEL[transit.planet as Graha]} drishti)</div>
          <div className="flex flex-wrap gap-2">
            {aspectedNatals.map(({ planet, house }) => (
              <div key={planet} className="inline-flex items-center gap-1.5 rounded-sm border border-planet-mercury/30 bg-planet-mercury/5 px-2.5 py-1.5">
                <span className="text-brand-saffron">→</span>
                <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${planet}))` }} />
                <span className="text-xs font-medium capitalize text-text-primary">{PLANET_LABELS[planet].full}</span>
                <span className="text-xs text-text-tertiary">(H{house})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sade Sati */}
      {sadeSati && (
        <div className="rounded-sm border border-brand-maroon/30 bg-brand-maroon/5 p-3">
          <div className="font-medium text-brand-maroon text-sm">Sade Sati Active</div>
          <p className="mt-1 text-xs text-text-secondary">Saturn transits H{satFromMoon} from natal Moon — within the 7.5-year cycle of karmic restructuring.</p>
        </div>
      )}

      {/* Plain-language explanation */}
      <div className="text-sm text-text-secondary">
        <p>
          <span className="capitalize font-medium text-text-primary">{PLANET_LABELS[transit.planet].full}</span> transits H{houseFromLagna}
          {bindu != null && ` with ${bindu} bindus`}
          {bindu != null && bindu >= 4 && ' \u2014 favorable conditions for this house\u2019s matters'}
          {bindu != null && bindu < 3 && ' \u2014 constraint on this house\u2019s significations'}
          {aspectedNatals.length > 0 && `; aspects ${aspectedNatals.map(a => PLANET_LABELS[a.planet].full).join(', ')}`}
          {aspectedNatals.length > 0 && ' → activating their natal themes'}.
        </p>
      </div>

      {/* Math Proof */}
      {depth === 'math' && (
        <div className="rounded-sm bg-elevated/50 p-3 text-xs space-y-2">
          <div className="text-eyebrow text-text-tertiary">Math Proof — Ashtakavarga Transit Rule</div>
          <div className="text-text-secondary space-y-1">
            <p>Bhinnashtakavarga (BAV) assigns 0 or 1 bindu per contributor (8 sources: 7 planets + Lagna) for each of the 12 houses from a planet.</p>
            <p className="font-mono">bindu[{transit.planet}][H{houseFromLagna}] = {bindu ?? '?'}/8</p>
            <p className="mt-1">Transit strength convention:</p>
            <p className="font-mono">≥ 4 bindus → favorable (auspicious transit)</p>
            <p className="font-mono">3 bindus → moderate (mixed results)</p>
            <p className="font-mono">≤ 2 bindus → constrained (challenging transit)</p>
            {aspectedNatals.length > 0 && (
              <>
                <p className="mt-2">Graha drishti from transit position (H{houseFromLagna}):</p>
                <p className="font-mono">{aspectOffsets(transit.planet as Graha).map(o => `H${houseFromLagna}+${o+1}th → H${((houseFromLagna - 1 + o) % 12) + 1}`).join('  ·  ')}</p>
              </>
            )}
          </div>
          <div className="mt-2 text-text-muted italic">
            Ref: Brihat Parashara Hora Shastra (BPHS), Ch. 48 — Ashtakavarga; and Varahamihira's Brihat Jataka.
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Headline card ---------- */

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
