import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

export interface ResolvedDefaultChart {
  chartId: string | null;
  chartName: string | null;
  /** True when the chart came from the user's explicit default (vs the latest-chart fallback). */
  isExplicitDefault: boolean;
}

/**
 * Resolves the chart the no-chart Voice Guru entries should use, so multi-chart
 * users don't have to re-select every time:
 *   explicit default (profiles.default_chart_id) → else latest saved chart → else none.
 * Returns chartId = null when the user has no saved charts (true no-chart flow).
 */
export function useDefaultChart() {
  const { user } = useSession();
  return useQuery<ResolvedDefaultChart>({
    queryKey: ['default-chart', user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: profile }, { data: charts }] = await Promise.all([
        supabase.from('profiles').select('default_chart_id').eq('user_id', user!.id).maybeSingle(),
        supabase.from('charts').select('id,name,created_at').order('created_at', { ascending: false }),
      ]);
      const list = charts ?? [];
      const explicit = profile?.default_chart_id
        ? list.find((c) => c.id === profile.default_chart_id) ?? null
        : null;
      const chosen = explicit ?? list[0] ?? null;
      return {
        chartId: chosen?.id ?? null,
        chartName: chosen?.name ?? null,
        isExplicitDefault: !!explicit,
      };
    },
  });
}
