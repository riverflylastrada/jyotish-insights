import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Sunrise, Sunset, Calendar as CalendarIcon, Clock, Sparkles, AlertTriangle, CheckCircle2, MapPin, Info } from 'lucide-react';
import dayjs from 'dayjs';
import { useKundli } from '@/hooks/useKundli';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { computeSunTimes, localDateInTz } from '@/lib/astro/sun';

// ── Constants ───────────────────────────────────────────────────────

/** Day-lords in Surya-Siddhanta weekday order (Sun=0 … Sat=6). */
const DAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;
/** Chaldean order used for Hora rotation. */
const HORA_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'] as const;

/** Position (1-based, of 8) of the inauspicious slice for each weekday. */
const RAHU_KALAM_POS:    Record<number, number> = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 };
const YAMAGANDAM_POS:    Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6 };
const GULIKA_KALAM_POS:  Record<number, number> = { 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

/** Choghadiya names — day sequence starts from weekday lord; night reverses. */
const CHOGHADIYA_NAMES = ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'] as const;
type ChoghadiyaName = typeof CHOGHADIYA_NAMES[number];
const CHOGHADIYA_QUALITY: Record<ChoghadiyaName, 'auspicious' | 'mixed' | 'inauspicious'> = {
  Amrit: 'auspicious', Shubh: 'auspicious', Labh: 'auspicious', Char: 'mixed',
  Udveg: 'inauspicious', Kaal: 'inauspicious', Rog: 'inauspicious',
};
const CHOGHADIYA_USE: Record<ChoghadiyaName, string> = {
  Amrit: 'All auspicious works, marriage, travel',
  Shubh: 'Auspicious for all works, especially worship',
  Labh: 'Profitable ventures, business, purchases',
  Char: 'Travelling only; not for other new starts',
  Udveg: 'Government work only; avoid new beginnings',
  Kaal: 'Avoid; only for casting spells/tantra',
  Rog: 'Avoid; only for defeating enemies, war',
};

/** Day-lord → Choghadiya starting index for day sequence. */
const DAY_CHOG_START: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

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

const ACTIVITIES: Array<{ key: string; label: string; favours: typeof HORA_ORDER[number][] }> = [
  { key: 'travel',   label: 'Begin a journey',          favours: ['Moon', 'Mercury', 'Venus'] },
  { key: 'business', label: 'Sign a contract',          favours: ['Mercury', 'Jupiter'] },
  { key: 'learn',    label: 'Start study or course',    favours: ['Mercury', 'Jupiter'] },
  { key: 'wedding',  label: 'Marriage / engagement',    favours: ['Venus', 'Jupiter', 'Moon'] },
  { key: 'medical',  label: 'Medical procedure',        favours: ['Mars', 'Sun'] },
  { key: 'wealth',   label: 'Investment / purchase',    favours: ['Jupiter', 'Venus', 'Mercury'] },
  { key: 'spiritual',label: 'Mantra / sadhana',         favours: ['Jupiter', 'Sun', 'Moon'] },
];

// ── Time helpers ────────────────────────────────────────────────────

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

// ── Slice type ──────────────────────────────────────────────────────

interface Slice { from: string; to: string; label: string; sub?: string; tone: 'auspicious' | 'mixed' | 'inauspicious' }

// ── Compute all muhurta slices ──────────────────────────────────────

function computeChoghadiya(sr: number, ss: number, weekday: number) {
  const dayLen = ss - sr;
  const nightLen = 24 * 60 - dayLen;
  const daySlice = dayLen / 8;
  const nightSlice = nightLen / 8;

  const startIdx = DAY_CHOG_START[weekday];
  const day: Slice[] = [];
  for (let i = 0; i < 8; i++) {
    const name = CHOGHADIYA_NAMES[(startIdx + i) % 7];
    day.push({
      from: minutesToTime(sr + i * daySlice),
      to: minutesToTime(sr + (i + 1) * daySlice),
      label: name,
      sub: CHOGHADIYA_USE[name],
      tone: CHOGHADIYA_QUALITY[name],
    });
  }

  // Night choghadiya starts from the lord 5 places ahead in reverse order
  const nightStartIdx = (startIdx + 1) % 7;
  const night: Slice[] = [];
  for (let i = 0; i < 8; i++) {
    const name = CHOGHADIYA_NAMES[(nightStartIdx + i) % 7];
    night.push({
      from: minutesToTime(ss + i * nightSlice),
      to: minutesToTime(ss + (i + 1) * nightSlice),
      label: name,
      sub: CHOGHADIYA_USE[name],
      tone: CHOGHADIYA_QUALITY[name],
    });
  }

  return { day, night };
}

function computeMuhurtas(weekday: number, sunrise: string, sunset: string) {
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

  // Abhijit Muhurta — ~24 min around solar noon, except Wednesday
  const noon = sr + dayLen / 2;
  const abhi: Slice[] = weekday === 3 ? [] : [{
    from: minutesToTime(noon - 12),
    to:   minutesToTime(noon + 12),
    label: 'Abhijit Muhurta',
    sub: 'King of muhurtas — universally auspicious (skip on Wednesday)',
    tone: 'auspicious',
  }];

  // Brahma Muhurta — ~96 min before sunrise
  const brahma: Slice[] = [{
    from: minutesToTime(sr - 96),
    to:   minutesToTime(sr - 48),
    label: 'Brahma Muhurta',
    sub: 'Best for meditation, study, sadhana',
    tone: 'auspicious',
  }];

  // Pradosha Kala — ~96 min around sunset
  const pradosha: Slice[] = [{
    from: minutesToTime(ss - 48),
    to:   minutesToTime(ss + 48),
    label: 'Pradosha Kala',
    sub: 'Sacred to Lord Shiva — worship, evening rituals',
    tone: 'auspicious',
  }];

  // 24 planetary horas
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

  const choghadiya = computeChoghadiya(sr, ss, weekday);

  return { weekday: DAY_LORDS[weekday], auspicious: [...brahma, ...abhi, ...pradosha], inauspicious, horas, choghadiya };
}

// ── Component ───────────────────────────────────────────────────────

export default function Muhurta() {
  const { id = 'demo' } = useParams();
  const { data } = useKundli(id);

  // Extract birth-chart lat/lon/tz as fallback
  const birthLat = (data?.birthDetails as any)?.placeOfBirth?.latitude as number | undefined;
  const birthLon = (data?.birthDetails as any)?.placeOfBirth?.longitude as number | undefined;
  const birthTz  = (data?.birthDetails as any)?.placeOfBirth?.timezone as string | undefined;
  const birthPlace = (data?.birthDetails as any)?.placeOfBirth?.name as string | undefined;

  const { location, isFromProfile } = useCurrentLocation(birthLat, birthLon, birthTz);

  // Local date from user's timezone (or browser tz)
  const tz = location?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = localDateInTz(tz);
  const [date, setDate] = useState(today);
  useEffect(() => { setDate(today); }, [today]);

  // Compute sunrise/sunset from lat/lon
  const sunTimes = useMemo(() => {
    if (!location) return null;
    return computeSunTimes(date, location.lat, location.lon, tz);
  }, [date, location, tz]);

  const sunrise = sunTimes?.sunrise ?? data?.panchang?.sunrise ?? '06:12';
  const sunset  = sunTimes?.sunset  ?? data?.panchang?.sunset  ?? '18:24';

  const weekday = dayjs(date).day();
  const m = useMemo(() => computeMuhurtas(weekday, sunrise, sunset), [weekday, sunrise, sunset]);

  const [activity, setActivity] = useState(ACTIVITIES[0].key);
  const fav = ACTIVITIES.find((a) => a.key === activity)!.favours;
  const recommended = m.horas.filter((h) => fav.includes(h.lord));
  const avoidWindows = m.inauspicious;

  const locationLabel = isFromProfile
    ? location?.placeName ?? 'Current location'
    : location ? (birthPlace ?? `${location.lat.toFixed(2)}°N, ${location.lon.toFixed(2)}°E`) : 'Unknown';

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Muhurta · Choosing the auspicious moment</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Muhurta Finder</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Complete daily muhurta analysis: Choghadiya, planetary Horas, Rahu Kalam, Yamagandam, Gulika Kalam, Abhijit, and favourable-window picker — all computed from today's sunrise and sunset at your location.
      </p>

      {/* Location badge */}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-elevated px-3 py-1.5 text-xs text-text-secondary">
        <MapPin className="h-3 w-3" />
        computed for <span className="font-semibold text-text-primary">{locationLabel}</span>
        {!isFromProfile && location && (
          <span className="ml-1 text-text-tertiary">(set your current location in Settings for your city)</span>
        )}
      </div>

      {/* Inputs */}
      <div className="mt-5 grid gap-4 rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm sm:grid-cols-4">
        <InputField label="Date" icon={CalendarIcon}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-1.5 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none" />
        </InputField>
        <InputField label="Sunrise" icon={Sunrise}>
          <div className="rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-1.5 font-mono text-sm text-text-primary">{sunrise}</div>
        </InputField>
        <InputField label="Sunset" icon={Sunset}>
          <div className="rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-1.5 font-mono text-sm text-text-primary">{sunset}</div>
        </InputField>
        <InputField label="Activity" icon={Sparkles}>
          <select value={activity} onChange={(e) => setActivity(e.target.value)}
            className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-1.5 text-sm text-text-primary focus:border-brand-maroon focus:outline-none">
            {ACTIVITIES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </InputField>
      </div>

      <div className="mt-2 font-mono text-xs text-text-tertiary">
        {dayjs(date).format('dddd, DD MMM YYYY')} · ruling lord <span className="text-text-primary">{m.weekday}</span> · tz {tz}
      </div>

      {/* ─── Inauspicious windows (Rahu Kalam etc.) ─── */}
      <section className="mt-8">
        <h2 className="font-display text-h2 text-text-primary">Inauspicious windows</h2>
        <p className="mt-1 text-body text-text-secondary">Rahu Kalam, Yamagandam, and Gulika Kalam — avoid auspicious beginnings in these slices.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {m.inauspicious.map((s) => (
            <div key={s.label} className="rounded-md border border-semantic-negative/30 bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-display text-h3 text-text-primary">{s.label}</div>
                <Tone tone={s.tone} />
              </div>
              <div className="mt-1 font-mono text-sm text-text-secondary">{s.from} → {s.to}</div>
              <div className="mt-2 text-xs text-text-tertiary">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Auspicious slices (Abhijit, Brahma, Pradosha) ─── */}
      <section className="mt-10">
        <h2 className="font-display text-h2 text-text-primary">Auspicious slices</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {m.auspicious.map((s) => (
            <div key={s.label} className="rounded-md border border-semantic-positive/30 bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-display text-h3 text-text-primary">{s.label}</div>
                <Tone tone={s.tone} />
              </div>
              <div className="mt-1 font-mono text-sm text-text-secondary">{s.from} → {s.to}</div>
              <div className="mt-2 text-xs text-text-tertiary">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Recommended windows for activity ─── */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-h2 text-text-primary">Recommended windows</h2>
          <span className="font-mono text-xs text-text-tertiary">For: {ACTIVITIES.find(a => a.key === activity)!.label}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recommended.length === 0 && <div className="text-sm text-text-tertiary">No favourable horas of {fav.join(', ')} today.</div>}
          {recommended.map((h, i) => {
            const inAvoid = isOverlap(h, avoidWindows);
            return (
              <div key={i} className={`rounded-md border bg-surface p-4 shadow-sm ${inAvoid ? 'border-brand-saffron/40' : 'border-semantic-positive/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-display text-h3 text-text-primary">{h.label}</div>
                  <Tone tone={inAvoid ? 'mixed' : h.tone} />
                </div>
                <div className="mt-1 font-mono text-sm text-text-secondary">{h.from} → {h.to}</div>
                <div className="mt-2 text-sm text-text-tertiary">{h.sub}</div>
                {inAvoid && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs text-brand-saffron">
                    <AlertTriangle className="h-3.5 w-3.5" /> Overlaps an inauspicious slice — pick the part outside Rahu/Yama/Gulika.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Choghadiya ─── */}
      <section className="mt-12">
        <h2 className="font-display text-h2 text-text-primary">Choghadiya</h2>
        <p className="mt-1 text-body text-text-secondary">Eight day and eight night muhurtas of ~90 minutes each, commonly used for quick electional timing.</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 text-eyebrow text-brand-saffron"><Sunrise className="h-3.5 w-3.5" /> Day Choghadiya</div>
            <ul className="mt-3 divide-y divide-hairline-subtle">
              {m.choghadiya.day.map((s, i) => <ChogRow key={i} s={s} />)}
            </ul>
          </div>
          <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 text-eyebrow text-text-tertiary"><Sunset className="h-3.5 w-3.5" /> Night Choghadiya</div>
            <ul className="mt-3 divide-y divide-hairline-subtle">
              {m.choghadiya.night.map((s, i) => <ChogRow key={i} s={s} />)}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Hora timeline ─── */}
      <section className="mt-12">
        <h2 className="font-display text-h2 text-text-primary">Planetary Horas (24-hour chart)</h2>
        <p className="mt-1 text-body text-text-secondary">Each hora carries the quality of its planetary lord. Begin work in a hora friendly to the activity.</p>
        <div className="mt-4 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
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

      {/* ─── Today's Panchang summary ─── */}
      {data?.panchang && (
        <section className="mt-12">
          <h2 className="font-display text-h2 text-text-primary">Today's Panchang</h2>
          <p className="mt-1 text-body text-text-secondary">Five-fold almanac for the natal chart's date. For today's live Panchang, see the Debate dossier.</p>
          <div className="mt-4 rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-text-tertiary">Tithi</span><span className="text-text-primary">{data.panchang.tithi}</span></li>
              <li className="flex justify-between"><span className="text-text-tertiary">Vara</span><span className="text-text-primary">{data.panchang.vara}</span></li>
              <li className="flex justify-between"><span className="text-text-tertiary">Nakshatra</span><span className="text-text-primary">{data.panchang.nakshatra}</span></li>
              <li className="flex justify-between"><span className="text-text-tertiary">Yoga</span><span className="text-text-primary">{data.panchang.yoga}</span></li>
              <li className="flex justify-between"><span className="text-text-tertiary">Karana</span><span className="text-text-primary">{data.panchang.karana}</span></li>
              <li className="flex justify-between border-t border-hairline-subtle pt-2">
                <span className="text-text-tertiary">Sunrise / Sunset</span>
                <span className="font-mono text-text-primary">{sunrise} / {sunset}</span>
              </li>
            </ul>
          </div>
        </section>
      )}

      <div className="mt-12 rounded-md border border-hairline-subtle bg-elevated/40 p-5 text-sm text-text-tertiary">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong className="text-text-secondary">How this works:</strong> Sunrise and sunset are computed
            from your location's coordinates using the NOAA Solar Calculator algorithm (iterative bisection
            to geometric horizon, Hindu convention). All Muhurta time-windows derive from the day length
            between sunrise and sunset. Set your current location in Settings for accurate results.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function InputField({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-eyebrow text-text-tertiary"><Icon className="h-3 w-3" /> {label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ChogRow({ s }: { s: Slice }) {
  const toneColor = s.tone === 'auspicious' ? 'text-semantic-positive' : s.tone === 'inauspicious' ? 'text-semantic-negative' : 'text-brand-saffron';
  return (
    <li className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold ${toneColor}`}>{s.label}</span>
        <span className="text-xs text-text-tertiary">{s.sub}</span>
      </div>
      <span className="font-mono text-sm text-text-secondary">{s.from} – {s.to}</span>
    </li>
  );
}

function Tone({ tone }: { tone: Slice['tone'] }) {
  const map = {
    auspicious:   { cls: 'border-semantic-positive/40 text-semantic-positive', label: 'Auspicious' },
    mixed:        { cls: 'border-brand-saffron/40 text-brand-saffron',   label: 'Mixed' },
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
