import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Sunrise, Sunset, Calendar as CalendarIcon, Clock, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { useKundli } from '@/hooks/useKundli';

/** Day-lords in Surya-Siddhanta weekday order (Sun=0 … Sat=6). */
const DAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;
/** Chaldean order used for Hora rotation. */
const HORA_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'] as const;

/** Position (1-based, of 8) of the inauspicious slice for each weekday. */
const RAHU_KALAM_POS:    Record<number, number> = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 };
const YAMAGANDAM_POS:    Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6 };
const GULIKA_KALAM_POS:  Record<number, number> = { 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

/** Quality of a hora's lord for general activity. */
const HORA_QUALITY: Record<typeof HORA_ORDER[number], { tone: 'auspicious' | 'mixed' | 'inauspicious'; use: string }> = {
  Sun:     { tone: 'mixed',        use: 'Authority, government work, dealing with elders' },
  Moon:    { tone: 'auspicious',   use: 'Travel, water-related work, healing, social functions' },
  Mars:    { tone: 'inauspicious', use: 'Avoid most starts; suited only to surgery, sports, conflict resolution' },
  Mercury: { tone: 'auspicious',   use: 'Learning, writing, contracts, commerce, communication' },
  Jupiter: { tone: 'auspicious',   use: 'Spiritual rites, education, marriage, financial commitments' },
  Venus:   { tone: 'auspicious',   use: 'Art, music, romance, beauty, luxury purchases' },
  Saturn:  { tone: 'inauspicious', use: 'Avoid new ventures; suited to renunciation, labour, machinery' },
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(min: number): string {
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

interface Slice { from: string; to: string; label: string; sub?: string; tone: 'auspicious' | 'mixed' | 'inauspicious' }

function computeMuhurtas(date: Dayjs, sunrise: string, sunset: string) {
  const weekday = date.day(); // 0 = Sun
  const sr = timeToMinutes(sunrise);
  const ss = timeToMinutes(sunset);
  const dayLen = ss - sr;
  const nightLen = 24 * 60 - dayLen;
  const slice = dayLen / 8;

  const inauspicious: Slice[] = [
    {
      from: minutesToTime(sr + slice * (RAHU_KALAM_POS[weekday] - 1)),
      to:   minutesToTime(sr + slice * RAHU_KALAM_POS[weekday]),
      label: 'Rahu Kalam',
      sub: 'Avoid all auspicious beginnings',
      tone: 'inauspicious',
    },
    {
      from: minutesToTime(sr + slice * (YAMAGANDAM_POS[weekday] - 1)),
      to:   minutesToTime(sr + slice * YAMAGANDAM_POS[weekday]),
      label: 'Yamagandam',
      sub: 'Avoid travel, journeys',
      tone: 'inauspicious',
    },
    {
      from: minutesToTime(sr + slice * (GULIKA_KALAM_POS[weekday] - 1)),
      to:   minutesToTime(sr + slice * GULIKA_KALAM_POS[weekday]),
      label: 'Gulika Kalam',
      sub: 'Effects of action begun here repeat — avoid',
      tone: 'inauspicious',
    },
  ];

  // Abhijit Muhurta — ~24 min around solar noon, except Wednesday.
  const noon = sr + dayLen / 2;
  const abhi: Slice[] = weekday === 3 ? [] : [{
    from: minutesToTime(noon - 12),
    to:   minutesToTime(noon + 12),
    label: 'Abhijit Muhurta',
    sub: 'King of muhurtas — universally auspicious (skip on Wednesday)',
    tone: 'auspicious',
  }];

  // Brahma Muhurta — ~96 min before sunrise.
  const brahma: Slice[] = [{
    from: minutesToTime(sr - 96),
    to:   minutesToTime(sr - 48),
    label: 'Brahma Muhurta',
    sub: 'Best for meditation, study, sadhana',
    tone: 'auspicious',
  }];

  // Pradosha Kala — ~96 min around sunset.
  const pradosha: Slice[] = [{
    from: minutesToTime(ss - 48),
    to:   minutesToTime(ss + 48),
    label: 'Pradosha Kala',
    sub: 'Sacred to Lord Shiva — worship, evening rituals',
    tone: 'auspicious',
  }];

  // Day & night horas (1 day-hora = dayLen/12; 1 night-hora = nightLen/12).
  const dayHoraLen = dayLen / 12;
  const nightHoraLen = nightLen / 12;
  const startLord = DAY_LORDS[weekday] as typeof HORA_ORDER[number];
  const startIndex = HORA_ORDER.indexOf(startLord);

  const horas: Array<Slice & { lord: typeof HORA_ORDER[number] }> = [];
  for (let i = 0; i < 24; i++) {
    const lord = HORA_ORDER[(startIndex + i) % 7];
    const isDay = i < 12;
    const len = isDay ? dayHoraLen : nightHoraLen;
    const start = isDay ? sr + i * dayHoraLen : ss + (i - 12) * nightHoraLen;
    const q = HORA_QUALITY[lord];
    horas.push({
      lord,
      from: minutesToTime(start),
      to: minutesToTime(start + len),
      label: `${lord} Hora`,
      sub: q.use,
      tone: q.tone,
    });
  }

  return {
    weekday: DAY_LORDS[weekday],
    auspicious: [...brahma, ...abhi, ...pradosha],
    inauspicious,
    horas,
  };
}

const ACTIVITIES: Array<{ key: string; label: string; favours: typeof HORA_ORDER[number][] }> = [
  { key: 'travel',   label: 'Begin a journey',          favours: ['Moon', 'Mercury', 'Venus'] },
  { key: 'business', label: 'Sign a contract',          favours: ['Mercury', 'Jupiter'] },
  { key: 'learn',    label: 'Start study or course',    favours: ['Mercury', 'Jupiter'] },
  { key: 'wedding',  label: 'Marriage / engagement',    favours: ['Venus', 'Jupiter', 'Moon'] },
  { key: 'medical',  label: 'Medical procedure',        favours: ['Mars', 'Sun'] },
  { key: 'wealth',   label: 'Investment / purchase',    favours: ['Jupiter', 'Venus', 'Mercury'] },
  { key: 'spiritual',label: 'Mantra / sadhana',         favours: ['Jupiter', 'Sun', 'Moon'] },
];

export default function Muhurta() {
  const { id = 'demo' } = useParams();
  const { data } = useKundli(id);

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [sunrise, setSunrise] = useState(data?.panchang.sunrise ?? '06:12');
  const [sunset, setSunset]   = useState(data?.panchang.sunset ?? '18:24');
  const [activity, setActivity] = useState(ACTIVITIES[0].key);

  const m = useMemo(() => computeMuhurtas(dayjs(date), sunrise, sunset), [date, sunrise, sunset]);
  const fav = ACTIVITIES.find((a) => a.key === activity)!.favours;

  const recommended = m.horas.filter((h) => fav.includes(h.lord));
  const avoidWindows = m.inauspicious;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Muhurta · Choosing the auspicious moment</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Muhurta Finder</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Auspicious and inauspicious time-windows for any chosen date, computed from weekday-lord rotations and the day's sunrise/sunset.
      </p>

      {/* Inputs */}
      <div className="mt-6 grid gap-4 rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm sm:grid-cols-4">
        <Field label="Date" icon={CalendarIcon}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-1.5 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none" />
        </Field>
        <Field label="Sunrise" icon={Sunrise}>
          <input type="time" value={sunrise} onChange={(e) => setSunrise(e.target.value)}
            className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-1.5 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none" />
        </Field>
        <Field label="Sunset" icon={Sunset}>
          <input type="time" value={sunset} onChange={(e) => setSunset(e.target.value)}
            className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-1.5 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none" />
        </Field>
        <Field label="Activity" icon={Sparkles}>
          <select value={activity} onChange={(e) => setActivity(e.target.value)}
            className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-1.5 text-sm text-text-primary focus:border-brand-maroon focus:outline-none">
            {ACTIVITIES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-2 font-mono text-xs text-text-tertiary">
        {dayjs(date).format('dddd, DD MMM YYYY')} · ruling lord <span className="text-text-primary">{m.weekday}</span>
      </div>

      {/* Recommended for activity */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-h2 text-text-primary">Recommended windows</h2>
          <span className="font-mono text-xs text-text-tertiary">For: {ACTIVITIES.find(a => a.key === activity)!.label}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recommended.length === 0 && <div className="text-sm text-text-tertiary">No favourable horas of {fav.join(', ')} in this day.</div>}
          {recommended.map((h, i) => {
            const inAvoid = isOverlap(h, avoidWindows);
            return (
              <div key={i} className={`rounded-md border bg-surface p-4 shadow-sm ${inAvoid ? 'border-semantic-warning/40' : 'border-semantic-positive/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-display text-h3 text-text-primary">{h.label}</div>
                  <Tone tone={inAvoid ? 'mixed' : h.tone} />
                </div>
                <div className="mt-1 font-mono text-sm text-text-secondary">{h.from} → {h.to}</div>
                <div className="mt-2 text-sm text-text-tertiary">{h.sub}</div>
                {inAvoid && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-semantic-warning">
                    <AlertTriangle className="h-3.5 w-3.5" /> Overlaps an inauspicious slice — pick the part outside Rahu/Yama/Gulika.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Auspicious & Inauspicious base */}
      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2 text-eyebrow text-semantic-positive">
            <CheckCircle2 className="h-3.5 w-3.5" /> Auspicious slices
          </div>
          <ul className="mt-3 divide-y divide-hairline-subtle">
            {m.auspicious.map((s) => <Row key={s.label} s={s} />)}
          </ul>
        </div>
        <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2 text-eyebrow text-semantic-negative">
            <AlertTriangle className="h-3.5 w-3.5" /> Inauspicious slices
          </div>
          <ul className="mt-3 divide-y divide-hairline-subtle">
            {m.inauspicious.map((s) => <Row key={s.label} s={s} />)}
          </ul>
        </div>
      </section>

      {/* Hora timeline */}
      <section className="mt-12">
        <h2 className="font-display text-h2 text-text-primary">Planetary horas (Hora chart)</h2>
        <p className="mt-1 text-body text-text-secondary">Each hora carries the quality of its planetary lord. Begin work in a hora friendly to the activity.</p>
        <div className="mt-4 overflow-hidden rounded-md border border-hairline-subtle bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
              <tr>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Lord</th>
                <th className="px-4 py-2 font-medium">Use for</th>
                <th className="px-4 py-2 font-medium text-right">Tone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-subtle">
              {m.horas.map((h, i) => (
                <tr key={i} className={i === 11 ? 'border-b-2 border-hairline-strong' : ''}>
                  <td className="px-4 py-2 font-mono text-text-tertiary">{i + 1}</td>
                  <td className="px-4 py-2 font-mono text-text-primary">{h.from} – {h.to}</td>
                  <td className="px-4 py-2 text-text-primary">{h.lord} {i < 12 ? '(day)' : '(night)'}</td>
                  <td className="px-4 py-2 text-text-tertiary">{h.sub}</td>
                  <td className="px-4 py-2 text-right"><Tone tone={h.tone} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-12 rounded-md border border-hairline-subtle bg-elevated/40 p-5 text-sm text-text-tertiary">
        <strong className="text-text-secondary">Note:</strong> Sunrise and sunset default to the natal chart's panchang values. For accurate muhurta on a different location, enter that day's local sunrise/sunset. A complete electional analysis also weighs Tithi, Nakshatra, Yoga, Karana and the running Vimshottari sub-period — to be wired in the next phase.
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-eyebrow text-text-tertiary"><Icon className="h-3 w-3" /> {label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Row({ s }: { s: Slice }) {
  return (
    <li className="flex items-center justify-between py-2.5">
      <div>
        <div className="text-sm text-text-primary">{s.label}</div>
        {s.sub && <div className="text-xs text-text-tertiary">{s.sub}</div>}
      </div>
      <div className="font-mono text-sm text-text-secondary">{s.from} – {s.to}</div>
    </li>
  );
}

function Tone({ tone }: { tone: Slice['tone'] }) {
  const map = {
    auspicious:   { cls: 'border-semantic-positive/40 text-semantic-positive', label: 'Auspicious' },
    mixed:        { cls: 'border-semantic-warning/40 text-semantic-warning',   label: 'Mixed' },
    inauspicious: { cls: 'border-semantic-negative/40 text-semantic-negative', label: 'Avoid' },
  } as const;
  const m = map[tone];
  return <span className={`inline-flex items-center gap-1 rounded-sm border bg-surface px-2 py-0.5 text-eyebrow ${m.cls}`}><Clock className="h-3 w-3" />{m.label}</span>;
}

function isOverlap(slice: Slice, others: Slice[]): boolean {
  const a1 = timeToMinutes(slice.from), a2 = timeToMinutes(slice.to);
  return others.some((o) => {
    const b1 = timeToMinutes(o.from), b2 = timeToMinutes(o.to);
    return a1 < b2 && b1 < a2;
  });
}