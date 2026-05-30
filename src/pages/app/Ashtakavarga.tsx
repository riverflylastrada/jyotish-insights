import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useKundli } from '@/hooks/useKundli';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SIGN_NAMES, SIGN_NAMES_DEVA, PLANET_LABELS, type PlanetName, type HouseAttribution } from '@/lib/astro/types';

type Depth = 'visual' | 'explain' | 'math';

const BHINNA_PLANETS: PlanetName[] = ['sun','moon','mars','mercury','jupiter','venus','saturn'];

function heat(value: number, max: number) {
  const t = Math.min(1, Math.max(0, value / max));
  const alpha = 0.08 + t * 0.55;
  return { background: `hsl(var(--brand-saffron) / ${alpha})` };
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function Ashtakavarga() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetName | null>(null);
  const [depth, setDepth] = useState<Depth>('visual');

  if (isLoading || !data) {
    return <div className="mx-auto max-w-7xl px-6 py-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" /></div>;
  }

  const { bhinna, sarva, attribution } = data.ashtakavarga;
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

  // Selected house data
  const selectedSignIdx = selectedHouse !== null ? getSignIdxForHouse(selectedHouse) : null;
  const selectedSarvaBindu = selectedSignIdx !== null ? sarva[selectedSignIdx] : null;

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

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        {/* Left column: tables */}
        <div className="lg:col-span-7 space-y-10">
          {/* Sarva heatmap */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-h2 text-text-primary">Sarvashtakavarga</h2>
              <div className="text-xs text-text-tertiary">Tap a row to explore</div>
            </div>
            <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
              <table className="w-full min-w-[480px] text-sm">
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
                    const isSelected = selectedHouse === houseNum;
                    return (
                      <tr
                        key={houseNum}
                        style={heat(b, sarvaMax)}
                        className={`cursor-pointer transition-colors ${isLagna ? 'bg-brand-saffron/[0.03] border-y border-brand-saffron/20' : ''} ${isSelected ? 'ring-2 ring-inset ring-brand-maroon' : 'hover:brightness-95'}`}
                        onClick={() => { setSelectedHouse(isSelected ? null : houseNum); setSelectedPlanet(null); }}
                      >
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
          <section>
            <h2 className="font-display text-h2 text-text-primary">Bhinnashtakavarga</h2>
            <p className="mt-1 text-sm text-text-tertiary">Bindus contributed by each planet to each sign (max 8). Tap a cell to focus that house.</p>
            <div className="mt-4 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-elevated text-xs uppercase tracking-wide text-text-tertiary">
                  <tr>
                    <th className="px-3 py-2 text-left">Planet</th>
                    {SIGN_NAMES.map((s, i) => {
                      const houseNum = getHouseNum(i);
                      const isLagna = houseNum === 1;
                      const isColSelected = selectedHouse === houseNum;
                      return (
                        <th
                          key={i}
                          className={`px-1 py-2 text-center font-medium cursor-pointer transition-colors ${isLagna ? 'bg-brand-saffron/10 border-x border-brand-saffron/20 rounded-t-sm' : ''} ${isColSelected ? 'bg-brand-maroon/10' : ''}`}
                          onClick={() => { setSelectedHouse(isColSelected ? null : houseNum); setSelectedPlanet(null); }}
                        >
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
                          const isColSelected = selectedHouse === houseNum;
                          return (
                            <td
                              key={i}
                              className={`px-1 py-1 text-center font-mono cursor-pointer ${isLagna ? 'bg-brand-saffron/[0.02] border-x border-brand-saffron/10' : ''} ${isColSelected ? 'bg-brand-maroon/5' : ''} ${selectedPlanet === p && selectedHouse === houseNum ? 'ring-2 ring-inset ring-brand-maroon' : ''}`}
                              onClick={() => { setSelectedHouse(isColSelected && selectedPlanet === p ? null : houseNum); setSelectedPlanet(isColSelected && selectedPlanet === p ? null : p); }}
                            >
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
        </div>

        {/* Right column: focus panel */}
        <aside className="lg:col-span-5 space-y-4">
          {/* Depth toggle */}
          <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
            {([['visual', '👁️ Visual'], ['explain', '👆 Explain'], ['math', '🔬 Math Proof']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setDepth(k)}
                className={`flex-1 rounded-sm px-3 py-1.5 transition-colors ${depth === k ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary hover:text-text-primary'}`}>
                {label}
              </button>
            ))}
          </div>

          {selectedHouse === null ? (
            <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-8 text-center text-sm text-text-tertiary">
              Tap a house row or column to explore its planet-wise bindu contributions.
            </div>
          ) : (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-h3 text-text-primary">
                    House {selectedHouse} — {SIGN_NAMES[selectedSignIdx!]}
                  </span>
                  <span className="font-deva text-sm text-text-tertiary">{SIGN_NAMES_DEVA[selectedSignIdx!]}</span>
                </div>
                <div className="mt-1 font-mono text-xs text-text-tertiary">
                  Sarva bindus: <span className={`font-semibold ${selectedSarvaBindu! >= 30 ? 'text-semantic-positive' : selectedSarvaBindu! < 25 ? 'text-semantic-negative' : 'text-text-primary'}`}>{selectedSarvaBindu}</span>
                  <span className="ml-2">
                    {selectedSarvaBindu! >= 30 ? '— Favorable (≥30)' : selectedSarvaBindu! < 25 ? '— Constrained (<25)' : '— Moderate'}
                  </span>
                </div>
              </div>

              {/* Attribution drill-down (when a bhinna cell is selected) */}
              {(() => {
                const attrForPlanet: HouseAttribution[] | undefined =
                  selectedPlanet && attribution ? attribution[selectedPlanet] : undefined;
                const houseAttr = attrForPlanet && selectedSignIdx !== null
                  ? attrForPlanet[selectedSignIdx]
                  : undefined;

                if (selectedPlanet && houseAttr && houseAttr.contributingPositions.length > 0) {
                  const binduCount = houseAttr.contributingPositions.length;
                  return (
                    <div className="space-y-2">
                      <div className="text-eyebrow text-text-tertiary">
                        <span style={{ color: `hsl(var(--planet-${selectedPlanet}))` }} className="font-semibold capitalize">
                          {PLANET_LABELS[selectedPlanet].full}
                        </span>
                        {' '}— {binduCount} bindu{binduCount !== 1 ? 's' : ''} in House {selectedHouse}
                      </div>
                      <div className="space-y-1.5">
                        {houseAttr.contributingPositions.map((cp, idx) => (
                          <div key={idx} className="flex items-start gap-2 rounded-sm bg-elevated/40 px-3 py-2 text-xs">
                            <span className="mt-0.5 text-semantic-positive shrink-0">✓</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-text-primary font-medium">{cp.rule}</div>
                              <div className="text-text-tertiary font-mono mt-0.5">
                                {cp.fromReference !== 'lagna' ? PLANET_LABELS[cp.fromReference as PlanetName]?.full ?? cp.fromReference : 'Lagna'}
                                {' '}at {cp.relativeSign}{ordinal(cp.relativeSign)} house
                                <span className="ml-2 italic">{cp.citation}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectedPlanet(null)}
                        className="mt-1 text-xs text-text-tertiary hover:text-text-primary underline underline-offset-2"
                      >
                        ← Back to 7-planet view
                      </button>
                    </div>
                  );
                }

                // Fall back: 7-planet contribution bar chart
                return (
                  <div className="space-y-2">
                    <div className="text-eyebrow text-text-tertiary">
                      7-planet contribution matrix
                      {attribution && <span className="ml-1 text-text-muted">(tap a bindu cell for rule drill-down)</span>}
                    </div>
                    {BHINNA_PLANETS.map((p) => {
                      const row = bhinna[p] ?? [];
                      const v = row[selectedSignIdx!] ?? 0;
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <div className="w-20 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--planet-${p}))` }} />
                            <span className="text-xs text-text-primary capitalize">{PLANET_LABELS[p].full}</span>
                          </div>
                          <div className="relative h-4 flex-1 overflow-hidden rounded-sm border border-hairline-subtle bg-canvas">
                            <div className="absolute inset-y-0 left-0" style={{ width: `${(v / bhinnaMax) * 100}%`, background: `hsl(var(--planet-${p}))`, opacity: 0.7 }} />
                          </div>
                          <span className="w-6 text-right font-mono text-xs text-text-primary">{v}</span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t border-hairline-subtle pt-2 text-xs">
                      <span className="text-text-tertiary">Sum (Sarva)</span>
                      <span className="font-mono text-text-primary font-semibold">{selectedSarvaBindu}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Explain layer */}
              {depth !== 'visual' && (
                <div className="space-y-2 border-t border-hairline-subtle pt-3 text-sm text-text-secondary">
                  {BHINNA_PLANETS.map((p) => {
                    const row = bhinna[p] ?? [];
                    const v = row[selectedSignIdx!] ?? 0;
                    return (
                      <p key={p}>
                        <span style={{ color: `hsl(var(--planet-${p}))` }} className="font-medium capitalize">{PLANET_LABELS[p].full}</span>
                        {' '}contributes <span className="font-mono font-semibold text-text-primary">{v}</span> bindu{v !== 1 ? 's' : ''} to House {selectedHouse} ({SIGN_NAMES[selectedSignIdx!]}).
                        {v >= 5 ? ' Strong support.' : v <= 2 ? ' Minimal contribution.' : ''}
                      </p>
                    );
                  })}
                  <p className="text-text-tertiary text-xs mt-2">
                    Transit-strength convention: Sarva ≥30 is favorable for transits; &lt;25 indicates constrained results.
                  </p>
                </div>
              )}

              {/* Math Proof layer */}
              {depth === 'math' && (
                <div className="space-y-3 rounded-sm bg-elevated/50 p-3 text-xs border-t border-hairline-subtle">
                  <div className="text-eyebrow text-text-tertiary">Math proof</div>

                  <div>
                    <div className="text-text-secondary font-medium">Bhinnashtakavarga rule (BPHS Ch. 48; Sarvachintamani Ch. 6):</div>
                    <div className="mt-1 font-mono text-text-tertiary leading-relaxed">
                      Each of the 7 planets (Sun through Saturn) contributes bindus
                      (0–8) to each of the 12 signs, based on its position relative
                      to the other 6 planets and the Ascendant.
                    </div>
                  </div>

                  <div>
                    <div className="text-text-secondary font-medium">Sarvashtakavarga derivation:</div>
                    <code className="block font-mono text-text-primary mt-1">
                      Sarva(sign) = Σ Bhinna_p(sign) for p ∈ &#123;Su, Mo, Ma, Me, Ju, Ve, Sa&#125;
                    </code>
                    <div className="mt-1 font-mono text-text-tertiary">
                      = {BHINNA_PLANETS.map((p) => {
                        const row = bhinna[p] ?? [];
                        return row[selectedSignIdx!] ?? 0;
                      }).join(' + ')} = {selectedSarvaBindu}
                    </div>
                  </div>

                  <div>
                    <div className="text-text-secondary font-medium">Transit-strength convention:</div>
                    <div className="mt-1 font-mono text-text-tertiary">
                      Sarva ≥ 30 → favorable for transits (auspicious bhava)<br />
                      Sarva &lt; 25 → constrained / remedial attention needed
                    </div>
                  </div>

                  <div className="border-t border-hairline-subtle pt-2">
                    <div className="text-text-secondary font-medium">House {selectedHouse} — {SIGN_NAMES[selectedSignIdx!]}:</div>
                    <table className="mt-1 w-full text-text-tertiary font-mono">
                      <tbody>
                        {BHINNA_PLANETS.map((p) => {
                          const row = bhinna[p] ?? [];
                          const v = row[selectedSignIdx!] ?? 0;
                          return (
                            <tr key={p}>
                              <td className="py-0.5 pr-2" style={{ color: `hsl(var(--planet-${p}))` }}>{PLANET_LABELS[p].short}</td>
                              <td className="py-0.5">{PLANET_LABELS[p].full}</td>
                              <td className="py-0.5 text-right text-text-primary">{v}/8 bindus</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-text-muted italic pt-1">
                    Ref: Brihat Parashara Hora Shastra, Adhyaya 48 (Ashtakavargadhyaya); Sarvachintamani, Ch. 6.
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

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
