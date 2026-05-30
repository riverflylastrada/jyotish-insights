import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Building2, Calendar, MapPin, Sparkles, ExternalLink, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAstroProvider } from '@/lib/astro/factory';
import { KundliChart } from '@/components/kundli/KundliChart';
import { useChartStore } from '@/stores/useChartStore';
import { toast } from '@/components/ui/sonner';
import type { KundliData, BirthDetails } from '@/lib/astro/types';

interface GeoResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

// ─── Feature flag stub (TODO: wire to billing/plan-gating when ready) ───────
function usePlanGate(_feature: string): boolean {
  // TODO: replace with real plan-gating logic when billing ships
  return true;
}

// ─── Business house labels ──────────────────────────────────────────────────

const BUSINESS_HOUSES: Record<number, { label: string; theme: string }> = {
  1:  { label: 'Entity / Brand Identity', theme: 'The entity itself — corporate personality, founding vision, public image of the brand.' },
  2:  { label: 'Revenue & Cashflow', theme: 'Revenue streams, liquid assets, cash reserves, banking relationships.' },
  3:  { label: 'Marketing / Communications', theme: 'Marketing, advertising, media presence, contracts, short-range logistics.' },
  4:  { label: 'Infrastructure / Assets', theme: 'Real estate, office, plant & machinery, foundational assets.' },
  5:  { label: 'Innovation / Speculative Ventures', theme: 'R&D, creative output, speculative ventures, stock performance.' },
  6:  { label: 'Competition / Debt / Staff', theme: 'Competitors, outstanding debts, day-to-day employees, operational friction.' },
  7:  { label: 'Clients & Partnerships', theme: 'Key clients, business partners, joint ventures, M&A counterparties.' },
  8:  { label: 'Shared Resources / Liabilities', theme: 'Investor capital, debt instruments, insurance, hidden liabilities.' },
  9:  { label: 'Strategy / Legal / Global Reach', theme: 'Long-term strategy, legal affairs, international expansion, higher guidance.' },
  10: { label: 'Reputation / Market Position', theme: 'Market reputation, brand authority, regulatory standing, public perception.' },
  11: { label: 'Profits & Gains', theme: 'Net profits, gains from networks, fulfilment of business objectives, strategic alliances.' },
  12: { label: 'Expenses / Losses / Exit', theme: 'Hidden costs, losses, foreign operations, dissolution, restructuring.' },
};

const SIGN_LORDS: Record<number, string> = {
  1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon', 5: 'Sun', 6: 'Mercury',
  7: 'Venus', 8: 'Mars', 9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter',
};

// ─── Form schema ────────────────────────────────────────────────────────────

const schema = z.object({
  entityName: z.string().trim().min(1, 'Required').max(120),
  incorporationDate: z.string().min(1, 'Required'),
  incorporationTime: z.string().min(1, 'Required'),
  city: z.string().min(1, 'Pick a city'),
  ayanamsa: z.enum(['lahiri', 'raman', 'krishnamurti', 'yukteshwar']),
  houseSystem: z.enum(['whole_sign', 'placidus', 'koch', 'sripati', 'equal']),
});

type Form = z.infer<typeof schema>;

// ─── Main component ─────────────────────────────────────────────────────────

export default function BusinessNew() {
  const nav = useNavigate();
  const chartStyle = useChartStore((s) => s.chartStyle);
  const allowed = usePlanGate('business');

  const [submitting, setSubmitting] = useState(false);
  const [chartData, setChartData] = useState<KundliData | null>(null);

  // Place picker
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string; lat: number; lng: number; tz: string; off: number;
  } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { ayanamsa: 'lahiri', houseSystem: 'whole_sign' },
  });

  const incDate = watch('incorporationDate');
  const incTime = watch('incorporationTime') ?? '';

  // Debounced geocoding
  useEffect(() => {
    if (selectedPlace && searchQuery === selectedPlace.name) { setSuggestions([]); return; }
    if (!searchQuery || searchQuery.trim().length < 3) { setSuggestions([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch { /* silent */ } finally { setIsSearching(false); }
    }, 450);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery, selectedPlace]);

  const handleSelectSuggestion = (s: GeoResult) => {
    const name = [s.name, s.admin1, s.country].filter(Boolean).join(', ');
    const tz = s.timezone || 'UTC';
    const off = getTimezoneOffset(tz, incDate || '2000-01-01', incTime || '12:00:00');
    setSearchQuery(name);
    setShowSuggestions(false);
    setSelectedPlace({ name, lat: s.latitude, lng: s.longitude, tz, off });
    setValue('city', name);
  };

  const onSubmit = async (data: Form) => {
    if (!selectedPlace) { toast.error('Please select a city.'); return; }
    setSubmitting(true);
    setChartData(null);
    try {
      const finalOff = getTimezoneOffset(selectedPlace.tz, data.incorporationDate, data.incorporationTime);
      const birthDetails: BirthDetails = {
        fullName: data.entityName,
        dateOfBirth: data.incorporationDate,
        timeOfBirth: data.incorporationTime,
        placeOfBirth: {
          name: selectedPlace.name,
          latitude: selectedPlace.lat,
          longitude: selectedPlace.lng,
          timezone: selectedPlace.tz,
          timezoneOffset: finalOff,
        },
        ayanamsa: data.ayanamsa,
        houseSystem: data.houseSystem,
      };
      const provider = getAstroProvider();
      const kundli = await provider.generateKundli(birthDetails);
      setChartData(kundli);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cast chart');
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <Building2 className="mx-auto h-10 w-10 text-text-muted" />
        <h1 className="mt-4 font-display text-h2 text-text-primary">Business Kundli</h1>
        <p className="mt-2 text-body text-text-secondary">This feature requires an Acharya-tier plan. Coming soon.</p>
      </div>
    );
  }

  const d1 = chartData?.divisionalCharts?.find((c) => c.varga === 'D1');

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="text-eyebrow text-brand-saffron">Business Kundli · Entity Chart</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Cast a Business Chart</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Generate an astrological chart for a company's founding or incorporation moment.
        Houses are re-labeled for entity-level interpretation.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm space-y-5">
        <Field label="Entity / Company Name" error={errors.entityName?.message}>
          <input {...register('entityName')} className="input" placeholder="e.g. Reliance Industries Ltd" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Incorporation Date" error={errors.incorporationDate?.message}>
            <input type="date" {...register('incorporationDate')} min="1800-01-01" max="2100-12-31" className="input" />
          </Field>
          <Field label="Incorporation Time" error={errors.incorporationTime?.message}>
            <input type="time" step="1" {...register('incorporationTime')} className="input" />
          </Field>
        </div>

        {/* Place picker */}
        <Field label="Place of Incorporation" error={errors.city?.message}>
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) { setSelectedPlace(null); setValue('city', ''); } }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search city…"
              className="input"
            />
            {isSearching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-text-muted" />}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-sm border border-hairline-subtle bg-surface shadow-lg">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-elevated"
                    onMouseDown={() => handleSelectSuggestion(s)}
                  >
                    <MapPin className="h-3 w-3 text-text-muted" />
                    {[s.name, s.admin1, s.country].filter(Boolean).join(', ')}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedPlace && (
            <div className="mt-1 text-xs text-text-muted">
              {selectedPlace.lat.toFixed(4)}°N, {selectedPlace.lng.toFixed(4)}°E · {selectedPlace.tz}
            </div>
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ayanamsa">
            <select {...register('ayanamsa')} className="input">
              <option value="lahiri">Lahiri</option>
              <option value="raman">Raman</option>
              <option value="krishnamurti">Krishnamurti</option>
              <option value="yukteshwar">Yukteshwar</option>
            </select>
          </Field>
          <Field label="House System">
            <select {...register('houseSystem')} className="input">
              <option value="whole_sign">Whole Sign</option>
              <option value="placidus">Placidus</option>
              <option value="koch">Koch</option>
              <option value="sripati">Sripati</option>
              <option value="equal">Equal</option>
            </select>
          </Field>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {submitting ? 'Casting…' : 'Cast Business Chart'}
        </button>
      </form>

      {/* Chart results */}
      {chartData && d1 && (
        <div className="mt-8 space-y-8 animate-in fade-in duration-500">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Chart visualization */}
            <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
              <h2 className="mb-4 font-display text-h3 text-text-primary">
                {chartData.birthDetails.fullName} — Business Chart
              </h2>
              <div className="flex justify-center">
                <KundliChart chart={d1} style={chartStyle} size={340} />
              </div>
            </div>

            {/* Business summary */}
            <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
              <h2 className="mb-4 font-display text-h3 text-text-primary">Entity Overview</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-eyebrow text-text-tertiary">Ascendant (Entity Identity)</span>
                  <div className="mt-0.5 font-display text-text-primary">
                    {chartData.ascendant.signName} — Lord: {SIGN_LORDS[chartData.ascendant.signNumber]}
                  </div>
                </div>
                {(() => {
                  const moon = d1.planets.find((p) => p.planet === 'moon');
                  return moon ? (
                    <div>
                      <span className="text-eyebrow text-text-tertiary">Moon (Public Sentiment)</span>
                      <div className="mt-0.5 font-display text-text-primary">{moon.signName} in House {moon.houseNumber}</div>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const sun = d1.planets.find((p) => p.planet === 'sun');
                  return sun ? (
                    <div>
                      <span className="text-eyebrow text-text-tertiary">Sun (Authority / Leadership)</span>
                      <div className="mt-0.5 font-display text-text-primary">{sun.signName} in House {sun.houseNumber}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>

          {/* Business house panel */}
          <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
            <h2 className="mb-4 font-display text-h3 text-text-primary">Business House Analysis</h2>
            <p className="mb-4 text-xs text-text-muted">
              Houses are re-labeled for entity-level interpretation. Key planets and lords mapped to business themes.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(BUSINESS_HOUSES).map(([houseStr, { label, theme }]) => {
                const house = parseInt(houseStr, 10);
                const planetsInHouse = d1.planets.filter((p) => p.houseNumber === house && p.planet !== 'ascendant');
                const houseSign = ((chartData.ascendant.signNumber - 1 + house - 1) % 12) + 1;
                const lord = SIGN_LORDS[houseSign];

                return (
                  <div key={house} className="rounded-sm border border-hairline-subtle bg-canvas p-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-saffron/10 text-xs font-display text-brand-saffron">
                        {house}
                      </span>
                      <span className="font-display text-sm font-semibold text-text-primary">{label}</span>
                    </div>
                    <p className="text-xs text-text-muted mb-2">{theme}</p>
                    <div className="text-xs text-text-secondary">
                      <span className="font-medium">Lord:</span> {lord}
                      {planetsInHouse.length > 0 && (
                        <span className="ml-2">
                          <span className="font-medium">Planets:</span>{' '}
                          {planetsInHouse.map((p) => (
                            <span key={p.planet} className="capitalize">
                              {p.planet}{p.isRetrograde ? '(R)' : ''}{' '}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Muhurta link */}
          <div className="rounded-md border border-brand-saffron/20 bg-surface p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-brand-saffron mt-0.5" />
              <div>
                <h3 className="font-display text-h3 text-text-primary">Choose an Auspicious Launch Time</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Use the Muhurta module to pick the most favourable day and hora for incorporation, launch,
                  or any major business event.
                </p>
                <p className="mt-2">
                  <Link
                    to="/app/new"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-saffron hover:underline"
                  >
                    Create a chart first, then navigate to Muhurta <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Tip: save this chart via <strong>New Chart</strong> with the incorporation details, then access Muhurta from the chart detail page.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.input { width: 100%; border: 1px solid hsl(var(--input)); background: hsl(var(--bg-surface)); border-radius: 3px; padding: 0.55rem 0.75rem; font-size: 14px; color: hsl(var(--text-primary)); outline: none; transition: border-color 120ms; }
.input:focus { border-color: hsl(var(--brand-saffron)); box-shadow: 0 0 0 3px hsl(var(--brand-saffron) / 0.12); }`}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-eyebrow mb-2 text-text-tertiary">{label}</div>
      {children}
      {error && <div className="mt-1 text-xs text-semantic-negative">{error}</div>}
    </label>
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
