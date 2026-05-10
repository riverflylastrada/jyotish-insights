import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="text-eyebrow text-brand-saffron">Dashboard</div>
      <h1 className="mt-2 font-display text-h1 text-text-primary">Welcome back</h1>
      <p className="mt-2 text-body text-text-secondary">Cast a new chart, or open the demo to see what a full report looks like.</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Link to="/app/new" className="group rounded-md border border-hairline-subtle bg-surface p-8 shadow-sm transition-shadow hover:shadow-md">
          <div className="text-eyebrow text-brand-saffron">Create</div>
          <div className="mt-2 font-display text-h2 text-text-primary">New Kundli</div>
          <p className="mt-2 text-sm text-text-secondary">Two-step wizard. Birth details, then place. We compute the rest.</p>
          <div className="mt-6 inline-flex items-center gap-1 text-sm text-brand-maroon">Start <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
        </Link>
        <Link to="/app/chart/demo" className="group rounded-md border border-brand-maroon/30 bg-surface p-8 shadow-sm transition-shadow hover:shadow-md">
          <div className="text-eyebrow text-brand-saffron flex items-center gap-1"><Star className="h-3 w-3 fill-brand-gold text-brand-gold" /> Sample</div>
          <div className="mt-2 font-display text-h2 text-text-primary">Open the demo chart</div>
          <p className="mt-2 text-sm text-text-secondary">15 Aug 1980 · 14:30 · Ahmedabad. Fully populated reference report.</p>
          <div className="mt-6 inline-flex items-center gap-1 text-sm text-brand-maroon">Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
        </Link>
      </div>
    </div>
  );
}
