import { Lock } from 'lucide-react';
import { VOICE_GURUS, type VoiceGuruId } from '@/config/guruVoices';
import { Badge } from '@/components/ui/badge';

interface GuruSelectorProps {
  onSelect: (guru: VoiceGuruId) => void;
}

/**
 * Card grid of voice personas. Availability is driven by the static `available`
 * flag (phased rollout); unavailable gurus show "Coming Soon". We intentionally
 * do NOT read app_settings here — those rows are admin-only under RLS.
 */
export function GuruSelector({ onSelect }: GuruSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {VOICE_GURUS.map((g) => {
        const disabled = !g.available;
        return (
          <button
            key={g.id}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onSelect(g.id)}
            className={`relative flex flex-col items-start gap-1 rounded-md border p-4 text-left transition-colors ${
              disabled
                ? 'cursor-not-allowed border-hairline-subtle bg-surface opacity-60'
                : 'border-brand-gold/30 bg-surface hover:border-brand-gold hover:bg-elevated'
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-2xl" aria-hidden>{g.icon}</span>
              {disabled && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Lock className="h-3 w-3" /> Coming Soon
                </Badge>
              )}
            </div>
            <div className="mt-1">
              <div className="font-display text-base text-text-primary">{g.name}</div>
              <div className="font-deva text-sm text-brand-maroon">{g.nameHindi}</div>
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-brand-gold">{g.school}</div>
            <p className="mt-1 text-xs text-text-tertiary">{g.description}</p>
          </button>
        );
      })}
    </div>
  );
}
