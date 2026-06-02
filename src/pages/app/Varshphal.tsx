import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useKundli } from '@/hooks/useKundli';
import { KundliChart, KundliFrame } from '@/components/kundli/KundliChart';
import { useChartStore } from '@/stores/useChartStore';
import {
  SIGN_NAMES, SIGN_NAMES_DEVA,
  type DivisionalChart, type PlanetName, type PlanetPosition,
  type VarshphalData, type SahamsData,
} from '@/lib/astro/types';

const PLANET_NAME_TO_KEY: Record<string, PlanetName> = {
  sun: 'sun', moon: 'moon', mars: 'mars', mercury: 'mercury', jupiter: 'jupiter',
  venus: 'venus', saturn: 'saturn', rahu: 'rahu', ketu: 'ketu',
  Sun: 'sun', Moon: 'moon', Mars: 'mars', Mercury: 'mercury', Jupiter: 'jupiter',
  Venus: 'venus', Saturn: 'saturn', Rahu: 'rahu', Ketu: 'ketu',
};

/** JD → Date conversion (UT). */
function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">
      Recalculate this chart to generate {label}.
    </div>
  );
}

export default function Varshphal() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);
  const chartStyle = useChartStore((s) => s.chartStyle);
  const v = data?.varshphal;

  const wheel = useMemo<DivisionalChart | null>(() => {
    if (!v) return null;
    const planets: PlanetPosition[] = v.planets.map((p) => ({
      planet: PLANET_NAME_TO_KEY[p.planet] ?? 'saturn',
      longitude: p.longitude,
      signNumber: p.signNumber,
      signName: p.signName,
      signDegree: p.signDegree,
      nakshatra: p.nakshatra,
      nakshatraPada: p.nakshatraPada,
      houseNumber: p.houseNumber,
      isRetrograde: p.isRetrograde,
      isCombust: false,
    }));
    return {
      varga: 'D1',
      vargaName: 'Varshphal',
      significance: 'Annual chart (solar return)',
      ascendantSign: v.annualAscSign,
      planets,
    };
  }, [v]);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Tajik · Varshphal</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Annual Chart</h1>
      {v && (
        <p className="mt-2 font-mono text-sm text-text-tertiary">
          Year {v.years} · Varsha Pravesh {dayjs(jdToDate(v.varshaPraveshJd)).format('DD MMM YYYY HH:mm')} UTC
        </p>
      )}

      {!v || !wheel ? (
        <div className="mt-8"><EmptyState label="Varshphal" /></div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <KundliFrame title={`Annual chart · Year ${v.years}`} subtitle={`${v.annualAscSign ? SIGN_NAMES[v.annualAscSign - 1] : ''} ascendant`}>
              <KundliChart chart={wheel} style={chartStyle} />
            </KundliFrame>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard label="Muntha Sign" value={SIGN_NAMES[v.munthaSign - 1] ?? `${v.munthaSign}`} sub={SIGN_NAMES_DEVA[v.munthaSign - 1]} />
              <StatCard label="Muntha House" value={`H${v.munthaHouse}`} />
              <StatCard label="Year Lord (Varshesh)" value={v.yearLord} capitalize />
            </div>

            <PlanetTable planets={v.planets} />

            {v.tajikYogas && <TajikYogas data={v.tajikYogas} />}

            {v.sahams && <SahamsTable data={v.sahams} />}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, capitalize }: { label: string; value: string; sub?: string; capitalize?: boolean }) {
  return (
    <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
      <div className="text-eyebrow text-text-tertiary">{label}</div>
      <div className={`mt-1 font-display text-h3 text-text-primary ${capitalize ? 'capitalize' : ''}`}>{value}</div>
      {sub && <div className="font-deva text-xs text-text-tertiary">{sub}</div>}
    </div>
  );
}

function PlanetTable({ planets }: { planets: VarshphalData['planets'] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th className="px-4 py-2 font-medium">Planet</th>
            <th className="px-3 py-2 font-medium">Sign</th>
            <th className="px-3 py-2 text-right font-medium">Degree</th>
            <th className="px-3 py-2 font-medium">Nakshatra</th>
            <th className="px-3 py-2 font-medium">House</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-subtle">
          {planets.map((p) => (
            <tr key={p.planet}>
              <td className="px-4 py-2 font-display capitalize text-text-primary">
                {p.planet}{p.isRetrograde && <span className="ml-1 text-brand-saffron">℞</span>}
              </td>
              <td className="px-3 py-2">
                <span className="text-text-secondary">{p.signName}</span>
                <span className="ml-1 font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[p.signNumber - 1]}</span>
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-text-tertiary">{p.signDegree.toFixed(2)}°</td>
              <td className="px-3 py-2 text-xs text-text-secondary">{p.nakshatra}</td>
              <td className="px-3 py-2 font-mono text-xs text-text-tertiary">H{p.houseNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TajikYogas({ data }: { data: NonNullable<VarshphalData['tajikYogas']> }) {
  const hasAny = data.ithasala.length || data.eesarpha.length || data.nakta.length || data.yamaya.length || data.ishkavala || data.induvara;
  return (
    <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
      <h2 className="font-display text-h3 text-text-primary">Tajik Yogas</h2>
      {!hasAny ? (
        <p className="mt-3 text-sm text-text-tertiary">No active Tajik yogas detected for this year.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {data.ithasala.length > 0 && (
            <YogaGroup title="Ithasala" subtitle="Applying aspect — culminating outcome">
              {data.ithasala.map((y, i) => (
                <YogaChip key={i}>
                  <span className="capitalize">{y.planet1}</span> → <span className="capitalize">{y.planet2}</span>
                  {y.ithasalaType && (
                    <span className="ml-2 rounded-sm bg-brand-saffron/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-saffron">
                      {y.ithasalaType === 1 ? 'Varthamaana' : y.ithasalaType === 2 ? 'Poorna' : 'Bhavishya'}
                    </span>
                  )}
                </YogaChip>
              ))}
            </YogaGroup>
          )}
          {data.eesarpha.length > 0 && (
            <YogaGroup title="Eesarpha" subtitle="Separating aspect — past matter">
              {data.eesarpha.map((y, i) => (
                <YogaChip key={i}><span className="capitalize">{y.planet1}</span> ← <span className="capitalize">{y.planet2}</span></YogaChip>
              ))}
            </YogaGroup>
          )}
          {data.nakta.length > 0 && (
            <YogaGroup title="Nakta" subtitle="Connection through a mediating planet">
              {data.nakta.map((y, i) => (
                <YogaChip key={i}><span className="capitalize">{y.planet1}</span> · <span className="text-brand-saffron capitalize">{y.mediator}</span> · <span className="capitalize">{y.planet2}</span></YogaChip>
              ))}
            </YogaGroup>
          )}
          {data.yamaya.length > 0 && (
            <YogaGroup title="Yamaya" subtitle="Day/night mediation">
              {data.yamaya.map((y, i) => (
                <YogaChip key={i}><span className="capitalize">{y.planet1}</span> · <span className="text-brand-saffron capitalize">{y.mediator}</span> · <span className="capitalize">{y.planet2}</span></YogaChip>
              ))}
            </YogaGroup>
          )}
          {(data.ishkavala || data.induvara) && (
            <div className="flex flex-wrap gap-2">
              {data.ishkavala && <span className="rounded-sm border border-semantic-positive/40 bg-semantic-positive/5 px-2 py-1 text-xs font-medium text-semantic-positive">Ishkavala</span>}
              {data.induvara && <span className="rounded-sm border border-semantic-negative/40 bg-semantic-negative/5 px-2 py-1 text-xs font-medium text-semantic-negative">Induvara</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function YogaGroup({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm text-text-primary">{title}</h3>
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">{subtitle}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function YogaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-hairline-subtle bg-canvas px-2 py-1 font-mono text-xs text-text-secondary">
      {children}
    </span>
  );
}

function SahamsTable({ data }: { data: SahamsData }) {
  return (
    <div className="rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <div className="border-b border-hairline-subtle px-5 py-4">
        <h2 className="font-display text-h3 text-text-primary">Sahams (36 Sensitive Points)</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          {data.isDayBirth ? 'Day' : 'Night'} birth formulas applied · {data.citation}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">Saham</th>
              <th className="px-3 py-2 font-medium">Meaning</th>
              <th className="px-3 py-2 font-medium">Sign</th>
              <th className="px-3 py-2 text-right font-medium">Degree</th>
              <th className="px-3 py-2 font-medium">Nakshatra</th>
              <th className="px-3 py-2 font-medium">House</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {data.sahams.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-display text-text-primary">{s.name}</td>
                <td className="px-3 py-2 text-xs text-text-tertiary">{s.meaning}</td>
                <td className="px-3 py-2">
                  <span className="text-text-secondary">{s.signName}</span>
                  <span className="ml-1 font-deva text-xs text-text-tertiary">{SIGN_NAMES_DEVA[s.signNumber - 1]}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs text-text-tertiary">{s.signDegree.toFixed(2)}°</td>
                <td className="px-3 py-2 text-xs text-text-secondary">{s.nakshatra}</td>
                <td className="px-3 py-2 font-mono text-xs text-text-tertiary">H{s.houseNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}