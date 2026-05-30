import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
import { useTransitAlerts, type TransitAlert } from '@/hooks/useTransitAlerts';
import { usePlanGate } from '@/hooks/usePlanGate';
import { cn } from '@/lib/utils';

const SEVERITY_COLORS: Record<string, string> = {
  high: 'border-l-red-500 bg-red-500/5',
  medium: 'border-l-amber-500 bg-amber-500/5',
  low: 'border-l-emerald-500 bg-emerald-500/5',
};

const TYPE_LABELS: Record<string, string> = {
  sade_sati: 'Sade Sati',
  ashtama_shani: 'Ashtama Shani',
  sign_ingress: 'Sign Change',
  guru_bala: 'Guru Bala',
  retrograde: 'Retrograde',
  eclipse: 'Eclipse',
  dasha_transition: 'Dasha',
};

function deepLinkFor(alert: TransitAlert): string {
  const base = `/app/chart/${alert.chart_id}`;
  if (alert.type === 'sade_sati' || alert.type === 'ashtama_shani' || alert.type === 'sign_ingress' || alert.type === 'guru_bala' || alert.type === 'retrograde' || alert.type === 'eclipse') {
    return `${base}/transits`;
  }
  if (alert.type === 'dasha_transition') return `${base}/dashas`;
  return base;
}

export default function Notifications() {
  const allowed = usePlanGate('transit_alerts');
  const { alerts, isLoading, unreadCount, markRead, markAllRead } = useTransitAlerts();
  const [filter, setFilter] = useState<string>('all');

  if (!allowed) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <Bell className="mx-auto h-12 w-12 text-text-tertiary" />
        <h2 className="mt-4 font-display text-h2 text-text-primary">Transit Alerts</h2>
        <p className="mt-2 text-body text-text-secondary">
          Upgrade to Acharya tier to access transit and dasha event notifications.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }

  // Group by chart
  const grouped = new Map<string, TransitAlert[]>();
  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);
  for (const alert of filtered) {
    const key = alert.chart_name ?? alert.chart_id;
    const list = grouped.get(key) ?? [];
    list.push(alert);
    grouped.set(key, list);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-eyebrow text-brand-saffron">Notifications</div>
          <h1 className="mt-2 font-display text-h1 text-text-primary">Transit Alerts</h1>
          <p className="mt-1 text-body text-text-secondary">
            Upcoming transit and dasha events for your saved charts.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="inline-flex items-center gap-2 rounded-sm bg-elevated px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="mt-6 flex flex-wrap gap-2">
        {['all', 'sade_sati', 'ashtama_shani', 'sign_ingress', 'guru_bala', 'retrograde', 'eclipse', 'dasha_transition'].map(t => (
          <button key={t}
            onClick={() => setFilter(t)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === t ? 'bg-brand-saffron text-white' : 'bg-elevated text-text-secondary hover:text-text-primary',
            )}>
            {t === 'all' ? 'All' : TYPE_LABELS[t] ?? t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-text-tertiary opacity-40" />
          <p className="mt-4 text-body text-text-tertiary">No alerts to show.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[...grouped.entries()].map(([chartName, items]) => (
            <div key={chartName}>
              <h2 className="mb-3 text-sm font-semibold text-text-secondary">{chartName}</h2>
              <div className="space-y-2">
                {items.map(alert => (
                  <AlertCard key={alert.id} alert={alert} onMarkRead={() => markRead.mutate([alert.id])} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, onMarkRead }: { alert: TransitAlert; onMarkRead: () => void }) {
  const isUnread = !alert.read_at;
  const severityClass = SEVERITY_COLORS[alert.severity] ?? '';
  const dateStr = new Date(alert.starts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={cn(
      'relative rounded-md border border-hairline-subtle border-l-4 p-4 transition-colors',
      severityClass,
      isUnread && 'ring-1 ring-brand-saffron/20',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              alert.severity === 'high' ? 'bg-red-100 text-red-700' :
              alert.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-emerald-100 text-emerald-700',
            )}>
              {alert.severity}
            </span>
            <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
              {TYPE_LABELS[alert.type] ?? alert.type}
            </span>
            {isUnread && <span className="h-2 w-2 rounded-full bg-brand-saffron" />}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-text-primary">{alert.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{alert.description}</p>
          {alert.citation && (
            <p className="mt-1 text-[11px] italic text-text-tertiary">{alert.citation}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
          <span className="text-xs text-text-tertiary">{dateStr}</span>
          <Link to={deepLinkFor(alert)}
            className="inline-flex items-center gap-1 text-xs text-brand-saffron hover:underline">
            View in chart <ExternalLink className="h-3 w-3" />
          </Link>
          {isUnread && (
            <button onClick={onMarkRead}
              className="text-[11px] text-text-tertiary hover:text-text-primary">
              Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
