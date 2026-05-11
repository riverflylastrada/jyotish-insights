import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import type { Dosha } from '@/lib/astro/types';

const DOSHA_LABEL: Record<Dosha['name'], { title: string; deva: string; classical: string }> = {
  mangal:       { title: 'Mangal Dosha',     deva: 'मंगल दोष',      classical: 'Mars in 1, 4, 7, 8, or 12 from Lagna or Moon — Brihat Parashara Hora Sastra, Ch. 80' },
  kaal_sarp:    { title: 'Kaal Sarp Dosha',  deva: 'काल सर्प दोष',  classical: 'All grahas hemmed between Rahu and Ketu axis — Phaladeepika' },
  sade_sati:    { title: 'Sade Sati',        deva: 'साढ़े साती',     classical: 'Saturn transiting 12th, 1st, 2nd from natal Moon — Saravali, Ch. 35' },
  pitra:        { title: 'Pitra Dosha',      deva: 'पितृ दोष',      classical: 'Sun afflicted by Rahu/Saturn, or 9th lord debilitated — classical commentaries' },
  guru_chandal: { title: 'Guru Chandala',    deva: 'गुरु चांडाल',    classical: 'Jupiter conjunct Rahu — Phaladeepika' },
  shakat:       { title: 'Shakat Yoga',      deva: 'शकट योग',       classical: 'Moon in 6/8/12 from Jupiter — Brihat Jataka' },
};

const SEVERITY_BARS: Record<NonNullable<Dosha['severity']>, { bars: number; color: string; label: string }> = {
  low:       { bars: 1, color: 'hsl(var(--semantic-info))',      label: 'Low' },
  medium:    { bars: 2, color: 'hsl(var(--brand-saffron))',      label: 'Medium' },
  high:      { bars: 3, color: 'hsl(var(--semantic-negative))',  label: 'High' },
  cancelled: { bars: 0, color: 'hsl(var(--semantic-positive))',  label: 'Cancelled' },
};

export default function Doshas() {
  const { id = 'demo' } = useParams();
  const { data, isLoading } = useKundli(id);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Configurations</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Doshas & Remedies</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Doshas are afflictive configurations described in the classical texts. Detection is mechanical; severity, cancellation, and remedy belong to the judgment of the astrologer.
      </p>

      <div className="mt-8 space-y-5">
        {data.doshas.map((d) => {
          const meta = DOSHA_LABEL[d.name];
          const sev = d.severity ? SEVERITY_BARS[d.severity] : null;
          return (
            <article key={d.name} className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {d.isPresent ? <AlertTriangle className="h-4 w-4 text-brand-saffron" /> : <ShieldCheck className="h-4 w-4 text-semantic-positive" />}
                    <h2 className="font-display text-h2 text-text-primary">{meta.title}</h2>
                    <span className="font-deva text-sm text-text-tertiary">{meta.deva}</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-text-tertiary">{meta.classical}</div>
                </div>
                <div className="text-right">
                  <div className="text-eyebrow text-text-tertiary">Status</div>
                  {d.isPresent ? (
                    <div className="mt-1 inline-flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1,2,3].map((b) => (
                          <span key={b} className="h-3 w-2 rounded-sm" style={{ background: sev && b <= sev.bars ? sev.color : 'hsl(var(--border-subtle))' }} />
                        ))}
                      </div>
                      <span className="text-sm text-text-secondary">{sev?.label ?? 'Present'}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-semantic-positive">Not present</div>
                  )}
                </div>
              </div>

              <div className="gold-rule mt-5" />
              <p className="mt-4 text-body text-text-secondary">{d.explanation}</p>

              {d.affectedAreas.length > 0 && (
                <div className="mt-4">
                  <div className="text-eyebrow text-text-tertiary">Affected areas</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d.affectedAreas.map((a) => (
                      <span key={a} className="rounded-sm border border-hairline-subtle bg-elevated px-2.5 py-1 text-xs text-text-secondary">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {d.remedies.length > 0 && (
                <div className="mt-5">
                  <div className="text-eyebrow text-text-tertiary">Remedies</div>
                  <ul className="mt-3 divide-y divide-hairline-subtle">
                    {d.remedies.map((r) => (
                      <li key={r.title} className="flex items-start justify-between gap-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm text-text-primary">{r.title}</span>
                            <span className="rounded-sm border border-hairline-subtle px-1.5 py-0.5 text-eyebrow text-text-tertiary capitalize">{r.type}</span>
                          </div>
                          <p className="mt-1 text-sm text-text-tertiary">{r.description}</p>
                        </div>
                        <span className={`text-eyebrow capitalize ${r.priority === 'high' ? 'text-brand-maroon' : r.priority === 'medium' ? 'text-brand-saffron' : 'text-text-tertiary'}`}>{r.priority}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}