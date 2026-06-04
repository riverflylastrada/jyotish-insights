import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, MessageSquare, Clock, Hash, Gavel, Trash2, Play, Square, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { getAstroProvider } from '@/lib/astro/factory';
import { KundliChart } from '@/components/kundli/KundliChart';
import { useChartStore } from '@/stores/useChartStore';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import type { KundliData, KpData, BirthDetails } from '@/lib/astro/types';

// ─── Guru definitions (same as Debate.tsx) ─────────────────────────────────

type GuruKey = 'parashara' | 'varahamihira' | 'raman' | 'rao' | 'krishnamurti' | 'jaimini' | 'mantreshwara' | 'kalyanavarman';

interface Guru {
  key: GuruKey;
  name: string;
  signature: string;
  accent: string;
  school: string;
}

const GURUS: Guru[] = [
  { key: 'parashara',    name: 'Maharishi Parashara', signature: 'PS', accent: 'hsl(var(--brand-maroon))', school: 'BPHS' },
  { key: 'varahamihira', name: 'Varahamihira',        signature: 'VM', accent: 'hsl(var(--planet-jupiter))', school: 'Brihat Jataka' },
  { key: 'raman',        name: 'Dr. B. V. Raman',     signature: 'BR', accent: 'hsl(var(--planet-mars))', school: 'Modern Hindu' },
  { key: 'rao',          name: 'K. N. Rao',           signature: 'KR', accent: 'hsl(var(--planet-saturn))', school: 'Dasha-led' },
  { key: 'krishnamurti', name: 'K. S. Krishnamurti',  signature: 'KP', accent: 'hsl(var(--planet-mercury))', school: 'KP / Stellar' },
  { key: 'jaimini',      name: 'Maharishi Jaimini',   signature: 'JM', accent: 'hsl(180, 70%, 35%)', school: 'Jaimini Sutras' },
  { key: 'mantreshwara', name: 'Mantreshwara',        signature: 'MP', accent: 'hsl(var(--brand-saffron))', school: 'Phaladeepika' },
  { key: 'kalyanavarman',name: 'Kalyanavarman',       signature: 'KV', accent: 'hsl(280, 60%, 45%)', school: 'Saravali' },
];

const DEBATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guru-debate`;

// ─── Stream helper (reuse same pattern as Debate.tsx) ───────────────────────

interface StreamResult { text: string; finishReason: string | null; }

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
      if (currentEventData) { handleEvent(currentEventData); currentEventData = ''; }
    } else if (line.startsWith('data: ')) {
      const value = line.slice(6);
      currentEventData = currentEventData ? `${currentEventData}\n${value}` : value;
    }
  };

  const handleEvent = (data: string) => {
    const trimmed = data.trim();
    if (trimmed === '[DONE]') { done = true; return; }
    try {
      const parsed = JSON.parse(trimmed);
      const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
      const fr = parsed.choices?.[0]?.finish_reason as string | undefined;
      if (fr) lastFinishReason = fr;
      if (delta) { full += delta; onDelta(full); }
    } catch { /* skip malformed */ }
  };

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) {
      if (buffer) { const remaining = buffer.trim(); if (remaining) { processLine(remaining); processLine(''); } }
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

// ─── KP Significators + Ruling Planets panels ──────────────────────────────

function PlanetSubLords({ data }: { data: KpData['planetSubLords'] }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">Planet Sub-Lords</h2>
      <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">Planet</th>
              <th className="px-4 py-2 font-medium">Sign Lord</th>
              <th className="px-4 py-2 font-medium">Star Lord</th>
              <th className="px-4 py-2 font-medium">Sub Lord</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {data.map((r) => (
              <tr key={r.planet}>
                <td className="px-4 py-2 font-display capitalize text-text-primary">{r.planet}</td>
                <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.signLord}</td>
                <td className="px-4 py-2 font-mono text-xs text-text-secondary">{r.starLord}</td>
                <td className="px-4 py-2 font-mono text-xs text-brand-saffron">{r.subLord}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RulingPlanets({ data }: { data: NonNullable<KpData['rulingPlanets']> }) {
  const items: Array<[string, string]> = [
    ['Asc Sign Lord', data.ascSignLord],
    ['Asc Star Lord', data.ascStarLord],
    ['Moon Sign Lord', data.moonSignLord],
    ['Moon Star Lord', data.moonStarLord],
    ['Day Lord', data.dayLord],
  ];
  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">Ruling Planets</h2>
      <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map(([k, v]) => (
            <div key={k}>
              <div className="text-eyebrow text-text-tertiary">{k}</div>
              <div className="mt-1 font-display text-h3 capitalize text-text-primary">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HouseSignificators({ data }: { data: NonNullable<KpData['houseSignificators']> }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-h3 text-text-primary">House Significators</h2>
      <div className="overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-3 py-2 font-medium">House</th>
              <th className="px-3 py-2 font-medium">A (Strongest)</th>
              <th className="px-3 py-2 font-medium">B</th>
              <th className="px-3 py-2 font-medium">C</th>
              <th className="px-3 py-2 font-medium">D (Weakest)</th>
              <th className="px-3 py-2 font-medium">Ordered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {data.map((h) => (
              <tr key={h.house}>
                <td className="px-3 py-2 font-display text-text-primary">{h.house}</td>
                <td className="px-3 py-2 font-mono text-xs text-text-secondary capitalize">{h.levelA.join(', ') || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-text-secondary capitalize">{h.levelB.join(', ') || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-text-secondary capitalize">{h.levelC.join(', ') || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-text-secondary capitalize">{h.levelD.join(', ') || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-brand-saffron capitalize">{h.ordered.join(' → ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Debate types ───────────────────────────────────────────────────────────

type GuruState = { status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error'; text: string; error?: string };

interface DebateTurn {
  question: string;
  readings: Array<{ guru: string; text: string }>;
  verdict: string;
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function Prashna() {
  const { location, loading: locLoading } = useCurrentLocation();
  const chartStyle = useChartStore((s) => s.chartStyle);

  // Casting mode
  const [castMode, setCastMode] = useState<'moment' | 'kp'>('moment');
  const [kpNumber, setKpNumber] = useState<string>('');
  const [questionText, setQuestionText] = useState('');
  const [casting, setCasting] = useState(false);
  const [chartData, setChartData] = useState<KundliData | null>(null);
  const [castTimestamp, setCastTimestamp] = useState<string | null>(null);

  // Debate state
  const [running, setRunning] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Record<GuruKey, boolean>>(() =>
    Object.fromEntries(GURUS.map((g) => [g.key, true])) as Record<GuruKey, boolean>,
  );
  const [states, setStates] = useState<Record<GuruKey, GuruState>>(() =>
    Object.fromEntries(GURUS.map((g) => [g.key, { status: 'idle', text: '' }])) as Record<GuruKey, GuruState>,
  );
  const [verdict, setVerdict] = useState<{ status: 'idle' | 'thinking' | 'streaming' | 'done' | 'error'; text: string; error?: string }>({ status: 'idle', text: '' });
  const [turns, setTurns] = useState<DebateTurn[]>([]);

  const activeGurus = GURUS.filter((g) => selectedKeys[g.key]);

  const resetDebate = () => {
    setStates(Object.fromEntries(GURUS.map((g) => [g.key, { status: 'idle', text: '' }])) as Record<GuruKey, GuruState>);
    setVerdict({ status: 'idle', text: '' });
  };

  // Cast the chart
  const castChart = async () => {
    if (!questionText.trim()) {
      toast.error('Please enter your question first.');
      return;
    }

    if (castMode === 'kp') {
      const n = parseInt(kpNumber, 10);
      if (!n || n < 1 || n > 249) {
        toast.error('Enter a valid KP horary number (1–249).');
        return;
      }
    }

    if (castMode === 'moment' && !location) {
      toast.error('Current location not available. Set it in Settings → Current Location.');
      return;
    }

    setCasting(true);
    setChartData(null);
    resetDebate();
    setTurns([]);

    try {
      const now = new Date();
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
      const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

      const loc = location!;
      const tz = loc.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const off = getTimezoneOffset(tz, dateStr, timeStr);

      const birthDetails: BirthDetails = {
        fullName: 'Prashna Chart',
        dateOfBirth: dateStr,
        ...(castMode === 'moment' ? { timeOfBirth: timeStr } : {}),
        placeOfBirth: {
          name: loc.placeName || 'Current Location',
          latitude: loc.lat,
          longitude: loc.lon,
          timezone: tz,
          timezoneOffset: off,
        },
        ayanamsa: 'lahiri',
        houseSystem: castMode === 'kp' ? 'placidus' : 'whole_sign',
        ...(castMode === 'kp'
          ? { chartBasis: 'horary' as const, horaryNumber: parseInt(kpNumber, 10) }
          : {}),
      };

      const provider = getAstroProvider();
      const data = await provider.generateKundli(birthDetails);
      setChartData(data);
      setCastTimestamp(
        `${dateStr} ${timeStr} (${loc.placeName || 'Current Location'})` +
        (castMode === 'kp' ? ` · KP #${kpNumber}` : ' · This Moment'),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cast chart');
    } finally {
      setCasting(false);
    }
  };

  // Run prashna debate
  const runDebate = async () => {
    if (!questionText.trim()) { toast.error('Enter a question.'); return; }
    if (!chartData) { toast.error('Cast a chart first.'); return; }
    if (activeGurus.length === 0) { toast.error('Select at least one Guru.'); return; }

    setRunning(true);
    resetDebate();

    const MAX_RETRIES = 2;
    const MIN_READING_LENGTH = 200;

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
            { mode: 'guru', guru: g.key, question: questionText, chart: chartData, prashnaMode: true },
            (t) => setStates((s) => ({ ...s, [g.key]: { status: 'streaming', text: t } })),
          );

          const isTruncated = result.finishReason === 'length';
          const isTooShort = result.text.length < MIN_READING_LENGTH;
          if (isTruncated || isTooShort) {
            attempts++;
            if (attempts > MAX_RETRIES) {
              setStates((s) => ({ ...s, [g.key]: { status: 'error', text: '', error: 'Reading was truncated' } }));
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

    const successfulReadings = results.filter((r) => r.success).map((r) => ({ guru: r.name, text: r.text as string }));
    const failedGurus = results.filter((r) => !r.success).map((r) => r.name);

    if (successfulReadings.length > 0) {
      try {
        setVerdict({ status: 'thinking', text: '' });
        await new Promise((r) => setTimeout(r, 400));
        setVerdict({ status: 'streaming', text: '' });

        const verdictPayload: Record<string, unknown> = {
          mode: 'verdict',
          question: questionText,
          chart: chartData,
          priorReadings: successfulReadings,
          prashnaMode: true,
        };
        if (failedGurus.length > 0) verdictPayload.missingVoices = failedGurus;

        let verdictAttempts = 0;
        let verdictResult: StreamResult = { text: '', finishReason: null };
        while (verdictAttempts <= MAX_RETRIES) {
          setVerdict({ status: 'streaming', text: '' });
          verdictResult = await streamFromEdge(
            verdictPayload,
            (t) => setVerdict({ status: 'streaming', text: t }),
          );
          if (verdictResult.finishReason === 'length' || verdictResult.text.length < MIN_READING_LENGTH) {
            verdictAttempts++;
            if (verdictAttempts > MAX_RETRIES) break;
            continue;
          }
          break;
        }
        setVerdict({ status: 'done', text: verdictResult.text });

        setTurns((prev) => [...prev, {
          question: questionText,
          readings: successfulReadings,
          verdict: verdictResult.text,
        }]);
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

  const d1 = chartData?.divisionalCharts?.find((c) => c.varga === 'D1');
  const kp = chartData?.kp;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="text-eyebrow text-brand-saffron">Prashna Kundli · Horary Astrology</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Prashna — Ask a Question</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Cast a chart for the exact moment a question arises. Horary judgment is KP-driven —
        sub-lords, Ruling Planets, and Moon's application reveal the answer. Method: <strong>Krishnamurti Paddhati (KP)</strong>.
      </p>

      {/* Question + Casting */}
      <div className="mt-6 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm space-y-5">
        <div>
          <label className="text-eyebrow text-text-tertiary">Your Question</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            placeholder="e.g. Will I get this job offer? Should I travel this month?"
            className="mt-2 w-full resize-none rounded-sm border border-hairline-subtle bg-canvas px-3 py-2 text-body text-text-primary placeholder:text-text-muted focus:border-brand-maroon focus:outline-none"
          />
        </div>

        {/* Cast mode tabs */}
        <div>
          <label className="text-eyebrow text-text-tertiary">Cast method</label>
          <div className="mt-2 flex gap-3">
            <button
              onClick={() => setCastMode('moment')}
              className={`inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-sm transition-all ${
                castMode === 'moment'
                  ? 'border-brand-saffron bg-brand-saffron/10 text-text-primary'
                  : 'border-hairline-subtle text-text-tertiary hover:text-text-primary'
              }`}
            >
              <Clock className="h-4 w-4" /> This Moment
            </button>
            <button
              onClick={() => setCastMode('kp')}
              className={`inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-sm transition-all ${
                castMode === 'kp'
                  ? 'border-brand-saffron bg-brand-saffron/10 text-text-primary'
                  : 'border-hairline-subtle text-text-tertiary hover:text-text-primary'
              }`}
            >
              <Hash className="h-4 w-4" /> KP Number (1–249)
            </button>
          </div>
        </div>

        {castMode === 'moment' && (
          <div className="rounded-sm border border-hairline-subtle bg-elevated p-4 text-sm text-text-secondary">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-text-tertiary" />
              <span className="font-medium text-text-primary">Current Location</span>
            </div>
            {locLoading ? (
              <span className="text-text-muted">Loading location…</span>
            ) : location ? (
              <span>{location.placeName || `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`} ({location.timezone})</span>
            ) : (
              <span className="text-semantic-negative">No location set. Go to <Link to="/app/settings" className="underline">Settings</Link> to set your current location.</span>
            )}
          </div>
        )}

        {castMode === 'kp' && (
          <div>
            <label className="text-eyebrow text-text-tertiary">KP Horary Number</label>
            <input
              type="number"
              min={1}
              max={249}
              value={kpNumber}
              onChange={(e) => setKpNumber(e.target.value)}
              placeholder="1–249"
              className="mt-2 w-32 rounded-sm border border-hairline-subtle bg-canvas px-3 py-2 text-body text-text-primary placeholder:text-text-muted focus:border-brand-maroon focus:outline-none"
            />
            <p className="mt-1 text-xs text-text-muted">Think of a number 1–249 at the moment of asking. This determines the Lagna via KP sub-lord table.</p>
          </div>
        )}

        <button
          onClick={castChart}
          disabled={casting || !questionText.trim() || (castMode === 'moment' && !location)}
          className="inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {casting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {casting ? 'Casting…' : 'Cast Prashna Chart'}
        </button>
      </div>

      {/* Cast timestamp */}
      {castTimestamp && (
        <div className="mt-4 text-xs text-text-muted">
          Chart cast: {castTimestamp}
        </div>
      )}

      {/* Chart + KP data */}
      {chartData && d1 && (
        <div className="mt-8 space-y-8 animate-in fade-in duration-500">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Chart */}
            <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
              <h2 className="mb-4 font-display text-h3 text-text-primary">Prashna Chart (D1 Rasi)</h2>
              <div className="flex justify-center">
                <KundliChart chart={d1} style={chartStyle} size={340} />
              </div>
            </div>

            {/* Quick reference */}
            <div className="space-y-6">
              {kp?.rulingPlanets && <RulingPlanets data={kp.rulingPlanets} />}
              {kp?.planetSubLords && <PlanetSubLords data={kp.planetSubLords} />}
            </div>
          </div>

          {kp?.houseSignificators && kp.houseSignificators.length > 0 && (
            <HouseSignificators data={kp.houseSignificators} />
          )}

          {/* Ask 5 Gurus button */}
          <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-display text-h3 text-text-primary">Ask the Gurus — Prashna Mode</h2>
              <p className="mt-1 text-sm text-text-secondary">
                The gurus will judge your question horary-style using this moment-chart, KP sub-lords, Ruling Planets, and Moon's application. No natal/birth-data assumptions.
              </p>
            </div>

            {/* Guru selection */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GURUS.map((g) => {
                const isSelected = selectedKeys[g.key];
                return (
                  <button
                    key={g.key}
                    disabled={running}
                    onClick={() => setSelectedKeys((prev) => ({ ...prev, [g.key]: !prev[g.key] }))}
                    className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-left text-xs transition-all hover:bg-elevated ${
                      isSelected
                        ? 'border-brand-saffron/40 bg-brand-saffron/5 shadow-sm'
                        : 'border-hairline-subtle bg-canvas opacity-65 hover:opacity-90'
                    } disabled:opacity-50`}
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-display"
                      style={{
                        color: g.accent,
                        borderColor: isSelected ? g.accent : 'var(--border-hairline)',
                      }}
                    >
                      {g.signature}
                    </div>
                    <span className="truncate font-display text-text-primary">{g.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={runDebate}
              disabled={running || activeGurus.length === 0}
              className="inline-flex items-center gap-2 rounded-sm bg-brand-maroon px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              {running ? 'Gurus deliberating…' : 'Ask 5 Gurus (Prashna Mode)'}
            </button>
          </div>

          {/* Active streaming */}
          {(running || activeGurus.some((g) => states[g.key].status !== 'idle') || verdict.status !== 'idle') && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-maroon opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-maroon" />
                </span>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-text-tertiary">Prashna Tribunal</h3>
              </div>

              <div className="space-y-3">
                {activeGurus.map((g) => {
                  const st = states[g.key];
                  if (st.status === 'idle') return null;
                  return (
                    <motion.div
                      key={g.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-sm border border-hairline-subtle bg-surface p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-display"
                          style={{ color: g.accent, borderColor: g.accent }}
                        >
                          {g.signature}
                        </div>
                        <span className="font-display text-sm font-semibold text-text-primary">{g.name}</span>
                        {st.status === 'thinking' && <Loader2 className="h-3 w-3 animate-spin text-text-muted" />}
                      </div>
                      {st.status === 'error' ? (
                        <p className="text-xs text-semantic-negative">{st.error}</p>
                      ) : (
                        <p className="whitespace-pre-line text-xs text-text-secondary leading-relaxed">{st.text}</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Verdict */}
              {verdict.status !== 'idle' && (
                <div className="rounded-sm border border-brand-maroon/20 bg-surface p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Gavel className="h-4 w-4 text-brand-maroon" />
                    <span className="font-display font-bold text-text-primary text-sm">Acharya's Prashna Verdict</span>
                    {verdict.status === 'thinking' && <Loader2 className="h-3 w-3 animate-spin text-text-muted" />}
                  </div>
                  {verdict.status === 'error' ? (
                    <p className="text-xs text-semantic-negative">{verdict.error}</p>
                  ) : (
                    <p className="whitespace-pre-line text-sm text-text-secondary leading-relaxed">{verdict.text}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Past turns */}
          {turns.length > 0 && (
            <div className="space-y-6 border-t border-hairline-subtle pt-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-h3 text-text-primary flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-brand-saffron" /> Prashna Debate History
                </h2>
                <button
                  onClick={() => { setTurns([]); resetDebate(); }}
                  className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-semantic-negative"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
              {turns.map((turn, idx) => (
                <div key={idx} className="rounded-md border border-hairline-subtle bg-canvas/30 p-5 space-y-4">
                  <h4 className="font-display text-sm text-text-primary">{turn.question}</h4>
                  {turn.verdict && (
                    <div className="rounded-sm border border-brand-maroon/20 bg-surface p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Gavel className="h-3 w-3 text-brand-maroon" />
                        <span className="text-xs font-bold text-text-primary">Acharya's Verdict</span>
                      </div>
                      <p className="whitespace-pre-line text-xs text-text-secondary">{turn.verdict}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`.input { width: 100%; border: 1px solid hsl(var(--input)); background: hsl(var(--bg-surface)); border-radius: 3px; padding: 0.55rem 0.75rem; font-size: 14px; color: hsl(var(--text-primary)); outline: none; transition: border-color 120ms; }
.input:focus { border-color: hsl(var(--brand-saffron)); box-shadow: 0 0 0 3px hsl(var(--brand-saffron) / 0.12); }`}</style>
    </div>
  );
}

function getTimezoneOffset(timeZone: string, dateStr: string, timeStr: string): number {
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const [hourStr, minStr, secStr] = timeStr.split(':');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minStr, 10);
    const second = secStr ? parseInt(secStr, 10) : 0;
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) return 0;
    const utcMillis = Date.UTC(year, month, day, hour, minute, second);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
    });
    const parts = formatter.formatToParts(new Date(utcMillis));
    const map: Record<string, number> = {};
    parts.forEach((p) => { if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10); });
    const t1 = Date.UTC(map.year, map.month - 1, map.day, map.hour === 24 ? 0 : map.hour, map.minute, map.second || 0);
    return Math.round(((t1 - utcMillis) / 3_600_000) * 100) / 100;
  } catch { return 0; }
}
