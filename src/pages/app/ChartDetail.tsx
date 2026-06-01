import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useKundli } from '@/hooks/useKundli';
import { useChartStore } from '@/stores/useChartStore';
import { KundliChart, KundliFrame } from '@/components/kundli/KundliChart';
import { PLANET_LABELS, SIGN_NAMES, SIGN_NAMES_DEVA, type DivisionalChart, type Dosha, type PlanetPosition } from '@/lib/astro/types';
import { Download, Share2, RefreshCcw, Save, MessageSquare, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import { VoiceButton } from '@/components/voice/VoiceButton';

export default function ChartDetail() {
  const { id = 'demo' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useKundli(id);
  const chartStyle = useChartStore((s) => s.chartStyle);
  const setChartStyle = useChartStore((s) => s.setChartStyle);
  const [tab, setTab] = useState<'overview' | 'houses' | 'planets'>('overview');
  const [busy, setBusy] = useState<null | 'save' | 'share' | 'recalc'>(null);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const d1 = data.divisionalCharts.find(c => c.varga === 'D1')!;
  const d9 = data.divisionalCharts.find(c => c.varga === 'D9')!;
  const sun = d1.planets.find(p => p.planet === 'sun')!;
  const moon = d1.planets.find(p => p.planet === 'moon')!;

  const md = data.dashas[0].currentMahaDasha;
  const ad = md.children?.find(c => new Date(c.startDate).getTime() <= Date.now() && new Date(c.endDate).getTime() > Date.now()) ?? md.children?.[0];
  const sadeSati = data.doshas.find(dd => dd.name === 'sade_sati');

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const shareToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('share') : null;
  const readOnly = !!shareToken;

  const onSave = async () => {
    setBusy('save');
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { toast.error('Sign in to save charts'); nav('/login'); return; }
      if (isUuid) {
        const { error } = await supabase.from('charts')
          .update({ snapshot: data as unknown as never, birth_details: data.birthDetails as unknown as never })
          .eq('id', id);
        if (error) throw error;
        toast.success('Chart updated');
      } else {
        const { data: row, error } = await supabase.from('charts').insert({
          user_id: u.user.id,
          name: data.birthDetails.fullName || 'Untitled chart',
          birth_details: data.birthDetails as unknown as never,
          snapshot: data as unknown as never,
        }).select('id').single();
        if (error) throw error;
        toast.success('Chart saved to your library');
        nav(`/app/chart/${row.id}`, { replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally { setBusy(null); }
  };

  const onShare = async () => {
    setBusy('share');
    try {
      let token: string | null = null;
      if (isUuid) {
        const { data: row, error } = await supabase.from('charts').select('share_token').eq('id', id).single();
        if (error) throw error;
        token = row.share_token;
      }
      const url = token
        ? `${window.location.origin}/app/chart/${id}?share=${token}`
        : `${window.location.origin}/app/chart/${id}`;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied to clipboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create share link. Save the chart first.');
    } finally { setBusy(null); }
  };

  const onRecalc = async () => {
    setBusy('recalc');
    try {
      if (isUuid) {
        // Clear cached snapshot so next fetch regenerates
        await supabase.from('charts').update({ snapshot: null as unknown as never }).eq('id', id);
      }
      await qc.invalidateQueries({ queryKey: ['chart', id] });
      await refetch();
      toast.success('Chart recomputed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Recompute failed');
    } finally { setBusy(null); }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {readOnly && (
        <div className="mb-6 rounded-md border border-brand-gold/30 bg-surface/80 backdrop-blur p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-500">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-saffron/10 rounded-full text-brand-saffron">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <span className="text-eyebrow text-brand-gold">Acharya Jyotish</span>
              <h3 className="font-display text-h3 text-text-primary mt-1">This Vedic Chart was shared with you</h3>
              <p className="text-xs text-text-secondary mt-1">Unlock live transits, relationship compatibility matching, and personal dasha feeds.</p>
            </div>
          </div>
          <Link to="/signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-sm bg-brand-maroon px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-brand-maroon/90 transition-colors shadow">
            Cast Your Own Chart <ArrowRight className="h-4 w-4 text-brand-gold animate-bounce" />
          </Link>
        </div>
      )}
      {/* Header */}
      <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="text-eyebrow text-brand-saffron">Kundli · {dayjs(data.generatedAt).format('DD MMM YYYY')}</div>
            <h1 className="mt-2 font-display text-h1 text-text-primary">{data.birthDetails.fullName}</h1>
            <div className="gold-rule mt-3 max-w-[8rem]" />
            <div className="mt-3 font-mono text-sm text-text-tertiary">
              {dayjs(data.birthDetails.dateOfBirth).format('DD MMM YYYY')}{data.birthDetails.timeOfBirth ? ` · ${data.birthDetails.timeOfBirth}` : ''} · {data.birthDetails.placeOfBirth.name}{data.chartBasis && data.chartBasis !== 'rasi' ? ` · ${data.chartBasis.charAt(0).toUpperCase() + data.chartBasis.slice(1)} chart` : ''}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Chip label="Lagna" value={`${data.ascendant.signName} ${data.ascendant.signDegree.toFixed(1)}°`} color="maroon" />
              <Chip label="Moon" value={`${moon.signName} · ${moon.nakshatra}`} color="moon" />
              <Chip label="Sun" value={`${sun.signName} · ${sun.nakshatra}`} color="sun" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Secondary actions grouped into one segmented toolbar; labels show from lg */}
            <div className="inline-flex items-center divide-x divide-hairline-subtle overflow-hidden rounded-sm border border-hairline-subtle bg-surface">
              {!readOnly && <ActionBtn grouped icon={Save} label={isUuid ? 'Update' : 'Save'} onClick={onSave} loading={busy === 'save'} />}
              <ActionBtn grouped icon={Download} label="PDF" to={`/app/chart/${id}/report${shareToken ? `?share=${shareToken}` : ''}`} />
              {!readOnly && <ActionBtn grouped icon={Share2} label="Share" onClick={onShare} loading={busy === 'share'} />}
              {!readOnly && <ActionBtn grouped icon={RefreshCcw} label="Recalculate" onClick={onRecalc} loading={busy === 'recalc'} />}
            </div>
            <Link to={`/app/chart/${id}/debate`} className="inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-brand-maroon/90">
              <MessageSquare className="h-4 w-4" /> Open Debate
            </Link>
            <VoiceButton chartId={id} variant="inline" />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* LEFT — charts (the North/South toggle now lives on the D1 frame) */}
        <div className="space-y-6 lg:col-span-4">
          <KundliFrame title="D1 · Rasi" subtitle="Body & overall life" action={
            <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
              {(['north', 'south'] as const).map(s => (
                <button key={s} onClick={() => setChartStyle(s)}
                  className={`rounded-sm px-2.5 py-1 capitalize transition-colors ${chartStyle === s ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary hover:text-text-primary'}`}>
                  {s}
                </button>
              ))}
            </div>
          }>
            <KundliChart chart={d1} style={chartStyle} />
          </KundliFrame>
          <KundliFrame title="D9 · Navamsha" subtitle="Marriage & dharma">
            <KundliChart chart={d9} style={chartStyle} />
          </KundliFrame>
        </div>

        {/* CENTER — tabs */}
        <div className="space-y-4 lg:col-span-5">
          <div className="flex border-b border-hairline-subtle">
            {(['overview', 'houses', 'planets'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative px-4 py-3 text-sm capitalize transition-colors ${tab === t ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}>
                {t}
                {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-saffron" />}
              </button>
            ))}
          </div>

          {tab === 'overview' && <OverviewTab chart={d1} doshaCount={data.doshas.filter(d => d.isPresent).length} yogas={data.yogas} md={md.planet} ad={ad?.planet ?? '—'} />}
          {tab === 'houses' && <HousesTab chart={d1} autoInsights={data.autoInsights} chartId={id} />}
          {tab === 'planets' && <PlanetsTab chart={d1} />}
        </div>

        {/* RIGHT — snapshot */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
            <div className="text-eyebrow text-text-tertiary">Current Snapshot</div>
            <div className="mt-3 space-y-3">
              <Stat label="Maha Dasha" value={md.planet} sub={`until ${dayjs(md.endDate).format('MMM YYYY')}`} />
              {ad && <Stat label="Antar Dasha" value={ad.planet} sub={`until ${dayjs(ad.endDate).format('MMM YYYY')}`} />}
              {sadeSati && (
                <Stat
                  label="Sade Sati"
                  value={sadeSati.isPresent
                    ? `Active${sadeSati.severity ? ` · ${sadeSati.severity}` : ''}`
                    : 'Not active'}
                  sub={sadeSatiPhase(sadeSati)}
                />
              )}
            </div>
          </div>
          <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
            <div className="text-eyebrow text-text-tertiary">Panchang</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-text-tertiary">Tithi</span><span className="text-text-primary">{data.panchang.tithi}</span></li>
              <li className="flex justify-between"><span className="text-text-tertiary">Vara</span><span className="text-text-primary">{data.panchang.vara}</span></li>
              <li className="flex justify-between"><span className="text-text-tertiary">Nakshatra</span><span className="text-text-primary">{data.panchang.nakshatra}</span></li>
              <li className="flex justify-between"><span className="text-text-tertiary">Yoga</span><span className="text-text-primary">{data.panchang.yoga}</span></li>
              <li className="flex justify-between"><span className="text-text-tertiary">Karana</span><span className="text-text-primary">{data.panchang.karana}</span></li>
            </ul>
          </div>
          <Link to={`/app/chart/${id}/debate`} className="block rounded-md border border-brand-maroon/30 bg-surface p-5 text-left shadow-sm hover:bg-elevated">
            <div className="text-eyebrow text-brand-saffron">Tribunal</div>
            <div className="mt-2 font-display text-h3 text-text-primary">Ask the Gurus</div>
            <p className="mt-1 text-sm text-text-tertiary">Run a eight-Guru debate on a specific question about this chart.</p>
          </Link>
        </aside>
      </div>

      {/* Sub-nav links */}
      {([
        { heading: 'Core', items: [
          ['lab', 'Research Lab'],
          ['charts', 'Divisional'],
          ['dashas', 'Dashas'],
          ['doshas', 'Doshas'],
          ['yogas', 'Yogas'],
          ['ashtakavarga', 'Ashtakavarga'],
          ['transits', 'Transits'],
          ['saturn-transits', 'Saturn Transits'],
        ] },
        { heading: 'Strength & Bala', items: [
          ['strengths', 'Strengths'],
        ] },
        { heading: 'Advanced systems', items: [
          ['kp', 'KP System'],
          ['jaimini', 'Jaimini'],
          ['varshphal', 'Varshphal'],
        ] },
        { heading: 'Output', items: [
          ['remedies', 'Remedies'],
          ['muhurta', 'Muhurta'],
          ['report', 'Report'],
        ] },
      ] as const).map((group) => (
        <div key={group.heading} className="mt-8">
          <div className="mb-2 text-eyebrow text-text-tertiary">{group.heading}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {group.items.map(([slug, label]) => (
              <Link key={slug} to={`/app/chart/${id}/${slug}`}
                className="rounded-md border border-hairline-subtle bg-surface px-4 py-3 text-center text-sm text-text-secondary hover:border-brand-maroon hover:text-text-primary">
                {label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, to, onClick, loading, grouped }: { icon: React.ElementType; label: string; to?: string; onClick?: () => void; loading?: boolean; grouped?: boolean }) {
  // `grouped` = borderless segment inside a shared toolbar; label collapses to
  // an icon (with tooltip) until lg so the toolbar stays compact.
  const cls = grouped
    ? 'inline-flex items-center gap-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-elevated disabled:opacity-50'
    : 'inline-flex items-center gap-2 rounded-sm border border-hairline-subtle bg-surface px-3 py-2 text-sm text-text-secondary hover:bg-elevated disabled:opacity-50';
  const labelEl = <span className={grouped ? 'hidden lg:inline' : undefined}>{label}</span>;
  if (to) return <Link to={to} className={cls} title={label}><Icon className="h-4 w-4" />{labelEl}</Link>;
  return (
    <button onClick={onClick} disabled={loading} className={cls} title={label}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {labelEl}
    </button>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: 'maroon' | 'moon' | 'sun' }) {
  const map = { maroon: 'border-brand-maroon/30 text-brand-maroon', moon: 'border-planet-moon/30 text-planet-moon', sun: 'border-planet-sun/30 text-planet-sun' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border bg-surface px-2.5 py-1 ${map[color]}`}>
      <span className="text-eyebrow opacity-70">{label}</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-eyebrow text-text-tertiary">{label}</div>
      <div className="font-display text-h3 text-text-primary">{value}</div>
      {sub && <div className="font-mono text-xs text-text-tertiary">{sub}</div>}
    </div>
  );
}

const HOUSE_THEMES: Record<number, string> = {
  1: 'Self, body, vitality', 2: 'Wealth, family, speech', 3: 'Siblings, courage, communication',
  4: 'Mother, home, comforts', 5: 'Children, intellect, romance', 6: 'Health, debts, enemies',
  7: 'Spouse, partnerships', 8: 'Longevity, transformation', 9: 'Dharma, fortune, father',
  10: 'Career, public life', 11: 'Gains, network, fulfilment', 12: 'Loss, liberation, foreign lands',
};
const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

/** Concise, accurate Sade Sati phase label drawn from the engine's computed explanation. */
function sadeSatiPhase(d: Dosha): string | undefined {
  if (!d.isPresent) return 'Saturn clear of natal Moon';
  if (d.explanation.includes('rising')) return 'Rising · 12th from Moon';
  if (d.explanation.includes('peak')) return 'Peak · over natal Moon';
  if (d.explanation.includes('setting')) return 'Setting · 2nd from Moon';
  return undefined;
}

/**
 * Factual chart synthesis built from real computed data — the ascendant, the
 * most-occupied house, and the live yoga/dosha/dasha counts. No fabrication.
 */
function buildSynthesis(chart: DivisionalChart, yogasPresent: number, doshaCount: number, md: string): string {
  const counts = new Map<number, number>();
  chart.planets.forEach((p) => {
    if (p.planet === 'ascendant') return;
    counts.set(p.houseNumber, (counts.get(p.houseNumber) ?? 0) + 1);
  });
  let topHouse = 0, topN = 0;
  counts.forEach((n, h) => { if (n > topN) { topN = n; topHouse = h; } });

  const asc = SIGN_NAMES[chart.ascendantSign - 1];
  const cluster = topN >= 3
    ? `A stellium of ${topN} planets gathers in the ${ORDINALS[topHouse]} house (${HOUSE_THEMES[topHouse]}), the chart's centre of gravity. `
    : topN === 2
    ? `Its heaviest house is the ${ORDINALS[topHouse]} (${HOUSE_THEMES[topHouse]}), holding two planets. `
    : `Planets are spread across the houses without a single dominant cluster. `;
  const lord = md.charAt(0).toUpperCase() + md.slice(1);
  const flags = `${yogasPresent} yoga${yogasPresent === 1 ? '' : 's'} and ${doshaCount} dosha${doshaCount === 1 ? '' : 's'} ${(yogasPresent + doshaCount) === 1 ? 'is' : 'are'} flagged`;

  return `${asc} rising. ${cluster}${flags}, and the active Vimshottari mahadasha is governed by ${lord}.`;
}

function OverviewTab({ chart, doshaCount, yogas, md, ad }: { chart: DivisionalChart; doshaCount: number; yogas: any[]; md: string; ad: string }) {
  const present = yogas.filter(y => y.isPresent).slice(0, 3);
  return (
    <div className="space-y-5 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
      <div>
        <div className="text-eyebrow text-text-tertiary">Synthesis</div>
        <p className="mt-2 text-body text-text-secondary">
          {buildSynthesis(chart, yogas.filter(y => y.isPresent).length, doshaCount, md)}
        </p>
      </div>
      <div className="gold-rule" />
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Active Maha" value={md} />
        <Stat label="Active Antar" value={ad} />
        <Stat label="Yogas detected" value={String(yogas.filter(y => y.isPresent).length)} />
        <Stat label="Doshas active" value={String(doshaCount)} />
      </div>
      <div className="gold-rule" />
      <div>
        <div className="text-eyebrow text-text-tertiary">Top yogas</div>
        <ul className="mt-3 divide-y divide-hairline-subtle">
          {present.map(y => (
            <li key={y.name} className="flex items-center justify-between py-2 text-sm">
              <span className="text-text-primary">{y.name}</span>
              <span className="font-mono text-xs text-text-tertiary capitalize">{y.strength}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HousesTab({ chart, autoInsights, chartId }: { chart: DivisionalChart; autoInsights?: { houses?: Record<string, string> }; chartId: string }) {
  const [expandedHouse, setExpandedHouse] = useState<number | null>(null);
  const planetsByHouse = new Map<number, PlanetPosition[]>();
  chart.planets.forEach(p => {
    if (p.planet === 'ascendant') return;
    const arr = planetsByHouse.get(p.houseNumber) ?? [];
    arr.push(p);
    planetsByHouse.set(p.houseNumber, arr);
  });
  return (
    <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th className="px-4 py-2 font-medium">House</th>
            <th className="px-4 py-2 font-medium">Sign</th>
            <th className="px-4 py-2 font-medium">Occupants</th>
            <th className="px-4 py-2 font-medium">Significations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-subtle">
          {Array.from({ length: 12 }).map((_, i) => {
            const h = i + 1;
            const sign = ((chart.ascendantSign - 1 + i) % 12) + 1;
            const occ = planetsByHouse.get(h) ?? [];
            return (
              <React.Fragment key={h}>
                <tr className="hover:bg-elevated/50 cursor-pointer" onClick={() => setExpandedHouse(expandedHouse === h ? null : h)}>
                  <td className="px-4 py-3 font-mono text-text-primary">H{h}</td>
                  <td className="px-4 py-3"><span className="text-text-primary">{SIGN_NAMES[sign - 1]}</span> <span className="ml-1 font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[sign - 1]}</span></td>
                  <td className="px-4 py-3">
                    {occ.length === 0 ? <span className="text-text-muted">—</span> :
                      occ.map(p => <span key={p.planet} className="mr-2 font-mono text-xs" style={{ color: `hsl(var(--planet-${p.planet}))` }}>{PLANET_LABELS[p.planet].short}</span>)}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary">{HOUSE_THEMES[h]}</td>
                </tr>
                {expandedHouse === h && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 bg-elevated/30">
                      {autoInsights?.houses?.[String(h)] ? (
                        <div className="rounded-sm border border-brand-gold/20 bg-brand-gold/5 p-3">
                          <div className="flex items-center gap-1.5 text-xs text-brand-gold font-medium mb-1">
                            <Sparkles className="h-3.5 w-3.5" /> Guru Insight
                          </div>
                          <p className="text-sm text-text-secondary">{autoInsights.houses[String(h)]}</p>
                        </div>
                      ) : (
                        <Link to={`/app/chart/${chartId}/debate`} className="inline-flex items-center gap-1.5 text-xs text-brand-maroon hover:underline">
                          <MessageSquare className="h-3.5 w-3.5" /> Tap to ask a Guru &rarr;
                        </Link>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlanetsTab({ chart }: { chart: DivisionalChart }) {
  return (
    <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th className="px-4 py-2 font-medium">Planet</th>
            <th className="px-4 py-2 font-medium">Sign</th>
            <th className="px-4 py-2 font-medium">Degree</th>
            <th className="px-4 py-2 font-medium">House</th>
            <th className="px-4 py-2 font-medium">Nakshatra · Pada</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-subtle">
          {chart.planets.filter(p => p.planet !== 'ascendant').map(p => (
            <tr key={p.planet} className="hover:bg-elevated/50">
              <td className="px-4 py-3">
                <span className="font-mono text-xs" style={{ color: `hsl(var(--planet-${p.planet}))` }}>{PLANET_LABELS[p.planet].short}</span>
                <span className="ml-2 text-text-primary">{PLANET_LABELS[p.planet].full}</span>
              </td>
              <td className="px-4 py-3 text-text-primary">{p.signName}</td>
              <td className="px-4 py-3 font-mono text-text-secondary">{p.signDegree.toFixed(2)}°</td>
              <td className="px-4 py-3 font-mono text-text-secondary">H{p.houseNumber}</td>
              <td className="px-4 py-3 text-text-tertiary">{p.nakshatra} · {p.nakshatraPada}</td>
              <td className="px-4 py-3 text-xs">
                {p.isRetrograde && <span className="mr-1 rounded-sm bg-elevated px-1.5 py-0.5 font-mono text-text-tertiary">℞</span>}
                {p.dignity && <span className="capitalize text-text-tertiary">{p.dignity.replace('_', ' ')}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
