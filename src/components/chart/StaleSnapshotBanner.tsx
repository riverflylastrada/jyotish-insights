import { useMatch } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { CURRENT_SNAPSHOT_VERSION } from '@/lib/astro/types';

/**
 * Top-of-page ribbon shown on any /app/chart/:id/* route when the cached
 * snapshot was produced by an older engine version. Without this, stale
 * snapshots silently render with missing fields (44-yoga page after the
 * engine jumped to 153, missing D-81 tiles, missing avasthas, etc.) and
 * the user has no signal that a recalc would surface the new data.
 *
 * Mounted once in AppLayout — extracts the chart id from the URL, so no
 * per-page wiring is needed.
 */
export function StaleSnapshotBanner() {
  const match = useMatch('/app/chart/:id/*');
  const chartId = match?.params.id;
  if (!chartId) return null;
  return <Banner chartId={chartId} />;
}

function Banner({ chartId }: { chartId: string }) {
  const { data } = useKundli(chartId);
  const queryClient = useQueryClient();

  if (!data) return null;
  const version = data.snapshotVersion ?? 0;
  if (version >= CURRENT_SNAPSHOT_VERSION) return null;

  const handleRecalculate = () => {
    void queryClient.invalidateQueries({ queryKey: ['chart', chartId] });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-hairline-subtle bg-elevated"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="flex items-start gap-2 text-sm text-text-secondary">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-brand-saffron" />
          <span>
            This chart was computed at engine{' '}
            <span className="font-mono">v{version}</span> — current is{' '}
            <span className="font-mono">v{CURRENT_SNAPSHOT_VERSION}</span>.
            Some new yogas, dashas, vargas, or analyses may be missing until you
            recalculate.
          </span>
        </div>
        <button
          onClick={handleRecalculate}
          className="shrink-0 rounded-sm bg-brand-maroon px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Recalculate now
        </button>
      </div>
    </div>
  );
}
