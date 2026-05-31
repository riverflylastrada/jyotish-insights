import { useMatch } from 'react-router-dom';
import { useAutoInsights } from '@/hooks/useAutoInsights';

/**
 * Headless: on any /app/chart/:id/* route, kicks off background generation of
 * the chart's AI auto-insights (once per chart) and merges them into the cached
 * snapshot. Renders nothing. Mounted once in AppLayout alongside
 * StaleSnapshotBanner so every chart sub-page is covered without per-page wiring.
 */
export function AutoInsightsLoader() {
  const match = useMatch('/app/chart/:id/*');
  const chartId = match?.params.id;
  // Gate BEFORE touching React Query hooks: on non-chart routes (and in tests
  // that render AppLayout without a QueryClientProvider) we must not call
  // useQueryClient/useKundli at all.
  if (!chartId) return null;
  return <Loader chartId={chartId} />;
}

function Loader({ chartId }: { chartId: string }) {
  useAutoInsights(chartId);
  return null;
}
