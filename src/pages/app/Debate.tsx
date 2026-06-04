import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import { ArrowLeft, MessageSquare, Loader2, Gavel, Sparkles, Play, Square, Trash2, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebateStore, type DebateTurn } from '@/stores/useDebateStore';
import { useKundli } from '@/hooks/useKundli';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';

type GuruKey = 'parashara' | 'varahamihira' | 'raman' | 'rao' | 'krishnamurti' | 'jaimini' | 'mantreshwara' | 'kalyanavarman';

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
  { key: 'jaimini',      name: 'Maharishi Jaimini',   deva: '\u091C\u0948\u092E\u093F\u0928\u093F', era: '~3rd c. BCE',  school: 'Jaimini Sutras / Dasha', signature: 'JM', accent: 'hsl(180, 70%, 35%)' },
  { key: 'mantreshwara', name: 'Mantreshwara',        deva: '\u092E\u0928\u094D\u0924\u094D\u0930\u0947\u0936\u094D\u0935\u0930', era: '16th c. CE',  school: 'Phaladeepika (Practical)',     signature: 'MP', accent: 'hsl(var(--brand-saffron))' },
  { key: 'kalyanavarman', name: 'Kalyanavarman',      deva: '\u0915\u0932\u094D\u092F\u093E\u0923\u0935\u0930\u094D\u092E\u0928', era: '10th c. CE',  school: 'Saravali (Poetic Descriptive)', signature: 'KV', accent: 'hsl(280, 60%, 45%)' },
];

const SAMPLE_QUESTIONS = [
  'When will the next significant career inflection occur?',
  'Is the current Sade Sati phase weakening, and what is the likely outcome?',
  'What does the chart say about marriage timing and partner temperament?',
  'Which yogas are actively shaping this lifetime, and which are dormant?',
];

const DEBATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guru-debate`;

interface StreamResult {
  text: string;
  finishReason: string | null;
}

async function streamFromEdge(
  payload: Record<string, unknown>,
  onDelta: (chunk: string) => void,
): Promise<StreamResult> {
  // Prefer the signed-in user's access token so the edge can attribute this call
  // to a real user in ai_usage; fall back to the anon key when logged out.
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(DEBATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    // Send the viewer's IANA timezone so the dossier's "today" is their local
    // civil date (DST-aware); all astronomy stays UTC server-side.
    body: JSON.stringify({ clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...payload }),
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
  let currentEventData = '';
  let lastFinishReason: string | null = null;

  const processLine = (line: string) => {
    if (line === '') {
      // Empty line indicates the end of an event block
      if (currentEventData) {
        handleEvent(currentEventData);
        currentEventData = '';
      }
    } else if (line.startsWith('data: ')) {
      const value = line.slice(6);
      currentEventData = currentEventData ? `${currentEventData}\n${value}` : value;
    }
  };

  const handleEvent = (data: string) => {
    const trimmed = data.trim();
    if (trimmed === '[DONE]') {
      done = true;
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
      const fr = parsed.choices?.[0]?.finish_reason as string | undefined;
      if (fr) lastFinishReason = fr;
      if (delta) {
        full += delta;
        onDelta(full);
      }
    } catch {
      console.warn('Skipped malformed SSE chunk:', trimmed.slice(0, 100));
    }
  };

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) {
      // If the stream ended, force processing of any remaining line in buffer
      if (buffer) {
        const remaining = buffer.trim();
        if (remaining) {
          processLine(remaining);
          processLine(''); // Trigger final event block
        }
      }
      break;
    }
    
    buffer += decoder.decode(value, { stream: true });

    let lineIndex;
    while ((lineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, lineIndex).trim();
      buffer = buffer.slice(lineIndex + 1);
      processLine(line);
      if (done) break;
    }
  }

  return { text: full, finishReason: lastFinishReason };
}


const compileChatHistory = (turns: DebateTurn[]) => {
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const turn of turns) {
    history.push({ role: 'user', content: turn.question });
    let assistantContent = turn.readings.map(r => `--- ${r.guru.toUpperCase()} ---\n${r.text}`).join('\n\n');
    if (turn.verdict) {
      assistantContent += `\n\n--- ACHARYA'S VERDICT ---\n${turn.verdict}`;
    }
    history.push({ role: 'assistant', content: assistantContent });
  }
  return history;
};

type GuruState = { status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error'; text: string; error?: string };

export default function Debate() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data: chart } = useKundli(id);
  const { question, setQuestion, followUp, setFollowUp, addToHistory, turns, addTurn, clearTurns } = useDebateStore();
  const [running, setRunning] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Record<GuruKey, boolean>>(() =>
    Object.fromEntries(GURUS.map((g) => [g.key, true])) as Record<GuruKey, boolean>,
  );
  const [states, setStates] = useState<Record<GuruKey, GuruState>>(() =>
    Object.fromEntries(GURUS.map((g) => [g.key, { status: 'idle', text: '' }])) as Record<GuruKey, GuruState>,
  );
  const [verdict, setVerdict] = useState<{ status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error'; text: string; error?: string }>({ status: 'idle', text: '' });

  const activeGurus = GURUS.filter((g) => selectedKeys[g.key]);

  // Playback mode
  const [playbackMode, setPlaybackMode] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(-1);

  const reset = () => {
    setStates(Object.fromEntries(GURUS.map((g) => [g.key, { status: 'idle', text: '' }])) as Record<GuruKey, GuruState>);
    setVerdict({ status: 'idle', text: '' });
  };

  useEffect(() => {
    clearTurns();
    reset();
  }, [id]);

  const runDebate = async (overrideQuestion?: string) => {
    const activeQuestion = (overrideQuestion || question).trim();
    if (!activeQuestion) {
      toast.error('Please pose a question to convene the tribunal.');
      return;
    }
    if (activeGurus.length === 0) {
      toast.error('Please select at least one Guru to convene the tribunal.');
      return;
    }

    setRunning(true);
    setPlaybackMode(false);
    reset();

    const compiledHistory = compileChatHistory(turns);

    const MAX_RETRIES = 2;
    const MIN_READING_LENGTH = 200;

    // parallel stream all selected Gurus (with per-guru retry)
    const promises = activeGurus.map(async (g) => {
      let attempts = 0;
      while (attempts <= MAX_RETRIES) {
        try {
          if (attempts === 0) {
            setStates((s) => ({ ...s, [g.key]: { status: 'thinking', text: '' } }));
            await new Promise((r) => setTimeout(r, Math.random() * 300));
          }
          setStates((s) => ({ ...s, [g.key]: { status: 'streaming', text: '' } }));

          const result = await streamFromEdge(
            { mode: 'guru', guru: g.key, question: activeQuestion, chart, chatHistory: compiledHistory },
            (t) => setStates((s) => ({ ...s, [g.key]: { status: 'streaming', text: t } })),
          );

          const isTruncated = result.finishReason === 'length';
          const isTooShort = result.text.length < MIN_READING_LENGTH;
          const noStopReason = !result.finishReason && result.text.length > 0;

          if (isTruncated || isTooShort || noStopReason) {
            attempts++;
            if (attempts > MAX_RETRIES) {
              setStates((s) => ({ ...s, [g.key]: { status: 'error', text: '', error: 'Reading was truncated after multiple attempts' } }));
              return { success: false, key: g.key, name: g.name, error: 'truncated' };
            }
            continue;
          }

          setStates((s) => ({ ...s, [g.key]: { status: 'done', text: result.text } }));
          return { success: true, key: g.key, name: g.name, text: result.text };
        } catch (e) {
          attempts++;
          if (attempts > MAX_RETRIES) {
            const msg = e instanceof Error ? e.message : 'Reading failed';
            setStates((s) => ({ ...s, [g.key]: { status: 'error', text: '', error: msg } }));
            return { success: false, key: g.key, name: g.name, error: msg };
          }
        }
      }
      return { success: false, key: g.key, name: g.name, error: 'Exhausted retries' };
    });

    const results = await Promise.all(promises);

    const successfulReadings = results
      .filter((r) => r.success)
      .map((r) => ({ guru: r.name, text: r.text as string }));

    const failedGurus = results
      .filter((r) => !r.success)
      .map((r) => r.name);

    if (successfulReadings.length > 0) {
      try {
        setVerdict({ status: 'thinking', text: '' });
        await new Promise((r) => setTimeout(r, 400));
        setVerdict({ status: 'streaming', text: '' });

        const verdictPayload: Record<string, unknown> = {
          mode: 'verdict',
          question: activeQuestion,
          chart,
          priorReadings: successfulReadings,
          chatHistory: compiledHistory,
        };
        if (failedGurus.length > 0) {
          verdictPayload.missingVoices = failedGurus;
        }

        let verdictAttempts = 0;
        let verdictResult: StreamResult = { text: '', finishReason: null };
        while (verdictAttempts <= MAX_RETRIES) {
          setVerdict({ status: 'streaming', text: '' });
          verdictResult = await streamFromEdge(
            verdictPayload,
            (t) => setVerdict({ status: 'streaming', text: t }),
          );
          const vTruncated = verdictResult.finishReason === 'length';
          const vTooShort = verdictResult.text.length < MIN_READING_LENGTH;
          if (vTruncated || vTooShort) {
            verdictAttempts++;
            if (verdictAttempts > MAX_RETRIES) break;
            continue;
          }
          break;
        }
        setVerdict({ status: 'done', text: verdictResult.text });

        // Add this completed turn to store history
        addTurn({
          question: activeQuestion,
          readings: successfulReadings,
          verdict: verdictResult.text
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Verdict failed';
        setVerdict({ status: 'error', text: '', error: msg });
        toast.error('Acharya verdict failed: ' + msg);
      }
    } else {
      toast.error('All selected gurus failed. Please try again.');
    }

    setRunning(false);
  };

  const handleFollowUp = () => {
    const nextQuestion = followUp.trim();
    if (!nextQuestion) return;

    addToHistory(question);
    setQuestion(nextQuestion);
    setFollowUp('');
    runDebate(nextQuestion);
  };

  const startPlayback = async () => {
    setPlaybackMode(true);
    setPlaybackIndex(-1);
    for (let i = 0; i < activeGurus.length; i++) {
      setPlaybackIndex(i);
      await new Promise((r) => setTimeout(r, 2000));
    }
    setPlaybackIndex(activeGurus.length); // reveal verdict
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between gap-2">
        <Link to={chartLink(`/app/chart/${id}`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to chart
        </Link>
        <Link to={`/app/voice/${id}`} className="inline-flex items-center gap-1.5 rounded-sm border border-brand-gold/40 px-3 py-1.5 text-sm font-medium text-brand-gold hover:bg-brand-gold/10">
          <Mic className="h-4 w-4" /> Switch to Voice Mode
        </Link>
      </div>
      <div className="mt-3 text-eyebrow text-brand-saffron">Tribunal · Selected voices, one verdict</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">The Guru Debate</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Pose a single, focused question. Choose your custom panel of classical and modern Gurus to read the chart in their own idiom; the Acharya synthesises their insights into a final judgment.
      </p>

      {/* Guru Selection Panel */}
      <div className="mt-6 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-text-tertiary">Select Astrological Gurus</h3>
            <p className="text-xs text-text-muted">Choose which traditions and lineages should join this debate</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedKeys(Object.fromEntries(GURUS.map(g => [g.key, true])) as Record<GuruKey, boolean>)}
              className="text-xs text-brand-saffron hover:underline"
            >
              Select All
            </button>
            <span className="text-xs text-text-muted">|</span>
            <button
              onClick={() => setSelectedKeys(Object.fromEntries(GURUS.map(g => [g.key, false])) as Record<GuruKey, boolean>)}
              className="text-xs text-text-tertiary hover:underline"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GURUS.map((g) => {
            const isSelected = selectedKeys[g.key];
            return (
              <button
                key={g.key}
                disabled={running}
                onClick={() => setSelectedKeys(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                className={`flex items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-all hover:bg-elevated ${
                  isSelected
                    ? 'border-brand-saffron/40 bg-brand-saffron/5 shadow-sm'
                    : 'border-hairline-subtle bg-canvas opacity-65 hover:opacity-90'
                } disabled:opacity-50`}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-display text-xs transition-all"
                  style={{
                    color: g.accent,
                    borderColor: isSelected ? g.accent : 'var(--border-hairline)',
                    backgroundColor: isSelected ? `${g.accent}0a` : 'transparent',
                  }}
                >
                  {g.signature}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-sm text-text-primary">{g.name}</div>
                  <div className="truncate text-xxs font-mono text-text-tertiary">{g.school}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question input */}
      <div className="mt-6 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
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
            onClick={() => runDebate()}
            disabled={running || !question.trim()}
            className="inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {running ? 'Debate in session\u2026' : 'Convene the Tribunal'}
          </button>
        </div>
      </div>      {/* Historical Debates Feed (Scrollable Trial Log) */}
      {turns.length > 0 && (
        <div className="mt-10 space-y-8 border-t border-hairline-subtle pt-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-h3 font-semibold text-text-primary flex items-center gap-2">
              <Gavel className="h-4 w-4 text-brand-saffron" /> Debate Proceedings History
            </h2>
            <button
              onClick={() => {
                clearTurns();
                reset();
                toast.success("Debate history cleared");
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-hairline-subtle px-3 py-1.5 text-xs text-text-tertiary hover:text-semantic-negative hover:border-semantic-negative/30 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear History
            </button>
          </div>
          
          <div className="space-y-6">
            {turns.map((turn, turnIdx) => (
              <div key={turnIdx} className="rounded-md border border-hairline-subtle bg-canvas/30 p-6 space-y-5">
                {/* User's Question */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-saffron/10 text-brand-saffron font-display text-xs">
                    Q
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-tertiary">Turn {turnIdx + 1} Question</span>
                    <h4 className="font-display text-base font-semibold text-text-primary mt-0.5">{turn.question}</h4>
                  </div>
                </div>

                <div className="gold-rule opacity-35" />

                {/* Acharya Verdict — surfaced first */}
                {turn.verdict && (
                  <div className="rounded-sm border border-brand-maroon/20 bg-surface p-5 yantra-bg shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Gavel className="h-4 w-4 text-brand-maroon" />
                      <span className="font-display font-bold text-text-primary text-sm">Acharya's Synthesis Verdict</span>
                    </div>
                    <VerdictContent text={turn.verdict} />
                  </div>
                )}

                {/* Full tribunal — collapsible detail */}
                {turn.readings.length > 0 && (
                  <details className="group rounded-sm border border-hairline-subtle bg-surface/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-medium text-text-tertiary hover:text-text-primary [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5" /> Show the full tribunal ({turn.readings.length} {turn.readings.length === 1 ? 'voice' : 'voices'})
                      </span>
                      <span className="text-text-muted transition-transform group-open:rotate-90">›</span>
                    </summary>
                    <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
                      {turn.readings.map((r, rIdx) => {
                        const guruInfo = GURUS.find(g => g.name === r.guru);
                        return (
                          <div key={rIdx} className="rounded-sm border border-hairline-subtle bg-surface p-4 text-sm flex flex-col justify-between shadow-sm animate-in fade-in duration-300">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-display"
                                  style={{
                                    color: guruInfo?.accent || 'var(--text-primary)',
                                    borderColor: guruInfo?.accent || 'var(--border-hairline)'
                                  }}
                                >
                                  {guruInfo?.signature || 'G'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-display font-semibold text-text-primary text-xs truncate">{r.guru}</div>
                                  {guruInfo && <div className="text-[9px] text-text-tertiary font-mono truncate">{guruInfo.school}</div>}
                                </div>
                              </div>
                              <p className="whitespace-pre-line text-xs text-text-secondary leading-relaxed font-body">
                                {r.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Debate Panel (Streaming in Real-Time) */}
      {(running || activeGurus.some(g => states[g.key].status !== 'idle') || verdict.status !== 'idle') && (
        <div className="mt-8 space-y-6 border-t border-brand-saffron/20 pt-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-maroon opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-maroon"></span>
            </span>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-text-tertiary">
              Active Tribunal Session
            </h3>
          </div>
          
          <div className="space-y-4">
            {activeGurus.map((g) => {
              const st = states[g.key];
              const inactive = st.status === 'idle';
              return (
                <motion.article
                  key={g.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: inactive ? 0.55 : 1, y: 0 }}
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
          {verdict.status !== 'idle' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-md border border-brand-maroon/40 bg-surface p-6 shadow-sm yantra-bg">
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
                <div className="mt-4">
                  <VerdictContent text={verdict.text} streaming={verdict.status === 'streaming'} />
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Follow-up input */}
      {turns.length > 0 && !running && (
        <div className="mt-6 rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm animate-in fade-in duration-500">
          <label className="text-eyebrow text-text-tertiary">Ask a follow-up</label>
          <div className="mt-2 flex gap-3">
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="Ask a deeper question about this reading…"
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

/** Split the Acharya's verdict into the leading "BOTTOM LINE" TL;DR and the full synthesis body. */
function splitVerdict(text: string): { bottomLine: string | null; body: string } {
  const t = text.replace(/^\s+/, '');
  const m = /^BOTTOM LINE:\s*/i.exec(t);
  if (!m) return { bottomLine: null, body: text };
  const after = t.slice(m[0].length);
  const idx = after.indexOf('\n\n');
  if (idx === -1) return { bottomLine: after.trim(), body: '' };
  return { bottomLine: after.slice(0, idx).trim(), body: after.slice(idx + 2).trim() };
}

function VerdictContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const { bottomLine, body } = splitVerdict(text);
  const bodyText = body || (bottomLine ? '' : text);
  const cursor = <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-text-primary align-middle" />;
  return (
    <div className="space-y-3">
      {bottomLine && (
        <div className="rounded-sm border border-brand-maroon/25 bg-brand-maroon/[0.04] px-4 py-3">
          <div className="text-eyebrow text-brand-maroon mb-1">Bottom line</div>
          <p className="whitespace-pre-line text-body font-medium leading-relaxed text-text-primary">
            {bottomLine}{streaming && !bodyText && cursor}
          </p>
        </div>
      )}
      {bodyText && (
        <p className="whitespace-pre-line text-body leading-relaxed text-text-secondary">
          {bodyText}{streaming && cursor}
        </p>
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
