import { useQuery } from '@tanstack/react-query';
import { getAstroProvider } from '@/lib/astro/factory';
import { DEMO_BIRTH } from '@/lib/astro/providers/mock';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_SNAPSHOT_VERSION } from '@/lib/astro/types';
import type { BirthDetails, KundliData } from '@/lib/astro/types';

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/**
 * A saved snapshot is "fresh" only if it was produced by the current engine
 * version. Older snapshots (or pre-versioning snapshots with no version field)
 * are stale and get auto-recalculated so new data (KP, Jaimini, …) appears
 * without a manual "Recalculate".
 */
const isSnapshotFresh = (snap: unknown): snap is KundliData =>
  !!snap && typeof snap === 'object' &&
  ((snap as KundliData).snapshotVersion ?? 0) >= CURRENT_SNAPSHOT_VERSION;

export function useKundli(chartId: string, details: BirthDetails = DEMO_BIRTH) {
  const shareToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('share')
    : null;
  return useQuery<KundliData>({
    queryKey: ['chart', chartId, 'kundli', shareToken ?? ''],
    queryFn: async () => {
      // Public share link
      if (shareToken && isUuid(shareToken)) {
        const { data, error } = await supabase.rpc('get_chart_by_share_token', { _token: shareToken });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (isSnapshotFresh(row?.snapshot)) return row.snapshot as unknown as KundliData;
        // Stale or missing snapshot: regenerate from birth details (in-memory;
        // public share callers can't write the snapshot back).
        if (row?.birth_details) return getAstroProvider().generateKundli(row.birth_details as unknown as BirthDetails);
      }
      // Saved chart in DB
      if (isUuid(chartId)) {
        const { data, error } = await supabase
          .from('charts')
          .select('birth_details,snapshot')
          .eq('id', chartId)
          .maybeSingle();
        if (error) throw error;
        if (isSnapshotFresh(data?.snapshot)) return data.snapshot as unknown as KundliData;
        // No snapshot, or a stale one from an older engine version: regenerate
        // and cache the fresh snapshot back to the DB (best-effort, don't block).
        const fresh = await getAstroProvider().generateKundli((data?.birth_details as unknown as BirthDetails) ?? details);
        void supabase.from('charts').update({ snapshot: fresh as unknown as never }).eq('id', chartId);
        return fresh;
      }
      // Demo / fallback
      return getAstroProvider().generateKundli(details);
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}
