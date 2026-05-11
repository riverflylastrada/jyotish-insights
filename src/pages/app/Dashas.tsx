import { Fragment, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useKundli } from '@/hooks/useKundli';
import type { DashaPeriod } from '@/lib/astro/types';

const PLANET_KEY: Record<string, string> = {
  Sun: 'sun', Moon: 'moon', Mars: 'mars', Mercury: 'mercury', Jupiter: 'jupiter',
  Venus: 'venus', Saturn: 'saturn', Rahu: 'rahu', Ketu: 'ketu',
};

function planetColor(name: string) {
  const k = PLANET_KEY[name] ?? 'saturn';
  return `hsl(var(--planet-${k}))`;
}

function buildPratyantar(parent: DashaPeriod): DashaPeriod[] {
  const sequence: Array<[string, number]> = [
    ['Mercury', 17], ['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10],
    ['Mars', 7], ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19],
  ];
  const total = 120;
  const start = new Date(parent.startDate).getTime();
  const end = new Date(parent.endDate).getTime();
  const span = end - start;
  let cursor = start;
  return sequence.map(([planet, years]) => {
    const slice = (years / total) * span;
    const s = cursor;
    cursor += slice;
    return {
      level: 'pratyantar' as const, planet,
      durationYears: (years / total) * (parent.durationYears),
      startDate: new Date(s).toISOString(), endDate: new Date(cursor).toISOString(),
    };
  });
}

export default function Dashas() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const [openMaha, setOpenMaha] = useState<string | null>(null);
  const [openAntar, setOpenAntar] = useState<string | null>(null);

  const now = Date.now();

  const range = useMemo(() => {
    if (!data) return { start: 0, end: 1 };
    const tl = data.dashas[0].timeline;
    return { start: new Date(tl[0].startDate).getTime(), end: new Date(tl[tl.length - 1].endDate).getTime() };
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const tl = data.dashas[0].timeline;
  const span = range.end - range.start;
  const nowPct = ((now - range.start) / span) * 100;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Vimshottari · 120 year cycle</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Dasha Timeline</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Each Mahadasha is the planet currently ruling the sky of one's life. Click to drill from Maha → Antar → Pratyantar.
      </p>

      {/* Continuous bar */}
      <div className="mt-8 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <div className="text-eyebrow text-text-tertiary">Lifetime view</div>
        <div className="relative mt-4 h-12 overflow-hidden rounded-sm border border-hairline-subtle">
          {tl.map((p) => {
            const s = new Date(p.startDate).getTime();
            const e = new Date(p.endDate).getTime();
            const left = ((s - range.start) / span) * 100;
            const width = ((e - s) / span) * 100;
            const active = s <= now && e > now;
            return (
              <div key={p.planet + p.startDate}
                title={`${p.planet} · ${dayjs(s).format('YYYY')}–${dayjs(e).format('YYYY')}`}
                className="absolute inset-y-0 flex items-center justify-center border-l border-hairline-subtle text-xs font-medium"
                style={{ left: `${left}%`, width: `${width}%`, background: `${planetColor(p.planet)}${active ? '' : '22'}`, color: active ? 'hsl(var(--bg-canvas))' : 'hsl(var(--text-secondary))' }}>
                {width > 4 ? p.planet.slice(0, 2) : ''}
              </div>
            );
          })}
          {/* Now marker */}
          <div className="absolute inset-y-0 w-px bg-brand-maroon" style={{ left: `${nowPct}%` }} />
          <div className="absolute -top-5 -translate-x-1/2 text-eyebrow text-brand-maroon" style={{ left: `${nowPct}%` }}>Now</div>
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs text-text-tertiary">
          <span>{dayjs(range.start).format('YYYY')}</span>
          <span>{dayjs(range.end).format('YYYY')}</span>
        </div>
      </div>

      {/* Drill-down list */}
      <div className="mt-8 overflow-hidden rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">Maha</th>
              <th className="px-4 py-2 font-medium">From</th>
              <th className="px-4 py-2 font-medium">To</th>
              <th className="px-4 py-2 font-medium">Years</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {tl.map((p) => {
              const s = new Date(p.startDate).getTime();
              const e = new Date(p.endDate).getTime();
              const active = s <= now && e > now;
              const past = e <= now;
              const key = p.planet + p.startDate;
              const isOpen = openMaha === key;
              return (
                <Fragment key={key}>
                  <tr onClick={() => { setOpenMaha(isOpen ? null : key); setOpenAntar(null); }}
                    className={`cursor-pointer hover:bg-elevated/60 ${active ? 'bg-brand-saffron/5' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: planetColor(p.planet) }} />
                        <span className="font-display text-text-primary">{p.planet}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-text-secondary">{dayjs(s).format('DD MMM YYYY')}</td>
                    <td className="px-4 py-3 font-mono text-text-secondary">{dayjs(e).format('DD MMM YYYY')}</td>
                    <td className="px-4 py-3 font-mono text-text-tertiary">{p.durationYears}</td>
                    <td className="px-4 py-3 text-xs">
                      {active && <span className="rounded-sm bg-brand-maroon px-2 py-0.5 text-primary-foreground">Current</span>}
                      {past && <span className="text-text-muted">Past</span>}
                      {!active && !past && <span className="text-text-tertiary">Upcoming</span>}
                    </td>
                  </tr>
                  {isOpen && (p.children ?? buildPratyantar(p)).map((a) => {
                    const as = new Date(a.startDate).getTime();
                    const ae = new Date(a.endDate).getTime();
                    const aActive = as <= now && ae > now;
                    const aKey = key + a.planet + a.startDate;
                    const aOpen = openAntar === aKey;
                    const prats = buildPratyantar(a);
                    return (
                      <Fragment key={aKey}>
                        <tr onClick={(ev) => { ev.stopPropagation(); setOpenAntar(aOpen ? null : aKey); }}
                          className={`cursor-pointer bg-canvas hover:bg-elevated/40 ${aActive ? 'bg-brand-saffron/5' : ''}`}>
                          <td className="py-2 pl-10 pr-4">
                            <span className="inline-flex items-center gap-2 text-text-secondary">
                              <span className="h-2 w-2 rounded-full" style={{ background: planetColor(a.planet) }} />
                              <span>{p.planet} → {a.planet}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-text-tertiary">{dayjs(as).format('MMM YYYY')}</td>
                          <td className="px-4 py-2 font-mono text-xs text-text-tertiary">{dayjs(ae).format('MMM YYYY')}</td>
                          <td className="px-4 py-2 font-mono text-xs text-text-tertiary">{a.durationYears.toFixed(2)}</td>
                          <td className="px-4 py-2 text-xs">
                            {aActive && <span className="rounded-sm bg-brand-saffron/20 px-2 py-0.5 text-brand-saffron">Active</span>}
                          </td>
                        </tr>
                        {aOpen && prats.map((pr) => {
                          const ps = new Date(pr.startDate).getTime();
                          const pe = new Date(pr.endDate).getTime();
                          const prActive = ps <= now && pe > now;
                          return (
                            <tr key={aKey + pr.planet + pr.startDate} className={`bg-canvas/60 ${prActive ? 'bg-brand-saffron/5' : ''}`}>
                              <td className="py-1.5 pl-16 pr-4 text-xs text-text-tertiary">{p.planet} → {a.planet} → {pr.planet}</td>
                              <td className="px-4 py-1.5 font-mono text-xs text-text-tertiary">{dayjs(ps).format('DD MMM YYYY')}</td>
                              <td className="px-4 py-1.5 font-mono text-xs text-text-tertiary">{dayjs(pe).format('DD MMM YYYY')}</td>
                              <td className="px-4 py-1.5 font-mono text-xs text-text-tertiary">{pr.durationYears.toFixed(3)}</td>
                              <td className="px-4 py-1.5 text-xs">{prActive && <span className="text-brand-maroon">●</span>}</td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}