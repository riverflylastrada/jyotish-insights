import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Loader2, AlertTriangle, Shield, Info } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import type { SadeSatiPeriod, SaturnTransitPeriod, SaturnTransitsData } from '@/lib/astro/types';
import dayjs from 'dayjs';

type Tab = 'sade_sati' | 'moon_transits' | 'asc_transits';

function formatDuration(days: number): string {
  const years = Math.floor(days / 365.25);
  const months = Math.round((days % 365.25) / 30.44);
  if (years > 0 && months > 0) return `${years}y ${months}m`;
  if (years > 0) return `${years}y`;
  return `${months}m`;
}

function progressPercent(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

// ─── Period Card ────────────────────────────────────────────────────────────

function SadeSatiCard({ period }: { period: SadeSatiPeriod }) {
  const pct = progressPercent(period.startDate, period.endDate);
  const phaseColors: Record<number, string> = {
    1: 'border-semantic-warning/40 bg-semantic-warning/5',
    2: 'border-semantic-negative/40 bg-semantic-negative/5',
    3: 'border-brand-gold/40 bg-brand-gold/5',
  };
  const phaseIcons: Record<number, string> = {
    1: 'text-semantic-warning',
    2: 'text-semantic-negative',
    3: 'text-brand-gold',
  };

  return (
    <div className={`rounded-md border p-4 shadow-sm ${period.isActive ? phaseColors[period.phase] : 'border-hairline-subtle bg-surface'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {period.isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-semantic-negative/10 px-2 py-0.5 text-[10px] font-semibold text-semantic-negative uppercase tracking-wider">
                Active Now
              </span>
            )}
            <span className={`text-xs font-semibold ${phaseIcons[period.phase]}`}>
              Phase {period.phase}
            </span>
          </div>
          <h4 className="mt-1 font-display text-sm text-text-primary">{period.phaseLabel}</h4>
          <p className="mt-0.5 font-mono text-xs text-text-tertiary">
            Saturn in {period.saturnSignName}
          </p>
        </div>
        <div className="text-right text-xs text-text-tertiary shrink-0">
          <div>{dayjs(period.startDate).format('MMM YYYY')}</div>
          <div className="text-text-muted">to</div>
          <div>{dayjs(period.endDate).format('MMM YYYY')}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
        <span>{formatDuration(period.durationDays)}</span>
        {period.isActive && (
          <>
            <div className="flex-1 rounded-full bg-hairline-subtle h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-saffron transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span>{pct}%</span>
          </>
        )}
      </div>
    </div>
  );
}

function TransitCard({ period }: { period: SaturnTransitPeriod }) {
  const pct = progressPercent(period.startDate, period.endDate);
  const typeLabel = period.type === 'kantaka' ? 'Kantaka Shani' : 'Ashtama Shani';
  const houseLabel = period.type === 'kantaka'
    ? `${period.houseFromRef}th house`
    : '8th house';
  const severity = period.type === 'ashtama' ? 'high' : 'medium';

  return (
    <div className={`rounded-md border p-4 shadow-sm ${period.isActive ? 'border-semantic-negative/40 bg-semantic-negative/5' : 'border-hairline-subtle bg-surface'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {period.isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-semantic-negative/10 px-2 py-0.5 text-[10px] font-semibold text-semantic-negative uppercase tracking-wider">
                Active Now
              </span>
            )}
            {severity === 'high' ? (
              <AlertTriangle className="h-3.5 w-3.5 text-semantic-negative" />
            ) : (
              <Shield className="h-3.5 w-3.5 text-semantic-warning" />
            )}
          </div>
          <h4 className="mt-1 font-display text-sm text-text-primary">{typeLabel}</h4>
          <p className="mt-0.5 font-mono text-xs text-text-tertiary">
            Saturn in {period.saturnSignName} ({houseLabel} from {period.reference === 'moon' ? 'Moon' : 'Lagna'})
          </p>
        </div>
        <div className="text-right text-xs text-text-tertiary shrink-0">
          <div>{dayjs(period.startDate).format('MMM YYYY')}</div>
          <div className="text-text-muted">to</div>
          <div>{dayjs(period.endDate).format('MMM YYYY')}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
        <span>{formatDuration(period.durationDays)}</span>
        {period.isActive && (
          <>
            <div className="flex-1 rounded-full bg-hairline-subtle h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-saffron transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span>{pct}%</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab panels ─────────────────────────────────────────────────────────────

function SadeSatiPanel({ data }: { data: SaturnTransitsData }) {
  const [basis, setBasis] = useState<'sign' | 'degree'>('sign');
  const periods = basis === 'sign' ? data.sadeSatiSign : data.sadeSatiDegree;

  // Group into cycles: consecutive phase-1 → phase-2 → phase-3
  const activePeriods = periods.filter(p => p.isActive);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-h3 text-text-primary">Sade Sati Periods</h3>
          <p className="mt-1 text-xs text-text-tertiary">
            7.5-year Saturn transit over natal Moon ({data.natalMoonSignName})
          </p>
        </div>
        <div className="flex rounded-sm border border-hairline-subtle p-0.5 text-xs">
          {(['sign', 'degree'] as const).map(b => (
            <button key={b} onClick={() => setBasis(b)}
              className={`rounded-sm px-3 py-1.5 capitalize transition-colors ${basis === b ? 'bg-brand-maroon text-primary-foreground' : 'text-text-tertiary hover:text-text-primary'}`}>
              {b === 'sign' ? 'Sign-Based' : 'Degree (±45°)'}
            </button>
          ))}
        </div>
      </div>

      {activePeriods.length > 0 && (
        <div className="rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-semantic-negative">
            <AlertTriangle className="h-4 w-4" />
            Sade Sati is currently active
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {activePeriods.map(p => p.phaseLabel).join(' + ')} — Saturn transiting {activePeriods[0].saturnSignName}
          </p>
        </div>
      )}

      <div className="rounded-md border border-hairline-subtle bg-surface/50 p-3">
        <div className="flex items-start gap-2 text-xs text-text-tertiary">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>Classical rule (BPHS Ch. 65):</strong> Sade Sati occurs when Saturn transits the 12th, 1st, and 2nd signs from natal Moon.
            {basis === 'degree' && ' Degree-based uses ±45° orb from natal Moon longitude.'}
          </span>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="rounded-md border border-dashed border-hairline-subtle p-8 text-center text-sm text-text-tertiary">
          No Sade Sati periods found in the scan window.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {periods.map((p, i) => (
            <SadeSatiCard key={`${p.basis}-${p.phase}-${p.startDate}-${i}`} period={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function MoonTransitsPanel({ data }: { data: SaturnTransitsData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-h3 text-text-primary">Saturn Transits from Moon</h3>
        <p className="mt-1 text-xs text-text-tertiary">
          Kantaka Shani (4th/10th) and Ashtama Shani (8th) from natal Moon ({data.natalMoonSignName})
        </p>
      </div>

      <div className="rounded-md border border-hairline-subtle bg-surface/50 p-3">
        <div className="flex items-start gap-2 text-xs text-text-tertiary">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>Kantaka Shani (Phaladeepika Ch. 26):</strong> Saturn in the 4th or 10th from Moon causes obstacles in domestic life and career.
            <br />
            <strong>Ashtama Shani (Saravali Ch. 35):</strong> Saturn in the 8th from Moon brings stress, health issues, and transformation.
          </span>
        </div>
      </div>

      {data.kantakaMoon.length > 0 && (
        <div>
          <h4 className="mb-2 text-eyebrow text-brand-saffron">Kantaka Shani (4th/10th from Moon)</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.kantakaMoon.map((p, i) => (
              <TransitCard key={`kantaka-moon-${i}`} period={p} />
            ))}
          </div>
        </div>
      )}

      {data.ashtamaMoon.length > 0 && (
        <div>
          <h4 className="mb-2 text-eyebrow text-semantic-negative">Ashtama Shani (8th from Moon)</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.ashtamaMoon.map((p, i) => (
              <TransitCard key={`ashtama-moon-${i}`} period={p} />
            ))}
          </div>
        </div>
      )}

      {data.kantakaMoon.length === 0 && data.ashtamaMoon.length === 0 && (
        <div className="rounded-md border border-dashed border-hairline-subtle p-8 text-center text-sm text-text-tertiary">
          No Kantaka or Ashtama periods from Moon found in the scan window.
        </div>
      )}
    </div>
  );
}

function AscTransitsPanel({ data }: { data: SaturnTransitsData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-h3 text-text-primary">Saturn Transits from Ascendant</h3>
        <p className="mt-1 text-xs text-text-tertiary">
          Kantaka Shani (4th/10th) and Ashtama Shani (8th) from Lagna ({data.natalAscSignName})
        </p>
      </div>

      <div className="rounded-md border border-hairline-subtle bg-surface/50 p-3">
        <div className="flex items-start gap-2 text-xs text-text-tertiary">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>From Lagna (BPHS Ch. 65):</strong> Kantaka and Ashtama Shani from the Ascendant affect the native's
            physical body, temperament, and overall life direction.
          </span>
        </div>
      </div>

      {data.kantakaAsc.length > 0 && (
        <div>
          <h4 className="mb-2 text-eyebrow text-brand-saffron">Kantaka Shani (4th/10th from Lagna)</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.kantakaAsc.map((p, i) => (
              <TransitCard key={`kantaka-asc-${i}`} period={p} />
            ))}
          </div>
        </div>
      )}

      {data.ashtamaAsc.length > 0 && (
        <div>
          <h4 className="mb-2 text-eyebrow text-semantic-negative">Ashtama Shani (8th from Lagna)</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.ashtamaAsc.map((p, i) => (
              <TransitCard key={`ashtama-asc-${i}`} period={p} />
            ))}
          </div>
        </div>
      )}

      {data.kantakaAsc.length === 0 && data.ashtamaAsc.length === 0 && (
        <div className="rounded-md border border-dashed border-hairline-subtle p-8 text-center text-sm text-text-tertiary">
          No Kantaka or Ashtama periods from Lagna found in the scan window.
        </div>
      )}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function SaturnTransits() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data, isLoading } = useKundli(id);
  const [tab, setTab] = useState<Tab>('sade_sati');

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const st = data.saturnTransits;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>

      <div className="mt-4">
        <div className="text-eyebrow text-brand-saffron">Saturn Transits</div>
        <h1 className="mt-2 font-display text-h1 text-text-primary">
          Shani Gochara
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Comprehensive Saturn transit analysis — Sade Sati, Kantaka Shani, and Ashtama Shani periods
          across the lifetime, computed from both Moon and Ascendant.
        </p>
      </div>

      {!st ? (
        <div className="mt-8 rounded-md border border-dashed border-hairline-subtle p-12 text-center">
          <p className="text-sm text-text-tertiary">
            Saturn transit data not available. Recalculate the chart to generate this data.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="mt-6 flex border-b border-hairline-subtle">
            {([
              ['sade_sati', 'Sade Sati'],
              ['moon_transits', 'Moon Transits'],
              ['asc_transits', 'Ascendant Transits'],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`relative px-4 py-3 text-sm transition-colors ${tab === key ? 'text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}>
                {label}
                {tab === key && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-saffron" />}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {tab === 'sade_sati' && <SadeSatiPanel data={st} />}
            {tab === 'moon_transits' && <MoonTransitsPanel data={st} />}
            {tab === 'asc_transits' && <AscTransitsPanel data={st} />}
          </div>

          {/* Citation */}
          <div className="mt-8 rounded-md border border-hairline-subtle bg-surface/50 p-4 text-xs text-text-tertiary">
            <strong>Sources:</strong> {st.citation}
          </div>
        </>
      )}
    </div>
  );
}
