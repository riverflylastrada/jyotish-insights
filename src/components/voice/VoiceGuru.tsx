import { useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceWaveform } from '@/components/voice/VoiceWaveform';
import { useVoiceSession } from '@/hooks/useVoiceSession';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { getVoiceGuru } from '@/config/guruVoices';

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'Connecting…',
  connecting: 'Connecting… · जुड़ रहे हैं',
  connected: 'Connected',
  listening: 'Listening · सुन रहे हैं',
  speaking: 'Guruji is speaking · गुरुजी बोल रहे हैं',
  error: 'Disconnected',
};

/**
 * Global voice call tray. Mounted once in AppLayout. Until a session is opened
 * this renders nothing and touches only the Zustand store — the heavy hooks
 * (useConversation / useKundli, which require providers) live in the inner
 * session component that mounts only while a call is active.
 */
export function VoiceGuru() {
  const isSessionActive = useVoiceStore((s) => s.isSessionActive);
  if (!isSessionActive) return null;
  return <VoiceGuruSession />;
}

function VoiceGuruSession() {
  const { isSessionActive, currentGuru, status, error, transcript, sessionDuration, isMuted, setMuted, setStatus, tick, reset } =
    useVoiceStore();
  const { start, stop, conversation, chartReady } = useVoiceSession();
  const guru = currentGuru ? getVoiceGuru(currentGuru) : null;

  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Auto-start once the chart is ready (no-chart flow is ready immediately).
  useEffect(() => {
    if (isSessionActive && chartReady && !startedRef.current) {
      startedRef.current = true;
      void start();
    }
    if (!isSessionActive) startedRef.current = false;
  }, [isSessionActive, chartReady, start]);

  // Session timer while live.
  useEffect(() => {
    if (!['connected', 'listening', 'speaking'].includes(status)) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, tick]);

  // Auto-scroll transcript.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript.length]);

  const handleClose = () => {
    stop();
    reset();
  };

  const toggleMute = () => {
    const next = !isMuted;
    setMuted(next);
    try { conversation.setMuted(next); } catch { /* ignore */ }
  };

  // Keyboard: Space toggles mute, Escape ends.
  useEffect(() => {
    if (!isSessionActive) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); toggleMute(); }
      else if (e.code === 'Escape') { e.preventDefault(); handleClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSessionActive, isMuted]);

  if (!guru) return null;

  return (
    <Sheet open={isSessionActive} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent
        side="bottom"
        className="flex h-[100dvh] flex-col gap-0 rounded-t-2xl border-brand-gold/30 bg-surface p-0 sm:mx-auto sm:h-auto sm:max-h-[85vh] sm:max-w-xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-hairline-subtle px-5 py-4">
          <span className="text-3xl" aria-hidden>{guru.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-base text-text-primary">{guru.name}</div>
            <div className="font-deva text-sm text-brand-maroon">{guru.nameHindi}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-text-secondary" aria-live="polite">{STATUS_LABEL[status] ?? status}</div>
            <div className="font-mono text-xs text-text-tertiary">{fmt(sessionDuration)}</div>
          </div>
        </div>

        {/* Waveform */}
        <div className="border-b border-hairline-subtle py-3">
          <VoiceWaveform active={conversation.isSpeaking} />
        </div>

        {/* Transcript */}
        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="flex flex-col gap-2 px-5 py-4">
            {transcript.length === 0 && status !== 'error' && (
              <p className="py-8 text-center text-sm text-text-tertiary">
                {guru.name} is ready. Speak when you hear the greeting.
              </p>
            )}
            {transcript.map((t, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  t.role === 'user'
                    ? 'self-end bg-elevated text-text-primary'
                    : 'self-start bg-brand-gold/10 text-text-primary'
                }`}
              >
                {t.text}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Error */}
        {status === 'error' && (
          <div className="mx-5 mb-3 rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-3 text-sm text-semantic-negative">
            <p>{error ?? 'The voice connection dropped.'}</p>
            <button
              onClick={() => { startedRef.current = true; setStatus('connecting'); void start(); }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-brand-maroon px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-brand-maroon/90"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 border-t border-hairline-subtle px-5 py-4">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={isMuted}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
              isMuted ? 'border-semantic-negative/40 bg-semantic-negative/10 text-semantic-negative' : 'border-hairline-subtle text-text-secondary hover:bg-elevated'
            }`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            onClick={handleClose}
            aria-label="End conversation"
            className="flex h-12 items-center gap-2 rounded-full bg-brand-maroon px-6 text-sm font-medium text-primary-foreground shadow hover:bg-brand-maroon/90"
          >
            <PhoneOff className="h-5 w-5" /> End · समाप्त
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
