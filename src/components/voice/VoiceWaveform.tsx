import { motion, useReducedMotion } from 'framer-motion';

/**
 * Gold/saffron audio visualizer. Bars animate while the Guru is speaking; a
 * calm low baseline otherwise. Respects prefers-reduced-motion.
 */
export function VoiceWaveform({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const bars = Array.from({ length: 9 });

  if (reduce) {
    return (
      <div className="flex h-16 items-center justify-center gap-2 text-xs text-text-tertiary">
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-brand-gold' : 'bg-text-muted'}`} />
        {active ? 'Speaking' : 'Live'}
      </div>
    );
  }

  return (
    <div className="flex h-16 items-center justify-center gap-1.5" aria-hidden>
      {bars.map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-brand-saffron to-brand-gold"
          animate={active ? { height: [8, 36 - Math.abs(4 - i) * 5, 8] } : { height: 6 }}
          transition={
            active
              ? { duration: 0.7, repeat: Infinity, delay: i * 0.06, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
