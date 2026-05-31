import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GuruSelector } from '@/components/voice/GuruSelector';
import { useVoiceStore } from '@/stores/useVoiceStore';
import type { VoiceGuruId } from '@/config/guruVoices';

/**
 * Dedicated voice landing. /app/voice (no chart → Guru asks for birth details
 * and computes via tools) or /app/voice/:chartId (Guru already knows the chart).
 * Selecting a Guru opens the global <VoiceGuru /> tray via the store.
 */
export default function VoiceGuruPage() {
  const { chartId } = useParams<{ chartId?: string }>();
  const openWith = useVoiceStore((s) => s.openWith);

  const onSelect = (guru: VoiceGuruId) => openWith(guru, chartId ?? null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <span className="text-eyebrow uppercase tracking-wider text-brand-gold">Voice AI Guru</span>
        <h1 className="mt-1 font-display text-h2 text-text-primary">Talk to a Guruji · गुरुजी से बात करें</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          {chartId
            ? 'Choose a Guru to begin a live voice consultation. The Guru already knows this chart — every planet, dasha, and yoga is computed by our engine.'
            : 'Choose a Guru to begin. With no chart loaded, the Guru will ask for your birth details and compute the chart live before reading.'}
        </p>
      </motion.div>

      <div className="mt-8">
        <GuruSelector onSelect={onSelect} />
      </div>
    </div>
  );
}
