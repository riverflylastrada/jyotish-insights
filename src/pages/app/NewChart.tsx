import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Loader2, MapPin, HelpCircle } from 'lucide-react';
import type { ChartBasis } from '@/lib/astro/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Required').max(80),
  dateOfBirth: z.string().min(1, 'Required'),
  timeOfBirth: z.string().optional(),
  unknownTime: z.boolean().optional(),
  chartBasis: z.enum(['rasi', 'solar', 'moon', 'horary']).optional(),
  horaryNumber: z.coerce.number().int().min(1).max(249).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  city: z.string().min(1, 'Pick a city or enter coordinates'),
  ayanamsa: z.enum(['lahiri', 'raman', 'krishnamurti', 'yukteshwar']),
  houseSystem: z.enum(['whole_sign', 'placidus', 'koch', 'sripati', 'equal']),
  chartStyle: z.enum(['north', 'south']),
}).refine(
  (d) => d.unknownTime || (d.timeOfBirth && d.timeOfBirth.length > 0),
  { message: 'Required', path: ['timeOfBirth'] },
).refine(
  (d) => d.chartBasis !== 'horary' || (d.horaryNumber && d.horaryNumber >= 1 && d.horaryNumber <= 249),
  { message: 'Enter a KP number between 1 and 249', path: ['horaryNumber'] },
);
type Form = z.infer<typeof schema>;

const stages = [
  'Computing planetary positions...',
  'Drawing 19 divisional charts...',
  'Running Vimshottari Dasha...',
  'Detecting Yogas & Doshas...',
  'Consulting the Gurus...',
];

export default function NewChart() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    lat: number;
    lng: number;
    tz: string;
    off: number;
  } | null>(null);

  const { register, handleSubmit, formState: { errors }, trigger, watch, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { ayanamsa: 'lahiri', houseSystem: 'whole_sign', chartStyle: 'north', unknownTime: false, chartBasis: 'solar' },
  });

  const unknownTime = watch('unknownTime');
  const chartBasis = watch('chartBasis');

  // Debounced Place Search (Open-Meteo Geocoding API)
  useEffect(() => {
    if (selectedPlace && searchQuery === selectedPlace.name) {
      setSuggestions([]);
      return;
    }
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`
        );
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSuggestions(data.results || []);
      } catch (err) {
        console.error('Error fetching places:', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedPlace]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val) {
      setSelectedPlace(null);
      setValue('city', '');
    }
  };

  const dob = watch('dateOfBirth');
  const tob = watch('timeOfBirth') ?? '';

  const handleSelectSuggestion = (suggestion: any) => {
    const lat = suggestion.latitude;
    const lng = suggestion.longitude;
    const name = [suggestion.name, suggestion.admin1, suggestion.country].filter(Boolean).join(', ');
    const tz = suggestion.timezone || 'UTC';

    setSearchQuery(name);
    setShowSuggestions(false);

    const off = getTimezoneOffset(tz, dob || '2000-01-01', tob || '12:00:00');
    const place = { name, lat, lng, tz, off };
    setSelectedPlace(place);
    setValue('city', name);
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const next = async () => {
    const fields: (keyof Form)[] = unknownTime
      ? ['fullName', 'dateOfBirth']
      : ['fullName', 'dateOfBirth', 'timeOfBirth'];
    const ok = await trigger(fields);
    if (ok) setStep(2);
  };

  const onSubmit = async (data: Form) => {
    if (!selectedPlace) {
      toast.error('Please search and select a birthplace from the suggestions dropdown.');
      return;
    }
    setSubmitting(true);
    for (let i = 0; i < stages.length; i++) {
      setStageIdx(i);
      await new Promise(r => setTimeout(r, 700));
    }
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav('/app/chart/demo'); return; }
      
      const effectiveTob = data.unknownTime ? undefined : data.timeOfBirth;
      const finalOffset = getTimezoneOffset(selectedPlace.tz, data.dateOfBirth, effectiveTob || '12:00:00');

      const basis: ChartBasis | undefined = data.unknownTime ? (data.chartBasis as ChartBasis) : undefined;

      const birth_details: Record<string, unknown> = {
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        ...(effectiveTob ? { timeOfBirth: effectiveTob } : {}),
        gender: data.gender,
        ayanamsa: data.ayanamsa,
        houseSystem: data.houseSystem,
        placeOfBirth: {
          name: selectedPlace.name,
          latitude: selectedPlace.lat,
          longitude: selectedPlace.lng,
          timezone: selectedPlace.tz,
          timezoneOffset: finalOffset,
        },
        ...(basis ? { chartBasis: basis } : {}),
        ...(basis === 'horary' && data.horaryNumber ? { horaryNumber: data.horaryNumber } : {}),
      };
      const { data: row, error } = await supabase.from('charts').insert({
        user_id: u.user.id,
        name: data.fullName,
        birth_details: birth_details as unknown as never,
      }).select('id').single();
      if (error) throw error;
      nav(`/app/chart/${row.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save chart');
      nav('/app/chart/demo');
    }
  };

  if (submitting) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
        <div className="mt-6 text-eyebrow text-brand-saffron">Casting your chart</div>
        <div className="mt-2 font-display text-h2 text-text-primary">{stages[stageIdx]}</div>
        <div className="mx-auto mt-6 h-1 w-64 overflow-hidden rounded-full bg-elevated">
          <motion.div className="h-full bg-brand-saffron"
            animate={{ width: `${((stageIdx + 1) / stages.length) * 100}%` }}
            transition={{ duration: 0.4 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="text-eyebrow text-brand-saffron">New chart</div>
      <h1 className="mt-2 font-display text-h1 text-text-primary">Cast a Kundli</h1>

      {/* Progress */}
      <div className="mt-8 flex items-center gap-3">
        {[1, 2].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${step >= n ? 'bg-brand-maroon text-primary-foreground' : 'bg-elevated text-text-tertiary'}`}>{n}</div>
            <div className="text-sm text-text-secondary">{n === 1 ? 'Birth details' : 'Place & options'}</div>
            {n === 1 && <div className={`mx-2 h-px flex-1 ${step >= 2 ? 'bg-brand-maroon' : 'bg-hairline-subtle'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 rounded-md border border-hairline-subtle bg-surface p-8 shadow-sm">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="s1" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-5">
              <Field label="Full name" error={errors.fullName?.message}>
                <input {...register('fullName')} className="input" placeholder="As on official records" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date of birth" error={errors.dateOfBirth?.message}>
                  <input type="date" {...register('dateOfBirth')} min="1900-01-01" max="2100-12-31" className="input" />
                </Field>
                {!unknownTime && (
                  <Field label="Time of birth" error={errors.timeOfBirth?.message}>
                    <input type="time" step="1" {...register('timeOfBirth')} className="input" />
                  </Field>
                )}
              </div>

              {/* Unknown birth time toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-hairline-subtle px-4 py-3 text-sm transition-colors has-[:checked]:border-brand-saffron has-[:checked]:bg-elevated">
                <input type="checkbox" {...register('unknownTime')} className="accent-brand-saffron" />
                <HelpCircle className="h-4 w-4 text-text-tertiary" />
                <span className="text-text-primary">I don't know my birth time</span>
              </label>

              {unknownTime && (
                <div className="space-y-4 rounded-sm border border-hairline-subtle bg-elevated p-4">
                  <div className="text-xs text-text-tertiary">Choose a chart type that does not require an exact birth time:</div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['solar', 'Solar Chart', "Sun's sign = 1st house (stable for a full day)"],
                      ['moon', 'Moon Chart', "Moon's sign = 1st house (may shift if Moon is near a sign boundary)"],
                      ['horary', 'KP Horary', 'Think of a number 1\u2013249; that becomes the Lagna'],
                    ] as const).map(([val, label, hint]) => (
                      <label key={val} className="flex cursor-pointer items-start gap-2 rounded-sm border border-hairline-subtle px-3 py-2 text-sm has-[:checked]:border-brand-maroon has-[:checked]:bg-surface">
                        <input type="radio" value={val} {...register('chartBasis')} className="mt-0.5 accent-brand-maroon" />
                        <div>
                          <div className="font-medium">{label}</div>
                          <div className="text-[11px] text-text-tertiary">{hint}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {chartBasis === 'horary' && (
                    <Field label="KP Horary Number (1\u2013249)" error={errors.horaryNumber?.message}>
                      <input type="number" min={1} max={249} step={1} {...register('horaryNumber')} className="input" placeholder="e.g. 42" />
                    </Field>
                  )}

                  {chartBasis === 'moon' && (
                    <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                      Without an exact time, the Moon may be in a neighbouring sign. The chart will flag this uncertainty.
                    </div>
                  )}
                </div>
              )}

              <Field label="Gender">
                <div className="flex flex-wrap gap-2">
                  {(['male', 'female', 'other'] as const).map(g => (
                    <label key={g} className="flex cursor-pointer items-center gap-2 rounded-sm border border-hairline-subtle px-3 py-2 text-sm has-[:checked]:border-brand-maroon has-[:checked]:bg-elevated">
                      <input type="radio" value={g} {...register('gender')} className="accent-brand-maroon" />
                      <span className="capitalize">{g}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </motion.div>
          ) : (
            <motion.div key="s2" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-5">
              <Field label="Place of birth" error={errors.city?.message}>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={handleBlur}
                    className="input pl-9"
                    placeholder="Search birthplace (e.g. London, Mumbai, Tokyo...)"
                    autoComplete="off"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-brand-saffron" />
                    </div>
                  )}

                  {/* Suggestions List */}
                  {showSuggestions && searchQuery.trim().length >= 3 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-sm border border-hairline-subtle bg-surface shadow-lg">
                      {isSearching ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-xs text-text-tertiary">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-saffron" />
                          Searching global locations...
                        </div>
                      ) : suggestions.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-text-tertiary">
                          No locations found. Try typing more details.
                        </div>
                      ) : (
                        suggestions.map((s, idx) => {
                          const displayName = [s.name, s.admin1, s.country].filter(Boolean).join(', ');
                          return (
                            <div
                              key={idx}
                              onMouseDown={() => handleSelectSuggestion(s)}
                              className="cursor-pointer px-4 py-2.5 text-xs text-text-primary hover:bg-elevated transition-colors duration-150"
                            >
                              {displayName}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {selectedPlace && (
                  <div className="mt-2 rounded-sm bg-elevated p-3 font-mono text-xs text-text-tertiary">
                    {selectedPlace.lat.toFixed(4)}°N, {selectedPlace.lng.toFixed(4)}°E · {selectedPlace.tz} (UTC{selectedPlace.off >= 0 ? `+${selectedPlace.off}` : selectedPlace.off})
                  </div>
                )}
              </Field>

              <details className="rounded-sm border border-hairline-subtle">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-text-primary">Advanced settings</summary>
                <div className="space-y-4 border-t border-hairline-subtle p-4">
                  <Field label="Ayanamsa">
                    <select {...register('ayanamsa')} className="input">
                      <option value="lahiri">Lahiri (default)</option>
                      <option value="raman">Raman</option>
                      <option value="krishnamurti">Krishnamurti</option>
                      <option value="yukteshwar">Yukteshwar</option>
                    </select>
                  </Field>
                  <Field label="House system">
                    <select {...register('houseSystem')} className="input">
                      <option value="whole_sign">Whole Sign (default)</option>
                      <option value="placidus">Placidus</option>
                      <option value="koch">Koch</option>
                      <option value="sripati">Sripati</option>
                      <option value="equal">Equal</option>
                    </select>
                  </Field>
                  <Field label="Chart style">
                    <div className="flex gap-2">
                      {(['north', 'south'] as const).map(s => (
                        <label key={s} className="flex cursor-pointer items-center gap-2 rounded-sm border border-hairline-subtle px-3 py-2 text-sm has-[:checked]:border-brand-maroon has-[:checked]:bg-elevated">
                          <input type="radio" value={s} {...register('chartStyle')} className="accent-brand-maroon" />
                          <span className="capitalize">{s} Indian</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              </details>

              <div className="rounded-sm border border-hairline-subtle bg-elevated p-3 text-xs text-text-tertiary">
                Your birth data is stored privately and never shared. You can permanently delete charts at any time.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          {step === 2 ? (
            <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-text-secondary hover:bg-elevated">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : <div />}
          {step === 1 ? (
            <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover">
              Cast my chart <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

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
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });

    const parts = formatter.formatToParts(new Date(utcMillis));
    const map: Record<string, number> = {};
    parts.forEach(p => {
      if (p.type !== 'literal') {
        map[p.type] = parseInt(p.value, 10);
      }
    });

    const t1 = Date.UTC(
      map.year,
      map.month - 1,
      map.day,
      map.hour === 24 ? 0 : map.hour,
      map.minute,
      map.second || 0
    );

    const offsetMs = t1 - utcMillis;
    const offsetHours = offsetMs / (1000 * 60 * 60);
    return Math.round(offsetHours * 100) / 100;
  } catch (e) {
    console.error('Error calculating timezone offset:', e);
    return 0;
  }
}

