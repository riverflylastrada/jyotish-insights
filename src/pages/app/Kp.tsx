import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import type { KpData, KpHouseSignificatorData } from '@/lib/astro/types';
import { SIGN_LORDS, signOfHouse } from '@/lib/astro/dashaUtils';
import type { Depth } from '@/components/research/InteractiveVargaView';

type Graha = Exclude<import('@/lib/astro/types').PlanetName, 'ascendant'>;

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">
      Recalculate this chart to generate {label}.
    </div>
  );
}

/* Depth toggle copied from InteractiveVargaView (Phase 3b) */
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

/** Resolve which houses a planet owns given the lagna sign. */
function housesOwnedBy(planet: string, ascSign: number): number[] {
  const p = planet.toLowerCase() as Graha;
  const houses: number[] = [];
  for (let h = 1; h <= 12; h++) {
    if (SIGN_LORDS[signOfHouse(ascSign, h)] === p) houses.push(h);
  }
  return houses;
}

/** Given planets in chart, find which house a planet occupies. */
function houseOf(planet: string, planets: Array<{ planet: string; houseNumber: number }>): number | null {
  const found = planets.find((p) => p.planet.toLowerCase() === planet.toLowerCase());
  return found?.houseNumber ?? null;
}

export default function Kp() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);
  const [depth, setDepth] = useState<Depth>('explain');
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [selectedCusp, setSelectedCusp] = useState<number | null>(null);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const kp = data.kp;
  const natal = data.divisionalCharts.find(c => c.varga === 'D1');
  const ascSign = natal?.ascendantSign ?? 1;
  const planets = natal?.planets ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Krishnamurti Paddhati</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">KP System</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Sub-lord based prediction system. Tap a planet to trace its sub-lord chain, or tap a house to see 4-fold significator derivation.
      </p>

      {!kp ? (
        <div className="mt-8"><EmptyState label="KP data" /></div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Depth toggle */}
          <DepthToggle depth={depth} onSetDepth={setDepth} />

          {/* Planet Sub-Lords — tappable */}
          <PlanetSubLords
            data={kp.planetSubLords}
            ascSign={ascSign}
            planets={planets}
            selectedPlanet={selectedPlanet}
            onSelect={setSelectedPlanet}
            depth={depth}
          />

          {kp.rulingPlanets && <RulingPlanets data={kp.rulingPlanets} />}

          {/* Cuspal sub-lords — tappable */}
          {kp.cuspalSubLords && kp.cuspalSubLords.length > 0 && (
            <CuspalSubLords
              data={kp.cuspalSubLords}
              ascSign={ascSign}
              planets={planets}
              selectedCusp={selectedCusp}
              onSelect={setSelectedCusp}
              depth={depth}
            />
          )}

          {/* House Significators — tappable */}
          {kp.houseSignificators && kp.houseSignificators.length > 0 && (
            <HouseSignificators
              data={kp.houseSignificators}
              selectedHouse={selectedHouse}
              onSelect={setSelectedHouse}
              depth={depth}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Planet Sub-Lords ---------- */

interface PlanetSubLordsProps {
  data: KpData['planetSubLords'];
  ascSign: number;
  planets: Array<{ planet: string; houseNumber: number }>;
  selectedPlanet: string | null;
  onSelect: (p: string | null) => void;
  depth: Depth;
}

function PlanetSubLords({ data, ascSign, planets, selectedPlanet, onSelect, depth }: PlanetSubLordsProps) {
  const sel = selectedPlanet ? data.find((r) => r.planet.toLowerCase() === selectedPlanet.toLowerCase()) : null;

  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">Planet Sub-Lords</h2>
      <p className="mb-3 text-xs text-text-tertiary">Tap a row to trace the sub-lord chain.</p>
      <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">Planet</th>
              <th className="px-4 py-2 font-medium">Sign Lord</th>
              <th className="px-4 py-2 font-medium">Star Lord</th>
              <th className="px-4 py-2 font-medium">Sub Lord</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {data.map((r) => {
              const isSel = selectedPlanet?.toLowerCase() === r.planet.toLowerCase();
              return (
                <tr key={r.planet}
                  onClick={() => onSelect(isSel ? null : r.planet)}
                  className={`cursor-pointer transition-colors ${isSel ? 'bg-brand-maroon/10' : 'hover:bg-elevated/30'}`}>
                  <td className="px-4 py-2 font-display capitalize text-text-primary">{r.planet}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.signLord}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.starLord}</td>
                  <td className="px-4 py-2 font-mono text-xs text-brand-saffron">{r.subLord}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sub-lord chain panel */}
      {sel && depth !== 'visual' && (
        <SubLordChainPanel
          row={sel}
          ascSign={ascSign}
          planets={planets}
          depth={depth}
        />
      )}
    </section>
  );
}

/* ---------- Sub-lord chain panel ---------- */

function SubLordChainPanel({
  row,
  ascSign,
  planets,
  depth,
}: {
  row: KpData['planetSubLords'][number];
  ascSign: number;
  planets: Array<{ planet: string; houseNumber: number }>;
  depth: Depth;
}) {
  const chain = [
    { label: 'Sign Lord', lord: row.signLord },
    { label: 'Star Lord', lord: row.starLord },
    { label: 'Sub Lord', lord: row.subLord },
  ];

  return (
    <div className="mt-4 rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-4">
      <div className="text-eyebrow text-text-tertiary">Sub-Lord Chain for <span className="capitalize text-text-primary">{row.planet}</span></div>

      {/* Arrow chain visualization */}
      <div className="flex items-center gap-2 flex-wrap">
        {chain.map((node, i) => {
          const owned = housesOwnedBy(node.lord, ascSign);
          const placed = houseOf(node.lord, planets);
          return (
            <div key={node.label} className="flex items-center gap-2">
              {i > 0 && <span className="text-brand-saffron font-bold">→</span>}
              <div className="rounded-sm border border-hairline-subtle bg-elevated px-3 py-2 text-center min-w-[80px]">
                <div className="text-[10px] uppercase tracking-wider text-text-tertiary">{node.label}</div>
                <div className="mt-0.5 font-display text-sm capitalize text-text-primary">{node.lord}</div>
                <div className="mt-1 font-mono text-[10px] text-text-secondary">
                  {owned.length > 0 ? `Rules H${owned.join(',')}` : 'Node'}
                  {placed ? ` · In H${placed}` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explain */}
      <div className="text-sm text-text-secondary space-y-1">
        {chain.map((node) => {
          const owned = housesOwnedBy(node.lord, ascSign);
          const placed = houseOf(node.lord, planets);
          return (
            <p key={node.label}>
              <span className="font-medium text-brand-saffron">{node.label} ({node.lord})</span>
              {owned.length > 0 ? ` rules H${owned.join(' & ')}` : ' (node — acts for conjunct lords)'}
              {placed ? ` and is placed in H${placed}.` : '.'}
            </p>
          );
        })}
      </div>

      {/* Math Proof */}
      {depth === 'math' && (
        <div className="rounded-sm bg-elevated/50 p-3 text-xs space-y-2">
          <div className="text-eyebrow text-text-tertiary">Math Proof — KP Sub-Lord Theory</div>
          <div className="text-text-secondary">
            <p className="font-medium">249-segment sub-lord system:</p>
            <p className="mt-1">Each of the 27 nakshatras (13°20′ arc) is subdivided into 9 unequal sub-divisions proportional to Vimshottari dasha years (Ke:7, Ve:20, Su:6, Mo:10, Ma:7, Ra:18, Ju:16, Sa:19, Me:17 = 120 total).</p>
            <p className="mt-1">Sub-lord arc for lord L within star S = (13°20′) × (L_years / 120).</p>
            <p className="mt-1">27 stars × ~9.22 subs/star ≈ 249 total sub-lord segments across the zodiac.</p>
          </div>
          <div className="mt-2 text-text-muted italic">
            Ref: K.S. Krishnamurti, KP Reader I–VI (Mahabala Publishers). The sub-lord's signification determines the YES/NO outcome for any house matter.
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Ruling Planets ---------- */

function RulingPlanets({ data }: { data: NonNullable<KpData['rulingPlanets']> }) {
  const items: Array<[string, string]> = [
    ['Asc Sign Lord', data.ascSignLord],
    ['Asc Star Lord', data.ascStarLord],
    ['Moon Sign Lord', data.moonSignLord],
    ['Moon Star Lord', data.moonStarLord],
    ['Day Lord', data.dayLord],
  ];
  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">Ruling Planets</h2>
      <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map(([k, v]) => (
            <div key={k}>
              <div className="text-eyebrow text-text-tertiary">{k}</div>
              <div className="mt-1 font-display text-h3 capitalize text-text-primary">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Cuspal Sub-Lords — tappable ---------- */

interface CuspalSubLordsProps {
  data: NonNullable<KpData['cuspalSubLords']>;
  ascSign: number;
  planets: Array<{ planet: string; houseNumber: number }>;
  selectedCusp: number | null;
  onSelect: (c: number | null) => void;
  depth: Depth;
}

function CuspalSubLords({ data, ascSign, planets, selectedCusp, onSelect, depth }: CuspalSubLordsProps) {
  const sel = selectedCusp != null ? data.find((r) => r.cusp === selectedCusp) : null;

  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">Cuspal Sub-Lords</h2>
      <p className="mb-3 text-xs text-text-tertiary">Tap a cusp to see its sub-lord's significations and the KP YES/NO verdict driver.</p>
      <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">Cusp</th>
              <th className="px-4 py-2 text-right font-medium">Longitude</th>
              <th className="px-4 py-2 font-medium">Sign Lord</th>
              <th className="px-4 py-2 font-medium">Star Lord</th>
              <th className="px-4 py-2 font-medium">Sub Lord</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {data.map((r) => {
              const isSel = selectedCusp === r.cusp;
              return (
                <tr key={r.cusp}
                  onClick={() => onSelect(isSel ? null : r.cusp)}
                  className={`cursor-pointer transition-colors ${isSel ? 'bg-brand-maroon/10' : 'hover:bg-elevated/30'}`}>
                  <td className="px-4 py-2 font-mono text-text-primary">H{r.cusp}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-text-tertiary">{r.longitude.toFixed(2)}°</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.signLord}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.starLord}</td>
                  <td className="px-4 py-2 font-mono text-xs text-brand-saffron">{r.subLord}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cusp sub-lord signification panel */}
      {sel && depth !== 'visual' && (
        <div className="mt-4 rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-3">
          <div className="text-eyebrow text-text-tertiary">Cusp {sel.cusp} Sub-Lord: <span className="capitalize text-brand-saffron">{sel.subLord}</span></div>
          {(() => {
            const owned = housesOwnedBy(sel.subLord, ascSign);
            const placed = houseOf(sel.subLord, planets);
            return (
              <>
                <div className="text-sm text-text-secondary">
                  <p><span className="font-medium text-text-primary capitalize">{sel.subLord}</span>{owned.length > 0 ? ` owns H${owned.join(' & ')}` : ' (node)'}{placed ? ` and occupies H${placed}` : ''}.</p>
                  <p className="mt-1">As cuspal sub-lord of H{sel.cusp}, this planet's house connections determine whether H{sel.cusp} matters (marriage, career, etc.) will manifest positively.</p>
                  <p className="mt-1 text-text-tertiary">If the sub-lord signifies houses supporting H{sel.cusp} → <span className="text-semantic-positive font-medium">YES</span>; if it signifies negating houses → <span className="text-semantic-negative font-medium">NO</span>.</p>
                </div>
                {depth === 'math' && (
                  <div className="rounded-sm bg-elevated/50 p-3 text-xs space-y-2">
                    <div className="text-eyebrow text-text-tertiary">KP Horary Verdict Rule</div>
                    <div className="text-text-secondary">
                      <p>For any house matter (e.g. "Will I marry?" → H7):</p>
                      <p className="mt-1 font-mono">verdict = significations(cuspalSubLord[house]) ∩ supporting_houses ≠ ∅ ? YES : NO</p>
                      <p className="mt-1">Supporting houses for H{sel.cusp}: typically H{sel.cusp} itself + its trinal/kendra associates.</p>
                      <p className="mt-1">Negating houses: 6th/8th/12th from H{sel.cusp}.</p>
                    </div>
                    <div className="mt-2 text-text-muted italic">
                      Ref: K.S. Krishnamurti, KP Reader IV — Horary Astrology, Ch. 3.
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
}

/* ---------- House Significators — tappable 4-fold derivation ---------- */

interface HouseSignificatorsProps {
  data: NonNullable<KpData['houseSignificators']>;
  selectedHouse: number | null;
  onSelect: (h: number | null) => void;
  depth: Depth;
}

function HouseSignificators({ data, selectedHouse, onSelect, depth }: HouseSignificatorsProps) {
  const levelStyles: Record<'A' | 'B' | 'C' | 'D', string> = {
    A: 'bg-semantic-positive/15 text-semantic-positive border-semantic-positive/30',
    B: 'bg-brand-saffron/15 text-brand-saffron border-brand-saffron/30',
    C: 'bg-brand-gold/15 text-brand-gold border-brand-gold/30',
    D: 'bg-elevated text-text-tertiary border-hairline-subtle',
  };

  const renderLevel = (label: 'A' | 'B' | 'C' | 'D', planets: string[]) => (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Lvl {label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {planets.length === 0 ? <span className="text-xs text-text-muted">—</span> : planets.map((p) => (
          <span key={p} className={`rounded-sm border px-1.5 py-0.5 font-mono text-[11px] capitalize ${levelStyles[label]}`}>{p}</span>
        ))}
      </div>
    </div>
  );

  const sel: KpHouseSignificatorData | undefined = selectedHouse != null ? data.find((h) => h.house === selectedHouse) : undefined;

  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">House Significators</h2>
      <p className="mb-3 text-xs text-text-tertiary">Tap a house to see how the 4-fold significator levels (A→D) were derived.</p>
      <div className="space-y-3">
        {data.map((h) => {
          const isSel = selectedHouse === h.house;
          return (
            <div key={h.house}
              onClick={() => onSelect(isSel ? null : h.house)}
              className={`rounded-md border p-4 shadow-sm cursor-pointer transition-colors ${isSel ? 'border-brand-maroon/50 bg-brand-maroon/5' : 'border-hairline-subtle bg-surface hover:border-brand-maroon/30'}`}>
              <div className="flex items-center justify-between">
                <div className="font-display text-h3 text-text-primary">House {h.house}</div>
                {h.nodesActingFor.length > 0 && (
                  <div className="text-xs text-text-tertiary">
                    Nodes acting for: <span className="font-mono capitalize text-brand-saffron">{h.nodesActingFor.join(', ')}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {renderLevel('A', h.levelA)}
                {renderLevel('B', h.levelB)}
                {renderLevel('C', h.levelC)}
                {renderLevel('D', h.levelD)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4-fold derivation panel */}
      {sel && depth !== 'visual' && (
        <FourFoldDerivation house={sel} depth={depth} />
      )}
    </section>
  );
}

/* ---------- 4-Fold Derivation Panel ---------- */

function FourFoldDerivation({ house, depth }: { house: KpHouseSignificatorData; depth: Depth }) {
  return (
    <div className="mt-4 rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-4">
      <div className="text-eyebrow text-text-tertiary">4-Fold Significator Derivation — House {house.house}</div>

      <div className="space-y-3 text-sm text-text-secondary">
        <div className="rounded-sm border border-semantic-positive/20 bg-semantic-positive/5 p-3">
          <div className="font-medium text-semantic-positive">Level A — Occupants of H{house.house}</div>
          <p className="mt-1">Planets physically occupying House {house.house}. These are the strongest significators.</p>
          <div className="mt-2 font-mono text-xs capitalize">{house.levelA.length > 0 ? house.levelA.join(', ') : '(none)'}</div>
        </div>

        <div className="rounded-sm border border-brand-saffron/20 bg-brand-saffron/5 p-3">
          <div className="font-medium text-brand-saffron">Level B — Star-lords of Level A occupants</div>
          <p className="mt-1">The nakshatra lords (star-lords) of the planets in Level A. Their energy channels through the occupants.</p>
          <div className="mt-2 font-mono text-xs capitalize">{house.levelB.length > 0 ? house.levelB.join(', ') : '(none)'}</div>
        </div>

        <div className="rounded-sm border border-brand-gold/20 bg-brand-gold/5 p-3">
          <div className="font-medium text-brand-gold">Level C — Lord of H{house.house}</div>
          <p className="mt-1">The sign-lord (owner) of House {house.house}. Ownership gives secondary control.</p>
          <div className="mt-2 font-mono text-xs capitalize">{house.levelC.length > 0 ? house.levelC.join(', ') : '(none)'}</div>
        </div>

        <div className="rounded-sm border border-hairline-subtle bg-elevated/30 p-3">
          <div className="font-medium text-text-tertiary">Level D — Star-lords of Level C lord</div>
          <p className="mt-1">The nakshatra lords of the house-lord. Weakest significators but still operative.</p>
          <div className="mt-2 font-mono text-xs capitalize">{house.levelD.length > 0 ? house.levelD.join(', ') : '(none)'}</div>
        </div>

        {house.nodesActingFor.length > 0 && (
          <div className="rounded-sm border border-brand-saffron/30 bg-brand-saffron/5 p-3">
            <div className="font-medium text-brand-saffron">Rahu/Ketu Agency</div>
            <p className="mt-1">Nodes (Rahu/Ketu) act as proxies for planets they conjoin or whose stars they occupy. Here: <span className="font-mono capitalize">{house.nodesActingFor.join(', ')}</span></p>
          </div>
        )}
      </div>

      {/* Math Proof */}
      {depth === 'math' && (
        <div className="rounded-sm bg-elevated/50 p-3 text-xs space-y-2">
          <div className="text-eyebrow text-text-tertiary">Math Proof — 4-Fold Derivation Rules</div>
          <div className="text-text-secondary space-y-1">
            <p><code className="font-mono">A = occupants(H{house.house})</code> — planets in the house (strongest)</p>
            <p><code className="font-mono">B = starLordsOf(A)</code> — nakshatra lords of occupants</p>
            <p><code className="font-mono">C = signLord(H{house.house})</code> — owner of the sign on cusp</p>
            <p><code className="font-mono">D = starLordsOf(C)</code> — nakshatra lords of the owner</p>
            <p className="mt-2"><code className="font-mono">nodesActingFor:</code> Rahu/Ketu conjunct or in star of a Level A/C planet inherit that planet's signification.</p>
          </div>
          <div className="mt-2 text-text-muted italic">
            Ref: K.S. Krishnamurti, KP Reader II–III — Significator classification; Sagar Publications.
          </div>
        </div>
      )}
    </div>
  );
}
