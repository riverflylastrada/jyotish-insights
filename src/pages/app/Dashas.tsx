import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { DashaTimeline } from '@/components/dashas/DashaTimeline';
import type { DashaSystem } from '@/lib/astro/types';

const SYSTEM_META: Record<DashaSystem['system'], { label: string; cycle: string; tagline: string }> = {
  vimshottari: { label: 'Vimshottari', cycle: '120 year cycle', tagline: 'Standard nakshatra-based maha-dasha sequence.' },
  yogini:      { label: 'Yogini',      cycle: '36 year cycle',  tagline: 'Eight yoginis ruling shorter dasha periods.' },
  ashtottari:  { label: 'Ashtottari',  cycle: '108 year cycle', tagline: 'Ashtottari maha-dasha sequence used in some lineages.' },
  char:        { label: 'Char',        cycle: '—',              tagline: 'Char dasha.' },
  kalachakra:  { label: 'Kalachakra',  cycle: 'sign-based cycle', tagline: 'Sign-based dasha using Savya/Apasavya nakshatra-pada groups.' },
};

const SYSTEM_ORDER: DashaSystem['system'][] = ['vimshottari', 'yogini', 'ashtottari', 'char', 'kalachakra'];

export default function Dashas() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);
  const available = (data?.dashas ?? []).slice().sort(
    (a, b) => SYSTEM_ORDER.indexOf(a.system) - SYSTEM_ORDER.indexOf(b.system),
  );
  const [active, setActive] = useState<DashaSystem['system'] | null>(null);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const current = available.find((s) => s.system === active) ?? available[0];
  const meta = current ? SYSTEM_META[current.system] : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      {current && meta && (
        <>
          <div className="mt-3 text-eyebrow text-brand-saffron">{meta.label} · {meta.cycle}</div>
          <h1 className="mt-1 font-display text-h1 text-text-primary">Dasha Timeline</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">{meta.tagline} Click any Maha to drill into Antar / Pratyantar periods.</p>
        </>
      )}

      {available.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-1 border-b border-hairline-subtle">
          {available.map((s) => {
            const isActive = current?.system === s.system;
            return (
              <button
                key={s.system}
                onClick={() => setActive(s.system)}
                className={`relative px-4 py-3 text-sm capitalize transition-colors ${isActive ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
              >
                {SYSTEM_META[s.system].label}
                {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-saffron" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        {current ? (
          <DashaTimeline system={current} syntheticPratyantar={current.system === 'vimshottari'} />
        ) : (
          <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-10 text-center text-sm text-text-tertiary">
            No dasha systems available. Recalculate this chart to generate dashas.
          </div>
        )}
      </div>
    </div>
  );
}