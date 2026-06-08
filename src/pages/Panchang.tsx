import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Sun, Moon as MoonIcon, Calendar, MapPin, Loader2, ArrowRight,
  Sunrise, Sunset, Clock, Share2, Info,
} from 'lucide-react';
import dayjs from 'dayjs';
import { getAstroProvider } from '@/lib/astro/factory';
import { computeSunTimes, localDateInTz } from '@/lib/astro/sun';
import type { BirthDetails, KundliData } from '@/lib/astro/types';
import { SiteFooter } from '@/components/layout/SiteFooter';

/* ─── Timezone helper (mirrored from Mundane) ─── */

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
    return Math.round(((t1 - utcMillis) / (1000 * 60 * 60)) * 100) / 100;
  } catch { return 0; }
}

/* ─── Place search (Open-Meteo geocoding, same as Mundane) ─── */

interface PlaceResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
  country?: string;
}

function usePlaceSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [showDrop, setShowDrop] = useState(false);

  useEffect(() => {
    if (selected && query === [selected.name, selected.admin1, selected.country].filter(Boolean).join(', ')) {
      setSuggestions([]);
      return;
    }
    if (!query || query.trim().length < 3) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        if (!r.ok) throw new Error();
        const data = await r.json();
        setSuggestions(data.results || []);
      } catch { /* ignore */ } finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, selected]);

  const select = useCallback((s: PlaceResult) => {
    setSelected(s);
    setQuery([s.name, s.admin1, s.country].filter(Boolean).join(', '));
    setShowDrop(false);
  }, []);

  return { query, setQuery, suggestions, isSearching, selected, setSelected, showDrop, setShowDrop, select };
}

/* ─── Muhurta constants (verbatim from Muhurta.tsx) ─── */

const DAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;
const HORA_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'] as const;

const RAHU_KALAM_POS:   Record<number, number> = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 };
const YAMAGANDAM_POS:   Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6 };
const GULIKA_KALAM_POS: Record<number, number> = { 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

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
const DAY_CHOG_START: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

const HORA_QUALITY: Record<typeof HORA_ORDER[number], { tone: 'auspicious' | 'mixed' | 'inauspicious'; use: string }> = {
  Sun:     { tone: 'mixed',        use: 'Authority, government work, dealing with elders' },
  Moon:    { tone: 'auspicious',   use: 'Travel, water-related work, healing, social functions' },
  Mars:    { tone: 'inauspicious', use: 'Avoid most starts; suited only to surgery, sports, conflict resolution' },
  Mercury: { tone: 'auspicious',   use: 'Learning, writing, contracts, commerce, communication' },
  Jupiter: { tone: 'auspicious',   use: 'Spiritual rites, education, marriage, financial commitments' },
  Venus:   { tone: 'auspicious',   use: 'Art, music, romance, beauty, luxury purchases' },
  Saturn:  { tone: 'inauspicious', use: 'Avoid new ventures; suited to renunciation, labour, machinery' },
};

/* ─── Nakshatra reference data ─── */

const NAKSHATRA_DEITIES: Record<string, string> = {
  'Ashwini': 'Ashwini Kumaras', 'Bharani': 'Yama', 'Krittika': 'Agni',
  'Rohini': 'Brahma', 'Mrigashira': 'Soma', 'Ardra': 'Rudra',
  'Punarvasu': 'Aditi', 'Pushya': 'Brihaspati', 'Ashlesha': 'Sarpa',
  'Magha': 'Pitris', 'Purva Phalguni': 'Bhaga', 'Uttara Phalguni': 'Aryaman',
  'Hasta': 'Savitar', 'Chitra': 'Vishwakarma', 'Swati': 'Vayu',
  'Vishakha': 'Indra-Agni', 'Anuradha': 'Mitra', 'Jyeshtha': 'Indra',
  'Mula': 'Nirrti', 'Purva Ashadha': 'Apas', 'Uttara Ashadha': 'Vishvedevas',
  'Shravana': 'Vishnu', 'Dhanishtha': 'Vasus', 'Shatabhisha': 'Varuna',
  'Purva Bhadrapada': 'Aja Ekapada', 'Uttara Bhadrapada': 'Ahir Budhnya',
  'Revati': 'Pushan',
};

const NAKSHATRA_RULERS: Record<string, string> = {
  'Ashwini': 'Ketu', 'Bharani': 'Venus', 'Krittika': 'Sun',
  'Rohini': 'Moon', 'Mrigashira': 'Mars', 'Ardra': 'Rahu',
  'Punarvasu': 'Jupiter', 'Pushya': 'Saturn', 'Ashlesha': 'Mercury',
  'Magha': 'Ketu', 'Purva Phalguni': 'Venus', 'Uttara Phalguni': 'Sun',
  'Hasta': 'Moon', 'Chitra': 'Mars', 'Swati': 'Rahu',
  'Vishakha': 'Jupiter', 'Anuradha': 'Saturn', 'Jyeshtha': 'Mercury',
  'Mula': 'Ketu', 'Purva Ashadha': 'Venus', 'Uttara Ashadha': 'Sun',
  'Shravana': 'Moon', 'Dhanishtha': 'Mars', 'Shatabhisha': 'Rahu',
  'Purva Bhadrapada': 'Jupiter', 'Uttara Bhadrapada': 'Saturn',
  'Revati': 'Mercury',
};

/* ─── Vara Devanagari labels ─── */

const VARA_DEVA: Record<string, string> = {
  Sunday: 'रविवार', Monday: 'सोमवार', Tuesday: 'मंगलवार',
  Wednesday: 'बुधवार', Thursday: 'गुरुवार', Friday: 'शुक्रवार',
  Saturday: 'शनिवार',
};

/* ─── Panchang Yoga Devanagari ─── */

const YOGA_DEVA: Record<string, string> = {
  Vishkambha: 'विष्कम्भ', Priti: 'प्रीति', Ayushman: 'आयुष्मान',
  Saubhagya: 'सौभाग्य', Shobhana: 'शोभन', Atiganda: 'अतिगण्ड',
  Sukarma: 'सुकर्मा', Dhriti: 'धृति', Shoola: 'शूल',
  Ganda: 'गण्ड', Vriddhi: 'वृद्धि', Dhruva: 'ध्रुव',
  Vyaghata: 'व्याघात', Harshana: 'हर्षण', Vajra: 'वज्र',
  Siddhi: 'सिद्धि', Vyatipata: 'व्यतीपात', Variyan: 'वरीयान',
  Parigha: 'परिघ', Shiva: 'शिव', Siddha: 'सिद्ध',
  Sadhya: 'साध्य', Shubha: 'शुभ', Shukla: 'शुक्ल',
  Brahma: 'ब्रह्म', Indra: 'इन्द्र', Vaidhriti: 'वैधृति',
};

/* ─── Time helpers ─── */

interface Slice { from: string; to: string; label: string; sub?: string; tone: 'auspicious' | 'mixed' | 'inauspicious' }

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

/* ─── Compute muhurta slices (verbatim from Muhurta.tsx) ─── */

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
      sub: 'राहु काल — Avoid all auspicious beginnings',
      tone: 'inauspicious',
    },
    {
      from: minutesToTime(sr + slice * (YAMAGANDAM_POS[weekday] - 1)),
      to:   minutesToTime(sr + slice * YAMAGANDAM_POS[weekday]),
      label: 'Yamagandam',
      sub: 'यमघण्ट — Avoid travel, journeys',
      tone: 'inauspicious',
    },
    {
      from: minutesToTime(sr + slice * (GULIKA_KALAM_POS[weekday] - 1)),
      to:   minutesToTime(sr + slice * GULIKA_KALAM_POS[weekday]),
      label: 'Gulika Kalam',
      sub: 'गुलिक काल — Effects of action begun here repeat',
      tone: 'inauspicious',
    },
  ];

  // Abhijit Muhurta — 8th of 15 equal daytime muhurtas (Muhurta Chintamani)
  const muhurtaLen15 = dayLen / 15;
  const abhiStart = sr + 7 * muhurtaLen15;
  const abhiEnd = abhiStart + muhurtaLen15;
  const auspicious: Slice[] = weekday === 3 ? [] : [{
    from: minutesToTime(abhiStart),
    to:   minutesToTime(abhiEnd),
    label: 'Abhijit Muhurta',
    sub: 'अभिजित मुहूर्त — King of muhurtas, universally auspicious (skip on Wednesday)',
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

  return { weekday: DAY_LORDS[weekday], auspicious, inauspicious, horas, choghadiya };
}

/* ─── Place search input ─── */

function PlaceSearchInput({ place, label }: {
  place: ReturnType<typeof usePlaceSearch>;
  label?: string;
}) {
  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-medium text-text-secondary">{label ?? 'Location · स्थान'}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={place.query}
          onChange={(e) => { place.setQuery(e.target.value); place.setSelected(null); place.setShowDrop(true); }}
          onFocus={() => place.setShowDrop(true)}
          onBlur={() => setTimeout(() => place.setShowDrop(false), 200)}
          placeholder="Search city… शहर खोजें"
          className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 pl-10 text-sm text-text-primary focus:border-brand-maroon focus:outline-none"
        />
        {place.isSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />}
      </div>
      {place.showDrop && place.suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-hairline-subtle bg-surface shadow-lg">
          {place.suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-elevated"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => place.select(s)}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <span className="truncate">{[s.name, s.admin1, s.country].filter(Boolean).join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Use geolocation with graceful fallback ─── */

function useGeoLocation(place: ReturnType<typeof usePlaceSearch>) {
  const [geoLoc, setGeoLoc] = useState<PlaceResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) { setGeoLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=&count=1&language=en&format=json&latitude=${latitude}&longitude=${longitude}`
          );
          // Reverse geocoding via open-meteo isn't directly supported; use timezone lookup
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setGeoLoc({ name: 'Current Location', latitude, longitude, timezone: tz });
        } catch { /* fallback */ }
        setGeoLoading(false);
      },
      () => { setGeoLoading(false); },
      { timeout: 5000, maximumAge: 300000 },
    );
  }, []);

  // Effective location: user-selected > geolocation > null
  const effectivePlace = place.selected ?? geoLoc;
  return { effectivePlace, geoLoading };
}

/* ─── Main page ─── */

export default function Panchang() {
  const place = usePlaceSearch();
  const { effectivePlace, geoLoading } = useGeoLocation(place);

  const tz = effectivePlace?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = localDateInTz(tz);
  const [date, setDate] = useState(today);
  useEffect(() => { setDate(today); }, [today]);

  // Build BirthDetails for chart computation
  const birthDetails: BirthDetails | null = useMemo(() => {
    if (!effectivePlace) return null;
    const time = '12:00:00';
    const off = getTimezoneOffset(effectivePlace.timezone || tz, date, time);
    return {
      fullName: `Panchang ${date}`,
      dateOfBirth: date,
      timeOfBirth: time,
      placeOfBirth: {
        name: [effectivePlace.name, effectivePlace.admin1, effectivePlace.country].filter(Boolean).join(', '),
        latitude: effectivePlace.latitude,
        longitude: effectivePlace.longitude,
        timezone: effectivePlace.timezone || tz,
        timezoneOffset: off,
      },
      ayanamsa: 'lahiri' as const,
      houseSystem: 'whole_sign' as const,
    };
  }, [effectivePlace, date, tz]);

  // Auto-compute chart for panchang data
  const { data: kundli, isLoading, error } = useQuery<KundliData>({
    queryKey: ['panchang-page', date, JSON.stringify(birthDetails)],
    queryFn: async () => {
      if (!birthDetails) throw new Error('Missing inputs');
      return getAstroProvider().generateKundli(birthDetails);
    },
    enabled: !!birthDetails,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });

  // Sunrise / sunset from location
  const sunTimes = useMemo(() => {
    if (!effectivePlace) return null;
    return computeSunTimes(date, effectivePlace.latitude, effectivePlace.longitude, tz);
  }, [date, effectivePlace, tz]);

  const sunrise = sunTimes?.sunrise ?? kundli?.panchang?.sunrise ?? '06:12';
  const sunset  = sunTimes?.sunset  ?? kundli?.panchang?.sunset  ?? '18:24';

  const weekday = dayjs(date).day();
  const m = useMemo(() => computeMuhurtas(weekday, sunrise, sunset), [weekday, sunrise, sunset]);

  const panchang = kundli?.panchang;
  const placeName = effectivePlace
    ? [effectivePlace.name, effectivePlace.admin1, effectivePlace.country].filter(Boolean).join(', ')
    : '';

  const dateFormatted = dayjs(date).format('DD MMM YYYY');
  const dayName = dayjs(date).format('dddd');

  // WhatsApp share
  const whatsappText = useMemo(() => {
    if (!panchang) return '';
    const rk = m.inauspicious.find(s => s.label === 'Rahu Kalam');
    return encodeURIComponent(
      `🙏 आज का पंचांग — ${dateFormatted}, ${placeName}\n\n` +
      `तिथि Tithi: ${panchang.tithi}\n` +
      `नक्षत्र Nakshatra: ${panchang.nakshatra}\n` +
      `योग Yoga: ${panchang.yoga}\n` +
      `करण Karana: ${panchang.karana}\n` +
      `वार Vara: ${panchang.vara}\n` +
      `🌅 Sunrise: ${sunrise} | 🌇 Sunset: ${sunset}\n` +
      (rk ? `⚠️ Rahu Kaal: ${rk.from} – ${rk.to}\n` : '') +
      `\nGenerated by Acharya Jyotish`
    );
  }, [panchang, m.inauspicious, dateFormatted, placeName, sunrise, sunset]);

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Seo
        title={`आज का पंचांग — Today's Panchang, ${dateFormatted} | Acharya Jyotish`}
        description={`Free daily Panchang for ${dateFormatted}: tithi, nakshatra, yoga, karana, rahu kaal, sunrise & sunset — accurate sidereal calculations. आज का पंचांग — तिथि, नक्षत्र, योग, करण, राहु काल।`}
        canonical="/panchang"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-hairline-subtle bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-h3 text-brand-maroon">Acharya Jyotish</Link>
          <nav className="flex items-center gap-4">
            <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">Home</Link>
            <Link to="/mundane" className="text-sm text-text-secondary hover:text-text-primary">Mundane</Link>
            <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary">Sign in</Link>
            <Link to="/app/new" className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-brand-saffron-hover">
              Cast a chart <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-hairline-subtle bg-elevated py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-eyebrow text-brand-saffron">Daily Panchang · दैनिक पंचांग</div>
          <h1 className="mt-2 font-display text-display text-text-primary">
            आज का पंचांग
          </h1>
          <p className="mt-1 font-display text-h2 text-text-secondary">
            Today's Panchang — {dateFormatted}
          </p>
          <p className="mt-4 max-w-2xl text-body text-text-secondary">
            The five-fold Vedic almanac (पंचांग) — Tithi, Vara, Nakshatra, Yoga, and Karana — plus
            Muhurta timing strips, Rahu Kaal, and planetary Horas for any date and location.
            No account needed.
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Date + Location selectors */}
        <div className="grid gap-4 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-text-secondary">
              <Calendar className="h-3.5 w-3.5" /> Date · तिथि
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none"
            />
          </div>
          <PlaceSearchInput place={place} />
        </div>

        {effectivePlace && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-elevated px-3 py-1.5 text-xs text-text-secondary">
            <MapPin className="h-3 w-3" />
            {placeName} · {dayName} {VARA_DEVA[dayName] ? `(${VARA_DEVA[dayName]})` : ''}
          </div>
        )}

        {/* Loading */}
        {(isLoading || geoLoading) && (
          <div className="mt-8 flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-saffron" />
            <span className="ml-3 text-sm text-text-secondary">Computing panchang… पंचांग की गणना हो रही है</span>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="mt-6 rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">
            Failed to compute panchang: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        {/* Panchang data */}
        {panchang && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

            {/* ── Five limbs of panchang ── */}
            <section className="mt-8">
              <h2 className="font-display text-h2 text-text-primary">
                पंचांग <span className="text-text-tertiary">· Five Limbs</span>
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Tithi */}
                <PanchangCard
                  label="Tithi · तिथि"
                  value={panchang.tithi}
                  icon={<MoonIcon className="h-5 w-5 text-brand-gold" />}
                  detail="Lunar day (Moon–Sun elongation ÷ 12°)"
                />
                {/* Vara */}
                <PanchangCard
                  label="Vara · वार"
                  value={`${panchang.vara} ${VARA_DEVA[panchang.vara] ? `(${VARA_DEVA[panchang.vara]})` : ''}`}
                  icon={<Sun className="h-5 w-5 text-brand-saffron" />}
                  detail="Weekday ruled by its planet lord"
                />
                {/* Nakshatra */}
                <PanchangCard
                  label="Nakshatra · नक्षत्र"
                  value={panchang.nakshatra}
                  icon={<span className="text-lg">⭐</span>}
                  detail={`Deity: ${NAKSHATRA_DEITIES[panchang.nakshatra] ?? '—'} · Ruler: ${NAKSHATRA_RULERS[panchang.nakshatra] ?? '—'}`}
                />
                {/* Yoga */}
                <PanchangCard
                  label="Yoga · योग"
                  value={`${panchang.yoga} ${YOGA_DEVA[panchang.yoga] ? `(${YOGA_DEVA[panchang.yoga]})` : ''}`}
                  icon={<span className="text-lg">🔗</span>}
                  detail="Sun + Moon longitude ÷ (360/27)"
                />
                {/* Karana */}
                <PanchangCard
                  label="Karana · करण"
                  value={panchang.karana}
                  icon={<span className="text-lg">🌗</span>}
                  detail="Half-tithi (60 karanas per lunar month)"
                />
                {/* Sunrise / Sunset */}
                <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
                  <div className="text-xs text-text-tertiary">Sunrise / Sunset · सूर्योदय / सूर्यास्त</div>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Sunrise className="h-4 w-4 text-brand-saffron" />
                      <span className="font-mono text-lg font-semibold text-text-primary">{sunrise}</span>
                    </div>
                    <span className="text-text-muted">—</span>
                    <div className="flex items-center gap-1.5">
                      <Sunset className="h-4 w-4 text-brand-maroon" />
                      <span className="font-mono text-lg font-semibold text-text-primary">{sunset}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-text-tertiary">
                    Day length: {minutesToTime(timeToMinutes(sunset) - timeToMinutes(sunrise))} hrs
                  </div>
                </div>
              </div>
            </section>

            {/* ── Inauspicious windows ── */}
            <section className="mt-10">
              <h2 className="font-display text-h2 text-text-primary">
                Inauspicious Windows · अशुभ काल
              </h2>
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

            {/* ── Auspicious windows ── */}
            {m.auspicious.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-h2 text-text-primary">
                  Auspicious Windows · शुभ काल
                </h2>
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
            )}

            {/* ── Choghadiya ── */}
            <section className="mt-10">
              <h2 className="font-display text-h2 text-text-primary">
                Choghadiya · चौघड़िया
              </h2>
              <p className="mt-1 text-body text-text-secondary">
                Eight day and eight night muhurtas of ~90 minutes each.
              </p>
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-eyebrow text-brand-saffron"><Sunrise className="h-3.5 w-3.5" /> Day · दिन</div>
                  <ul className="mt-3 divide-y divide-hairline-subtle">
                    {m.choghadiya.day.map((s, i) => <ChogRow key={i} s={s} />)}
                  </ul>
                </div>
                <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-eyebrow text-text-tertiary"><Sunset className="h-3.5 w-3.5" /> Night · रात</div>
                  <ul className="mt-3 divide-y divide-hairline-subtle">
                    {m.choghadiya.night.map((s, i) => <ChogRow key={i} s={s} />)}
                  </ul>
                </div>
              </div>
            </section>

            {/* ── Planetary Horas ── */}
            <section className="mt-10">
              <h2 className="font-display text-h2 text-text-primary">
                Planetary Horas · ग्रह होरा
              </h2>
              <p className="mt-1 text-body text-text-secondary">
                24 planetary hours — begin work in a hora friendly to your activity.
              </p>
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

            {/* ── WhatsApp Share ── */}
            <section className="mt-10">
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-sm bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1ebe57]"
              >
                <Share2 className="h-4 w-4" /> Share on WhatsApp · व्हाट्सएप पर भेजें
              </a>
            </section>

            {/* ── Info box ── */}
            <div className="mt-10 rounded-md border border-hairline-subtle bg-elevated/40 p-5 text-sm text-text-tertiary">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <strong className="text-text-secondary">How this works:</strong> Panchang elements (Tithi, Nakshatra,
                  Yoga, Karana) are computed from first principles by the Acharya Jyotish engine. Sunrise/sunset use the
                  NOAA Solar Calculator. Muhurta windows (Rahu Kaal, Choghadiya, Horas) derive from the
                  day-length between sunrise and sunset. Lahiri Ayanamsa is used.
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* No location yet */}
        {!effectivePlace && !geoLoading && (
          <div className="mt-8 rounded-md border border-brand-saffron/30 bg-brand-saffron/5 p-6 text-center">
            <MapPin className="mx-auto h-8 w-8 text-brand-saffron" />
            <p className="mt-3 font-display text-h3 text-text-primary">Enter a location to begin</p>
            <p className="mt-1 text-sm text-text-secondary">
              Type a city name above or allow location access.
              <br />
              <span className="font-deva">शहर का नाम दर्ज करें या स्थान अनुमति दें।</span>
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-md border border-brand-maroon/20 bg-elevated p-8 text-center">
          <h2 className="font-display text-h2 text-text-primary">Want a full birth chart analysis?</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Sign up for a free account — generate your Kundli, run multi-guru debates, explore 23 vargas and dashas.
          </p>
          <Link
            to="/app/new"
            className="mt-4 inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:bg-brand-saffron-hover"
          >
            Generate my Kundli · मेरी कुण्डली बनाएं <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

/* ─── Sub-components ─── */

function PanchangCard({ label, value, icon, detail }: {
  label: string; value: string; icon: React.ReactNode; detail?: string;
}) {
  return (
    <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-text-tertiary">{label}</span>
      </div>
      <div className="mt-2 font-display text-lg text-text-primary">{value}</div>
      {detail && <div className="mt-1 text-xs text-text-tertiary">{detail}</div>}
    </div>
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
  const mt = map[tone];
  return <span className={`inline-flex items-center gap-1 rounded-sm border bg-surface px-2 py-0.5 text-eyebrow ${mt.cls}`}><Clock className="h-3 w-3" />{mt.label}</span>;
}
