import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, Sparkles, AlertTriangle, BookOpen, Loader2 } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { PLANET_LABELS } from '@/lib/astro/types';
import { selectLalKitab, type LalKitabEntry } from '@/lib/astro/lalKitab';

const NATURE_STYLE: Record<LalKitabEntry['nature'], { label: string; color: string }> = {
  malefic: { label: 'Challenging', color: 'hsl(var(--semantic-negative))' },
  mixed: { label: 'Mixed', color: 'hsl(var(--semantic-warning))' },
  benefic: { label: 'Supportive', color: 'hsl(var(--semantic-positive))' },
};

export default function LalKitab() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data } = useKundli(id);

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  const d1 = data.divisionalCharts.find((c) => c.varga === 'D1')!;
  const placements = selectLalKitab(d1);

  const challengingCount = placements.filter((p) => p.entry.nature === 'malefic').length;
  const heaviest = placements.find((p) => p.entry.nature === 'malefic');
  const totalRemedies = placements.reduce((n, p) => n + p.entry.remedies.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Lal Kitab · House-based totke</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Lal Kitab Remedies</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Simple, low-cost remedies for {data.birthDetails.fullName}, drawn from the Lal Kitab tradition
        (Pt. Radhakrishna Shrimali's English edition). Each totka follows the <strong>house</strong> a planet
        occupies in the D1 (Rasi) chart — the life-domain it colours — rather than the planet's classical strength.
      </p>

      {/* Summary banner */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-brand-maroon/30 bg-surface p-4 shadow-sm">
          <div className="text-eyebrow text-brand-maroon">Attend first</div>
          <div className="mt-1 font-display text-h3 text-text-primary capitalize">{heaviest?.planet ?? '—'}</div>
          <div className="mt-1 font-mono text-xs text-text-tertiary">
            {heaviest ? `In house ${heaviest.house} — begin with this totka.` : 'No challenging placements.'}
          </div>
        </div>
        <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
          <div className="text-eyebrow text-text-tertiary">Challenging placements</div>
          <div className="mt-1 font-display text-h3 text-text-primary">{challengingCount} of 9</div>
          <div className="mt-1 font-mono text-xs text-text-tertiary">Planets needing a remedy by house.</div>
        </div>
        <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
          <div className="text-eyebrow text-text-tertiary">Remedies suggested</div>
          <div className="mt-1 font-display text-h3 text-text-primary">{totalRemedies} totke</div>
          <div className="mt-1 font-mono text-xs text-text-tertiary">Across all nine grahas.</div>
        </div>
      </div>

      {/* Per-placement remedy cards */}
      <h2 className="mt-12 font-display text-h2 text-text-primary">Your placements</h2>
      <p className="mt-1 text-body text-text-secondary">
        Ordered with the most pressing placements first. Begin small, stay consistent, and prefer the
        challenging placements before the supportive ones.
      </p>

      <div className="mt-6 space-y-6">
        {placements.map(({ planet, house, entry }) => {
          const nature = NATURE_STYLE[entry.nature];
          return (
            <article
              key={planet}
              className={`rounded-md border bg-surface p-6 shadow-sm ${entry.nature === 'malefic' ? 'border-brand-maroon/40' : 'border-hairline-subtle'}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-eyebrow text-text-tertiary">House {house}</div>
                  <h3 className="font-display text-h3 text-text-primary capitalize">
                    {planet} <span className="ml-2 font-deva text-sm text-text-tertiary">{PLANET_LABELS[planet].deva}</span>
                  </h3>
                </div>
                <span
                  className="rounded-sm border px-2 py-0.5 text-eyebrow"
                  style={{ color: nature.color, borderColor: nature.color }}
                >
                  {nature.label}
                </span>
              </div>
              <div className="gold-rule mt-4" />

              <p className="mt-4 text-body text-text-secondary">{entry.effect}</p>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <RemedyBlock icon={Sparkles} title="Totke (remedies)">
                  <ul className="space-y-1.5 text-sm text-text-secondary">
                    {entry.remedies.map((r) => <li key={r}>· {r}</li>)}
                  </ul>
                  {entry.deva && <p className="mt-2 font-deva text-body text-text-primary">{entry.deva}</p>}
                </RemedyBlock>

                {entry.caution && (
                  <RemedyBlock icon={AlertTriangle} title="Caution (avoid)">
                    <p className="text-sm text-text-secondary">{entry.caution}</p>
                  </RemedyBlock>
                )}

                <RemedyBlock icon={BookOpen} title="Source">
                  <p className="text-sm text-text-secondary">{entry.citation}</p>
                  {entry.unsourced && (
                    <p className="mt-1 text-xs text-text-tertiary">
                      House-specific elaboration of the traditional remedy — not verse-pinned; review with an astrologer.
                    </p>
                  )}
                </RemedyBlock>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-12 rounded-md border border-hairline-subtle bg-elevated/40 p-5 text-sm text-text-tertiary">
        <strong className="text-text-secondary">Disclaimer:</strong> These Lal Kitab totke are educational and
        rooted in folk tradition. They are matched to your D1 house placements, but Lal Kitab practice weighs the
        whole chart (planet conditions, debts, and timing). Undertake remedies only after a qualified astrologer's
        review, and never as a substitute for medical, legal, or financial advice.
      </div>
    </div>
  );
}

function RemedyBlock({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-eyebrow text-text-tertiary">
        <Icon className="h-3.5 w-3.5 text-brand-saffron" /> {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
