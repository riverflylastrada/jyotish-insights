import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Loader2, Gavel, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebateStore } from '@/stores/useDebateStore';

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
  { key: 'parashara',    name: 'Maharishi Parashara', deva: 'पराशर',       era: '~1500 BCE',  school: 'Brihat Parashara Hora Sastra', signature: 'PS', accent: 'hsl(var(--brand-maroon))' },
  { key: 'varahamihira', name: 'Varahamihira',        deva: 'वराहमिहिर',  era: '6th c. CE',  school: 'Brihat Jataka',                signature: 'VM', accent: 'hsl(var(--planet-jupiter))' },
  { key: 'raman',        name: 'Dr. B. V. Raman',     deva: 'बी. वी. रमण', era: '20th c.',    school: 'Modern Hindu Astrology',       signature: 'BR', accent: 'hsl(var(--planet-mars))' },
  { key: 'rao',          name: 'K. N. Rao',           deva: 'के. एन. राव', era: '20th c.',    school: 'Dasha-led judgment',           signature: 'KR', accent: 'hsl(var(--planet-saturn))' },
  { key: 'krishnamurti', name: 'K. S. Krishnamurti',  deva: 'कृष्णमूर्ति',  era: '20th c.',    school: 'KP / Stellar Astrology',       signature: 'KP', accent: 'hsl(var(--planet-mercury))' },
];

const SAMPLE_QUESTIONS = [
  'When will the next significant career inflection occur?',
  'Is the current Sade Sati phase weakening, and what is the likely outcome?',
  'What does the chart say about marriage timing and partner temperament?',
  'Which yogas are actively shaping this lifetime, and which are dormant?',
];

// Mock argument generator — produces a deterministic, classically-flavored response per guru.
function generateResponse(g: Guru, q: string): string {
  const base: Record<GuruKey, string> = {
    parashara:    `Reading the Lagna and its lord first, as ordained in the Hora Sastra: the ascendant is Vrischika, ruled by Mangal placed in the 11th from Lagna in Kanya. Where Mangal occupies a friend's sign in an upachaya, the matter improves with time. The 9th lord Chandra in the 9th in Karka is a dignified placement, and the Atmakaraka here speaks plainly to the question.`,
    varahamihira: `Per Brihat Jataka, the strength of the karaka must be weighed against the strength of the bhava. Guru aspecting the 10th, while Surya and Budha conjoin therein (Budhaditya), produces a luminous tenth house. The matter posed will not unfold suddenly, but through repeated, well-considered exertion across two Antardashas.`,
    raman:        `Practically speaking, the Dasamsa supports what the Rasi suggests — Surya in the 10th is a public vocation, not a private one. The current Mahadasha lord is functionally benefic for this Lagna, so I would interpret the question optimistically, with the caveat that a Saturn transit through the natal 10th will demand patience around 2026–2028.`,
    rao:          `I judge by Dasha first. The running Maha-Antar combination shows the lord of the 10th influencing the lord of the 11th — a clear period for results from labour, particularly recognition. Pratyantar of Guru within this period, when it arrives, will be the operative window. Apply double-transit: when Saturn and Jupiter both touch a single bhava, that bhava fructifies.`,
    krishnamurti: `Stellar analysis: the cuspal sub-lord of the 10th house signifies houses 2, 6, 10, 11 — the matter is promised. The ruling planets at the moment of judgment include the Moon's star-lord, which corroborates a positive verdict. The timing will be governed by the Dasha-Bhukti-Antara of the significators of 10 and 11.`,
  };
  const tail = q ? `\n\nDirected to your question — "${q}" — my reading stands.` : '';
  return base[g.key] + tail;
}

function generateVerdict(q: string): string {
  return `Across five readings the consensus is clear: the chart supports an affirmative outcome, conditioned on patience through the closing Sade Sati window. Parashara and Varahamihira agree on the underlying yoga; Raman tempers the timing; Rao isolates the operative Antardasha; Krishnamurti confirms via cuspal sub-lord. The dissent is primarily about timing, not direction.${q ? `\n\nOn "${q}" — proceed, with the major commitment timed to the Jupiter Pratyantar inside the current Mahadasha.` : ''}`;
}

type GuruState = { status: 'idle' | 'thinking' | 'streaming' | 'done'; text: string };

export default function Debate() {
  const { id = 'demo' } = useParams();
  const { question, setQuestion } = useDebateStore();
  const [running, setRunning] = useState(false);
  const [states, setStates] = useState<Record<GuruKey, GuruState>>(() =>
    Object.fromEntries(GURUS.map((g) => [g.key, { status: 'idle', text: '' }])) as Record<GuruKey, GuruState>,
  );
  const [verdict, setVerdict] = useState<{ status: 'idle' | 'streaming' | 'done'; text: string }>({ status: 'idle', text: '' });

  const reset = () => {
    setStates(Object.fromEntries(GURUS.map((g) => [g.key, { status: 'idle', text: '' }])) as Record<GuruKey, GuruState>);
    setVerdict({ status: 'idle', text: '' });
  };

  const streamText = (full: string, onChunk: (t: string) => void): Promise<void> =>
    new Promise((resolve) => {
      const words = full.split(' ');
      let i = 0;
      const tick = () => {
        i += Math.max(2, Math.floor(Math.random() * 4));
        onChunk(words.slice(0, i).join(' '));
        if (i < words.length) setTimeout(tick, 35 + Math.random() * 50);
        else resolve();
      };
      tick();
    });

  const runDebate = async () => {
    setRunning(true);
    reset();
    for (const g of GURUS) {
      setStates((s) => ({ ...s, [g.key]: { status: 'thinking', text: '' } }));
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
      setStates((s) => ({ ...s, [g.key]: { status: 'streaming', text: '' } }));
      const full = generateResponse(g, question);
      await streamText(full, (t) => setStates((s) => ({ ...s, [g.key]: { status: 'streaming', text: t } })));
      setStates((s) => ({ ...s, [g.key]: { status: 'done', text: full } }));
    }
    setVerdict({ status: 'streaming', text: '' });
    const v = generateVerdict(question);
    await streamText(v, (t) => setVerdict({ status: 'streaming', text: t }));
    setVerdict({ status: 'done', text: v });
    setRunning(false);
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
          <div className="text-xs text-text-tertiary">Demo mode · responses are mock-generated for the reference chart.</div>
          <button
            onClick={runDebate}
            disabled={running || !question.trim()}
            className="inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {running ? 'Debate in session…' : 'Convene the Tribunal'}
          </button>
        </div>
      </div>

      {/* Guru responses */}
      <div className="mt-8 space-y-4">
        {GURUS.map((g) => {
          const st = states[g.key];
          const inactive = st.status === 'idle';
          return (
            <motion.article
              key={g.key}
              initial={false}
              animate={{ opacity: inactive ? 0.55 : 1 }}
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
                          <ThinkingDots />
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
          <p className="mt-4 whitespace-pre-line text-body text-text-secondary">
            {verdict.text}
            {verdict.status === 'streaming' && <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-text-primary align-middle" />}
          </p>
        </motion.div>
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
  } as const;
  const m = map[status];
  return <span className={`rounded-sm border bg-surface px-2 py-0.5 text-eyebrow ${m.cls}`}>{m.label}</span>;
}

function ThinkingDots() {
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
      <span className="ml-2 text-xs">Consulting the chart…</span>
    </div>
  );
}