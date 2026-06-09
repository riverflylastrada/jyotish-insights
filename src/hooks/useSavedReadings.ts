import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import type { Json } from '@/integrations/supabase/types';

export type ReadingKind = 'single' | 'debate' | 'prashna';

export interface ReadingAnswer {
  /** One entry for a single-guru ask; up to eight for a tribunal debate. */
  readings: Array<{ guru: string; text: string }>;
  /** The Acharya's synthesis — present only for tribunal debates. */
  verdict?: string;
}

export interface SavedReading {
  id: string;
  created_at: string;
  user_id: string;
  chart_id: string | null;
  kind: ReadingKind;
  gurus: string[];
  question: string;
  answer: ReadingAnswer;
}

export interface SaveReadingInput {
  chartId?: string | null;
  kind: ReadingKind;
  gurus: string[];
  question: string;
  answer: ReadingAnswer;
}

const READINGS_KEY = 'saved_readings';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * List saved Guru readings, newest first. Pass a chartId to scope to one chart
 * (the per-chart "recent questions" list); omit it for the global My Readings page.
 */
export function useSavedReadings(chartId?: string) {
  return useQuery<SavedReading[]>({
    queryKey: [READINGS_KEY, chartId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('saved_readings')
        .select('id,created_at,user_id,chart_id,kind,gurus,question,answer')
        .order('created_at', { ascending: false });
      if (chartId) q = q.eq('chart_id', chartId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SavedReading[];
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Persist a completed reading so it survives a refresh and is re-readable later.
 * Best-effort and fire-and-forget: a save hiccup must never block the user from
 * seeing their answer, so failures are logged, not thrown. RLS scopes the row to
 * the signed-in user (auth.uid() = user_id).
 */
export async function saveReading(input: SaveReadingInput): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return; // demo/unsigned — nothing to persist
    // chart_id is a uuid FK column; a non-uuid id (e.g. the "demo" chart) must
    // be stored as null rather than rejected.
    const chartId = input.chartId && UUID_RE.test(input.chartId) ? input.chartId : null;
    const { error } = await supabase.from('saved_readings').insert({
      user_id: uid,
      chart_id: chartId,
      kind: input.kind,
      gurus: input.gurus,
      question: input.question,
      answer: input.answer as unknown as Json,
    });
    if (error) {
      console.warn('saveReading failed:', error.message);
      return;
    }
    // Refresh both the global and any per-chart lists (prefix match).
    void queryClient.invalidateQueries({ queryKey: [READINGS_KEY] });
  } catch (e) {
    console.warn('saveReading error:', e);
  }
}

/** Delete one saved reading (owner-only via RLS). Refreshes the lists on success. */
export async function deleteReading(id: string): Promise<void> {
  const { error } = await supabase.from('saved_readings').delete().eq('id', id);
  if (error) {
    console.warn('deleteReading failed:', error.message);
    throw error;
  }
  void queryClient.invalidateQueries({ queryKey: [READINGS_KEY] });
}
