import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GuruSelector } from '@/components/voice/GuruSelector';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { DEFAULT_VOICE_GURU, type VoiceGuruId } from '@/config/guruVoices';
import { useVoiceGuruEnabled } from '@/hooks/useVoiceGuruEnabled';

interface VoiceButtonProps {
  chartId: string | null;
  /** Skip the picker and launch straight into this guru. */
  defaultGuru?: VoiceGuruId;
  variant?: 'floating' | 'inline';
  className?: string;
}

/**
 * Entry point for the Voice Guru. Floating mic FAB (mobile) or inline button.
 * Opens a guru picker, then hands off to the global <VoiceGuru /> tray via the
 * store. Uses lucide Mic to avoid the MessageSquare collision with Open Debate.
 */
export function VoiceButton({ chartId, defaultGuru, variant = 'floating', className = '' }: VoiceButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const openWith = useVoiceStore((s) => s.openWith);
  const reduce = useReducedMotion();
  const { enabled, isLoading } = useVoiceGuruEnabled();

  const launch = (guru: VoiceGuruId) => {
    setPickerOpen(false);
    openWith(guru, chartId);
  };

  const onClick = () => {
    if (defaultGuru) launch(defaultGuru);
    else setPickerOpen(true);
  };

  const label = 'Ask Guruji · गुरुजी से पूछें';

  // Coming soon: render a disabled affordance; no session can be opened.
  if (isLoading) return null;
  if (!enabled) {
    return variant === 'inline' ? (
      <button
        type="button"
        disabled
        title="Voice Guru · coming soon"
        className={`inline-flex cursor-not-allowed items-center gap-2 rounded-sm bg-elevated px-4 py-2 text-sm font-medium text-text-tertiary ${className}`}
      >
        <Mic className="h-4 w-4" /> Ask Guruji · Coming soon
      </button>
    ) : (
      <div
        title="Voice Guru · coming soon"
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-elevated text-text-tertiary shadow-lg ${className}`}
      >
        <Mic className="h-6 w-6" />
      </div>
    );
  }

  return (
    <>
      {variant === 'inline' ? (
        <button
          type="button"
          onClick={onClick}
          title={label}
          className={`inline-flex items-center gap-2 rounded-sm bg-brand-gold px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-gold/90 ${className}`}
        >
          <Mic className="h-4 w-4" /> Ask Guruji
        </button>
      ) : (
        <motion.button
          type="button"
          onClick={onClick}
          title={label}
          aria-label={label}
          whileTap={{ scale: 0.95 }}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-maroon text-primary-foreground shadow-lg ${className}`}
        >
          {!reduce && (
            <motion.span
              className="absolute inset-0 rounded-full bg-brand-saffron/40"
              animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <Mic className="relative h-6 w-6" />
        </motion.button>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Choose your Guru · अपने गुरु चुनें</DialogTitle>
          </DialogHeader>
          <GuruSelector onSelect={launch} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export { DEFAULT_VOICE_GURU };
