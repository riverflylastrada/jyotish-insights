import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { DashaTimeline, type SelectedPeriodInfo } from '@/components/dashas/DashaTimeline';
import { DashaFocusPanel } from '@/components/dashas/DashaFocusPanel';
import type { DashaSystem, DivisionalChart } from '@/lib/astro/types';
import {
  resolveDashaLord,
  nakshatraIndex,
  vimshottariLordForNakshatra,
  VIMSHOTTARI_SEQUENCE,
  YOGINI_SEQUENCE,
  ASHTOTTARI_SEQUENCE,
  NAKSHATRA_NAMES,
} from '@/lib/astro/dashaUtils';

/* ------------------------------------------------------------------ */
/*  System metadata                                                    */
/* ------------------------------------------------------------------ */

const SYSTEM_META: Record<DashaSystem['system'], { label: string; cycle: string; tagline: string; tooltip?: string }> = {
  vimshottari:    { label: 'Vimshottari',                   cycle: '120 year cycle',    tagline: 'Standard nakshatra-based maha-dasha sequence.' },
  yogini:         { label: 'Yogini',                        cycle: '36 year cycle',     tagline: 'Eight yoginis ruling shorter dasha periods.' },
  ashtottari:     { label: 'Ashtottari',                    cycle: '108 year cycle',    tagline: 'Ashtottari maha-dasha sequence used in some lineages.' },
  char:           { label: 'Char',                          cycle: '—',                 tagline: 'Char dasha.' },
  kalachakra:     { label: 'Kalachakra',                    cycle: 'sign-based cycle',  tagline: 'Sign-based dasha using Savya/Apasavya nakshatra-pada groups.' },
  narayana:       { label: 'Narayana (नारायण)',               cycle: 'rasi-based cycle',  tagline: 'Padakrama rasi dasha — zodiacal for odd signs, anti-zodiacal for even (Sanjay Rath / Jaimini Sutra 2.3).' },
  lagna_kendradi: { label: 'Lagna Kendradi (लग्न केन्द्रादि)', cycle: 'rasi-based cycle',  tagline: 'Strength-ordered rasi dasha — kendras first, then panaphara, then apoklima (KN Rao / Jaimini Sutra).' },
  sudasa:         { label: 'Sudasa (सुदशा)',                  cycle: 'rasi-based cycle',  tagline: 'Wealth dasha from the D-2 (Hora) chart — times prosperity periods (Jaimini Sutra Pada 4).' },
  drigdasa:       { label: 'Drigdasa (दृग्दशा)',              cycle: 'rasi-based cycle',  tagline: 'Aspect-based rasi dasha — sequence from Atmakaraka sign via rasi drishtis (Jaimini Sutra Pada 4 / Sanjay Rath).' },
  shoola:         { label: 'Shoola (शूल)',                    cycle: 'rasi-based cycle',  tagline: 'Death/health timing rasi dasha — starts 7th from Atmakaraka for longevity analysis (Phaladeepika Ch. 8 / KN Rao).' },
  dwisaptati:     { label: 'Dwisaptati-sama (द्विसप्तति-सम)',    cycle: '72 year cycle',     tagline: '72-year conditional dasha — 8 lords × 9 years each (BPHS Ch. 47).', tooltip: 'Applicable when Lagna lord is in the 7th house or 7th lord is in Lagna.' },
  shat_trimsa:    { label: 'Shat-trimsa-sama (षट्त्रिंश-सम)',   cycle: '36 year cycle',     tagline: '36-year conditional dasha — 7 lords × ~5.14 years each (BPHS Ch. 47).', tooltip: 'Applicable when Sun is in Lagna, or Sun is AK and in a kendra (1/4/7/10).' },
};

const SYSTEM_ORDER: DashaSystem['system'][] = ['vimshottari', 'yogini', 'ashtottari', 'char', 'kalachakra', 'narayana', 'lagna_kendradi', 'sudasa', 'drigdasa', 'shoola', 'dwisaptati', 'shat_trimsa'];

type Depth = 'visual' | 'explain' | 'math';

/* ------------------------------------------------------------------ */
/*  Math Proof sections per dasha system                               */
/* ------------------------------------------------------------------ */

function VimshottariMathProof({ d1 }: { d1: DivisionalChart }) {
  const moonPos = d1.planets.find((p) => p.planet === 'moon');
  if (!moonPos) return null;

  const nakName = moonPos.nakshatra;
  const nakIdx = nakshatraIndex(nakName);
  const { lord, years } = vimshottariLordForNakshatra(nakIdx);
  const nakshatraDeg = 360 / 27; // 13.3333°
  const moonLongInNak = moonPos.longitude % nakshatraDeg;
  const fractionTraversed = moonLongInNak / nakshatraDeg;
  const balanceYears = (1 - fractionTraversed) * years;

  return (
    <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-4">
      <div className="text-eyebrow text-brand-saffron">Math Proof — Vimshottari Balance</div>
      <p className="text-xs text-text-tertiary italic">
        Ref: Brihat Parashara Hora Shastra (BPHS), Ch. 46 — Dashadhyaya
      </p>

      <div className="space-y-3 text-sm text-text-secondary">
        <div>
          <div className="font-medium text-text-primary">1. Moon&apos;s nakshatra</div>
          <p>
            Moon is in <strong>{nakName}</strong> (nakshatra #{nakIdx}) at {moonPos.longitude.toFixed(4)}° total longitude.
          </p>
        </div>

        <div>
          <div className="font-medium text-text-primary">2. Nakshatra → Dasha lord</div>
          <p className="font-mono text-xs text-text-tertiary">
            Sequence index = (nakshatra − 1) mod 9 = ({nakIdx} − 1) mod 9 = {(nakIdx - 1) % 9}
          </p>
          <p>Starting dasha lord: <strong>{lord}</strong> ({years} years total).</p>
          <div className="mt-1 overflow-x-auto">
            <table className="text-xs border-collapse">
              <tbody>
                <tr>
                  {VIMSHOTTARI_SEQUENCE.map((v, i) => (
                    <td key={i} className={`border border-hairline-subtle px-2 py-1 ${v.lord === lord ? 'bg-brand-saffron/10 font-medium' : ''}`}>
                      {v.lord} ({v.years}y)
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="font-medium text-text-primary">3. Balance computation</div>
          <p className="font-mono text-xs text-text-tertiary">
            Each nakshatra = 360° / 27 = {nakshatraDeg.toFixed(4)}°
          </p>
          <p className="font-mono text-xs text-text-tertiary">
            Moon position within nakshatra = {moonPos.longitude.toFixed(4)}° mod {nakshatraDeg.toFixed(4)}° = {moonLongInNak.toFixed(4)}°
          </p>
          <p className="font-mono text-xs text-text-tertiary">
            Fraction traversed = {moonLongInNak.toFixed(4)} / {nakshatraDeg.toFixed(4)} = {fractionTraversed.toFixed(6)}
          </p>
          <p className="font-mono text-xs text-text-tertiary">
            Balance = (1 − {fractionTraversed.toFixed(6)}) × {years} = <strong>{balanceYears.toFixed(4)} years</strong>
          </p>
          <p className="mt-1">
            The native begins life with <strong>{balanceYears.toFixed(2)} years</strong> of <strong>{lord}</strong> Mahadasha remaining at birth.
          </p>
        </div>
      </div>
    </div>
  );
}

function YoginiMathProof({ d1 }: { d1: DivisionalChart }) {
  const moonPos = d1.planets.find((p) => p.planet === 'moon');
  if (!moonPos) return null;

  const nakName = moonPos.nakshatra;
  const nakIdx = nakshatraIndex(nakName);
  const yoginiIdx = (nakIdx + 3) % 8;
  const yogini = YOGINI_SEQUENCE[yoginiIdx];

  return (
    <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-4">
      <div className="text-eyebrow text-brand-saffron">Math Proof — Yogini Dasha</div>
      <p className="text-xs text-text-tertiary italic">36-year cycle · 8 yoginis</p>

      <div className="space-y-3 text-sm text-text-secondary">
        <div>
          <div className="font-medium text-text-primary">1. Nakshatra → Yogini mapping</div>
          <p className="font-mono text-xs text-text-tertiary">
            Yogini index = (nakshatra + 3) mod 8 = ({nakIdx} + 3) mod 8 = {yoginiIdx}
          </p>
          <p>
            Moon in <strong>{nakName}</strong> → starting Yogini: <strong>{yogini.yogini}</strong> (lord: {yogini.lord}, {yogini.years} years).
          </p>
        </div>

        <div>
          <div className="font-medium text-text-primary">2. Full sequence (total 36 years)</div>
          <div className="mt-1 overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="text-text-tertiary">
                  <th className="border border-hairline-subtle px-2 py-1 text-left">Yogini</th>
                  <th className="border border-hairline-subtle px-2 py-1 text-left">Lord</th>
                  <th className="border border-hairline-subtle px-2 py-1">Years</th>
                </tr>
              </thead>
              <tbody>
                {YOGINI_SEQUENCE.map((y, i) => (
                  <tr key={i} className={i === yoginiIdx ? 'bg-brand-saffron/10 font-medium' : ''}>
                    <td className="border border-hairline-subtle px-2 py-1">{y.yogini}</td>
                    <td className="border border-hairline-subtle px-2 py-1">{y.lord}</td>
                    <td className="border border-hairline-subtle px-2 py-1 text-center">{y.years}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AshtottariMathProof({ d1 }: { d1: DivisionalChart }) {
  const moonPos = d1.planets.find((p) => p.planet === 'moon');
  if (!moonPos) return null;

  return (
    <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm space-y-4">
      <div className="text-eyebrow text-brand-saffron">Math Proof — Ashtottari Dasha</div>
      <p className="text-xs text-text-tertiary italic">
        Ref: Saravali (Kalyana Varma) · KP literature
      </p>

      <div className="space-y-3 text-sm text-text-secondary">
        <div>
          <div className="font-medium text-text-primary">1. Eligibility rule</div>
          <p>
            Ashtottari is applicable when <strong>Rahu</strong> occupies a Kendra (1, 4, 7, 10) or Trikona (1, 5, 9)
            from the Lagna lord. Some authorities (KP school) apply it universally for night-born natives.
          </p>
        </div>

        <div>
          <div className="font-medium text-text-primary">2. 108-year cycle · 8 lords</div>
          <p>Ketu is excluded. The cycle sums to 108 years.</p>
          <div className="mt-1 overflow-x-auto">
            <table className="text-xs border-collapse">
              <tbody>
                <tr>
                  {ASHTOTTARI_SEQUENCE.map((v, i) => (
                    <td key={i} className="border border-hairline-subtle px-2 py-1">
                      {v.lord} ({v.years}y)
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="font-medium text-text-primary">3. Starting lord</div>
          <p>
            Determined by Moon&apos;s nakshatra (<strong>{moonPos.nakshatra}</strong>), mapped to the Ashtottari
            nakshatra groups (each lord governs 3–4 nakshatras in sequence).
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashas page                                                   */
/* ------------------------------------------------------------------ */

export default function Dashas() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);
  const available = (data?.dashas ?? []).slice().sort(
    (a, b) => SYSTEM_ORDER.indexOf(a.system) - SYSTEM_ORDER.indexOf(b.system),
  );
  const [active, setActive] = useState<DashaSystem['system'] | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriodInfo | null>(null);
  const [depth, setDepth] = useState<Depth>('explain');

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const current = available.find((s) => s.system === active) ?? available[0];
  const meta = current ? SYSTEM_META[current.system] : null;
  const d1 = data.divisionalCharts.find((c) => c.varga === 'D1') as DivisionalChart | undefined;
  const ascSign = d1?.ascendantSign;

  const resolvedLord = selectedPeriod ? resolveDashaLord(selectedPeriod.planet) : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      {current && meta && (
        <>
          <div className="mt-3 text-eyebrow text-brand-saffron">{meta.label} · {meta.cycle}</div>
          <h1 className="mt-1 font-display text-h1 text-text-primary">Dasha Timeline</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            {meta.tagline} Tap any period to see the dasha lord highlighted on the D1 chart.
          </p>
        </>
      )}

      {/* System tabs + Depth toggle */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        {available.length > 1 && (
          <div className="flex flex-wrap gap-1 border-b border-hairline-subtle">
            {available.map((s) => {
              const isActive = current?.system === s.system;
              return (
                <button
                  key={s.system}
                  onClick={() => {
                    setActive(s.system);
                    setSelectedPeriod(null);
                  }}
                  className={`relative px-4 py-3 text-sm capitalize transition-colors ${isActive ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
                >
                  {SYSTEM_META[s.system].label}
                  {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-saffron" />}
                  {SYSTEM_META[s.system].tooltip && (
                    <span className="ml-1 inline-block align-middle text-text-tertiary" title={SYSTEM_META[s.system].tooltip}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="inline h-3.5 w-3.5"><path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" /></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Depth toggle */}
        <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
          {([['visual', '👁️ Visual'], ['explain', '📖 Explain'], ['math', '🔬 Math Proof']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setDepth(k)}
              className={`rounded-sm px-3 py-1.5 transition-colors ${depth === k ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary hover:text-text-primary'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Math Proof section — system-level computation */}
      {depth === 'math' && d1 && current && (
        <div className="mt-6">
          {current.system === 'vimshottari' && <VimshottariMathProof d1={d1} />}
          {current.system === 'yogini' && <YoginiMathProof d1={d1} />}
          {current.system === 'ashtottari' && <AshtottariMathProof d1={d1} />}
          {current.system === 'kalachakra' && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <div className="text-eyebrow text-brand-saffron">Math Proof — Kalachakra Dasha</div>
              <p className="mt-2 text-sm text-text-secondary">
                Sign-based dasha using the <strong>Savya / Apasavya</strong> nakshatra-pada groups.
                Each nakshatra-pada maps to a sign sequence; the order reverses for Apasavya padas.
                Period length is derived from the navamsha-sign rulership.
              </p>
            </div>
          )}
          {current.system === 'char' && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <div className="text-eyebrow text-brand-saffron">Math Proof — Chara Dasha</div>
              <p className="mt-2 text-sm text-text-secondary">
                Jaimini Chara Dasha assigns sign-based periods. The Maha period for each sign
                is determined by the distance of the sign lord from that sign (odd signs count
                forward, even signs count backward). Duration = distance in signs − 1 years
                (with exceptions per KN Rao&apos;s method).
              </p>
            </div>
          )}
          {current.system === 'narayana' && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <div className="text-eyebrow text-brand-saffron">Math Proof — Narayana (Padakrama) Dasha</div>
              <p className="mt-2 text-sm text-text-secondary">
                Rasi-based maha-dasha starting from Lagna. <strong>Odd signs → zodiacal</strong>,
                <strong>even signs → anti-zodiacal</strong> (per Maharishi Jaimini). Each rasi&apos;s duration
                = distance (in signs) from that rasi to its lord&apos;s placement, counted in the rasi&apos;s
                natural direction. Lord-in-own-sign → 12 years. Cite: Sanjay Rath, &ldquo;Jaimini
                Maharishi&apos;s Upadesa Sutras&rdquo; + Jaimini Sutra 2.3.
              </p>
            </div>
          )}
          {current.system === 'lagna_kendradi' && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <div className="text-eyebrow text-brand-saffron">Math Proof — Lagna Kendradi Dasha</div>
              <p className="mt-2 text-sm text-text-secondary">
                Strength-ordered rasi dasha. Lagna&apos;s sign first, then kendras (4th/7th/10th from
                Lagna) ranked by Padakrama strength, then panaphara (2/5/8/11), then apoklima
                (3/6/9/12). Duration = same signs-to-lord formula as Narayana. Cite: Jaimini
                Sutra + KN Rao &ldquo;Predicting Through Jaimini&apos;s Chara Dasha.&rdquo;
              </p>
            </div>
          )}
          {current.system === 'sudasa' && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <div className="text-eyebrow text-brand-saffron">Math Proof — Sudasa (Wealth Dasha)</div>
              <p className="mt-2 text-sm text-text-secondary">
                Computed from the <strong>D-2 (Hora)</strong> chart. Identifies the Hora-ascendant;
                signs are ordered by strength (kendras → panaphara → apoklima from Hora-Lagna).
                Duration = distance from dasha rasi to its Hora-chart lord. Used to time wealth
                and prosperity periods. Cite: Jaimini Sutra Pada 4 + KN Rao &ldquo;Astrology of
                Wealth Sudasa.&rdquo;
              </p>
            </div>
          )}
          {current.system === 'drigdasa' && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <div className="text-eyebrow text-brand-saffron">Math Proof — Drigdasa (Aspect Dasha)</div>
              <p className="mt-2 text-sm text-text-secondary">
                Aspect-based rasi dasha. The sequence starts from the <strong>Atmakaraka&apos;s sign</strong>,
                then signs that aspect (rasi drishti) the AK&apos;s sign come next, ordered by
                zodiacal proximity. Duration = Padakrama formula (distance from dasha rasi to its
                lord). Cite: Jaimini Sutra Pada 4 + Sanjay Rath, &ldquo;Jaimini Maharishi&apos;s
                Upadesa Sutras.&rdquo;
              </p>
            </div>
          )}
          {current.system === 'shoola' && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <div className="text-eyebrow text-brand-saffron">Math Proof — Shoola Dasha</div>
              <p className="mt-2 text-sm text-text-secondary">
                Death/health timing rasi dasha. Starts from the <strong>7th house from Atmakaraka&apos;s
                sign</strong>, then proceeds zodiacally (odd starting sign) or anti-zodiacally
                (even starting sign). Duration = Padakrama formula. Used in longevity (ayurdaya)
                analysis. Cite: Phaladeepika Ch. 8 + KN Rao, &ldquo;Predicting Longevity.&rdquo;
              </p>
            </div>
          )}
          {current.system === 'dwisaptati' && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <div className="text-eyebrow text-brand-saffron">Math Proof — Dwisaptati-sama Dasha</div>
              <p className="mt-2 text-sm text-text-secondary">
                Conditional 72-year dasha (BPHS Ch. 47). <strong>Applicability:</strong> Lagna lord
                is in the 7th house OR 7th lord is in Lagna. 8 mahadasha lords × 9 years each.
                Order: Sun → Moon → Mars → Mercury → Jupiter → Venus → Saturn → Rahu. Balance
                computed from Moon&apos;s nakshatra position like standard Vimshottari.
              </p>
            </div>
          )}
          {current.system === 'shat_trimsa' && (
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <div className="text-eyebrow text-brand-saffron">Math Proof — Shat-trimsa-sama Dasha</div>
              <p className="mt-2 text-sm text-text-secondary">
                Conditional 36-year dasha (BPHS Ch. 47). <strong>Applicability:</strong> Sun is in
                Lagna, or Sun is the Atmakaraka and occupies a kendra (1/4/7/10) from Lagna.
                7 mahadasha lords × ~5.14 years each. Order: Sun → Moon → Mars → Mercury →
                Jupiter → Venus → Saturn. Balance computed from Moon&apos;s nakshatra position.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main content: Timeline + Focus Panel */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className={selectedPeriod && resolvedLord && d1 ? 'lg:col-span-7' : 'lg:col-span-12'}>
          {current ? (
            <DashaTimeline
              system={current}
              syntheticPratyantar={current.system === 'vimshottari'}
              ascSign={ascSign}
              onPeriodSelect={setSelectedPeriod}
              selectedLabel={selectedPeriod?.label}
            />
          ) : (
            <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">
              No dasha systems available. Recalculate this chart to generate dashas.
            </div>
          )}
        </div>

        {/* Focus panel (sticky sidebar) */}
        {selectedPeriod && resolvedLord && d1 ? (
          <aside className="lg:col-span-5 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
              <DashaFocusPanel
                d1={d1}
                dashaLordKey={resolvedLord}
                dashaLabel={selectedPeriod.label}
                depth={depth}
              />
              {/* Auto-insight reading for the selected dasha period */}
              {(() => {
                const match = data.autoInsights?.dashas?.find(
                  (e) => e.lord.toLowerCase() === resolvedLord && e.period === selectedPeriod.label
                ) ?? data.autoInsights?.dashas?.find(
                  (e) => e.lord.toLowerCase() === resolvedLord
                );
                if (match) return (
                  <div className="mt-3 rounded-sm border border-brand-gold/20 bg-brand-gold/5 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-brand-gold font-medium mb-1">
                      <Sparkles className="h-3.5 w-3.5" /> Guru Insight
                    </div>
                    <p className="text-sm text-text-secondary">{match.reading}</p>
                  </div>
                );
                return (
                  <Link to={chartLink(`/app/chart/${id}/debate`)} className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-maroon hover:underline">
                    <MessageSquare className="h-3.5 w-3.5" /> Tap to ask a Guru &rarr;
                  </Link>
                );
              })()}
            </div>
          </aside>
        ) : (
          current && (
            <aside className="hidden lg:col-span-5 lg:block">
              <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-8 text-center text-sm text-text-tertiary">
                Tap any dasha period to see its lord highlighted on the D1 chart with lordship, aspects, and dignity.
              </div>
            </aside>
          )
        )}
      </div>
    </div>
  );
}
