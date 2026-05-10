import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useKundli } from '@/hooks/useKundli';
import { useChartStore } from '@/stores/useChartStore';
import { KundliChart, KundliFrame } from '@/components/kundli/KundliChart';
import { PLANET_LABELS, SIGN_NAMES, SIGN_NAMES_DEVA, type DivisionalChart, type PlanetPosition } from '@/lib/astro/types';
import { Download, Share2, RefreshCcw, Save, MessageSquare, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

export default function ChartDetail() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const chartStyle = useChartStore((s) => s.chartStyle);
  const setChartStyle = useChartStore((s) => s.setChartStyle);
  const [tab, setTab] = useState<'overview' | 'houses' | 'planets'>('overview');

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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-eyebrow text-brand-saffron">Kundli · {dayjs(data.generatedAt).format('DD MMM YYYY')}</div>
            <h1 className="mt-2 font-display text-h1 text-text-primary">{data.birthDetails.fullName}</h1>
            <div className="mt-2 font-mono text-sm text-text-tertiary">
              {dayjs(data.birthDetails.dateOfBirth).format('DD MMM YYYY')} · {data.birthDetails.timeOfBirth} · {data.birthDetails.placeOfBirth.name}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Chip label="Lagna" value={`${data.ascendant.signName} ${data.ascendant.signDegree.toFixed(1)}°`} color="maroon" />
              <Chip label="Moon" value={`${moon.signName} · ${moon.nakshatra}`} color="moon" />
              <Chip label="Sun" value={`${sun.signName} · ${sun.nakshatra}`} color="sun" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionBtn icon={Save} label="Save" />
            <ActionBtn icon={Download} label="PDF" to={`/app/chart/${id}/report`} />
            <ActionBtn icon={Share2} label="Share" />
            <ActionBtn icon={RefreshCcw} label="Recalculate" />
            <Link to={`/app/chart/${id}/debate`} className="inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-3 py-2 text-sm text-primary-foreground hover:bg-brand-maroon/90">
              <MessageSquare className="h-4 w-4" /> Open Debate
            </Link>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* LEFT — charts */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-eyebrow text-text-tertiary">Chart style</div>
              <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
                {(['north', 'south'] as const).map(s => (
                  <button key={s} onClick={() => setChartStyle(s)}
                    className={`rounded-sm px-3 py-1 capitalize ${chartStyle === s ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <KundliFrame title="D1 · Rasi" subtitle="Body & overall life">
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
          {tab === 'houses' && <HousesTab chart={d1} />}
          {tab === 'planets' && <PlanetsTab chart={d1} />}
        </div>

        {/* RIGHT — snapshot */}
        <aside className="space-y-4 lg:col-span-3">
          <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
            <div className="text-eyebrow text-text-tertiary">Current Snapshot</div>
            <div className="mt-3 space-y-3">
              <Stat label="Maha Dasha" value={md.planet} sub={`until ${dayjs(md.endDate).format('MMM YYYY')}`} />
              {ad && <Stat label="Antar Dasha" value={ad.planet} sub={`until ${dayjs(ad.endDate).format('MMM YYYY')}`} />}
              <Stat label="Sade Sati" value="Tapering" sub="12th from natal Moon" />
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
            <p className="mt-1 text-sm text-text-tertiary">Run a five-Guru debate on a specific question about this chart.</p>
          </Link>
        </aside>
      </div>

      {/* Sub-nav links */}
      <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ['charts', 'Divisional'],
          ['dashas', 'Dashas'],
          ['doshas', 'Doshas'],
          ['yogas', 'Yogas'],
          ['ashtakvarga', 'Ashtakavarga'],
          ['transits', 'Transits'],
          ['report', 'Report'],
        ].map(([slug, label]) => (
          <Link key={slug} to={`/app/chart/${id}/${slug}`}
            className="rounded-md border border-hairline-subtle bg-surface px-4 py-3 text-center text-sm text-text-secondary hover:border-brand-maroon hover:text-text-primary">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, to }: { icon: React.ElementType; label: string; to?: string }) {
  const cls = 'inline-flex items-center gap-2 rounded-sm border border-hairline-subtle bg-surface px-3 py-2 text-sm text-text-secondary hover:bg-elevated';
  if (to) return <Link to={to} className={cls}><Icon className="h-4 w-4" />{label}</Link>;
  return <button className={cls}><Icon className="h-4 w-4" />{label}</button>;
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

function OverviewTab({ chart, doshaCount, yogas, md, ad }: { chart: DivisionalChart; doshaCount: number; yogas: any[]; md: string; ad: string }) {
  const present = yogas.filter(y => y.isPresent).slice(0, 3);
  return (
    <div className="space-y-5 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
      <div>
        <div className="text-eyebrow text-text-tertiary">Synthesis</div>
        <p className="mt-2 text-body text-text-secondary">
          A {chart.planets[0].signName} ascendant chart with strong concentration in the 9th and 10th houses — a configuration that classical texts associate with public-facing work, recognition through merit, and a steady rise built on intellect and persistence.
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

function HousesTab({ chart }: { chart: DivisionalChart }) {
  const planetsByHouse = new Map<number, PlanetPosition[]>();
  chart.planets.forEach(p => {
    if (p.planet === 'ascendant') return;
    const arr = planetsByHouse.get(p.houseNumber) ?? [];
    arr.push(p);
    planetsByHouse.set(p.houseNumber, arr);
  });
  const themes: Record<number, string> = {
    1: 'Self, body, vitality', 2: 'Wealth, family, speech', 3: 'Siblings, courage, communication',
    4: 'Mother, home, comforts', 5: 'Children, intellect, romance', 6: 'Health, debts, enemies',
    7: 'Spouse, partnerships', 8: 'Longevity, transformation', 9: 'Dharma, fortune, father',
    10: 'Career, public life', 11: 'Gains, network, fulfilment', 12: 'Loss, liberation, foreign lands',
  };
  return (
    <div className="overflow-hidden rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <table className="w-full text-sm">
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
              <tr key={h} className="hover:bg-elevated/50">
                <td className="px-4 py-3 font-mono text-text-primary">H{h}</td>
                <td className="px-4 py-3"><span className="text-text-primary">{SIGN_NAMES[sign - 1]}</span> <span className="ml-1 font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[sign - 1]}</span></td>
                <td className="px-4 py-3">
                  {occ.length === 0 ? <span className="text-text-muted">—</span> :
                    occ.map(p => <span key={p.planet} className="mr-2 font-mono text-xs" style={{ color: `hsl(var(--planet-${p.planet}))` }}>{PLANET_LABELS[p.planet].short}</span>)}
                </td>
                <td className="px-4 py-3 text-text-tertiary">{themes[h]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlanetsTab({ chart }: { chart: DivisionalChart }) {
  return (
    <div className="overflow-hidden rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <table className="w-full text-sm">
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
