import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Download, Printer } from 'lucide-react';
import { useState } from 'react';
import dayjs from 'dayjs';
import { useKundli } from '@/hooks/useKundli';
import { KundliChart } from '@/components/kundli/KundliChart';
import { useChartStore } from '@/stores/useChartStore';
import { PLANET_LABELS, SIGN_NAMES } from '@/lib/astro/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export default function Report() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const chartStyle = useChartStore((s) => s.chartStyle);
  const [downloading, setDownloading] = useState(false);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const shareToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('share') : null;

  const downloadPdf = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sess.session?.access_token) headers.Authorization = `Bearer ${sess.session.access_token}`;
      const body: Record<string, unknown> = {};
      if (shareToken) body.shareToken = shareToken;
      else if (isUuid) body.chartId = id;
      else body.snapshot = data; // demo / unsaved chart

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-report`, {
        method: 'POST',
        headers: {
          ...headers,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed (${resp.status})`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jyotish-sage-${(data.birthDetails.fullName || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PDF generation failed — try Print instead.');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || !data) {
    return <div className="mx-auto max-w-7xl px-6 py-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" /></div>;
  }

  const d1 = data.divisionalCharts.find(c => c.varga === 'D1')!;
  const d9 = data.divisionalCharts.find(c => c.varga === 'D9')!;
  const d10 = data.divisionalCharts.find(c => c.varga === 'D10')!;
  const sun = d1.planets.find(p => p.planet === 'sun')!;
  const moon = d1.planets.find(p => p.planet === 'moon')!;
  const md = data.dashas[0].currentMahaDasha;
  const presentYogas = data.yogas.filter(y => y.isPresent);
  const presentDoshas = data.doshas.filter(d => d.isPresent);
  const sarvaTotal = data.ashtakavarga.sarva.reduce((a,b)=>a+b,0);

  return (
    <div className="bg-canvas">
      {/* Toolbar — hidden on print */}
      <div className="no-print sticky top-0 z-20 border-b border-hairline-subtle bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between px-6 py-3">
          <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to chart
          </Link>
          <div className="text-xs text-text-tertiary">Server-rendered · A4 portrait</div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-sm border border-hairline-subtle bg-surface px-3 py-1.5 text-sm text-text-secondary hover:bg-elevated">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={downloadPdf} disabled={downloading} className="inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-3 py-1.5 text-sm text-primary-foreground hover:bg-brand-maroon/90 disabled:opacity-60">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="report mx-auto max-w-[210mm] bg-surface px-12 py-12 text-text-primary shadow-sm">
        {/* Cover */}
        <section className="page">
          <div className="text-eyebrow text-brand-saffron">Acharya Jyotish · Vedic Research Report</div>
          <h1 className="mt-2 font-display text-display leading-[1.05]">{data.birthDetails.fullName}</h1>
          <div className="gold-rule mt-6" />
          <dl className="mt-8 grid grid-cols-2 gap-y-4 text-sm">
            <DT label="Date of birth" value={dayjs(data.birthDetails.dateOfBirth).format('DD MMMM YYYY')} />
            <DT label="Time of birth" value={data.birthDetails.timeOfBirth ?? 'Unknown'} />
            <DT label="Place of birth" value={data.birthDetails.placeOfBirth.name} />
            <DT label="Coordinates" value={`${data.birthDetails.placeOfBirth.latitude.toFixed(4)}°, ${data.birthDetails.placeOfBirth.longitude.toFixed(4)}°`} />
            <DT label="Ayanamsa" value={data.birthDetails.ayanamsa} />
            <DT label="House system" value={data.birthDetails.houseSystem.replace('_', ' ')} />
          </dl>

          <div className="mt-12 grid grid-cols-3 gap-6">
            <Tile label="Lagna"   value={data.ascendant.signName} sub={`${data.ascendant.signDegree.toFixed(2)}°`} />
            <Tile label="Moon"    value={moon.signName}           sub={moon.nakshatra} />
            <Tile label="Sun"     value={sun.signName}            sub={sun.nakshatra} />
          </div>

          <p className="mt-12 text-sm leading-relaxed text-text-secondary">
            This document distils the natal configuration into a single, archival-quality reading. Each section follows the order of judgment used in classical Jyotish — Lagna and lord, planetary disposition, divisional confirmation, dasha unfoldment, doshas with remedies, and yogas as the operative architecture of the lifetime.
          </p>

          <div className="mt-16 text-xs text-text-muted">
            Generated {dayjs(data.generatedAt).format('DD MMM YYYY · HH:mm')} · Reference ID {data.id.toUpperCase()}
          </div>
        </section>

        {/* Panchang & Synthesis */}
        <section className="page mt-16">
          <H2>Birth Panchang</H2>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            {Object.entries(data.panchang).map(([k, v]) => (
              <div key={k} className="rounded-sm border border-hairline-subtle p-3">
                <div className="text-eyebrow text-text-tertiary capitalize">{k}</div>
                <div className="mt-1 text-text-primary">{v}</div>
              </div>
            ))}
          </div>

          <H2 className="mt-10">Opening Synthesis</H2>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            A {data.ascendant.signName} ascendant chart with a strong concentration of grahas in the 9th and 10th houses suggests a life shaped by dharmic action and public-facing work. The Moon in {moon.signName} ({moon.nakshatra}) gives the emotional architecture; Sun in {sun.signName} sets the ego-vector toward {sun.houseNumber === 10 ? 'authority and recognition' : 'self-expression'}.
          </p>
        </section>

        {/* D1 */}
        <section className="page mt-16">
          <H2>Rasi Chakra · D1</H2>
          <p className="mt-2 text-sm text-text-tertiary">The body of the chart — overall life themes.</p>
          <div className="mt-6 grid grid-cols-2 gap-8">
            <div className="kundli-print">
              <KundliChart chart={d1} style={chartStyle} />
            </div>
            <PlanetTable chart={d1} />
          </div>
        </section>

        {/* D9 + D10 */}
        <section className="page mt-16">
          <H2>Divisional Confirmation</H2>
          <div className="mt-6 grid grid-cols-2 gap-8">
            <div>
              <div className="text-eyebrow text-brand-saffron">D9 · Navamsha</div>
              <div className="mt-2 text-sm text-text-tertiary">Marriage, dharma, fruition.</div>
              <div className="kundli-print mt-3"><KundliChart chart={d9} style={chartStyle} /></div>
            </div>
            <div>
              <div className="text-eyebrow text-brand-saffron">D10 · Dasamsa</div>
              <div className="mt-2 text-sm text-text-tertiary">Career, public life.</div>
              <div className="kundli-print mt-3"><KundliChart chart={d10} style={chartStyle} /></div>
            </div>
          </div>
        </section>

        {/* Dasha */}
        <section className="page mt-16">
          <H2>Dasha Unfoldment · Vimshottari</H2>
          <div className="mt-3 text-sm text-text-secondary">
            Currently running <strong>{md.planet} Mahadasha</strong> until {dayjs(md.endDate).format('MMMM YYYY')}.
          </div>
          <table className="mt-5 w-full text-sm">
            <thead className="border-b border-hairline-subtle text-left text-xs uppercase tracking-wide text-text-tertiary">
              <tr><th className="py-2">Maha</th><th>Begin</th><th>End</th><th className="text-right">Years</th></tr>
            </thead>
            <tbody className="divide-y divide-hairline-subtle">
              {data.dashas[0].timeline.slice(0, 9).map((p, i) => (
                <tr key={i} className={p.planet === md.planet ? 'bg-elevated' : ''}>
                  <td className="py-2 font-mono">{p.planet}</td>
                  <td>{dayjs(p.startDate).format('MMM YYYY')}</td>
                  <td>{dayjs(p.endDate).format('MMM YYYY')}</td>
                  <td className="text-right font-mono">{p.durationYears}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Yogas */}
        <section className="page mt-16">
          <H2>Active Yogas</H2>
          <div className="mt-4 space-y-4">
            {presentYogas.map(y => (
              <div key={y.name} className="rounded-sm border border-hairline-subtle p-4">
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-h3">{y.name}</div>
                  <div className="font-mono text-xs capitalize text-text-tertiary">{y.category} · {y.strength}</div>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{y.explanation}</p>
                {y.effects.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-sm text-text-tertiary">
                    {y.effects.map(e => <li key={e}>{e}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Doshas + Remedies */}
        <section className="page mt-16">
          <H2>Doshas &amp; Remedies</H2>
          <div className="mt-4 space-y-4">
            {presentDoshas.map(d => (
              <div key={d.name} className="rounded-sm border border-hairline-subtle p-4">
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-h3 capitalize">{d.name.replace('_', ' ')} Dosha</div>
                  <div className="font-mono text-xs uppercase text-brand-maroon">{d.severity}</div>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{d.explanation}</p>
                {d.remedies.length > 0 && (
                  <div className="mt-3">
                    <div className="text-eyebrow text-text-tertiary">Remedies</div>
                    <ul className="mt-1 space-y-1 text-sm">
                      {d.remedies.map(r => (
                        <li key={r.title}>
                          <span className="font-mono text-xs uppercase text-text-tertiary">{r.type}</span>
                          <span className="ml-2 text-text-primary">{r.title}</span>
                          <span className="ml-2 text-text-tertiary">— {r.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Ashtakavarga summary */}
        <section className="page mt-16">
          <H2>Bhava Strength · Sarvashtakavarga</H2>
          <div className="mt-3 text-sm text-text-secondary">Total {sarvaTotal} bindus across the zodiac.</div>
          <table className="mt-4 w-full text-sm">
            <thead className="border-b border-hairline-subtle text-left text-xs uppercase tracking-wide text-text-tertiary">
              <tr><th className="py-2">House</th><th>Sign</th><th className="text-right">Bindus</th></tr>
            </thead>
            <tbody className="divide-y divide-hairline-subtle">
              {data.ashtakavarga.sarva.map((b, i) => (
                <tr key={i}>
                  <td className="py-2 font-mono">H{i+1}</td>
                  <td>{SIGN_NAMES[i]}</td>
                  <td className="text-right font-mono">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-20 border-t border-hairline-subtle pt-6 text-xs text-text-muted">
          Acharya Jyotish · This report is generated for reflection and study. Classical Vedic astrology is a contemplative tradition; treat all judgments as guidance, not determinism.
        </footer>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; color: #111111 !important; }
          .report { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; background: transparent !important; }
          .page { page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; padding-top: 8mm; }
          .page:last-child { page-break-after: avoid; break-after: avoid; }
          h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
          table, tr, td, th { page-break-inside: avoid; break-inside: avoid; }
        }
        .kundli-print svg { width: 100%; height: auto; }
        @page { size: A4; margin: 16mm; }
      `}</style>
    </div>
  );
}

function H2({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-display text-h2 text-text-primary ${className}`}>{children}</h2>;
}

function DT({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-eyebrow text-text-tertiary">{label}</dt>
      <dd className="mt-0.5 text-text-primary">{value}</dd>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-sm border border-hairline-subtle bg-elevated/50 p-4">
      <div className="text-eyebrow text-text-tertiary">{label}</div>
      <div className="mt-1 font-display text-h2 text-text-primary">{value}</div>
      <div className="font-mono text-xs text-text-tertiary">{sub}</div>
    </div>
  );
}

function PlanetTable({ chart }: { chart: any }) {
  return (
    <table className="w-full text-xs">
      <thead className="border-b border-hairline-subtle text-left uppercase tracking-wide text-text-tertiary">
        <tr><th className="py-1.5">Planet</th><th>Sign</th><th>Deg</th><th>H</th><th>Nakshatra</th></tr>
      </thead>
      <tbody className="divide-y divide-hairline-subtle">
        {chart.planets.filter((p: any) => p.planet !== 'ascendant').map((p: any) => (
          <tr key={p.planet}>
            <td className="py-1.5 font-mono" style={{ color: `hsl(var(--planet-${p.planet}))` }}>{PLANET_LABELS[p.planet as keyof typeof PLANET_LABELS].short}</td>
            <td className="text-text-primary">{p.signName}</td>
            <td className="font-mono text-text-tertiary">{p.signDegree.toFixed(1)}°</td>
            <td className="font-mono text-text-tertiary">{p.houseNumber}</td>
            <td className="text-text-tertiary">{p.nakshatra}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}