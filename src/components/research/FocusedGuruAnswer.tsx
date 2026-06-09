import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Sparkles, Loader2, Users } from 'lucide-react';
import { useChartLink } from '@/hooks/useChartLink';
import { useKundli } from '@/hooks/useKundli';
import { streamFromEdge } from '@/lib/guru/streamGuruDebate';
import { saveReading } from '@/hooks/useSavedReadings';
import { GURU_BY_KEY } from '@/lib/guru/guruRoster';
import { guruForTopic, focusedQuestion, type GuruTopic } from '@/lib/guru/guruRouter';

/**
 * Focused, cost-aware "ask a Guru" entry point.
 *
 * Free first: if a cached auto-insight reading already exists for this subject,
 * show it instantly ($0). Otherwise make ONE call to the single expert guru that
 * owns this topic (mode:"guru") — not the full eight-guru tribunal. The expensive
 * tribunal stays one explicit click away via the secondary link.
 */

type Status = 'idle' | 'streaming' | 'done' | 'error';

interface FocusedGuruAnswerProps {
  chartId: string;
  /** Routes the query to the matching expert guru. */
  topic: GuruTopic;
  /** What's being asked about, e.g. "Jupiter" — used in the prompt and labels. */
  subject: string;
  /** Free cached reading (auto-insight `full`), shown instantly when present. */
  cachedFull?: string;
  /**
   * Closed-state trigger style. `button` = full-width bordered button (default,
   * for the Research-Lab panel); `link` = compact inline link (for the small
   * "Tap to ask a Guru" spots under dasha / yoga / dosha / house cards).
   */
  variant?: 'button' | 'link';
}

export function FocusedGuruAnswer({ chartId, topic, subject, cachedFull, variant = 'button' }: FocusedGuruAnswerProps) {
  const chartLink = useChartLink();
  const { data: chart } = useKundli(chartId);
  const guru = GURU_BY_KEY[guruForTopic(topic)];
  const guruShort = guru.name.split(' ').pop();

  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<'cached' | 'live'>('cached');
  const [status, setStatus] = useState<Status>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    setOpen(true);

    // Free first — reuse the reading we already paid for at chart creation.
    if (cachedFull) {
      setSource('cached');
      setText(cachedFull);
      setStatus('done');
      return;
    }

    // Otherwise one focused call to the matching expert guru.
    setSource('live');
    setText('');
    setError(null);
    if (!chart) {
      setStatus('error');
      setError('The chart is still loading — try again in a moment.');
      return;
    }
    setStatus('streaming');
    try {
      // Single-guru ask: one turn_id, counts as one (cheap) question.
      const askedQuestion = focusedQuestion(topic, subject);
      const result = await streamFromEdge(
        { mode: 'guru', guru: guru.key, question: askedQuestion, chart, turnId: crypto.randomUUID(), turnKind: 'single' },
        (t) => setText(t),
      );
      setText(result.text);
      setStatus('done');

      // Persist this live single-guru ask so it survives a refresh and appears
      // in My Readings. (Cached/free re-reads above are not saved — no new Q&A.)
      void saveReading({
        chartId,
        kind: 'single',
        gurus: [guru.key],
        question: askedQuestion,
        answer: { readings: [{ guru: guru.name, text: result.text }] },
      });
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'The Guru was unable to answer.');
    }
  };

  if (!open) {
    if (variant === 'link') {
      return (
        <button
          onClick={ask}
          className="inline-flex items-center gap-1.5 text-xs text-brand-maroon hover:underline"
        >
          {cachedFull ? <Sparkles className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
          {cachedFull ? `Read ${guruShort}'s insight` : `Ask ${guruShort} about this`} &rarr;
        </button>
      );
    }
    return (
      <button
        onClick={ask}
        className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-brand-maroon/30 bg-surface px-4 py-2 text-sm text-brand-maroon hover:bg-elevated"
      >
        {cachedFull ? <Sparkles className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        {cachedFull ? `Read the full Guru insight on ${subject}` : `Ask a Guru about ${subject}`}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-brand-maroon/25 bg-surface p-4 shadow-sm">
      {/* Who's answering */}
      {source === 'cached' ? (
        <div className="flex items-center gap-1.5 text-xs font-medium text-brand-gold">
          <Sparkles className="h-3.5 w-3.5" /> Guru Insight
          <span className="font-mono text-xxs font-normal text-text-tertiary">· cached · free</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-display"
            style={{ color: guru.accent, borderColor: guru.accent }}
          >
            {guru.signature}
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm text-text-primary">{guru.name}</div>
            <div className="font-mono text-xxs text-text-tertiary">{guru.school} · focused reading</div>
          </div>
          {status === 'streaming' && <Loader2 className="ml-auto h-4 w-4 animate-spin text-brand-maroon" />}
        </div>
      )}

      {status === 'error' ? (
        <div className="rounded-sm border border-semantic-negative/30 bg-semantic-negative/5 px-3 py-2 text-sm text-semantic-negative">
          {error}{' '}
          <button onClick={ask} className="underline underline-offset-2 hover:no-underline">Retry</button>
        </div>
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
          {text}
          {status === 'streaming' && <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-text-primary align-middle" />}
        </p>
      )}

      {/* The full tribunal stays explicit (≈8 voices + verdict) — and the deep path. */}
      <div className="border-t border-hairline-subtle pt-2.5">
        <Link
          to={chartLink(`/app/chart/${chartId}/debate`)}
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-brand-maroon"
        >
          <Users className="h-3.5 w-3.5" /> Want all eight Gurus to weigh in? Convene the full tribunal &rarr;
        </Link>
      </div>
    </div>
  );
}
