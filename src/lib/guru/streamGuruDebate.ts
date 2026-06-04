/**
 * Shared SSE client for the `guru-debate` edge function.
 *
 * The edge streams OpenAI-style `data: {...}` chunks. This reader accumulates
 * the deltas, surfaces the running text via `onDelta`, and returns the final
 * text plus the model's finish reason (used by callers to detect truncation).
 *
 * Used by the full tribunal ([Debate.tsx]), the horary tribunal ([Prashna.tsx])
 * and the focused single-guru ask ([FocusedGuruAnswer]). All three POST the same
 * shape; only the `mode`/`guru` in the payload differ.
 */

import { supabase } from '@/integrations/supabase/client';

const DEBATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guru-debate`;

export interface StreamResult {
  text: string;
  finishReason: string | null;
}

export async function streamFromEdge(
  payload: Record<string, unknown>,
  onDelta: (chunk: string) => void,
): Promise<StreamResult> {
  // Prefer the signed-in user's access token so the edge can attribute this call
  // to a real user in ai_usage; fall back to the anon key when logged out.
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(DEBATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    // Send the viewer's IANA timezone so the dossier's "today" is their local
    // civil date (DST-aware); all astronomy stays UTC server-side.
    body: JSON.stringify({ clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...payload }),
  });

  if (!resp.ok || !resp.body) {
    let msg = 'Failed to start stream';
    try { const j = await resp.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let done = false;
  let currentEventData = '';
  let lastFinishReason: string | null = null;

  const processLine = (line: string) => {
    if (line === '') {
      // Empty line indicates the end of an event block
      if (currentEventData) {
        handleEvent(currentEventData);
        currentEventData = '';
      }
    } else if (line.startsWith('data: ')) {
      const value = line.slice(6);
      currentEventData = currentEventData ? `${currentEventData}\n${value}` : value;
    }
  };

  const handleEvent = (data: string) => {
    const trimmed = data.trim();
    if (trimmed === '[DONE]') {
      done = true;
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
      const fr = parsed.choices?.[0]?.finish_reason as string | undefined;
      if (fr) lastFinishReason = fr;
      if (delta) {
        full += delta;
        onDelta(full);
      }
    } catch {
      console.warn('Skipped malformed SSE chunk:', trimmed.slice(0, 100));
    }
  };

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) {
      // If the stream ended, force processing of any remaining line in buffer
      if (buffer) {
        const remaining = buffer.trim();
        if (remaining) {
          processLine(remaining);
          processLine(''); // Trigger final event block
        }
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let lineIndex;
    while ((lineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, lineIndex).trim();
      buffer = buffer.slice(lineIndex + 1);
      processLine(line);
      if (done) break;
    }
  }

  return { text: full, finishReason: lastFinishReason };
}
