import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, FileText, TrendingUp, Calendar } from 'lucide-react';

interface Stats {
  total_users: number;
  total_charts: number;
  users_today: number;
  charts_today: number;
  users_this_week: number;
  charts_this_week: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase.rpc('admin_get_stats');
      if (err) { setError(err.message); setLoading(false); return; }
      setStats(data as unknown as Stats);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-brand-saffron" /></div>;
  if (error) return <div className="rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">{error}</div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-brand-maroon' },
    { label: 'Total Charts', value: stats.total_charts, icon: FileText, color: 'text-brand-saffron' },
    { label: 'Users Today', value: stats.users_today, icon: TrendingUp, color: 'text-semantic-positive' },
    { label: 'Charts Today', value: stats.charts_today, icon: Calendar, color: 'text-semantic-info' },
    { label: 'Users This Week', value: stats.users_this_week, icon: TrendingUp, color: 'text-brand-gold' },
    { label: 'Charts This Week', value: stats.charts_this_week, icon: Calendar, color: 'text-brand-gold' },
  ];

  return (
    <div>
      <h1 className="font-display text-h2 text-text-primary">Dashboard</h1>
      <p className="mt-1 text-sm text-text-muted">Overview of your Acharya Jyotish instance.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className={`mt-2 font-display text-h1 ${color}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
