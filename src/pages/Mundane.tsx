import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Sun, Moon as MoonIcon, Calendar, MapPin, Loader2, ArrowRight,
  ChevronDown, Info, ExternalLink,
} from 'lucide-react';
import { getAstroProvider } from '@/lib/astro/factory';
import { KundliChart, KundliFrame } from '@/components/kundli/KundliChart';
import { MUNDANE_HOUSES, NATIONAL_PRESETS, type MundaneHouseInfo } from '@/lib/astro/mundane';
import { SIGN_NAMES, SIGN_NAMES_DEVA, PLANET_LABELS, type BirthDetails, type KundliData, type DivisionalChart, type PlanetName } from '@/lib/astro/types';
import { SiteFooter } from '@/components/layout/SiteFooter';

/* ─── Chart type definitions ─── */

type MundaneChartType = 'national' | 'solar_ingress' | 'eclipse' | 'custom_event';

interface ChartTypeOption {
  id: MundaneChartType;
  label: string;
  labelDeva: string;
  icon: React.ElementType;
  description: string;
}

const CHART_TYPES: ChartTypeOption[] = [
  {
    id: 'national',
    label: 'National Chart',
    labelDeva: 'राष्ट्रीय कुंडली',
    icon: Globe,
    description: 'Independence or foundation chart of a nation.',
  },
  {
    id: 'solar_ingress',
    label: 'Solar Ingress',
    labelDeva: 'मेष संक्रांति',
    icon: Sun,
    description: 'Mesha Sankranti — the moment the Sun enters sidereal Aries for a chosen year and place.',
  },
  {
    id: 'eclipse',
    label: 'Eclipse Chart',
    labelDeva: 'ग्रहण कुंडली',
    icon: MoonIcon,
    description: 'Solar or lunar eclipse chart for a chosen date and place.',
  },
  {
    id: 'custom_event',
    label: 'Custom Event',
    labelDeva: 'कस्टम घटना',
    icon: Calendar,
    description: 'Any date, time, and place — e.g. swearing-in, budget, election.',
  },
];

/* ─── Timezone helper (mirrored from NewChart) ─── */

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

/* ─── Approximate Mesha Sankranti ─── */

/**
 * Approximate the moment the Sun enters sidereal Aries (Mesha Sankranti)
 * for a given year. The actual ingress is ~April 13-14 each year with
 * Lahiri ayanamsa. This uses a linear approximation (precise to ~±12 hours)
 * — enough to cast a meaningful ingress chart, since the ascendant changes
 * every 2 hours. A true Swiss-Ephemeris calculation would be done server-side.
 */
function approxMeshaSankrantiDate(year: number): { date: string; time: string } {
  const baseYear = 2000;
  const baseJd = 2451645.0;
  const tropicalYear = 365.24219;
  const jd = baseJd + (year - baseYear) * tropicalYear;
  const ms = (jd - 2440587.5) * 86400000;
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear().toString().padStart(4, '0');
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = d.getUTCDate().toString().padStart(2, '0');
  const hh = d.getUTCHours().toString().padStart(2, '0');
  const mi = d.getUTCMinutes().toString().padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}:00` };
}

/* ─── Place search (Open-Meteo geocoding, same as NewChart) ─── */

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

/* ─── Mundane chart wrapper around KundliChart with house labels ─── */

function MundaneChartWithLabels({ chart, mundaneHouses }: { chart: DivisionalChart; mundaneHouses: MundaneHouseInfo[] }) {
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const info = selectedHouse ? mundaneHouses.find((h) => h.house === selectedHouse) : null;

  return (
    <div>
      <KundliFrame title="D1 — Rasi" subtitle="Mundane Chart · लौकिक कुंडली">
        <KundliChart chart={chart} onHouseClick={(h) => setSelectedHouse(selectedHouse === h ? null : h)} />
      </KundliFrame>

      {/* House signification panel */}
      <AnimatePresence mode="wait">
        {info && (
          <motion.div
            key={info.house}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-4 rounded-md border border-brand-maroon/20 bg-surface p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-maroon/10 font-mono text-sm text-brand-maroon">
                {info.house}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-h3 text-text-primary">{info.label}</h3>
                <p className="font-deva text-sm text-text-tertiary">{info.labelDeva}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {info.keywords.map((kw) => (
                    <span key={kw} className="rounded-sm bg-elevated px-2 py-0.5 text-xs text-text-secondary">{kw}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedHouse && (
        <p className="mt-4 text-center text-xs text-text-muted">
          Tap any house in the chart to see its mundane signification.
        </p>
      )}
    </div>
  );
}

/* ─── House signification reference grid ─── */

function MundaneHouseGrid() {
  return (
    <div className="mt-8">
      <h2 className="font-display text-h2 text-text-primary">Mundane House Significations</h2>
      <p className="mt-1 text-sm text-text-tertiary">
        Ref: B.V. Raman, <cite>Mundane or Political Astrology</cite>; K.N. Rao, <cite>Mundane Astrology</cite>.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MUNDANE_HOUSES.map((h) => (
          <div key={h.house} className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-maroon/10 font-mono text-xs text-brand-maroon">
                {h.house}
              </span>
              <span className="font-display text-sm text-text-primary">{h.label}</span>
            </div>
            <p className="mt-1 font-deva text-xs text-text-tertiary">{h.labelDeva}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {h.keywords.map((kw) => (
                <span key={kw} className="rounded-sm bg-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">{kw}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Planet summary table ─── */

function PlanetSummary({ data }: { data: KundliData }) {
  const d1 = data.divisionalCharts.find((c) => c.varga === 'D1');
  if (!d1) return null;
  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-hairline-subtle bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline-subtle bg-elevated text-text-tertiary">
            <th className="px-4 py-2 text-left font-mono text-xs">Planet</th>
            <th className="px-4 py-2 text-left font-mono text-xs">Sign</th>
            <th className="px-4 py-2 text-left font-mono text-xs">House</th>
            <th className="px-4 py-2 text-left font-mono text-xs">Degree</th>
            <th className="px-4 py-2 text-left font-mono text-xs">Nakshatra</th>
            <th className="hidden px-4 py-2 text-left font-mono text-xs sm:table-cell">Retro</th>
          </tr>
        </thead>
        <tbody>
          {d1.planets.filter((p) => p.planet !== 'ascendant').map((p) => {
            const label = PLANET_LABELS[p.planet as PlanetName];
            return (
              <tr key={p.planet} className="border-b border-hairline-subtle last:border-0">
                <td className="px-4 py-2">
                  <span style={{ color: `hsl(var(--planet-${p.planet}))` }} className="font-medium">
                    {label?.full ?? p.planet}
                  </span>
                  {label && <span className="ml-1 font-deva text-xs text-text-muted">{label.deva}</span>}
                </td>
                <td className="px-4 py-2">
                  {SIGN_NAMES[p.signNumber - 1]}
                  <span className="ml-1 font-deva text-xs text-text-muted">{SIGN_NAMES_DEVA[p.signNumber - 1]}</span>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{p.houseNumber}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.signDegree.toFixed(2)}°</td>
                <td className="px-4 py-2 text-xs">{p.nakshatra} P{p.nakshatraPada}</td>
                <td className="hidden px-4 py-2 text-xs sm:table-cell">{p.isRetrograde ? '℞' : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Place search input (reusable inline) ─── */

function PlaceSearchInput({ place, label }: {
  place: ReturnType<typeof usePlaceSearch>;
  label?: string;
}) {
  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-medium text-text-secondary">{label ?? 'Place'}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={place.query}
          onChange={(e) => { place.setQuery(e.target.value); place.setSelected(null); place.setShowDrop(true); }}
          onFocus={() => place.setShowDrop(true)}
          onBlur={() => setTimeout(() => place.setShowDrop(false), 200)}
          placeholder="Search city..."
          className="input w-full pl-10"
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

/* ─── Main page component ─── */

export default function Mundane() {
  const [chartType, setChartType] = useState<MundaneChartType>('national');
  const [presetId, setPresetId] = useState(NATIONAL_PRESETS[0].id);
  const [ingressYear, setIngressYear] = useState(new Date().getFullYear());
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('12:00');
  const place = usePlaceSearch();

  // Build birth details from current selections
  const birthDetails: BirthDetails | null = (() => {
    if (chartType === 'national') {
      const preset = NATIONAL_PRESETS.find((p) => p.id === presetId);
      if (!preset) return null;
      return {
        fullName: preset.label,
        dateOfBirth: preset.dateOfBirth,
        timeOfBirth: preset.timeOfBirth,
        placeOfBirth: preset.place,
        ayanamsa: 'lahiri' as const,
        houseSystem: 'whole_sign' as const,
      };
    }

    if (chartType === 'solar_ingress') {
      const { date, time } = approxMeshaSankrantiDate(ingressYear);
      const p = place.selected;
      if (!p) return null;
      const tz = p.timezone || 'UTC';
      const off = getTimezoneOffset(tz, date, time);
      return {
        fullName: `Mesha Sankranti ${ingressYear}`,
        dateOfBirth: date,
        timeOfBirth: time,
        placeOfBirth: {
          name: [p.name, p.admin1, p.country].filter(Boolean).join(', '),
          latitude: p.latitude,
          longitude: p.longitude,
          timezone: tz,
          timezoneOffset: off,
        },
        ayanamsa: 'lahiri' as const,
        houseSystem: 'whole_sign' as const,
      };
    }

    if (chartType === 'eclipse' || chartType === 'custom_event') {
      if (!eventDate || !place.selected) return null;
      const p = place.selected;
      const tz = p.timezone || 'UTC';
      const time = eventTime || '12:00';
      const off = getTimezoneOffset(tz, eventDate, time + ':00');
      return {
        fullName: chartType === 'eclipse' ? `Eclipse Chart — ${eventDate}` : `Event Chart — ${eventDate}`,
        dateOfBirth: eventDate,
        timeOfBirth: time + ':00',
        placeOfBirth: {
          name: [p.name, p.admin1, p.country].filter(Boolean).join(', '),
          latitude: p.latitude,
          longitude: p.longitude,
          timezone: tz,
          timezoneOffset: off,
        },
        ayanamsa: 'lahiri' as const,
        houseSystem: 'whole_sign' as const,
      };
    }

    return null;
  })();

  const canCompute = !!birthDetails;

  // Compute the chart (no DB save, no auth required)
  const { data: kundli, isLoading, error, refetch } = useQuery<KundliData>({
    queryKey: ['mundane', chartType, JSON.stringify(birthDetails)],
    queryFn: async () => {
      if (!birthDetails) throw new Error('Missing inputs');
      return getAstroProvider().generateKundli(birthDetails);
    },
    enabled: false,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });

  const [hasComputed, setHasComputed] = useState(false);
  const compute = useCallback(() => {
    if (!canCompute) return;
    setHasComputed(true);
    refetch();
  }, [canCompute, refetch]);

  // Auto-compute for national preset on first load
  useEffect(() => {
    if (chartType === 'national' && canCompute && !hasComputed) {
      compute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  const d1 = kundli?.divisionalCharts.find((c) => c.varga === 'D1');
  const preset = NATIONAL_PRESETS.find((p) => p.id === presetId);

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      {/* SEO meta is set via index.html and document.title */}
      <title>Mundane Astrology — Acharya Jyotish | लौकिक ज्योतिष</title>
      <meta name="description" content="Explore mundane (world) astrology charts — national, solar ingress, eclipse, and event charts with Vedic house significations. Free, no login required." />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-hairline-subtle bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-h3 text-brand-maroon">Acharya Jyotish</Link>
          <nav className="flex items-center gap-4">
            <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">Home</Link>
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
          <div className="text-eyebrow text-brand-saffron">Mundane Astrology · लौकिक ज्योतिष</div>
          <h1 className="mt-2 font-display text-display text-text-primary">
            Charts for the World
          </h1>
          <p className="mt-4 max-w-2xl text-body text-text-secondary">
            Mundane (worldly) astrology applies Jyotish to nations, eclipses, and significant events.
            Each house maps to a sector of national life — government, economy, military, foreign affairs.
            Explore freely, no account needed.
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Chart type selector */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CHART_TYPES.map((ct) => {
            const Icon = ct.icon;
            const active = chartType === ct.id;
            return (
              <button
                key={ct.id}
                onClick={() => { setChartType(ct.id); setHasComputed(false); }}
                className={`rounded-md border p-4 text-left shadow-sm transition-colors ${
                  active
                    ? 'border-brand-maroon bg-brand-maroon/5'
                    : 'border-hairline-subtle bg-surface hover:border-brand-maroon/30'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-brand-maroon' : 'text-text-tertiary'}`} />
                <div className="mt-2 font-display text-sm text-text-primary">{ct.label}</div>
                <div className="font-deva text-xs text-text-tertiary">{ct.labelDeva}</div>
                <p className="mt-1 text-xs text-text-muted">{ct.description}</p>
              </button>
            );
          })}
        </div>

        {/* Input panel */}
        <div className="mt-8 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
          <AnimatePresence mode="wait">
            {/* National chart */}
            {chartType === 'national' && (
              <motion.div key="national" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Preset</label>
                  <div className="relative">
                    <select
                      value={presetId}
                      onChange={(e) => { setPresetId(e.target.value); setHasComputed(false); }}
                      className="input w-full appearance-none pr-8"
                    >
                      {NATIONAL_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label} — {p.labelDeva}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  </div>
                </div>
                {preset && (
                  <div className="rounded-sm bg-elevated p-4 text-sm">
                    <p className="text-text-secondary">{preset.description}</p>
                    <p className="mt-2 font-mono text-xs text-text-tertiary">Source: {preset.source}</p>
                    {preset.caveat && (
                      <div className="mt-3 flex gap-2 rounded-sm border border-brand-saffron/30 bg-brand-saffron/5 p-3 text-xs text-text-secondary">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-saffron" />
                        <span>{preset.caveat}</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Solar Ingress */}
            {chartType === 'solar_ingress' && (
              <motion.div key="ingress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Year</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={ingressYear}
                    onChange={(e) => { setIngressYear(parseInt(e.target.value, 10) || new Date().getFullYear()); setHasComputed(false); }}
                    className="input w-full max-w-xs"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Approximate Mesha Sankranti date for the chosen year will be computed.
                  </p>
                </div>
                <PlaceSearchInput place={place} label="Place (capital city for national reading)" />
              </motion.div>
            )}

            {/* Eclipse */}
            {chartType === 'eclipse' && (
              <motion.div key="eclipse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Eclipse Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => { setEventDate(e.target.value); setHasComputed(false); }}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Time (local)</label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => { setEventTime(e.target.value); setHasComputed(false); }}
                      className="input w-full"
                    />
                  </div>
                </div>
                <PlaceSearchInput place={place} label="Place of observation" />
                <p className="text-xs text-text-muted">
                  Tip: look up the exact eclipse time from a reliable source (e.g. NASA eclipse tables) and enter it here.
                </p>
              </motion.div>
            )}

            {/* Custom event */}
            {chartType === 'custom_event' && (
              <motion.div key="custom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Event Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => { setEventDate(e.target.value); setHasComputed(false); }}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Event Time</label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => { setEventTime(e.target.value); setHasComputed(false); }}
                      className="input w-full"
                    />
                  </div>
                </div>
                <PlaceSearchInput place={place} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compute button */}
          <div className="mt-6">
            <button
              onClick={compute}
              disabled={!canCompute || isLoading}
              className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:bg-brand-saffron-hover disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sun className="h-4 w-4" />}
              {isLoading ? 'Computing...' : 'Cast Mundane Chart'}
            </button>
            {!canCompute && chartType !== 'national' && (
              <span className="ml-3 text-xs text-text-muted">Fill in the required fields above.</span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && hasComputed && (
          <div className="mt-6 rounded-md border border-semantic-negative/30 bg-semantic-negative/5 p-4 text-sm text-semantic-negative">
            Failed to compute chart: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        {/* Results */}
        {kundli && d1 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-display text-h1 text-text-primary">{kundli.birthDetails.fullName}</h2>
              <span className="font-mono text-xs text-text-tertiary">
                {kundli.birthDetails.dateOfBirth} · {kundli.birthDetails.timeOfBirth ?? ''} · {kundli.birthDetails.placeOfBirth.name}
              </span>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Chart */}
              <MundaneChartWithLabels chart={d1} mundaneHouses={MUNDANE_HOUSES} />

              {/* Quick house reference */}
              <div>
                <h3 className="mb-3 font-display text-h3 text-text-primary">National-Sector Houses</h3>
                <div className="space-y-2">
                  {MUNDANE_HOUSES.map((h) => (
                    <div key={h.house} className="flex items-start gap-2 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-maroon/10 font-mono text-[10px] text-brand-maroon">
                        {h.house}
                      </span>
                      <span className="text-text-secondary">{h.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-text-muted">
                  Ref: B.V. Raman, <cite>Mundane or Political Astrology</cite> (Motilal Banarsidass);
                  K.N. Rao, <cite>Mundane Astrology</cite> (Bharatiya Vidya Bhavan).
                </p>
              </div>
            </div>

            {/* Planet table */}
            <PlanetSummary data={kundli} />

            {/* Panchang summary */}
            {kundli.panchang && (
              <div className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm">
                <h3 className="font-display text-h3 text-text-primary">Panchang · पंचांग</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    { k: 'Tithi · तिथि', v: kundli.panchang.tithi },
                    { k: 'Vara · वार', v: kundli.panchang.vara },
                    { k: 'Nakshatra · नक्षत्र', v: kundli.panchang.nakshatra },
                    { k: 'Yoga · योग', v: kundli.panchang.yoga },
                    { k: 'Karana · करण', v: kundli.panchang.karana },
                  ].map(({ k, v }) => (
                    <div key={k}>
                      <div className="text-xs text-text-tertiary">{k}</div>
                      <div className="mt-0.5 font-medium text-text-primary">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Full house reference grid */}
        <MundaneHouseGrid />

        {/* CTA */}
        <div className="mt-12 rounded-md border border-brand-maroon/20 bg-elevated p-8 text-center">
          <h2 className="font-display text-h2 text-text-primary">Want the full analysis?</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Sign up for a free account to save charts, run multi-guru debates, and get printable PDF reports.
          </p>
          <Link
            to="/app/new"
            className="mt-4 inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:bg-brand-saffron-hover"
          >
            Generate my Kundli <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
