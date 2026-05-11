import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { getAstroProvider } from '@/lib/astro/factory';
import { PLANET_LABELS, SIGN_NAMES, type PlanetPosition } from '@/lib/astro/types';

export default function Transits() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const [transits, setTransits] = useState<PlanetPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAstroProvider().getCurrentTransits(0, 0).then((t) => {
      setTransits(t);
      setLoading(false);
    });
  }, []);

  if (isLoading || !data || loading) {
    return <div className="mx-auto max-w-7xl px-6 py-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" /></div>;
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
      <div className="mt-3 text-eyebrow text-brand-saffron">Gochara · Sky vs natal</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Current Transits</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        How today's planetary sky activates the natal chart. Houses are reckoned from the natal Lagna and natal Moon — both perspectives matter in classical Gochara.
      </p>

      {/* Headline cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Headline
          title="Sade Sati"
          tone={sadeSati ? 'warn' : 'calm'}
          value={sadeSati ? 'Active' : 'Inactive'}
          sub={sat ? `Saturn in ${sat.signName} · ${satFromMoon}H from natal Moon` : ''}
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
      <section className="mt-10">
        <h2 className="font-display text-h2 text-text-primary">Planet-by-planet comparison</h2>
        <div className="mt-4 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
              <tr>
                <th className="px-3 py-2">Planet</th>
                <th className="px-3 py-2">Natal sign</th>
                <th className="px-3 py-2">Transit sign</th>
                <th className="px-3 py-2 text-right">Δ houses</th>
                <th className="px-3 py-2 text-right">From Lagna</th>
                <th className="px-3 py-2 text-right">From Moon</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-subtle">
              {transits.map(t => {
                const n = natal.planets.find(p => p.planet === t.planet);
                if (!n) return null;
                const delta = ((t.signNumber - n.signNumber + 12) % 12);
                const hL = houseFromLagna(t.signNumber);
                const hM = houseFromMoon(t.signNumber);
                const note = noteFor(t.planet, hL, hM);
                return (
                  <tr key={t.planet} className="hover:bg-elevated/40">
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs" style={{ color: `hsl(var(--planet-${t.planet}))` }}>{PLANET_LABELS[t.planet].short}</span>
                      <span className="ml-2 text-text-primary">{PLANET_LABELS[t.planet].full}</span>
                    </td>
                    <td className="px-3 py-2.5 text-text-tertiary">{n.signName}</td>
                    <td className="px-3 py-2.5 text-text-primary">{t.signName}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-tertiary">{delta === 0 ? '·' : `+${delta}`}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-secondary">{hL}H</td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-secondary">{hM}H</td>
                    <td className="px-3 py-2.5 text-xs text-text-tertiary">{note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-xs text-text-muted">
        Mock provider: transit positions are illustrative. Real provider will return live ephemeris.
      </p>
    </div>
  );
}

function noteFor(planet: string, hL: number, hM: number): string {
  if (planet === 'saturn' && [12,1,2].includes(hM)) return 'Sade Sati phase';
  if (planet === 'saturn' && [4,8].includes(hM)) return 'Ardhashtama / Ashtama Shani';
  if (planet === 'jupiter' && [1,5,9].includes(hL)) return 'Guru in trikona — auspicious';
  if (planet === 'jupiter' && [4,7,10].includes(hL)) return 'Guru in kendra';
  if (planet === 'rahu' && hL === 1) return 'Rahu over Lagna';
  if (planet === 'mars' && hL === 7) return 'Kuja in 7H from Lagna';
  return '—';
}

function Headline({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone: 'good' | 'warn' | 'calm' }) {
  const map = {
    good: 'border-semantic-positive/40',
    warn: 'border-brand-maroon/40',
    calm: 'border-hairline-subtle',
  } as const;
  return (
    <div className={`rounded-md border bg-surface p-5 shadow-sm ${map[tone]}`}>
      <div className="text-eyebrow text-text-tertiary">{title}</div>
      <div className="mt-1 font-display text-h2 text-text-primary">{value}</div>
      {sub && <div className="font-mono text-xs text-text-tertiary">{sub}</div>}
    </div>
  );
}