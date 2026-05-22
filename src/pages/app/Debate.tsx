import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Loader2, Gavel, Sparkles, Play, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebateStore } from '@/stores/useDebateStore';
import { useKundli } from '@/hooks/useKundli';
import { toast } from '@/components/ui/sonner';

type GuruKey = 'parashara' | 'varahamihira' | 'raman' | 'rao' | 'krishnamurti';

interface Guru {
  key: GuruKey;
  name: string;
  deva: string;
  era: string;
  school: string;
  signature: string;
  accent: string;
}

const GURUS: Guru[] = [
  { key: 'parashara',    name: 'Maharishi Parashara', deva: '\u092A\u0930\u093E\u0936\u0930',       era: '~1500 BCE',  school: 'Brihat Parashara Hora Sastra', signature: 'PS', accent: 'hsl(var(--brand-maroon))' },
  { key: 'varahamihira', name: 'Varahamihira',        deva: '\u0935\u0930\u093E\u0939\u092E\u093F\u0939\u093F\u0930',  era: '6th c. CE',  school: 'Brihat Jataka',                signature: 'VM', accent: 'hsl(var(--planet-jupiter))' },
  { key: 'raman',        name: 'Dr. B. V. Raman',     deva: '\u092C\u0940. \u0935\u0940. \u0930\u092E\u0923', era: '20th c.',    school: 'Modern Hindu Astrology',       signature: 'BR', accent: 'hsl(var(--planet-mars))' },
  { key: 'rao',          name: 'K. N. Rao',           deva: '\u0915\u0947. \u090F\u0928. \u0930\u093E\u0935', era: '20th c.',    school: 'Dasha-led judgment',           signature: 'KR', accent: 'hsl(var(--planet-saturn))' },
  { key: 'krishnamurti', name: 'K. S. Krishnamurti',  deva: '\u0915\u0943\u0937\u094D\u0923\u092E\u0942\u0930\u094D\u0924\u093F',  era: '20th c.',    school: 'KP / Stellar Astrology',       signature: 'KP', accent: 'hsl(var(--planet-mercury))' },
];

const SAMPLE_QUESTIONS = [
  'When will the next significant career inflection occur?',
  'Is the current Sade Sati phase weakening, and what is the likely outcome?',
  'What does the chart say about marriage timing and partner temperament?',
  'Which yogas are actively shaping this lifetime, and which are dormant?',
];

const DEBATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guru-debate`;

async function streamFromEdge(
  payload: Record<string, unknown>,
  onDelta: (chunk: string) => void,
): Promise<string> {
  const resp = await fetch(DEBATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(payload),
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

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buffer += decoder.decode(value, { stream: true });

    // Split on double-newline (SSE event boundary)
    const parts = buffer.split('\n\n');
    // Last element is incomplete — keep in buffer
    buffer = parts.pop() ?? '';

    for (const event of parts) {
      const lines = event.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') { done = true; break; }
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (delta) { full += delta; onDelta(full); }
        } catch {
          // Malformed JSON in a complete event — skip, don't retry
          console.warn('Skipped malformed SSE chunk:', json.slice(0, 100));
        }
      }
      if (done) break;
    }
  }
  return full;
}

type GuruState = { status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error'; text: string; error?: string };

export default function Debate() {
  const { id = 'demo' } = useParams();
  const { data: chart } = useKundli(id);
  const { question, setQuestion, followUp, setFollowUp, addToHistory } = useDebateStore();
  const [running, setRunning] = useState(false);
  const [states, setStates] = useState<Record<GuruKey, GuruState>>(() =>
    Object.fromEntries(GURUS.map((g) => [g.key, { status: 'idle', text: '' }])) as Record<GuruKey, GuruState>,
  );
  const [verdict, setVerdict] = useState<{ status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error'; text: string; error?: string }>({ status: 'idle', text: '' });

  // Playback mode
  const [playbackMode, setPlaybackMode] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(-1);

  const reset = () => {
    setStates(Object.fromEntries(GURUS.map((g) => [g.key, { status: 'idle', text: '' }])) as Record<GuruKey, GuruState>);
    setVerdict({ status: 'idle', text: '' });
  };

  const runDebate = async () => {
    setRunning(true);
    setPlaybackMode(false);
    reset();
    const readings: Array<{ guru: string; text: string }> = [];
    const failedGurus: string[] = [];

    for (const g of GURUS) {
      try {
        setStates((s) => ({ ...s, [g.key]: { status: 'thinking', text: '' } }));
        await new Promise((r) => setTimeout(r, 250));
        setStates((s) => ({ ...s, [g.key]: { status: 'streaming', text: '' } }));
        const full = await streamFromEdge(
          { mode: 'guru', guru: g.key, question, chart },
          (t) => setStates((s) => ({ ...s, [g.key]: { status: 'streaming', text: t } })),
        );
        setStates((s) => ({ ...s, [g.key]: { status: 'done', text: full } }));
        readings.push({ guru: g.name, text: full });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Reading failed';
        setStates((s) => ({ ...s, [g.key]: { status: 'error', text: '', error: msg } }));
        failedGurus.push(g.name);
      }
    }

    // Only run verdict if at least one guru succeeded
    if (readings.length > 0) {
      try {
        setVerdict({ status: 'thinking', text: '' });
        await new Promise((r) => setTimeout(r, 500));
        setVerdict({ status: 'streaming', text: '' });

        const verdictPayload: Record<string, unknown> = {
          mode: 'verdict', question, chart, priorReadings: readings,
        };
        if (failedGurus.length > 0) {
          verdictPayload.missingVoices = failedGurus;
        }

        const v = await streamFromEdge(
          verdictPayload,
          (t) => setVerdict({ status: 'streaming', text: t }),
        );
        setVerdict({ status: 'done', text: v });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Verdict failed';
        setVerdict({ status: 'error', text: '', error: msg });
        toast.error('Acharya verdict failed: ' + msg);
      }
    } else {
      toast.error('All gurus failed. Please try again.');
    }

    setRunning(false);
  };

  const handleFollowUp = () => {
    addToHistory(question);
    setQuestion(followUp);
    setFollowUp('');
    runDebate();
  };

  const startPlayback = async () => {
    setPlaybackMode(true);
    setPlaybackIndex(-1);
    for (let i = 0; i < GURUS.length; i++) {
      setPlaybackIndex(i);
      await new Promise((r) => setTimeout(r, 2000));
    }
    setPlaybackIndex(GURUS.length); // reveal verdict
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Tribunal · Five voices, one verdict</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">The Guru Debate</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Pose a single, focused question. Five classical and modern voices read the chart in their own idiom; the Acharya synthesises a final judgment.
      </p>

      {/* Question input */}
      <div className="mt-8 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <label className="text-eyebrow text-text-tertiary">Your question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="e.g. When is the most favourable window for a career change?"
          className="mt-2 w-full resize-none rounded-sm border border-hairline-subtle bg-canvas px-3 py-2 text-body text-text-primary placeholder:text-text-muted focus:border-brand-maroon focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((q) => (
            <button key={q} onClick={() => setQuestion(q)} className="rounded-sm border border-hairline-subtle bg-elevated px-2.5 py-1 text-xs text-text-tertiary hover:text-text-primary">
              {q}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-text-tertiary">Live · responses streamed from the AI gateway against this chart.</div>
          <button
            onClick={runDebate}
            disabled={running || !question.trim()}
            className="inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {running ? 'Debate in session\u2026' : 'Convene the Tribunal'}
          </button>
        </div>
      </div>

      {/* Guru responses */}
      <div className="mt-8 space-y-4">
        {GURUS.map((g, guruIdx) => {
          const st = states[g.key];
          const inactive = st.status === 'idle';

          // In playback mode, only show cards up to playbackIndex
          if (playbackMode && guruIdx > playbackIndex) return null;

          return (
            <motion.article
              key={g.key}
              initial={playbackMode ? { opacity: 0, y: 20, scale: 0.97 } : false}
              animate={{ opacity: inactive ? 0.55 : 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-hairline-subtle font-display text-sm" style={{ color: g.accent }}>
                  {g.signature}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="font-display text-h3 text-text-primary">{g.name} <span className="ml-2 font-deva text-sm text-text-tertiary">{g.deva}</span></div>
                      <div className="font-mono text-xs text-text-tertiary">{g.school} · {g.era}</div>
                    </div>
                    <StatusPill status={st.status} />
                  </div>
                  <AnimatePresence>
                    {st.status !== 'idle' && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-3"
                      >
                        {st.status === 'thinking' ? (
                          <ThinkingDots guruName={g.name} />
                        ) : st.status === 'error' ? (
                          <div className="mt-3 rounded-sm border border-semantic-negative/30 bg-semantic-negative/5 px-3 py-2 text-sm text-semantic-negative">
                            {g.name} was unable to complete their reading. {st.error}
                          </div>
                        ) : (
                          <p className="whitespace-pre-line text-body text-text-secondary">
                            {st.text}
                            {st.status === 'streaming' && <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-text-primary align-middle" />}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Verdict */}
      {verdict.status !== 'idle' && (!playbackMode || playbackIndex >= GURUS.length) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-md border border-brand-maroon/40 bg-surface p-6 shadow-sm yantra-bg">
          <div className="flex items-center gap-3">
            <Gavel className="h-5 w-5 text-brand-maroon" />
            <div>
              <div className="text-eyebrow text-brand-saffron">Acharya's Verdict</div>
              <div className="font-display text-h2 text-text-primary">Synthesis</div>
            </div>
            <Sparkles className="ml-auto h-4 w-4 text-brand-gold" />
          </div>
          <div className="gold-rule mt-4" />
          {verdict.status === 'thinking' ? (
            <div className="mt-4"><ThinkingDots guruName="The Acharya" /></div>
          ) : verdict.status === 'error' ? (
            <div className="mt-4 rounded-sm border border-semantic-negative/30 bg-semantic-negative/5 px-3 py-2 text-sm text-semantic-negative">
              The Acharya was unable to deliver a verdict. {verdict.error}
            </div>
          ) : (
            <p className="mt-4 whitespace-pre-line text-body text-text-secondary">
              {verdict.text}
              {verdict.status === 'streaming' && <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-text-primary align-middle" />}
            </p>
          )}
        </motion.div>
      )}

      {/* Watch the debate / Stop playback */}
      {verdict.status === 'done' && !playbackMode && (
        <button
          onClick={startPlayback}
          className="mt-4 inline-flex items-center gap-2 rounded-sm border border-brand-saffron/40 px-4 py-2 text-sm text-brand-saffron hover:bg-brand-saffron/5"
        >
          <Play className="h-4 w-4" /> Watch the debate
        </button>
      )}
      {playbackMode && (
        <button
          onClick={() => setPlaybackMode(false)}
          className="mt-4 inline-flex items-center gap-2 rounded-sm border border-semantic-negative/40 px-4 py-2 text-sm text-semantic-negative hover:bg-semantic-negative/5"
        >
          <Square className="h-4 w-4" /> Stop playback
        </button>
      )}

      {/* Follow-up input */}
      {verdict.status === 'done' && (
        <div className="mt-6 rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
          <label className="text-eyebrow text-text-tertiary">Ask a follow-up</label>
          <div className="mt-2 flex gap-3">
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="Ask a deeper question about this reading\u2026"
              className="flex-1 rounded-sm border border-hairline-subtle bg-canvas px-3 py-2 text-body text-text-primary placeholder:text-text-muted focus:border-brand-maroon focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && followUp.trim()) { handleFollowUp(); } }}
            />
            <button
              onClick={handleFollowUp}
              disabled={running || !followUp.trim()}
              className="inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              <MessageSquare className="h-4 w-4" /> Ask
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: GuruState['status'] }) {
  const map = {
    idle:      { label: 'Awaiting',  cls: 'border-hairline-subtle text-text-muted' },
    thinking:  { label: 'Reading',   cls: 'border-brand-saffron/40 text-brand-saffron' },
    streaming: { label: 'Speaking',  cls: 'border-brand-maroon/40 text-brand-maroon' },
    done:      { label: 'Concluded', cls: 'border-semantic-positive/40 text-semantic-positive' },
    error:     { label: 'Failed',    cls: 'border-semantic-negative/40 text-semantic-negative' },
  } as const;
  const m = map[status];
  return <span className={`rounded-sm border bg-surface px-2 py-0.5 text-eyebrow ${m.cls}`}>{m.label}</span>;
}

function ThinkingDots({ guruName }: { guruName?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-text-tertiary">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-text-tertiary"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
      <span className="ml-2 text-xs">
        {guruName ? `${guruName} is reviewing the chart\u2026` : 'Consulting the chart\u2026'}
      </span>
    </div>
  );
}
