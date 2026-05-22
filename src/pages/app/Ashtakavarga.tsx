import { Link, useParams } from 'react-router-dom';
import { useKundli } from '@/hooks/useKundli';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SIGN_NAMES, SIGN_NAMES_DEVA, PLANET_LABELS, type PlanetName } from '@/lib/astro/types';

const BHINNA_PLANETS: PlanetName[] = ['sun','moon','mars','mercury','jupiter','venus','saturn'];

function heat(value: number, max: number) {
  const t = Math.min(1, Math.max(0, value / max));
  // Map 0..1 → muted ivory → saffron → maroon
  const alpha = 0.08 + t * 0.55;
  return { background: `hsl(var(--brand-saffron) / ${alpha})` };
}

export default function Ashtakavarga() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);

  if (isLoading || !data) {
    return <div className="mx-auto max-w-7xl px-6 py-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" /></div>;
  }

  const { bhinna, sarva } = data.ashtakavarga;
  const sarvaMax = Math.max(...sarva);
  const bhinnaMax = 8;

  const totalSarva = sarva.reduce((a, b) => a + b, 0);
  const strongest = sarva.indexOf(Math.max(...sarva));
  const weakest = sarva.indexOf(Math.min(...sarva));

  // Ascendant details for dynamic house matching
  const ascSignNum = data.ascendant.signNumber || 1;
  const getHouseNum = (signIdx: number) => {
    return ((signIdx + 1 - ascSignNum + 12) % 12) + 1;
  };
  const getSignIdxForHouse = (houseNum: number) => {
    return (ascSignNum - 1 + houseNum - 1) % 12;
  };

  const strongestHouseNum = getHouseNum(strongest);
  const weakestHouseNum = getHouseNum(weakest);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Bindu Mathematics · Strength of bhavas</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Ashtakavarga</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        The Ashtakavarga system distils each planet's contribution to every sign into bindu (point) counts. The Sarvashtakavarga aggregates all seven planets, indicating which bhavas hold latent strength.
      </p>

      {/* Summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Total Sarva" value={String(totalSarva)} sub="Out of 337 maximum" />
        <Stat label="Strongest house" value={SIGN_NAMES[strongest]} sub={`${sarva[strongest]} bindus · House ${strongestHouseNum}`} />
        <Stat label="Weakest house" value={SIGN_NAMES[weakest]} sub={`${sarva[weakest]} bindus · House ${weakestHouseNum}`} />
      </div>

      {/* Sarva heatmap */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-h2 text-text-primary">Sarvashtakavarga</h2>
          <div className="text-xs text-text-tertiary">Heat = relative strength across the zodiac</div>
        </div>
        <div className="overflow-hidden rounded-md border border-hairline-subtle bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
              <tr>
                <th className="px-3 py-2">House</th>
                <th className="px-3 py-2">Sign</th>
                <th className="px-3 py-2 text-right">Bindus</th>
                <th className="px-3 py-2">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-subtle">
              {Array.from({ length: 12 }).map((_, hIdx) => {
                const houseNum = hIdx + 1;
                const signIdx = getSignIdxForHouse(houseNum);
                const b = sarva[signIdx];
                const isLagna = houseNum === 1;
                return (
                  <tr key={houseNum} style={heat(b, sarvaMax)} className={isLagna ? 'bg-brand-saffron/[0.03] border-y border-brand-saffron/20' : ''}>
                    <td className="px-3 py-2.5 font-mono text-text-primary">
                      <span className="flex items-center gap-1.5">
                        <span>H{houseNum}</span>
                        {isLagna && (
                          <span className="rounded bg-brand-saffron/10 px-1 py-0.5 text-[9px] font-bold text-brand-saffron uppercase tracking-wider">
                            Lagna
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-text-primary ${isLagna ? 'font-semibold' : ''}`}>{SIGN_NAMES[signIdx]}</span>
                      <span className="ml-2 font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[signIdx]}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-primary">{b}</td>
                    <td className="px-3 py-2.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                        <div className="h-full bg-brand-maroon" style={{ width: `${(b / sarvaMax) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bhinna grid */}
      <section className="mt-12">
        <h2 className="font-display text-h2 text-text-primary">Bhinnashtakavarga</h2>
        <p className="mt-1 text-sm text-text-tertiary">Bindus contributed by each planet to each sign (max 8).</p>
        <div className="mt-4 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wide text-text-tertiary">
              <tr>
                <th className="px-3 py-2 text-left">Planet</th>
                {SIGN_NAMES.map((s, i) => {
                  const houseNum = getHouseNum(i);
                  const isLagna = houseNum === 1;
                  return (
                    <th key={i} className={`px-1 py-2 text-center font-medium ${isLagna ? 'bg-brand-saffron/10 border-x border-brand-saffron/20 rounded-t-sm' : ''}`}>
                      <div className={`text-xs ${isLagna ? 'text-brand-saffron font-bold' : 'text-text-primary'}`}>{s.slice(0, 3)}</div>
                      <div className={`font-mono text-[10px] ${isLagna ? 'text-brand-saffron font-bold' : 'text-text-tertiary'}`}>
                        {isLagna ? 'Lagna' : `H${houseNum}`}
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-2 text-right">Σ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-subtle">
              {BHINNA_PLANETS.map((p) => {
                const row = bhinna[p] ?? [];
                const sum = row.reduce((a, b) => a + b, 0);
                return (
                  <tr key={p}>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="font-mono text-xs" style={{ color: `hsl(var(--planet-${p}))` }}>{PLANET_LABELS[p].short}</span>
                      <span className="ml-2 text-text-primary">{PLANET_LABELS[p].full}</span>
                    </td>
                    {row.map((v, i) => {
                      const houseNum = getHouseNum(i);
                      const isLagna = houseNum === 1;
                      return (
                        <td key={i} className={`px-1 py-1 text-center font-mono ${isLagna ? 'bg-brand-saffron/[0.02] border-x border-brand-saffron/10' : ''}`}>
                          <div className="mx-auto inline-block h-7 w-7 rounded-sm leading-7" style={heat(v, bhinnaMax)}>
                            <span className="text-text-primary">{v}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-right font-mono text-text-primary">{sum}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-xs text-text-muted">
        Reference: Brihat Parashara Hora Sastra, Adhyaya 66 (Ashtakavargadhyaya). Bindu thresholds &gt;30 in Sarva indicate auspicious bhavas; &lt;25 require remedial attention.
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
      <div className="text-eyebrow text-text-tertiary">{label}</div>
      <div className="mt-1 font-display text-h2 text-text-primary">{value}</div>
      {sub && <div className="font-mono text-xs text-text-tertiary">{sub}</div>}
    </div>
  );
}