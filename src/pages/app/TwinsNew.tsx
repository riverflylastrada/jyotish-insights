import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

/**
 * Parse "HH:MM:SS" → total seconds since midnight.
 * Returns NaN if the string is malformed.
 */
function timeToSec(t: string): number {
  const parts = t.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const s = parts[2] ? parseInt(parts[2], 10) : 0;
  return h * 3600 + m * 60 + s;
}

const schema = z.object({
  fullNameA: z.string().trim().min(1, 'Required').max(80),
  fullNameB: z.string().trim().min(1, 'Required').max(80),
  dateOfBirth: z.string().min(1, 'Required'),
  timeA: z.string().min(1, 'Required'),
  timeB: z.string().min(1, 'Required'),
  gender: z.enum(['male', 'female', 'other']).optional(),
  city: z.string().min(1, 'Pick a city'),
  ayanamsa: z.enum(['lahiri', 'raman', 'krishnamurti', 'yukteshwar']),
  houseSystem: z.enum(['whole_sign', 'placidus', 'koch', 'sripati', 'equal']),
}).refine(
  (d) => {
    const secA = timeToSec(d.timeA);
    const secB = timeToSec(d.timeB);
    if (isNaN(secA) || isNaN(secB)) return false;
    const delta = Math.abs(secA - secB);
    return delta >= 30 && delta <= 120;
  },
  { message: 'Time difference must be 30 s – 2 min', path: ['timeB'] },
);
type Form = z.infer<typeof schema>;

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
    parts.forEach(p => { if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10); });
    const t1 = Date.UTC(map.year, map.month - 1, map.day, map.hour === 24 ? 0 : map.hour, map.minute, map.second || 0);
    return Math.round(((t1 - utcMillis) / 3600000) * 100) / 100;
  } catch { return 0; }
}

export default function TwinsNew() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<Record<string, unknown>>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string; lat: number; lng: number; tz: string; off: number;
  } | null>(null);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { ayanamsa: 'lahiri', houseSystem: 'whole_sign' },
  });

  const dob = watch('dateOfBirth');
  const timeA = watch('timeA') ?? '';

  useEffect(() => {
    if (selectedPlace && searchQuery === selectedPlace.name) { setSuggestions([]); return; }
    if (!searchQuery || searchQuery.trim().length < 3) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`,
        );
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSuggestions((data.results as Array<Record<string, unknown>>) || []);
      } catch (err) { console.error('Geocoding error:', err); }
      finally { setIsSearching(false); }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedPlace]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val) { setSelectedPlace(null); setValue('city', ''); }
  };

  const handleSelectSuggestion = (s: Record<string, unknown>) => {
    const lat = s.latitude as number;
    const lng = s.longitude as number;
    const name = [s.name, s.admin1, s.country].filter(Boolean).join(', ');
    const tz = (s.timezone as string) || 'UTC';
    setSearchQuery(name);
    setShowSuggestions(false);
    const off = getTimezoneOffset(tz, dob || '2000-01-01', timeA || '12:00:00');
    setSelectedPlace({ name, lat, lng, tz, off });
    setValue('city', name);
  };

  const onSubmit = async (data: Form) => {
    if (!selectedPlace) { toast.error('Select a birthplace from the dropdown.'); return; }
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { toast.error('Please sign in'); return; }
      const offA = getTimezoneOffset(selectedPlace.tz, data.dateOfBirth, data.timeA);
      const offB = getTimezoneOffset(selectedPlace.tz, data.dateOfBirth, data.timeB);
      const common = {
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        ayanamsa: data.ayanamsa,
        houseSystem: data.houseSystem,
        placeOfBirth: {
          name: selectedPlace.name,
          latitude: selectedPlace.lat,
          longitude: selectedPlace.lng,
          timezone: selectedPlace.tz,
        },
      };
      const detailsA = { ...common, fullName: data.fullNameA, timeOfBirth: data.timeA, placeOfBirth: { ...common.placeOfBirth, timezoneOffset: offA } };
      const detailsB = { ...common, fullName: data.fullNameB, timeOfBirth: data.timeB, placeOfBirth: { ...common.placeOfBirth, timezoneOffset: offB } };
      const [rowA, rowB] = await Promise.all([
        supabase.from('charts').insert({ user_id: u.user.id, name: data.fullNameA, birth_details: detailsA as unknown as never }).select('id').single(),
        supabase.from('charts').insert({ user_id: u.user.id, name: data.fullNameB, birth_details: detailsB as unknown as never }).select('id').single(),
      ]);
      if (rowA.error) throw rowA.error;
      if (rowB.error) throw rowB.error;
      nav(`/app/twins/${rowA.data.id}/${rowB.data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save charts');
    } finally { setSubmitting(false); }
  };

  const timeAVal = watch('timeA');
  const timeBVal = watch('timeB');
  let deltaLabel = '';
  if (timeAVal && timeBVal) {
    const d = Math.abs(timeToSec(timeAVal) - timeToSec(timeBVal));
    if (!isNaN(d)) {
      const m = Math.floor(d / 60);
      const s = d % 60;
      deltaLabel = m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
  }

  if (submitting) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
        <div className="mt-6 text-eyebrow text-brand-saffron">Computing twin charts</div>
        <div className="mt-2 font-display text-h2 text-text-primary">Casting two Kundlis side by side...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="text-eyebrow text-brand-saffron">Twins · जुड़वाँ</div>
      <h1 className="mt-2 font-display text-h1 text-text-primary">Twin Chart Comparison</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Enter a shared birth date and place with two birth times 30 s – 2 min apart.
        The comparison highlights what <em>diverges</em> between the two charts.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 rounded-md border border-hairline-subtle bg-surface p-8 shadow-sm">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Names */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Twin A — Name" error={errors.fullNameA?.message}>
              <input {...register('fullNameA')} className="input" placeholder="e.g. Aarav" />
            </Field>
            <Field label="Twin B — Name" error={errors.fullNameB?.message}>
              <input {...register('fullNameB')} className="input" placeholder="e.g. Arjun" />
            </Field>
          </div>

          {/* Date */}
          <Field label="Date of birth" error={errors.dateOfBirth?.message}>
            <input type="date" {...register('dateOfBirth')} min="1900-01-01" max="2100-12-31" className="input" />
          </Field>

          {/* Two times */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Twin A — Time of birth" error={errors.timeA?.message}>
              <input type="time" step="1" {...register('timeA')} className="input" />
            </Field>
            <Field label="Twin B — Time of birth" error={errors.timeB?.message}>
              <input type="time" step="1" {...register('timeB')} className="input" />
            </Field>
          </div>
          {deltaLabel && (
            <div className="flex items-center gap-2 rounded-sm bg-elevated px-4 py-2 text-xs">
              <Users className="h-3.5 w-3.5 text-brand-saffron" />
              <span className="text-text-secondary">Birth-time delta: <span className="font-mono text-text-primary">{deltaLabel}</span></span>
            </div>
          )}

          {/* Gender */}
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

          {/* Place */}
          <Field label="Place of birth" error={errors.city?.message}>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="input pl-9"
                placeholder="Search birthplace (e.g. London, Mumbai...)"
                autoComplete="off"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-saffron" />
                </div>
              )}
              {showSuggestions && searchQuery.trim().length >= 3 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-sm border border-hairline-subtle bg-surface shadow-lg">
                  {isSearching ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-xs text-text-tertiary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-saffron" />
                      Searching...
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-text-tertiary">No locations found.</div>
                  ) : (
                    suggestions.map((s, idx) => {
                      const displayName = [s.name, s.admin1, s.country].filter(Boolean).join(', ');
                      return (
                        <div key={idx} onMouseDown={() => handleSelectSuggestion(s)}
                          className="cursor-pointer px-4 py-2.5 text-xs text-text-primary transition-colors hover:bg-elevated">
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

          {/* Advanced */}
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
            </div>
          </details>

          <button type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover">
            Compare Twin Charts <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
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
