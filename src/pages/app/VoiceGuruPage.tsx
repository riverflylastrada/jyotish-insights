import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MessageCirclePlus, Loader2 } from 'lucide-react';
import { GuruSelector } from '@/components/voice/GuruSelector';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { useDefaultChart } from '@/hooks/useDefaultChart';
import { useVoiceGuruEnabled } from '@/hooks/useVoiceGuruEnabled';
import type { VoiceGuruId } from '@/config/guruVoices';

/**
 * Dedicated voice landing. Three cases:
 *  - /app/voice/:chartId        → Guru already knows that specific chart.
 *  - /app/voice (have a chart)  → auto-use the user's default chart (or latest),
 *                                 so multi-chart users don't re-select every time.
 *                                 They can still "start fresh" to enter details.
 *  - /app/voice (no charts yet) → Guru asks for birth details and computes live.
 */
export default function VoiceGuruPage() {
  const { chartId: paramChartId } = useParams<{ chartId?: string }>();
  const openWith = useVoiceStore((s) => s.openWith);
  const { data: resolved, isLoading } = useDefaultChart();
  const [startFresh, setStartFresh] = useState(false);
  const { enabled, isLoading: flagLoading } = useVoiceGuruEnabled();

  if (flagLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }
  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <span className="text-eyebrow uppercase tracking-wider text-brand-gold">Voice AI Guru</span>
        <h1 className="mt-2 font-display text-h2 text-text-primary">Talk to a Guruji — coming soon</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">
          We're putting the finishing touches on the live voice consultation — speak with an AI Jyotishi
          who already knows your chart. It will be available here shortly.
        </p>
      </div>
    );
  }

  // An explicit :chartId always wins. Otherwise use the resolved default/latest
  // chart, unless the user chose to start fresh.
  const resolvedId = paramChartId ?? (startFresh ? null : resolved?.chartId ?? null);
  const usingChartName = paramChartId ? null : startFresh ? null : resolved?.chartName ?? null;

  const onSelect = (guru: VoiceGuruId) => openWith(guru, resolvedId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <span className="text-eyebrow uppercase tracking-wider text-brand-gold">Voice AI Guru</span>
        <h1 className="mt-1 font-display text-h2 text-text-primary">Talk to a Guruji · गुरुजी से बात करें</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          {resolvedId
            ? 'Choose a Guru to begin a live voice consultation. The Guru already knows this chart — every planet, dasha, and yoga is computed by our engine.'
            : 'Choose a Guru to begin. With no chart loaded, the Guru will ask for your birth details and compute the chart live before reading.'}
        </p>
      </motion.div>

      {/* Which chart the Guru will read (only on the no-:chartId landing). */}
      {!paramChartId && !isLoading && (
        <div className="mt-5">
          {usingChartName ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-brand-gold/30 bg-brand-gold/5 px-4 py-2.5 text-sm">
              <span className="inline-flex items-center gap-1.5 text-text-secondary">
                <Star className="h-3.5 w-3.5 fill-current text-brand-saffron" />
                The Guru will read your {resolved?.isExplicitDefault ? 'default' : 'most recent'} chart:
                <span className="font-medium text-text-primary">{usingChartName}</span>
              </span>
              <button
                onClick={() => setStartFresh(true)}
                className="text-xs text-brand-maroon underline-offset-2 hover:underline"
              >
                Start fresh instead
              </button>
            </div>
          ) : resolved?.chartId || startFresh ? (
            // Either the user has charts but chose to start fresh, or we resolved none.
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-hairline-subtle bg-surface px-4 py-2.5 text-sm">
              <span className="inline-flex items-center gap-1.5 text-text-secondary">
                <MessageCirclePlus className="h-3.5 w-3.5 text-text-tertiary" />
                Starting fresh — the Guru will ask for your birth details.
              </span>
              {startFresh && resolved?.chartId && (
                <button
                  onClick={() => setStartFresh(false)}
                  className="text-xs text-brand-maroon underline-offset-2 hover:underline"
                >
                  Use my saved chart instead
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-8">
        <GuruSelector onSelect={onSelect} />
      </div>
    </div>
  );
}
