import { useCallback, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useKundli } from '@/hooks/useKundli';
import { useSession } from '@/hooks/useSession';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

const SESSION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-session`;

/**
 * Drives a Voice Guru conversation: mints a token/override from the
 * voice-session edge function (server holds the ElevenLabs key), starts the
 * @elevenlabs session client-side with that override, streams the transcript
 * into the store, and best-effort logs the session on disconnect.
 *
 * Must be used inside a <ConversationProvider> (App wraps the tree).
 */
export function useVoiceSession() {
  const currentGuru = useVoiceStore((s) => s.currentGuru);
  const chartId = useVoiceStore((s) => s.chartId);
  const setStatus = useVoiceStore((s) => s.setStatus);
  const appendTranscript = useVoiceStore((s) => s.appendTranscript);

  const { session } = useSession();
  // A null chartId means the no-chart flow: the Guru asks for birth details and
  // computes via tools — we must NOT inject any chart (incl. the demo). When a
  // chartId is set, the client already holds the authoritative KundliData (the
  // same object stored as charts.snapshot), so we send it directly — mirrors
  // Debate.tsx and works for demo/unsaved/shared charts.
  const hasChart = chartId != null;
  const { data: loadedChart } = useKundli(chartId ?? 'demo');
  const chart = hasChart ? loadedChart : undefined;
  // Ready to connect once the chart has loaded (or immediately for no-chart).
  const chartReady = !hasChart || !!loadedChart;

  const startedAtRef = useRef<number | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      conversationIdRef.current = conversationId ?? null;
      setStatus('connected');
    },
    onDisconnect: () => {
      setStatus('idle');
      void logSession();
    },
    onError: (message) => setStatus('error', message || 'Voice error'),
    onMessage: (props) => {
      const isUser = props.role === 'user' || props.source === 'user';
      appendTranscript({ role: isUser ? 'user' : 'guru', text: props.message, ts: Date.now() });
    },
  });

  const start = useCallback(async () => {
    if (!currentGuru) return;
    if (hasChart && !chart) {
      toast.error('Chart is still loading — try again in a moment.');
      return;
    }
    setStatus('connecting');
    try {
      const resp = await fetch(SESSION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          mode: 'get-signed-url',
          guru: currentGuru,
          chart,                       // undefined for the no-chart flow
          chartId: hasChart ? chartId : null,
          clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!resp.ok) {
        let msg = 'Could not start the voice session.';
        try { const j = await resp.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const data = await resp.json();
      startedAtRef.current = Date.now();
      // Overrides are applied CLIENT-SIDE at startSession (not at get-signed-url).
      if (data.connectionType === 'webrtc' && data.conversationToken) {
        conversation.startSession({
          conversationToken: data.conversationToken,
          connectionType: 'webrtc',
          overrides: data.overrides,
        });
      } else if (data.signedUrl) {
        conversation.startSession({
          signedUrl: data.signedUrl,
          connectionType: 'websocket',
          overrides: data.overrides,
        });
      } else {
        throw new Error('Voice service did not return a connection.');
      }
    } catch (e) {
      setStatus('error', e instanceof Error ? e.message : 'Voice error');
    }
  }, [currentGuru, chart, hasChart, chartId, session, conversation, setStatus]);

  const stop = useCallback(() => {
    try { conversation.endSession(); } catch { /* ignore */ }
  }, [conversation]);

  async function logSession() {
    const startedTs = startedAtRef.current;
    if (!startedTs) return;
    const durationSeconds = Math.round((Date.now() - startedTs) / 1000);
    startedAtRef.current = null;
    const { transcript } = useVoiceStore.getState();
    // best-effort; never blocks or throws (mirrors useAutoInsights)
    void supabase.functions.invoke('voice-session', {
      body: {
        mode: 'log-session',
        guru: currentGuru,
        chartId,
        durationSeconds,
        conversationId: conversationIdRef.current,
        transcript,
      },
    });
  }

  // Reflect the SDK's live speaking/listening into the coarse store status.
  useEffect(() => {
    if (conversation.status === 'connected') {
      setStatus(conversation.isSpeaking ? 'speaking' : 'listening');
    }
  }, [conversation.isSpeaking, conversation.status, setStatus]);

  return { start, stop, conversation, chartReady };
}
