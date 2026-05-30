import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Check, X } from 'lucide-react';
import dayjs from 'dayjs';
import { useKundli } from '@/hooks/useKundli';
import { useChartStore } from '@/stores/useChartStore';
import { KundliChart, KundliFrame } from '@/components/kundli/KundliChart';
import { SIGN_NAMES_DEVA } from '@/lib/astro/types';
import type { KundliData, DivisionalChart, DashaPeriod, SpecialLagnaData } from '@/lib/astro/types';

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function TwinsCompare() {
  const { idA = '', idB = '' } = useParams<{ idA: string; idB: string }>();
  const qA = useKundli(idA);
  const qB = useKundli(idB);
  const chartStyle = useChartStore((s) => s.chartStyle);

  if (qA.isLoading || qB.isLoading || !qA.data || !qB.data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
        <p className="mt-4 text-sm text-text-tertiary">Loading twin charts...</p>
      </div>
    );
  }

  const a = qA.data;
  const b = qB.data;
  const nameA = a.birthDetails.fullName || 'Twin A';
  const nameB = b.birthDetails.fullName || 'Twin B';

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="mt-3 text-eyebrow text-brand-saffron">Twins · जुड़वाँ</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">
        {nameA} vs {nameB}
      </h1>
      <p className="mt-2 max-w-3xl text-body text-text-secondary">
        Birth-time difference of{' '}
        <span className="font-mono text-text-primary">
          {formatTimeDelta(a.birthDetails.timeOfBirth, b.birthDetails.timeOfBirth)}
        </span>
        . Sections below highlight what <em>diverges</em>.
      </p>

      {/* 1. D-60 Shashtiamsa side-by-side */}
      <Section title="D-60 · Shashtiamsa · षष्ट्यांश" subtitle="Fastest-changing varga — the headline differentiator">
        <D60SideBySide a={a} b={b} nameA={nameA} nameB={nameB} chartStyle={chartStyle} />
      </Section>

      {/* 2. KP Cuspal Sub-Lord Delta */}
      <Section title="KP Cuspal Sub-Lord Delta · कृष्णमूर्ति पद्धति" subtitle="Cusps whose sub-lord differs between the twins">
        <KpCuspalDelta a={a} b={b} nameA={nameA} nameB={nameB} />
      </Section>

      {/* 3. Parallel Vimshottari Dasha Timeline */}
      <Section title="Vimshottari Dasha Timeline · विंशोत्तरी दशा" subtitle="Where the period sequences diverge">
        <ParallelDasha a={a} b={b} nameA={nameA} nameB={nameB} />
      </Section>

      {/* 4. Pranapada Lagna Comparison */}
      <Section title="Pranapada Lagna · प्राणपद लग्न" subtitle="Moves fast — often the first lagna to diverge between twins">
        <PranapadaCompare a={a} b={b} nameA={nameA} nameB={nameB} />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                   */
/* ------------------------------------------------------------------ */

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-h2 text-text-primary">{title}</h2>
        <div className="h-px flex-1 bg-hairline-subtle" />
      </div>
      <p className="mb-6 text-sm text-text-secondary">{subtitle}</p>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  1.  D-60 Side-by-Side                                             */
/* ------------------------------------------------------------------ */

function D60SideBySide({ a, b, nameA, nameB, chartStyle }: {
  a: KundliData; b: KundliData; nameA: string; nameB: string; chartStyle: 'north' | 'south';
}) {
  const d60A = a.divisionalCharts.find((c) => c.varga === 'D60');
  const d60B = b.divisionalCharts.find((c) => c.varga === 'D60');

  if (!d60A || !d60B) {
    return <EmptyState label="D-60 data" />;
  }

  const ascDiff = d60A.ascendantSign !== d60B.ascendantSign;

  return (
    <div className="space-y-4">
      {ascDiff && (
        <DiffBanner>D-60 Ascendant differs — {nameA}: sign {d60A.ascendantSign}, {nameB}: sign {d60B.ascendantSign}</DiffBanner>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <KundliFrame title={`${nameA} · D60`} subtitle="Shashtiamsa">
          <KundliChart chart={d60A} style={chartStyle} size={380} />
        </KundliFrame>
        <KundliFrame title={`${nameB} · D60`} subtitle="Shashtiamsa">
          <KundliChart chart={d60B} style={chartStyle} size={380} />
        </KundliFrame>
      </div>
      <D60PlanetTable a={d60A} b={d60B} nameA={nameA} nameB={nameB} />
    </div>
  );
}

function D60PlanetTable({ a, b, nameA, nameB }: {
  a: DivisionalChart; b: DivisionalChart; nameA: string; nameB: string;
}) {
  const rows = a.planets.filter(p => p.planet !== 'ascendant').map((pa) => {
    const pb = b.planets.find(p => p.planet === pa.planet);
    const signDiff = pb ? pa.signNumber !== pb.signNumber : false;
    const houseDiff = pb ? pa.houseNumber !== pb.houseNumber : false;
    return { planet: pa.planet, pa, pb, signDiff, houseDiff, differs: signDiff || houseDiff };
  });

  return (
    <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th className="px-4 py-2 font-medium">Planet</th>
            <th className="px-4 py-2 font-medium">{nameA} Sign</th>
            <th className="px-4 py-2 font-medium">{nameB} Sign</th>
            <th className="px-4 py-2 font-medium">{nameA} House</th>
            <th className="px-4 py-2 font-medium">{nameB} House</th>
            <th className="px-4 py-2 text-center font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-subtle">
          {rows.map((r) => (
            <tr key={r.planet} className={r.differs ? 'bg-brand-saffron/5' : ''}>
              <td className="px-4 py-2 font-display capitalize text-text-primary">{r.planet}</td>
              <td className={`px-4 py-2 font-mono text-xs ${r.signDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>{r.pa.signName}</td>
              <td className={`px-4 py-2 font-mono text-xs ${r.signDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>{r.pb?.signName ?? '—'}</td>
              <td className={`px-4 py-2 font-mono text-xs ${r.houseDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>H{r.pa.houseNumber}</td>
              <td className={`px-4 py-2 font-mono text-xs ${r.houseDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>{r.pb ? `H${r.pb.houseNumber}` : '—'}</td>
              <td className="px-4 py-2 text-center">
                {r.differs ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-saffron/15 text-brand-saffron"><X className="h-3 w-3" /></span>
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-semantic-positive/15 text-semantic-positive"><Check className="h-3 w-3" /></span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2.  KP Cuspal Sub-Lord Delta                                      */
/* ------------------------------------------------------------------ */

function KpCuspalDelta({ a, b, nameA, nameB }: {
  a: KundliData; b: KundliData; nameA: string; nameB: string;
}) {
  const cuspsA = a.kp?.cuspalSubLords;
  const cuspsB = b.kp?.cuspalSubLords;

  if (!cuspsA?.length || !cuspsB?.length) {
    return <EmptyState label="KP cuspal sub-lord data (try Placidus house system)" />;
  }

  const rows = cuspsA.map((ca) => {
    const cb = cuspsB.find(c => c.cusp === ca.cusp);
    const subDiff = cb ? ca.subLord !== cb.subLord : false;
    const starDiff = cb ? ca.starLord !== cb.starLord : false;
    const signDiff = cb ? ca.signLord !== cb.signLord : false;
    return { cusp: ca.cusp, ca, cb, subDiff, starDiff, signDiff, anyDiff: subDiff || starDiff || signDiff };
  });

  const diffCount = rows.filter(r => r.anyDiff).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span className="font-mono text-brand-saffron">{diffCount}</span> of {rows.length} cusps differ in sub-lord chain
      </div>
      <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">Cusp</th>
              <th className="px-4 py-2 font-medium">{nameA} Sign</th>
              <th className="px-4 py-2 font-medium">{nameB} Sign</th>
              <th className="px-4 py-2 font-medium">{nameA} Star</th>
              <th className="px-4 py-2 font-medium">{nameB} Star</th>
              <th className="px-4 py-2 font-medium">{nameA} Sub</th>
              <th className="px-4 py-2 font-medium">{nameB} Sub</th>
              <th className="px-4 py-2 text-center font-medium">Match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {rows.map((r) => (
              <tr key={r.cusp} className={r.anyDiff ? 'bg-brand-saffron/5' : ''}>
                <td className="px-4 py-2 font-mono text-xs text-text-primary">Cusp {r.cusp}</td>
                <td className={`px-4 py-2 font-mono text-xs ${r.signDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>{r.ca.signLord}</td>
                <td className={`px-4 py-2 font-mono text-xs ${r.signDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>{r.cb?.signLord ?? '—'}</td>
                <td className={`px-4 py-2 font-mono text-xs ${r.starDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>{r.ca.starLord}</td>
                <td className={`px-4 py-2 font-mono text-xs ${r.starDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>{r.cb?.starLord ?? '—'}</td>
                <td className={`px-4 py-2 font-mono text-xs ${r.subDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>{r.ca.subLord}</td>
                <td className={`px-4 py-2 font-mono text-xs ${r.subDiff ? 'text-brand-saffron font-semibold' : 'text-text-secondary'}`}>{r.cb?.subLord ?? '—'}</td>
                <td className="px-4 py-2 text-center">
                  {r.anyDiff ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-saffron/15 text-brand-saffron"><X className="h-3 w-3" /></span>
                  ) : (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-semantic-positive/15 text-semantic-positive"><Check className="h-3 w-3" /></span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3.  Parallel Vimshottari Dasha Timeline                           */
/* ------------------------------------------------------------------ */

const PLANET_KEY: Record<string, string> = {
  Sun: 'sun', Moon: 'moon', Mars: 'mars', Mercury: 'mercury', Jupiter: 'jupiter',
  Venus: 'venus', Saturn: 'saturn', Rahu: 'rahu', Ketu: 'ketu',
};

function planetColor(name: string) {
  return `hsl(var(--planet-${PLANET_KEY[name] ?? 'saturn'}))`;
}

function ParallelDasha({ a, b, nameA, nameB }: {
  a: KundliData; b: KundliData; nameA: string; nameB: string;
}) {
  const vimA = a.dashas.find(d => d.system === 'vimshottari');
  const vimB = b.dashas.find(d => d.system === 'vimshottari');

  if (!vimA || !vimB) {
    return <EmptyState label="Vimshottari dasha data" />;
  }

  const tlA = vimA.timeline;
  const tlB = vimB.timeline;

  const divergences = useMemo(() => {
    const diffs: Array<{ idx: number; planetA: string; planetB: string; startA: string; startB: string }> = [];
    const len = Math.min(tlA.length, tlB.length);
    for (let i = 0; i < len; i++) {
      if (tlA[i].planet !== tlB[i].planet || tlA[i].startDate !== tlB[i].startDate) {
        diffs.push({ idx: i, planetA: tlA[i].planet, planetB: tlB[i].planet, startA: tlA[i].startDate, startB: tlB[i].startDate });
      }
    }
    return diffs;
  }, [tlA, tlB]);

  const range = useMemo(() => {
    const allTl = [...tlA, ...tlB];
    if (!allTl.length) return { start: 0, end: 1 };
    const starts = allTl.map(p => new Date(p.startDate).getTime());
    const ends = allTl.map(p => new Date(p.endDate).getTime());
    return { start: Math.min(...starts), end: Math.max(...ends) };
  }, [tlA, tlB]);

  const span = range.end - range.start || 1;
  const now = Date.now();
  const nowPct = ((now - range.start) / span) * 100;
  const inRange = nowPct >= 0 && nowPct <= 100;

  return (
    <div className="space-y-6">
      {/* Visual bars */}
      <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        {[{ label: nameA, tl: tlA }, { label: nameB, tl: tlB }].map(({ label, tl }) => (
          <div key={label} className="mb-4 last:mb-0">
            <div className="mb-1 text-eyebrow text-text-tertiary">{label}</div>
            <div className="relative h-10 overflow-hidden rounded-sm border border-hairline-subtle">
              {tl.map((p) => {
                const s = new Date(p.startDate).getTime();
                const e = new Date(p.endDate).getTime();
                const left = ((s - range.start) / span) * 100;
                const width = ((e - s) / span) * 100;
                const active = s <= now && e > now;
                return (
                  <div
                    key={p.planet + p.startDate}
                    title={`${p.planet} ${dayjs(s).format('YYYY')}\u2013${dayjs(e).format('YYYY')}`}
                    className="absolute inset-y-0 flex items-center justify-center border-l border-hairline-subtle text-xs font-medium"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: `${planetColor(p.planet)}${active ? '' : '22'}`,
                      color: active ? 'hsl(var(--bg-canvas))' : 'hsl(var(--text-secondary))',
                    }}
                  >
                    {width > 4 ? p.planet.slice(0, 2) : ''}
                  </div>
                );
              })}
              {inRange && <div className="absolute inset-y-0 w-px bg-brand-maroon" style={{ left: `${nowPct}%` }} />}
            </div>
          </div>
        ))}
        <div className="flex justify-between font-mono text-xs text-text-tertiary">
          <span>{dayjs(range.start).format('YYYY')}</span>
          <span>{dayjs(range.end).format('YYYY')}</span>
        </div>
      </div>

      {/* Divergence table */}
      {divergences.length > 0 ? (
        <div className="space-y-2">
          <DiffBanner>{divergences.length} maha-dasha period(s) diverge between the twins</DiffBanner>
          <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">{nameA} Planet</th>
                  <th className="px-4 py-2 font-medium">{nameB} Planet</th>
                  <th className="px-4 py-2 font-medium">{nameA} Start</th>
                  <th className="px-4 py-2 font-medium">{nameB} Start</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-subtle">
                {divergences.map((d) => (
                  <tr key={d.idx} className="bg-brand-saffron/5">
                    <td className="px-4 py-2 font-mono text-xs text-text-tertiary">{d.idx + 1}</td>
                    <td className="px-4 py-2 font-display capitalize text-text-primary">{d.planetA}</td>
                    <td className="px-4 py-2 font-display capitalize text-text-primary">{d.planetB}</td>
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">{dayjs(d.startA).format('DD MMM YYYY')}</td>
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">{dayjs(d.startB).format('DD MMM YYYY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <SameBanner>All maha-dasha periods are identical between the twins.</SameBanner>
      )}

      {/* Per-period side-by-side comparison */}
      <MahaDashaComparison tlA={tlA} tlB={tlB} nameA={nameA} nameB={nameB} />
    </div>
  );
}

function MahaDashaComparison({ tlA, tlB, nameA, nameB }: {
  tlA: DashaPeriod[]; tlB: DashaPeriod[]; nameA: string; nameB: string;
}) {
  const len = Math.min(tlA.length, tlB.length);
  const rows = [];
  for (let i = 0; i < len; i++) {
    const pA = tlA[i];
    const pB = tlB[i];
    const planetDiff = pA.planet !== pB.planet;
    const startDiff = pA.startDate !== pB.startDate;
    rows.push(
      <tr key={i} className={planetDiff || startDiff ? 'bg-brand-saffron/5' : ''}>
        <td className="px-4 py-2 font-display capitalize text-text-primary">{pA.planet}</td>
        <td className="px-4 py-2 font-mono text-xs text-text-secondary">{dayjs(pA.startDate).format('DD MMM YYYY')}</td>
        <td className="px-4 py-2 font-mono text-xs text-text-secondary">{dayjs(pA.endDate).format('DD MMM YYYY')}</td>
        <td className={`px-4 py-2 font-display capitalize ${planetDiff ? 'text-brand-saffron font-semibold' : 'text-text-primary'}`}>{pB.planet}</td>
        <td className={`px-4 py-2 font-mono text-xs ${startDiff ? 'text-brand-saffron' : 'text-text-secondary'}`}>{dayjs(pB.startDate).format('DD MMM YYYY')}</td>
        <td className="px-4 py-2 font-mono text-xs text-text-secondary">{dayjs(pB.endDate).format('DD MMM YYYY')}</td>
        <td className="px-4 py-2 text-center">
          {planetDiff || startDiff ? (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-saffron/15 text-brand-saffron"><X className="h-3 w-3" /></span>
          ) : (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-semantic-positive/15 text-semantic-positive"><Check className="h-3 w-3" /></span>
          )}
        </td>
      </tr>,
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th className="px-4 py-2 font-medium">{nameA}</th>
            <th className="px-4 py-2 font-medium">Start</th>
            <th className="px-4 py-2 font-medium">End</th>
            <th className="px-4 py-2 font-medium">{nameB}</th>
            <th className="px-4 py-2 font-medium">Start</th>
            <th className="px-4 py-2 font-medium">End</th>
            <th className="px-4 py-2 text-center font-medium">Match</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-subtle">
          {rows}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  4.  Pranapada Lagna Comparison                                    */
/* ------------------------------------------------------------------ */

function PranapadaCompare({ a, b, nameA, nameB }: {
  a: KundliData; b: KundliData; nameA: string; nameB: string;
}) {
  const lagnaA = findPranapada(a);
  const lagnaB = findPranapada(b);

  if (!lagnaA || !lagnaB) {
    return <EmptyState label="Pranapada Lagna data (from Jaimini special lagnas)" />;
  }

  const signDiff = lagnaA.sign !== lagnaB.sign;
  const degreeDiff = Math.abs(lagnaA.degree - lagnaB.degree);

  return (
    <div className="space-y-4">
      {signDiff && <DiffBanner>Pranapada Lagna sign differs!</DiffBanner>}
      <div className="grid gap-6 sm:grid-cols-2">
        <LagnaCard label={nameA} lagna={lagnaA} differs={signDiff} />
        <LagnaCard label={nameB} lagna={lagnaB} differs={signDiff} />
      </div>
      <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-eyebrow text-text-tertiary">Sign Match</div>
            <div className="mt-1">{signDiff ? <DiffBadge /> : <SameBadge />}</div>
          </div>
          <div>
            <div className="text-eyebrow text-text-tertiary">Degree Delta</div>
            <div className="mt-1 font-mono text-h3 text-text-primary">{degreeDiff.toFixed(2)}°</div>
          </div>
          <div>
            <div className="text-eyebrow text-text-tertiary">Longitude Delta</div>
            <div className="mt-1 font-mono text-h3 text-text-primary">{Math.abs(lagnaA.longitude - lagnaB.longitude).toFixed(2)}°</div>
          </div>
        </div>
      </div>

      {/* All special lagnas comparison */}
      <AllSpecialLagnasTable a={a} b={b} nameA={nameA} nameB={nameB} />
    </div>
  );
}

function AllSpecialLagnasTable({ a, b, nameA, nameB }: {
  a: KundliData; b: KundliData; nameA: string; nameB: string;
}) {
  const lagnas = a.jaimini?.specialLagnas;
  if (!lagnas?.length) return null;

  const rows = lagnas.map(la => {
    const lb = b.jaimini?.specialLagnas?.find(l => l.name === la.name);
    const signDiff = lb ? la.sign !== lb.sign : false;
    return { la, lb, signDiff };
  });

  return (
    <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th className="px-4 py-2 font-medium">Lagna</th>
            <th className="px-4 py-2 font-medium">{nameA} Sign</th>
            <th className="px-4 py-2 font-medium">{nameB} Sign</th>
            <th className="px-4 py-2 text-right font-medium">{nameA} Deg</th>
            <th className="px-4 py-2 text-right font-medium">{nameB} Deg</th>
            <th className="px-4 py-2 text-center font-medium">Match</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-subtle">
          {rows.map((r) => (
            <tr key={r.la.name} className={r.signDiff ? 'bg-brand-saffron/5' : ''}>
              <td className="px-4 py-2 text-text-primary">{r.la.name}</td>
              <td className="px-4 py-2">
                <span className={r.signDiff ? 'font-semibold text-brand-saffron' : 'text-text-secondary'}>{r.la.signName}</span>
                <span className="ml-1 font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[r.la.sign - 1]}</span>
              </td>
              <td className="px-4 py-2">
                {r.lb ? (
                  <>
                    <span className={r.signDiff ? 'font-semibold text-brand-saffron' : 'text-text-secondary'}>{r.lb.signName}</span>
                    <span className="ml-1 font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[r.lb.sign - 1]}</span>
                  </>
                ) : '—'}
              </td>
              <td className="px-4 py-2 text-right font-mono text-xs text-text-tertiary">{r.la.degree.toFixed(2)}°</td>
              <td className="px-4 py-2 text-right font-mono text-xs text-text-tertiary">{r.lb?.degree.toFixed(2) ?? '—'}°</td>
              <td className="px-4 py-2 text-center">
                {r.signDiff ? <DiffBadge /> : <SameBadge />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LagnaCard({ label, lagna, differs }: {
  label: string; lagna: SpecialLagnaData; differs: boolean;
}) {
  return (
    <div className={`rounded-md border p-5 shadow-sm ${differs ? 'border-brand-saffron bg-brand-saffron/5' : 'border-hairline-subtle bg-surface'}`}>
      <div className="text-eyebrow text-text-tertiary">{label}</div>
      <div className="mt-2 font-display text-h2 text-text-primary">
        {lagna.signName}
        <span className="ml-2 font-deva text-lg text-text-tertiary">{SIGN_NAMES_DEVA[lagna.sign - 1]}</span>
      </div>
      <div className="mt-1 font-mono text-sm text-text-secondary">
        {lagna.degree.toFixed(2)}° · longitude {lagna.longitude.toFixed(2)}°
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function findPranapada(data: KundliData): SpecialLagnaData | undefined {
  return data.jaimini?.specialLagnas?.find(l =>
    l.name.toLowerCase().includes('pranapada'),
  );
}

function formatTimeDelta(tA?: string, tB?: string): string {
  if (!tA || !tB) return '—';
  const secA = parseTimeStr(tA);
  const secB = parseTimeStr(tB);
  if (isNaN(secA) || isNaN(secB)) return '—';
  const d = Math.abs(secA - secB);
  const m = Math.floor(d / 60);
  const s = d % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function parseTimeStr(t: string): number {
  const parts = t.split(':');
  return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + (parts[2] ? parseInt(parts[2], 10) : 0);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">
      Recalculate this chart to generate {label}.
    </div>
  );
}

function DiffBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-brand-saffron/30 bg-brand-saffron/5 px-4 py-2.5 text-sm text-brand-saffron">
      <X className="h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

function SameBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-semantic-positive/30 bg-semantic-positive/5 px-4 py-2.5 text-sm text-semantic-positive">
      <Check className="h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

function DiffBadge() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-saffron/15 text-brand-saffron">
      <X className="h-3.5 w-3.5" />
    </span>
  );
}

function SameBadge() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-semantic-positive/15 text-semantic-positive">
      <Check className="h-3.5 w-3.5" />
    </span>
  );
}
