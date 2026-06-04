import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Whether the Voice Guru ("Talk to Guruji") feature is publicly enabled.
 *
 * Backed by the `voice_guru_enabled` flag in app_settings (flipped from
 * Admin → Voice), read via the voice-session `status` mode. Defaults to
 * DISABLED until known and on any error, so the feature stays "Coming soon"
 * unless an admin has explicitly turned it on. The edge function enforces the
 * same flag before minting any (paid) ElevenLabs token — this hook is the UX
 * half; the edge gate is the cost guarantee.
 */
export function useVoiceGuruEnabled() {
  const { data, isLoading } = useQuery({
    queryKey: ['voice-guru-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('voice-session', {
        body: { mode: 'status' },
      });
      if (error) return { enabled: false };
      return { enabled: (data as { enabled?: boolean })?.enabled === true };
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
  return { enabled: data?.enabled === true, isLoading };
}
