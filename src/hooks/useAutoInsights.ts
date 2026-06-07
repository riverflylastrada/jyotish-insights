import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useKundli } from '@/hooks/useKundli';
import { supabase } from '@/integrations/supabase/client';
import type { KundliData } from '@/lib/astro/types';

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Session-scoped dedupe so the background LLM call fires at most once per chart,
// no matter how many chart sub-pages mount or how often the user navigates.
const attempted = new Set<string>();

/**
 * Auto-insights (optional AI text on houses/dashas/yogas/doshas/vargas) used to
 * be generated *inside* calculateKundli, which blocked the ~25ms chart on a
 * ~25s LLM round-trip. They're now generated here — after the chart has already
 * rendered — and merged back into the cached + persisted snapshot, so they
 * appear progressively and are cached for next time without ever blocking.
 */
export function useAutoInsights(chartId: string | undefined) {
  const queryClient = useQueryClient();
  const { data } = useKundli(chartId ?? '');

  useEffect(() => {
    if (!chartId || !isUuid(chartId)) return;
    if (!data) return;
    if (data.autoInsights) return; // already have them
    if (attempted.has(chartId)) return;
    attempted.add(chartId);

    let cancelled = false;
    (async () => {
      try {
        const resp = await supabase.functions.invoke('guru-debate', {
          body: { mode: 'auto-insights', question: 'auto-insights', chart: data, turnId: crypto.randomUUID(), turnKind: 'auto' },
        });
        const insights = resp.data;
        if (resp.error || !insights || insights.error) return;
        if (cancelled) return;

        const merged = { ...data, autoInsights: insights } as KundliData;

        // Update every cached variant of this chart's query in place.
        queryClient.setQueriesData<KundliData>(
          {
            predicate: (q) =>
              q.queryKey[0] === 'chart' &&
              q.queryKey[1] === chartId &&
              q.queryKey[2] === 'kundli',
          },
          (prev) => (prev ? ({ ...prev, autoInsights: insights } as KundliData) : prev),
        );

        // Persist back to the saved snapshot so it's cached next visit (best-effort).
        void supabase
          .from('charts')
          .update({ snapshot: merged as unknown as never })
          .eq('id', chartId);
      } catch {
        // Best-effort enrichment — never surface as an error.
        attempted.delete(chartId); // allow a later retry
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chartId, data, queryClient]);
}
