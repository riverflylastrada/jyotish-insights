/**
 * MuhurtaFinder — find auspicious days in a date range for a chosen activity.
 *
 * Inputs: activity preset, start/end date, location (place search).
 * Outputs: ranked list of days with scores, panchang details, and rule citations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChartLink } from '@/hooks/useChartLink';
import {
  ArrowLeft, Calendar as CalendarIcon, MapPin, Loader2,
  Sparkles, ChevronDown, ChevronUp, Search, Info,
  CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useKundli } from '@/hooks/useKundli';
import { localDateInTz } from '@/lib/astro/sun';
import { ACTIVITY_RULES } from '@/lib/muhurta/muhurtaRules';
import { findAuspiciousDays, type DayScore } from '@/lib/muhurta/muhurtaFinder';

// ── Timezone offset helper ──────────────────────────────────────────

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

// ── Place search (Open-Meteo geocoding) ─────────────────────────────

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
      setSuggestions([]); return;
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

// ── Main component ──────────────────────────────────────────────────

export default function MuhurtaFinder() {
  const { id = 'demo' } = useParams();
  const chartLink = useChartLink();
  const { data } = useKundli(id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const birthLat = (data?.birthDetails as any)?.placeOfBirth as { latitude: number; longitude: number; timezone: string; name: string } | undefined;
  const { location, isFromProfile } = useCurrentLocation(birthLat?.latitude, birthLat?.longitude, birthLat?.timezone);

  const tz = location?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = localDateInTz(tz);

  // State
  const [activityKey, setActivityKey] = useState('general');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => dayjs(today).add(30, 'day').format('YYYY-MM-DD'));
  const place = usePlaceSearch();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => { setStartDate(today); setEndDate(dayjs(today).add(30, 'day').format('YYYY-MM-DD')); }, [today]);

  // Effective location: place search > current location > birth chart
  const effectiveLocation = useMemo(() => {
    if (place.selected) return {
      lat: place.selected.latitude,
      lon: place.selected.longitude,
      tz: place.selected.timezone,
      label: [place.selected.name, place.selected.admin1, place.selected.country].filter(Boolean).join(', '),
    };
    if (location) return {
      lat: location.lat,
      lon: location.lon,
      tz: location.timezone,
      label: isFromProfile
        ? location.placeName ?? 'Current location'
        : birthLat?.name ?? `${location.lat.toFixed(2)}°N, ${location.lon.toFixed(2)}°E`,
    };
    return null;
  }, [place.selected, location, isFromProfile, birthLat]);

  // Compute results
  const result = useMemo(() => {
    if (!effectiveLocation) return null;
    const tzOffset = getTimezoneOffset(effectiveLocation.tz, startDate, '12:00:00');
    return findAuspiciousDays(activityKey, startDate, endDate, effectiveLocation.lat, effectiveLocation.lon, tzOffset);
  }, [activityKey, startDate, endDate, effectiveLocation]);

  const selectedRule = ACTIVITY_RULES.find(r => r.key === activityKey)!;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to={chartLink(`/app/chart/${id}/muhurta`)} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to daily Muhurta
      </Link>

      <div className="mt-3 text-eyebrow text-brand-saffron">Muhurta Finder · शुभ मुहूर्त खोजें</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Find Auspicious Days</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Score and rank days by Tithi, Nakshatra, Vara, and Karana for your chosen activity.
        Rules follow classical Muhurta Chintamani and Dharma Sindhu traditions.
      </p>

      {/* ─── Inputs ─── */}
      <div className="mt-6 grid gap-4 rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {/* Activity */}
        <label className="block">
          <span className="flex items-center gap-1.5 text-eyebrow text-text-tertiary"><Sparkles className="h-3 w-3" /> Activity · कार्य</span>
          <select value={activityKey} onChange={(e) => setActivityKey(e.target.value)}
            className="mt-1.5 w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 text-sm text-text-primary focus:border-brand-maroon focus:outline-none">
            {ACTIVITY_RULES.map(r => (
              <option key={r.key} value={r.key}>{r.label} · {r.labelHi}</option>
            ))}
          </select>
        </label>

        {/* Start date */}
        <label className="block">
          <span className="flex items-center gap-1.5 text-eyebrow text-text-tertiary"><CalendarIcon className="h-3 w-3" /> From · प्रारंभ</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none" />
        </label>

        {/* End date */}
        <label className="block">
          <span className="flex items-center gap-1.5 text-eyebrow text-text-tertiary"><CalendarIcon className="h-3 w-3" /> To · समाप्ति</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="mt-1.5 w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none" />
        </label>

        {/* Location */}
        <div>
          <span className="flex items-center gap-1.5 text-eyebrow text-text-tertiary"><MapPin className="h-3 w-3" /> Location · स्थान</span>
          <div className="relative mt-1.5">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input type="text" value={place.query} placeholder={effectiveLocation?.label ?? 'Search city…'}
              onChange={(e) => { place.setQuery(e.target.value); place.setSelected(null); place.setShowDrop(true); }}
              onFocus={() => place.setShowDrop(true)}
              onBlur={() => setTimeout(() => place.setShowDrop(false), 200)}
              className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 pl-10 text-sm text-text-primary focus:border-brand-maroon focus:outline-none" />
            {place.isSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />}
          </div>
          {place.showDrop && place.suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-hairline-subtle bg-surface shadow-lg">
              {place.suggestions.map((s, i) => (
                <li key={i}>
                  <button type="button"
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-elevated"
                    onMouseDown={(e) => e.preventDefault()} onClick={() => place.select(s)}>
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    <span className="truncate">{[s.name, s.admin1, s.country].filter(Boolean).join(', ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Activity description */}
      <div className="mt-3 text-sm text-text-tertiary">
        <strong>{selectedRule.label} · {selectedRule.labelHi}:</strong> {selectedRule.description}
      </div>

      {/* Location badge */}
      {effectiveLocation && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-elevated px-3 py-1.5 text-xs text-text-secondary">
          <MapPin className="h-3 w-3" />
          computed for <span className="font-semibold text-text-primary">{effectiveLocation.label}</span>
          <span className="text-text-tertiary">· tz {effectiveLocation.tz}</span>
        </div>
      )}

      {/* ─── Results ─── */}
      {!effectiveLocation && (
        <div className="mt-8 rounded-md border border-hairline-subtle bg-surface p-8 text-center text-text-secondary">
          <MapPin className="mx-auto h-8 w-8 text-text-muted" />
          <p className="mt-3">Set your location in Settings or search for a city above to see results.</p>
        </div>
      )}

      {result && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-h2 text-text-primary">
              Ranked days · क्रमबद्ध दिन
            </h2>
            <span className="text-xs text-text-tertiary">{result.scored.length} days scored</span>
          </div>

          <div className="mt-4 space-y-2">
            {result.scored.map((d) => (
              <DayCard
                key={d.date}
                day={d}
                expanded={expandedDay === d.date}
                onToggle={() => setExpandedDay(expandedDay === d.date ? null : d.date)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Methodology ─── */}
      <div className="mt-12 rounded-md border border-hairline-subtle bg-elevated/40 p-5 text-sm text-text-tertiary">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong className="text-text-secondary">How scoring works:</strong> Each day is scored at local noon
            using Tithi (+4/−4), Nakshatra (+4/−4), Vara (+3/−3), Karana (−3), and Abhijit Muhurta (+1).
            Rules follow Muhurta Chintamani and Dharma Sindhu. The Vivah (marriage) preset applies stricter
            rules from classical texts, avoiding all Krishna Paksha tithis and specific unfavourable nakshatras.
            Planetary positions use simplified Meeus algorithms; for full precision, see the daily Panchang page.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Day card sub-component ──────────────────────────────────────────

function DayCard({ day, expanded, onToggle }: { day: DayScore; expanded: boolean; onToggle: () => void }) {
  const isGood = day.score > 0;
  const isNeutral = day.score === 0;
  const borderColor = isGood ? 'border-semantic-positive/30' : isNeutral ? 'border-hairline-subtle' : 'border-semantic-negative/30';
  const scoreColor = isGood ? 'text-semantic-positive' : isNeutral ? 'text-text-secondary' : 'text-semantic-negative';
  const ScoreIcon = isGood ? CheckCircle2 : isNeutral ? Clock : AlertTriangle;

  return (
    <div className={`rounded-md border bg-surface shadow-sm ${borderColor}`}>
      <button type="button" onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${borderColor} ${scoreColor}`}>
            <ScoreIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-h3 text-text-primary">
              {dayjs(day.date).format('ddd, DD MMM YYYY')}
            </div>
            <div className="mt-0.5 text-xs text-text-tertiary">
              {day.panchang.tithiFull} · {day.panchang.nakshatra} ({day.panchang.nakshatraHi}) · {day.panchang.vara} ({day.panchang.varaHi})
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-lg font-bold ${scoreColor}`}>
            {day.score > 0 ? '+' : ''}{day.score}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-hairline-subtle px-5 py-4">
          {/* Panchang summary */}
          <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex justify-between">
              <span className="text-text-tertiary">Tithi · तिथि</span>
              <span className="text-text-primary">{day.panchang.tithiFull}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Nakshatra · नक्षत्र</span>
              <span className="text-text-primary">{day.panchang.nakshatra} ({day.panchang.nakshatraHi})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Vara · वार</span>
              <span className="text-text-primary">{day.panchang.vara} ({day.panchang.varaHi})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Karana · करण</span>
              <span className="text-text-primary">{day.panchang.karana}</span>
            </div>
          </div>

          {/* Abhijit */}
          {day.abhijit && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-semantic-positive/30 bg-surface px-3 py-1.5 text-xs text-semantic-positive">
              <Clock className="h-3 w-3" />
              Abhijit Muhurta · अभिजित मुहूर्त: {day.abhijit.from} – {day.abhijit.to}
            </div>
          )}

          {/* Scoring reasons */}
          <div className="mt-3">
            <div className="text-eyebrow text-text-tertiary">Scoring rules · नियम</div>
            <ul className="mt-1.5 space-y-1">
              {day.reasons.map((r, i) => {
                const isPositive = r.startsWith('Favourable') || r.startsWith('Abhijit');
                return (
                  <li key={i} className={`flex items-start gap-2 text-sm ${isPositive ? 'text-semantic-positive' : 'text-semantic-negative'}`}>
                    {isPositive
                      ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    {r}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
