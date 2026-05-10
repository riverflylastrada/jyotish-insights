import { useQuery } from '@tanstack/react-query';
import { getAstroProvider } from '@/lib/astro/factory';
import { DEMO_BIRTH } from '@/lib/astro/providers/mock';
import type { BirthDetails, KundliData } from '@/lib/astro/types';

export function useKundli(chartId: string, details: BirthDetails = DEMO_BIRTH) {
  return useQuery<KundliData>({
    queryKey: ['chart', chartId, 'kundli'],
    queryFn: () => getAstroProvider().generateKundli(details),
    staleTime: 1000 * 60 * 60 * 24,
  });
}
