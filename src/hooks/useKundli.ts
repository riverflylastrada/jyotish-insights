import { useQuery } from '@tanstack/react-query';
import { getAstroProvider } from '@/lib/astro/factory';
import { DEMO_BIRTH } from '@/lib/astro/providers/mock';
import { supabase } from '@/integrations/supabase/client';
import type { BirthDetails, KundliData } from '@/lib/astro/types';

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export function useKundli(chartId: string, details: BirthDetails = DEMO_BIRTH) {
  return useQuery<KundliData>({
    queryKey: ['chart', chartId, 'kundli'],
    queryFn: async () => {
      // Saved chart in DB
      if (isUuid(chartId)) {
        const { data, error } = await supabase
          .from('charts')
          .select('birth_details,snapshot')
          .eq('id', chartId)
          .maybeSingle();
        if (error) throw error;
        if (data?.snapshot) return data.snapshot as unknown as KundliData;
        const fresh = await getAstroProvider().generateKundli((data?.birth_details as unknown as BirthDetails) ?? details);
        // cache snapshot back to DB (best-effort, don't block)
        void supabase.from('charts').update({ snapshot: fresh as unknown as never }).eq('id', chartId);
        return fresh;
      }
      // Demo / fallback
      return getAstroProvider().generateKundli(details);
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}
