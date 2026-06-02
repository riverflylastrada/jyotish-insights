import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useKundli } from '@/hooks/useKundli';
import { SIGN_NAMES, SIGN_NAMES_DEVA, type JaiminiData } from '@/lib/astro/types';

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">
      Recalculate this chart to generate {label}.
    </div>
  );
}

export default function Jaimini() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const j = data.jaimini;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Jaimini</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Jaimini System</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Sign-based prediction system: chara karakas, arudha padas, Chara dasha and argala.
      </p>

      {!j ? (
        <div className="mt-8"><EmptyState label="Jaimini data" /></div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <CharaKarakas data={j} />
          <ArudhaPadas data={j.arudhaPadas} />
          {j.specialLagnas && j.specialLagnas.length > 0 && <SpecialLagnas data={j.specialLagnas} />}
          {j.argala && j.argala.length > 0 && <Argala data={j.argala} />}
          {j.charaDasha && <div className="lg:col-span-2"><CharaDasha data={j.charaDasha} /></div>}
        </div>
      )}
    </div>
  );
}

function CharaKarakas({ data }: { data: JaiminiData }) {
  return (
    <section className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
      <h2 className="font-display text-h3 text-text-primary">Chara Karakas</h2>
      <p className="mt-1 text-xs text-text-tertiary">Atmakaraka: <span className="font-mono capitalize text-brand-saffron">{data.atmakaraka}</span> · Karakamsa: <span className="font-mono text-brand-saffron">{data.karakamsa.signName}</span></p>
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th className="py-2 font-medium">Karaka</th>
            <th className="py-2 font-medium">Planet</th>
            <th className="py-2 text-right font-medium">Degree</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-subtle">
          {data.charaKarakas.map((k) => {
            const isAk = k.karaka === 'AK';
            return (
              <tr key={k.karaka} className={isAk ? 'bg-brand-saffron/5' : ''}>
                <td className="py-2 font-mono text-xs text-text-secondary">{k.karaka}</td>
                <td className="py-2 font-display capitalize text-text-primary">
                  {k.planet}
                  {isAk && <span className="ml-2 rounded-sm bg-brand-saffron/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-saffron">Atmakaraka</span>}
                </td>
                <td className="py-2 text-right font-mono text-xs text-text-tertiary">{k.degreeInSign.toFixed(2)}°</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function ArudhaPadas({ data }: { data: JaiminiData['arudhaPadas'] }) {
  return (
    <section className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
      <h2 className="font-display text-h3 text-text-primary">Arudha Padas</h2>
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th className="py-2 font-medium">House</th>
            <th className="py-2 font-medium">Label</th>
            <th className="py-2 font-medium">Sign</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-subtle">
          {data.map((a) => (
            <tr key={a.label}>
              <td className="py-2 font-mono text-xs text-text-tertiary">H{a.house}</td>
              <td className="py-2 text-sm text-text-primary">{a.label}</td>
              <td className="py-2">
                <span className="text-text-primary">{a.signName}</span>
                <span className="ml-1.5 font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[a.sign - 1]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SpecialLagnas({ data }: { data: NonNullable<JaiminiData['specialLagnas']> }) {
  return (
    <section className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
      <h2 className="font-display text-h3 text-text-primary">Special Lagnas</h2>
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th className="py-2 font-medium">Lagna</th>
            <th className="py-2 font-medium">Sign</th>
            <th className="py-2 text-right font-medium">Degree</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-subtle">
          {data.map((l) => (
            <tr key={l.name}>
              <td className="py-2 text-sm text-text-primary">{l.name}</td>
              <td className="py-2">
                <span className="text-text-secondary">{l.signName}</span>
                <span className="ml-1.5 font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[l.sign - 1]}</span>
              </td>
              <td className="py-2 text-right font-mono text-xs text-text-tertiary">{l.degree.toFixed(2)}°</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Argala({ data }: { data: NonNullable<JaiminiData['argala']> }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm lg:col-span-2">
      <h2 className="font-display text-h3 text-text-primary">Argala</h2>
      <p className="mt-1 text-xs text-text-tertiary">Intervening planets (argala) versus their counter (virodha argala) per house.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {data.map((h) => {
          const isOpen = open === h.house;
          const argalaAll = [...h.argala.from2nd, ...h.argala.from4th, ...h.argala.from5th, ...h.argala.from11th];
          const virodhaAll = [...h.virodha.from12th, ...h.virodha.from10th, ...h.virodha.from9th, ...h.virodha.from3rd];
          return (
            <button key={h.house} onClick={() => setOpen(isOpen ? null : h.house)}
              className={`rounded-md border bg-canvas p-3 text-left transition-colors hover:border-brand-saffron ${isOpen ? 'border-brand-saffron' : 'border-hairline-subtle'}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-text-primary">H{h.house}</span>
                <span className="text-[10px] text-text-tertiary">
                  <span className="text-semantic-positive">{argalaAll.length}↑</span> · <span className="text-semantic-negative">{virodhaAll.length}↓</span>
                </span>
              </div>
              {isOpen && (
                <div className="mt-3 space-y-2">
                  <ArgalaRow label="2nd" planets={h.argala.from2nd} variant="argala" />
                  <ArgalaRow label="4th" planets={h.argala.from4th} variant="argala" />
                  <ArgalaRow label="5th" planets={h.argala.from5th} variant="argala" />
                  <ArgalaRow label="11th" planets={h.argala.from11th} variant="argala" />
                  <div className="my-2 h-px bg-hairline-subtle" />
                  <ArgalaRow label="12th" planets={h.virodha.from12th} variant="virodha" />
                  <ArgalaRow label="10th" planets={h.virodha.from10th} variant="virodha" />
                  <ArgalaRow label="9th" planets={h.virodha.from9th} variant="virodha" />
                  <ArgalaRow label="3rd" planets={h.virodha.from3rd} variant="virodha" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ArgalaRow({ label, planets, variant }: { label: string; planets: string[]; variant: 'argala' | 'virodha' }) {
  const color = variant === 'argala' ? 'text-semantic-positive border-semantic-positive/30 bg-semantic-positive/5' : 'text-semantic-negative border-semantic-negative/30 bg-semantic-negative/5';
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-8 font-mono text-text-tertiary">{label}</span>
      <div className="flex flex-1 flex-wrap gap-1">
        {planets.length === 0 ? <span className="text-text-muted">—</span> : planets.map((p) => (
          <span key={p} className={`rounded-sm border px-1.5 py-0.5 font-mono capitalize ${color}`}>{p}</span>
        ))}
      </div>
    </div>
  );
}

function CharaDasha({ data }: { data: NonNullable<JaiminiData['charaDasha']> }) {
  const [openSign, setOpenSign] = useState<number | null>(null);
  const tl = data.timeline;
  if (!tl.length) return null;
  const range = {
    start: new Date(tl[0].startDate).getTime(),
    end: new Date(tl[tl.length - 1].endDate).getTime(),
  };
  const span = Math.max(range.end - range.start, 1);
  const now = Date.now();
  const nowPct = ((now - range.start) / span) * 100;
  const inRange = nowPct >= 0 && nowPct <= 100;

  return (
    <section className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-h3 text-text-primary">Chara Dasha</h2>
        {data.currentSignName && (
          <div className="text-xs text-text-tertiary">Current: <span className="font-mono text-brand-saffron">{data.currentSignName}</span></div>
        )}
      </div>
      <div className="relative mt-4 h-10 overflow-hidden rounded-sm border border-hairline-subtle">
        {tl.map((p) => {
          const s = new Date(p.startDate).getTime();
          const e = new Date(p.endDate).getTime();
          const left = ((s - range.start) / span) * 100;
          const width = ((e - s) / span) * 100;
          const active = s <= now && e > now;
          return (
            <div key={p.sign + p.startDate}
              title={`${p.signName} · ${dayjs(s).format('YYYY')}–${dayjs(e).format('YYYY')}`}
              className="absolute inset-y-0 flex items-center justify-center border-l border-hairline-subtle text-[10px] font-medium"
              style={{
                left: `${left}%`, width: `${width}%`,
                background: active ? 'hsl(var(--brand-saffron))' : 'hsl(var(--elevated))',
                color: active ? 'hsl(var(--bg-canvas))' : 'hsl(var(--text-secondary))',
              }}>
              {width > 4 ? p.signName.slice(0, 3) : ''}
            </div>
          );
        })}
        {inRange && <div className="absolute inset-y-0 w-px bg-brand-maroon" style={{ left: `${nowPct}%` }} />}
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border border-hairline-subtle">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">Sign</th>
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
              // antardasha sub-periods (may exist on a wider type)
              const subs = (p as unknown as { antardasha?: Array<{ sign: number; signName: string; startDate: string; endDate: string; durationYears: number }> }).antardasha ?? [];
              const isOpen = openSign === p.sign;
              const expandable = subs.length > 0;
              return (
                <Fragment key={p.sign + p.startDate}>
                  <tr onClick={() => expandable && setOpenSign(isOpen ? null : p.sign)}
                    className={`${expandable ? 'cursor-pointer hover:bg-elevated/60' : ''} ${active ? 'bg-brand-saffron/5' : ''}`}>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        {expandable && <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />}
                        <span className="font-display text-text-primary">{p.signName}</span>
                        <span className="font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[p.sign - 1]}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">{dayjs(s).format('DD MMM YYYY')}</td>
                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">{dayjs(e).format('DD MMM YYYY')}</td>
                    <td className="px-4 py-2 font-mono text-xs text-text-tertiary">{p.durationYears.toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs">
                      {active && <span className="rounded-sm bg-brand-maroon px-2 py-0.5 text-primary-foreground">Current</span>}
                      {past && <span className="text-text-muted">Past</span>}
                      {!active && !past && <span className="text-text-tertiary">Upcoming</span>}
                    </td>
                  </tr>
                  {isOpen && subs.map((sub) => {
                    const ss = new Date(sub.startDate).getTime();
                    const se = new Date(sub.endDate).getTime();
                    const sActive = ss <= now && se > now;
                    return (
                      <tr key={`${p.sign}-${sub.sign}-${sub.startDate}`} className={`bg-canvas ${sActive ? 'bg-brand-saffron/5' : ''}`}>
                        <td className="py-1.5 pl-10 pr-4 text-xs text-text-tertiary">{p.signName} → {sub.signName}</td>
                        <td className="px-4 py-1.5 font-mono text-xs text-text-tertiary">{dayjs(ss).format('MMM YYYY')}</td>
                        <td className="px-4 py-1.5 font-mono text-xs text-text-tertiary">{dayjs(se).format('MMM YYYY')}</td>
                        <td className="px-4 py-1.5 font-mono text-xs text-text-tertiary">{sub.durationYears.toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-xs">{sActive && <span className="text-brand-maroon">●</span>}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}