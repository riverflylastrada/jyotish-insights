/**
 * Public Eclipse page — /eclipses
 *
 * Shows next solar + lunar eclipse and an upcoming list for any date/place.
 * No auth required (mirrors Panchang/Mundane anon-invoke pattern).
 *
 * Source: Surya Siddhanta / BPHS on grahan (eclipses) as karmic events;
 * computed from Swiss-Ephemeris-grade Sun/Moon/node ephemeris.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Sun, Moon as MoonIcon, Calendar, MapPin, Loader2, ArrowRight,
  Share2, Eye, EyeOff,
} from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '@/integrations/supabase/client';
import { SiteFooter } from '@/components/layout/SiteFooter';

/* ─── Types (mirrors engine EclipseData) ─── */

type EclipseKind = 'solar' | 'lunar';
type EclipseType = 'total' | 'annular' | 'partial' | 'penumbral';

interface EclipseRecord {
  kind: EclipseKind;
  type: EclipseType;
  jdMax: number;
  dateUtc: string;
  signNumber: number;
  signName: string;
  nakshatra: string;
  visibleFromPlace: boolean;
}

interface EclipseData {
  nextSolar: EclipseRecord | null;
  nextLunar: EclipseRecord | null;
  upcoming: EclipseRecord[];
}

/* ─── Bilingual labels ─── */

const SIGN_DEVA: Record<string, string> = {
  Mesha: 'मेष', Vrishabha: 'वृषभ', Mithuna: 'मिथुन', Karka: 'कर्क',
  Simha: 'सिंह', Kanya: 'कन्या', Tula: 'तुला', Vrischika: 'वृश्चिक',
  Dhanu: 'धनु', Makara: 'मकर', Kumbha: 'कुम्भ', Meena: 'मीन',
};

const ECLIPSE_TYPE_LABEL: Record<EclipseType, { en: string; hi: string }> = {
  total:     { en: 'Total',     hi: 'पूर्ण' },
  annular:   { en: 'Annular',   hi: 'वलयाकार' },
  partial:   { en: 'Partial',   hi: 'आंशिक' },
  penumbral: { en: 'Penumbral', hi: 'छायाकीय' },
};

const ECLIPSE_KIND_LABEL: Record<EclipseKind, { en: string; hi: string; icon: typeof Sun }> = {
  solar: { en: 'Solar Eclipse', hi: 'सूर्य ग्रहण', icon: Sun },
  lunar: { en: 'Lunar Eclipse', hi: 'चन्द्र ग्रहण', icon: MoonIcon },
};

/* ─── Timezone helper (mirrored from Panchang) ─── */

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

/* ─── Place search (Open-Meteo geocoding, same as Panchang) ─── */

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

/* ─── Fade animation ─── */

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

/* ─── Eclipse card component ─── */

function EclipseCard({ eclipse, placeName }: { eclipse: EclipseRecord; placeName: string }) {
  const kindLabel = ECLIPSE_KIND_LABEL[eclipse.kind];
  const typeLabel = ECLIPSE_TYPE_LABEL[eclipse.type];
  const Icon = kindLabel.icon;
  const signDeva = SIGN_DEVA[eclipse.signName] ?? eclipse.signName;
  const dateStr = dayjs(eclipse.dateUtc).format('DD MMM YYYY');
  const timeStr = dayjs(eclipse.dateUtc).format('HH:mm [UTC]');

  return (
    <motion.div {...fadeUp}
      className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${
          eclipse.kind === 'solar' ? 'bg-brand-saffron/10' : 'bg-brand-maroon/10'
        }`}>
          <Icon className={`h-5 w-5 ${
            eclipse.kind === 'solar' ? 'text-brand-saffron' : 'text-brand-maroon'
          }`} />
        </div>
        <div>
          <h3 className="font-display text-h3 text-text-primary">
            {typeLabel.en} {kindLabel.en}
          </h3>
          <p className="text-sm text-text-tertiary font-deva">
            {typeLabel.hi} {kindLabel.hi}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <div className="flex items-center justify-between rounded-sm bg-canvas px-3 py-2">
          <span className="text-text-secondary">Date · तारीख</span>
          <span className="font-mono text-text-primary">{dateStr}</span>
        </div>
        <div className="flex items-center justify-between rounded-sm bg-canvas px-3 py-2">
          <span className="text-text-secondary">Time (UTC)</span>
          <span className="font-mono text-text-primary">{timeStr}</span>
        </div>
        <div className="flex items-center justify-between rounded-sm bg-canvas px-3 py-2">
          <span className="text-text-secondary">Sign · राशि</span>
          <span className="text-text-primary">{eclipse.signName} · <span className="font-deva">{signDeva}</span></span>
        </div>
        <div className="flex items-center justify-between rounded-sm bg-canvas px-3 py-2">
          <span className="text-text-secondary">Nakshatra · नक्षत्र</span>
          <span className="text-text-primary">{eclipse.nakshatra}</span>
        </div>
        <div className="flex items-center justify-between rounded-sm bg-canvas px-3 py-2">
          <span className="text-text-secondary">
            Visible{placeName ? ` from ${placeName.split(',')[0]}` : ''} · दृश्यता
          </span>
          <span className={`inline-flex items-center gap-1.5 font-medium ${
            eclipse.visibleFromPlace ? 'text-semantic-positive' : 'text-text-tertiary'
          }`}>
            {eclipse.visibleFromPlace
              ? <><Eye className="h-3.5 w-3.5" /> Yes · हाँ</>
              : <><EyeOff className="h-3.5 w-3.5" /> No · नहीं</>}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main page ─── */

export default function Eclipses() {
  const today = dayjs().format('YYYY-MM-DD');
  const [date, setDate] = useState(today);
  const place = usePlaceSearch();

  // Default to New Delhi if no place selected
  const effectivePlace = place.selected ?? {
    name: 'New Delhi', latitude: 28.6139, longitude: 77.2090,
    timezone: 'Asia/Kolkata', admin1: 'Delhi', country: 'India',
  };
  const placeName = [effectivePlace.name, effectivePlace.admin1, effectivePlace.country]
    .filter(Boolean).join(', ');

  // Call the engine via Supabase edge function
  const { data: eclipseData, isLoading, error } = useQuery<EclipseData>({
    queryKey: ['eclipses', date, effectivePlace.latitude, effectivePlace.longitude],
    queryFn: async () => {
      const resp = await supabase.functions.invoke('calculate-kundli', {
        body: {
          mode: 'eclipses',
          fromDate: date,
          lat: effectivePlace.latitude,
          lon: effectivePlace.longitude,
          ayanamsa: 'lahiri',
          maxEclipses: 6,
        },
      });
      if (resp.error) throw new Error(resp.error.message ?? 'Eclipse calculation failed');
      return resp.data as EclipseData;
    },
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });

  // WhatsApp share text
  const whatsappText = useMemo(() => {
    if (!eclipseData) return '';
    const lines: string[] = ['🌑 Upcoming Eclipses · ग्रहण सूची\n'];
    if (eclipseData.nextSolar) {
      const s = eclipseData.nextSolar;
      lines.push(
        `☀️ Next Solar: ${ECLIPSE_TYPE_LABEL[s.type].en} — ${dayjs(s.dateUtc).format('DD MMM YYYY')}`,
        `   ${s.signName} · ${s.nakshatra}`,
      );
    }
    if (eclipseData.nextLunar) {
      const l = eclipseData.nextLunar;
      lines.push(
        `🌕 Next Lunar: ${ECLIPSE_TYPE_LABEL[l.type].en} — ${dayjs(l.dateUtc).format('DD MMM YYYY')}`,
        `   ${l.signName} · ${l.nakshatra}`,
      );
    }
    lines.push(`\nLocation: ${placeName}`, '\nGenerated by Acharya Jyotish');
    return encodeURIComponent(lines.join('\n'));
  }, [eclipseData, placeName]);

  const dateFormatted = dayjs(date).format('DD MMM YYYY');

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <title>{`Eclipses · ग्रहण — ${dateFormatted} | Acharya Jyotish`}</title>
      <meta name="description" content={`Upcoming solar and lunar eclipses from ${dateFormatted}: type, sidereal sign, nakshatra, visibility. सूर्य ग्रहण एवं चन्द्र ग्रहण — तिथि, राशि, नक्षत्र, दृश्यता।`} />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-hairline-subtle bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-h3 text-brand-maroon">Acharya Jyotish</Link>
          <nav className="flex items-center gap-4">
            <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">Home</Link>
            <Link to="/panchang" className="text-sm text-text-secondary hover:text-text-primary">Panchang</Link>
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
          <div className="text-eyebrow text-brand-saffron">Eclipse Finder · ग्रहण खोजक</div>
          <h1 className="mt-2 font-display text-display text-text-primary">
            ग्रहण — Eclipses
          </h1>
          <p className="mt-1 font-display text-h2 text-text-secondary">
            Solar &amp; Lunar Eclipses — {dateFormatted}
          </p>
          <p className="mt-4 max-w-2xl text-body text-text-secondary">
            Eclipses (ग्रहण) are among the most powerful astronomical events in Vedic astrology.
            The Surya Siddhanta teaches that eclipses mark karmic turning points — the shadow of
            Rahu and Ketu upon the luminaries. View upcoming solar and lunar eclipses with their
            sidereal sign, nakshatra, type, and visibility from your location. No account needed.
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Date + Location selectors */}
        <div className="grid gap-4 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-text-secondary">
              <Calendar className="h-3.5 w-3.5" /> From Date · तिथि से
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none"
            />
          </div>
          <div className="relative">
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-text-secondary">
              <MapPin className="h-3.5 w-3.5" /> Location · स्थान
            </label>
            <input
              type="text"
              placeholder="Search city…"
              value={place.query}
              onChange={(e) => { place.setQuery(e.target.value); place.setSelected(null); place.setShowDrop(true); }}
              onFocus={() => place.setShowDrop(true)}
              className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 text-sm text-text-primary focus:border-brand-maroon focus:outline-none"
            />
            {place.showDrop && place.suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-sm border border-hairline-subtle bg-surface shadow-lg">
                {place.suggestions.map((s, i) => (
                  <li key={i}
                    className="cursor-pointer px-3 py-2 text-sm text-text-primary hover:bg-elevated"
                    onClick={() => place.select(s)}
                  >
                    {[s.name, s.admin1, s.country].filter(Boolean).join(', ')}
                    <span className="ml-2 text-xs text-text-tertiary">
                      {s.latitude.toFixed(2)}°, {s.longitude.toFixed(2)}°
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!place.selected && !place.query && (
              <p className="mt-1 text-xs text-text-tertiary">
                Default: New Delhi · नई दिल्ली
              </p>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="mt-12 flex items-center justify-center gap-2 text-text-tertiary">
            <Loader2 className="h-5 w-5 animate-spin text-brand-saffron" />
            <span className="text-sm">Computing eclipses… ग्रहण गणना हो रही है</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mt-12 rounded-md border border-dashed border-semantic-negative/30 bg-semantic-negative/5 px-6 py-8 text-center text-sm text-semantic-negative">
            Failed to compute eclipses. Please try again.
          </div>
        )}

        {/* Results */}
        {eclipseData && (
          <>
            {/* Next solar + lunar eclipse cards */}
            <section className="mt-10">
              <h2 className="font-display text-h2 text-text-primary">
                Next Eclipses · अगला ग्रहण
              </h2>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {eclipseData.nextSolar && (
                  <EclipseCard eclipse={eclipseData.nextSolar} placeName={placeName} />
                )}
                {eclipseData.nextLunar && (
                  <EclipseCard eclipse={eclipseData.nextLunar} placeName={placeName} />
                )}
              </div>
              {!eclipseData.nextSolar && !eclipseData.nextLunar && (
                <div className="mt-4 rounded-md border border-dashed border-hairline-subtle px-6 py-8 text-center text-sm text-text-tertiary">
                  No eclipses found in the search window. Try a different start date.
                </div>
              )}
            </section>

            {/* Upcoming list */}
            {eclipseData.upcoming.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-h2 text-text-primary">
                  Upcoming Eclipses · आगामी ग्रहण सूची
                </h2>
                <div className="mt-4 overflow-hidden rounded-md border border-hairline-subtle shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-elevated text-left text-xs text-text-tertiary">
                        <th className="px-4 py-3 font-medium">Date · तारीख</th>
                        <th className="px-4 py-3 font-medium">Type · प्रकार</th>
                        <th className="px-4 py-3 font-medium">Sign · राशि</th>
                        <th className="px-4 py-3 font-medium">Nakshatra · नक्षत्र</th>
                        <th className="px-4 py-3 font-medium text-center">Visible · दृश्य</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline-subtle">
                      {eclipseData.upcoming.map((e, i) => {
                        const kindL = ECLIPSE_KIND_LABEL[e.kind];
                        const typeL = ECLIPSE_TYPE_LABEL[e.type];
                        const signD = SIGN_DEVA[e.signName] ?? '';
                        return (
                          <tr key={i} className="bg-surface hover:bg-elevated/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-text-primary">
                              {dayjs(e.dateUtc).format('DD MMM YYYY')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 ${
                                e.kind === 'solar' ? 'text-brand-saffron' : 'text-brand-maroon'
                              }`}>
                                {e.kind === 'solar' ? <Sun className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
                                {typeL.en} {kindL.en}
                              </span>
                              <span className="ml-1 text-xs text-text-tertiary font-deva">
                                {typeL.hi} {kindL.hi}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-primary">
                              {e.signName}{signD && <span className="ml-1 font-deva text-text-tertiary">{signD}</span>}
                            </td>
                            <td className="px-4 py-3 text-text-primary">{e.nakshatra}</td>
                            <td className="px-4 py-3 text-center">
                              {e.visibleFromPlace
                                ? <Eye className="mx-auto h-4 w-4 text-semantic-positive" />
                                : <EyeOff className="mx-auto h-4 w-4 text-text-muted" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* WhatsApp Share */}
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

            {/* Classical source */}
            <section className="mt-10 rounded-md border border-hairline-subtle bg-elevated px-6 py-5">
              <h3 className="font-display text-h3 text-text-primary">Classical Source · शास्त्रीय स्रोत</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Eclipse computation follows the lunisolar model of <strong>Surya Siddhanta</strong> — eclipses
                occur when the Sun or Moon is within the shadow cone of Rahu (ascending node) or Ketu
                (descending node). The engine uses Swiss-Ephemeris-grade VSOP87 (Sun/planets) and
                ELP-2000/82 (Moon) positions with IAU nutation, validated against PyJHora 4.8.6
                (<code>jhora.panchanga.eclipse</code>).
              </p>
              <p className="mt-2 text-sm text-text-secondary font-deva">
                ग्रहण गणना सूर्य सिद्धांत के चन्द्र-सौर मॉडल पर आधारित है — जब सूर्य या चन्द्र राहु
                (आरोही पात) या केतु (अवरोही पात) की छाया शंकु में हो, तब ग्रहण होता है।
              </p>
            </section>
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
