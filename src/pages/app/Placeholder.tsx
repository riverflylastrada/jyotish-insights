import { Link, useLocation } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function Placeholder({ title, kicker, description }: { title: string; kicker?: string; description?: string }) {
  const loc = useLocation();
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <div className="text-eyebrow text-brand-saffron">{kicker ?? 'Coming soon'}</div>
      <h1 className="mt-3 font-display text-h1 text-text-primary">{title}</h1>
      <div className="gold-rule mx-auto mt-5 w-24" />
      <p className="mt-6 text-body text-text-secondary">
        {description ?? 'This view is part of Phase 2 of the build. The route exists so the information architecture is complete; the panels will populate once the corresponding analysis modules ship.'}
      </p>
      <div className="mx-auto mt-10 w-fit rounded-md border border-hairline-subtle bg-surface px-6 py-4 text-left text-xs text-text-tertiary">
        <Sparkles className="mr-2 inline h-3 w-3 text-brand-gold" />
        Route: <span className="font-mono text-text-secondary">{loc.pathname}</span>
      </div>
      <div className="mt-8">
        <Link to="/app/chart/demo" className="inline-flex items-center gap-2 text-sm text-brand-maroon hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to chart
        </Link>
      </div>
    </div>
  );
}
