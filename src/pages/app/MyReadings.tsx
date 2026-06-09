import { ScrollText } from 'lucide-react';
import { SavedReadingsList } from '@/components/guru/SavedReadingsList';

/**
 * Global "My Readings" — every saved Guru answer across all charts and horary
 * questions, newest first. The primary, mobile-friendly home for re-reading past
 * consultations. Per-chart recall also lives inline on each chart's Guru room.
 */
export default function MyReadings() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 font-display text-2xl text-text-primary">
          <ScrollText className="h-6 w-6 text-brand-maroon" /> My Readings
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          Every Guru answer you've received — across all charts and horary questions. Tap any to re-read.
        </p>
      </header>
      <SavedReadingsList emptyHint="You haven't asked a Guru yet. Open a chart and ask a question — your readings are saved here automatically." />
    </div>
  );
}
