import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import type { KpData } from '@/lib/astro/types';

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">
      Recalculate this chart to generate {label}.
    </div>
  );
}

export default function Kp() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const kp = data.kp;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Krishnamurti Paddhati</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">KP System</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Sub-lord based prediction system. Levels A→D rank significators from strongest to weakest.
      </p>

      {!kp ? (
        <div className="mt-8"><EmptyState label="KP data" /></div>
      ) : (
        <div className="mt-8 space-y-8">
          <PlanetSubLords data={kp.planetSubLords} />
          {kp.rulingPlanets && <RulingPlanets data={kp.rulingPlanets} />}
          {kp.cuspalSubLords && kp.cuspalSubLords.length > 0 && <CuspalSubLords data={kp.cuspalSubLords} />}
          {kp.houseSignificators && kp.houseSignificators.length > 0 && <HouseSignificators data={kp.houseSignificators} />}
        </div>
      )}
    </div>
  );
}

function PlanetSubLords({ data }: { data: KpData['planetSubLords'] }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">Planet Sub-Lords</h2>
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
            {data.map((r) => (
              <tr key={r.planet}>
                <td className="px-4 py-2 font-display capitalize text-text-primary">{r.planet}</td>
                <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.signLord}</td>
                <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.starLord}</td>
                <td className="px-4 py-2 font-mono text-xs text-brand-saffron">{r.subLord}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

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

function CuspalSubLords({ data }: { data: NonNullable<KpData['cuspalSubLords']> }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">Cuspal Sub-Lords</h2>
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
            {data.map((r) => (
              <tr key={r.cusp}>
                <td className="px-4 py-2 font-mono text-text-primary">H{r.cusp}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-text-tertiary">{r.longitude.toFixed(2)}°</td>
                <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.signLord}</td>
                <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.starLord}</td>
                <td className="px-4 py-2 font-mono text-xs text-brand-saffron">{r.subLord}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HouseSignificators({ data }: { data: NonNullable<KpData['houseSignificators']> }) {
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

  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">House Significators</h2>
      <div className="space-y-3">
        {data.map((h) => (
          <div key={h.house} className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
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
        ))}
      </div>
    </section>
  );
}