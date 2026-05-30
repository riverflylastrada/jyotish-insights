import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

export interface TransitAlert {
  id: string;
  chart_id: string;
  user_id: string;
  event_key: string;
  type: string;
  severity: string;
  starts: string;
  ends: string | null;
  title: string;
  description: string;
  citation: string | null;
  affected_houses: number[] | null;
  read_at: string | null;
  created_at: string;
  chart_name?: string;
}

export function useTransitAlerts() {
  const { user } = useSession();
  const qc = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['transit-alerts', user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<TransitAlert[]> => {
      const { data: alerts, error } = await supabase
        .from('transit_alerts')
        .select('*')
        .order('starts', { ascending: false });
      if (error) throw error;
      if (!alerts || alerts.length === 0) return [];

      // Fetch chart names for display
      const chartIds = [...new Set(alerts.map(a => a.chart_id))];
      const { data: charts } = await supabase
        .from('charts')
        .select('id, name')
        .in('id', chartIds);
      const chartMap = new Map(charts?.map(c => [c.id, c.name]) ?? []);

      return alerts.map(a => ({
        ...a,
        chart_name: chartMap.get(a.chart_id) ?? 'Unknown chart',
      }));
    },
  });

  const unreadCount = alertsQuery.data?.filter(a => !a.read_at).length ?? 0;

  const markRead = useMutation({
    mutationFn: async (alertIds: string[]) => {
      const { error } = await supabase
        .from('transit_alerts')
        .update({ read_at: new Date().toISOString() })
        .in('id', alertIds);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transit-alerts'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('transit_alerts')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transit-alerts'] }),
  });

  return {
    alerts: alertsQuery.data ?? [],
    isLoading: alertsQuery.isLoading,
    unreadCount,
    markRead,
    markAllRead,
  };
}
