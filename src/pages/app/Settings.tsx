import { useEffect, useState, useRef } from 'react';
import { Loader2, Save, MapPin, X, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useSession } from '@/hooks/useSession';
import { usePlanGate } from '@/hooks/usePlanGate';
import { InstallAppCard } from '@/components/layout/InstallAppCard';

type Prefs = {
  display_name: string;
  ayanamsa: 'lahiri' | 'raman' | 'krishnamurti' | 'yukteshwar';
  chart_style: 'north' | 'south';
  house_system: 'whole_sign' | 'placidus' | 'koch' | 'sripati' | 'equal';
  current_place_name: string | null;
  current_lat: number | null;
  current_lon: number | null;
  current_timezone: string | null;
  transit_alerts_enabled: boolean;
  transit_alerts_categories: string[];
};

const DEFAULTS: Prefs = {
  display_name: '',
  ayanamsa: 'lahiri',
  chart_style: 'north',
  house_system: 'whole_sign',
  current_place_name: null,
  current_lat: null,
  current_lon: null,
  current_timezone: null,
  transit_alerts_enabled: true,
  transit_alerts_categories: ['all'],
};

const EVENT_CATEGORIES = [
  { key: 'sade_sati', label: 'Sade Sati' },
  { key: 'ashtama_shani', label: 'Ashtama Shani' },
  { key: 'sign_ingress', label: 'Planet sign changes' },
  { key: 'guru_bala', label: 'Guru Bala (Jupiter transits)' },
  { key: 'retrograde', label: 'Retrograde stations' },
  { key: 'eclipse', label: 'Eclipse activations' },
  { key: 'dasha_transition', label: 'Dasha transitions' },
] as const;

export default function Settings() {
  const { user } = useSession();
  const alertsGated = usePlanGate('transit_alerts');
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);

  // Place picker state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geoDetecting, setGeoDetecting] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name,ayanamsa,chart_style,house_system,current_place_name,current_lat,current_lon,current_timezone,transit_alerts_enabled,transit_alerts_categories')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) { toast.error(error.message); setPrefs(DEFAULTS); return; }
      const merged = { ...DEFAULTS, ...(data ?? {}) } as Prefs;
      setPrefs(merged);
      if (merged.current_place_name) {
        setSearchQuery(merged.current_place_name);
      }
    })();
  }, [user]);

  // Debounced geocoding (same Open-Meteo API as New Chart wizard)
  useEffect(() => {
    if (prefs?.current_place_name && searchQuery === prefs.current_place_name) {
      setSuggestions([]);
      return;
    }
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`
        );
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch {
        // silently ignore — user will just see no results
      } finally {
        setIsSearching(false);
      }
    }, 450);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery, prefs?.current_place_name]);

  const selectPlace = (s: any) => {
    const name = [s.name, s.admin1, s.country].filter(Boolean).join(', ');
    const tz = s.timezone || 'UTC';
    setSearchQuery(name);
    setShowSuggestions(false);
    setSuggestions([]);
    setPrefs((p) => p ? { ...p, current_place_name: name, current_lat: s.latitude, current_lon: s.longitude, current_timezone: tz } : p);
  };

  const clearPlace = () => {
    setSearchQuery('');
    setSuggestions([]);
    setPrefs((p) => p ? { ...p, current_place_name: null, current_lat: null, current_lon: null, current_timezone: null } : p);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setGeoDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Reverse-geocode via Open-Meteo to get a place name + timezone
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${lat.toFixed(2)},${lon.toFixed(2)}&count=1&language=en&format=json`
          );
          let name = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

          // Try reverse geocoding via Open-Meteo's reverse endpoint
          try {
            const revRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=1`
            );
            if (revRes.ok) {
              const revData = await revRes.json();
              if (revData.timezone) tz = revData.timezone;
            }
          } catch {
            // fallback to Intl timezone
          }

          // Try forward geocoding nearby to get a readable name
          try {
            const fwdRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
            );
            if (fwdRes.ok) {
              const fwdData = await fwdRes.json();
              if (fwdData.results?.length) {
                const s = fwdData.results[0];
                name = [s.name, s.admin1, s.country].filter(Boolean).join(', ');
                if (s.timezone) tz = s.timezone;
              }
            }
          } catch {
            // keep coordinate name
          }

          setSearchQuery(name);
          setPrefs((p) => p ? { ...p, current_place_name: name, current_lat: lat, current_lon: lon, current_timezone: tz } : p);
          toast.success('Location detected');
        } catch {
          toast.error('Could not resolve your location');
        } finally {
          setGeoDetecting(false);
        }
      },
      (err) => {
        setGeoDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          // Fall back to Intl timezone only
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          toast('Location permission denied — using browser timezone only');
          setPrefs((p) => p ? { ...p, current_timezone: tz } : p);
        } else {
          toast.error('Could not detect your location');
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  // Auto-detect timezone on first load when no location is saved
  useEffect(() => {
    if (!prefs) return;
    if (prefs.current_place_name || prefs.current_timezone) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setPrefs((p) => p ? { ...p, current_timezone: tz } : p);
  }, [prefs?.current_place_name, prefs?.current_timezone]);

  const save = async () => {
    if (!user || !prefs) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, ...prefs }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Preferences saved');
  };

  if (!prefs) {
    return <div className="mx-auto max-w-3xl px-6 py-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-eyebrow text-brand-saffron">Settings</div>
      <h1 className="mt-2 font-display text-h1 text-text-primary">Preferences</h1>
      <p className="mt-2 text-body text-text-secondary">These defaults apply to every new chart you cast.</p>

      <div className="mt-8 space-y-5 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <Field label="Display name">
          <input className="settings-input" value={prefs.display_name ?? ''}
            onChange={(e) => setPrefs({ ...prefs, display_name: e.target.value })} />
        </Field>
        <Field label="Ayanamsa">
          <select className="settings-input" value={prefs.ayanamsa}
            onChange={(e) => setPrefs({ ...prefs, ayanamsa: e.target.value as Prefs['ayanamsa'] })}>
            <option value="lahiri">Lahiri (default)</option>
            <option value="raman">Raman</option>
            <option value="krishnamurti">Krishnamurti</option>
            <option value="yukteshwar">Yukteshwar</option>
          </select>
        </Field>
        <Field label="Chart style">
          <select className="settings-input" value={prefs.chart_style}
            onChange={(e) => setPrefs({ ...prefs, chart_style: e.target.value as Prefs['chart_style'] })}>
            <option value="north">North Indian</option>
            <option value="south">South Indian</option>
          </select>
        </Field>
        <Field label="House system">
          <select className="settings-input" value={prefs.house_system}
            onChange={(e) => setPrefs({ ...prefs, house_system: e.target.value as Prefs['house_system'] })}>
            <option value="whole_sign">Whole Sign (default)</option>
            <option value="placidus">Placidus</option>
            <option value="koch">Koch</option>
            <option value="sripati">Sripati</option>
            <option value="equal">Equal</option>
          </select>
        </Field>

        {/* Current location — used for Muhurta, Panchang, transit ascendant */}
        <div className="block">
          <div className="text-eyebrow mb-2 text-text-tertiary">Current location</div>
          <p className="mb-2 text-xs text-text-tertiary">
            Used for sunrise/sunset, Muhurta, today's Panchang, and the Dashboard transit ascendant.
            Falls back to birth location if unset.
          </p>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) clearPlace(); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="settings-input pl-9 pr-20"
              placeholder="Search city (e.g. London, Mumbai, New York...)"
              autoComplete="off"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {prefs.current_place_name && (
                <button type="button" onClick={clearPlace}
                  className="rounded p-1 text-text-tertiary hover:text-text-primary">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button type="button" onClick={detectLocation} disabled={geoDetecting}
                className="rounded bg-elevated px-2 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary disabled:opacity-50">
                {geoDetecting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Detect'}
              </button>
            </div>

            {showSuggestions && searchQuery.trim().length >= 3 && (
              <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-sm border border-hairline-subtle bg-surface shadow-lg">
                {isSearching ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-xs text-text-tertiary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-saffron" />
                    Searching locations...
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-text-tertiary">No locations found.</div>
                ) : (
                  suggestions.map((s, i) => {
                    const display = [s.name, s.admin1, s.country].filter(Boolean).join(', ');
                    return (
                      <div key={i} onMouseDown={() => selectPlace(s)}
                        className="cursor-pointer px-4 py-2.5 text-xs text-text-primary hover:bg-elevated transition-colors duration-150">
                        {display}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {prefs.current_place_name && prefs.current_lat != null && prefs.current_lon != null && (
            <div className="mt-2 rounded-sm bg-elevated p-3 font-mono text-xs text-text-tertiary">
              {prefs.current_lat.toFixed(4)}&deg;N, {prefs.current_lon.toFixed(4)}&deg;E
              {prefs.current_timezone && <> &middot; {prefs.current_timezone}</>}
            </div>
          )}
          {!prefs.current_place_name && prefs.current_timezone && (
            <div className="mt-2 rounded-sm bg-elevated p-3 font-mono text-xs text-text-tertiary">
              Timezone: {prefs.current_timezone} (no coordinates — sunrise/sunset will use birth location)
            </div>
          )}
        </div>

        {/* Notifications section */}
        {alertsGated && (
          <div className="border-t border-hairline-subtle pt-5">
            <div className="flex items-center gap-2 text-eyebrow mb-3 text-text-tertiary">
              <Bell className="h-4 w-4" />
              Notifications
            </div>
            <p className="mb-3 text-xs text-text-tertiary">
              Receive in-app alerts when significant transits or dasha changes are approaching for your saved charts.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={prefs.transit_alerts_enabled}
                onChange={(e) => setPrefs({ ...prefs, transit_alerts_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-hairline-subtle accent-brand-saffron" />
              <span className="text-sm text-text-primary">Enable transit alerts</span>
            </label>
            {prefs.transit_alerts_enabled && (
              <div className="mt-3 ml-7 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox"
                    checked={prefs.transit_alerts_categories.includes('all')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPrefs({ ...prefs, transit_alerts_categories: ['all'] });
                      } else {
                        setPrefs({ ...prefs, transit_alerts_categories: EVENT_CATEGORIES.map(c => c.key) });
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-hairline-subtle accent-brand-saffron" />
                  <span className="text-xs text-text-secondary">All categories</span>
                </label>
                {!prefs.transit_alerts_categories.includes('all') && EVENT_CATEGORIES.map(cat => (
                  <label key={cat.key} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox"
                      checked={prefs.transit_alerts_categories.includes(cat.key)}
                      onChange={(e) => {
                        const cats = e.target.checked
                          ? [...prefs.transit_alerts_categories, cat.key]
                          : prefs.transit_alerts_categories.filter(c => c !== cat.key);
                        setPrefs({ ...prefs, transit_alerts_categories: cats.length === 0 ? ['all'] : cats });
                      }}
                      className="h-3.5 w-3.5 rounded border-hairline-subtle accent-brand-saffron" />
                    <span className="text-xs text-text-secondary">{cat.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save preferences
          </button>
        </div>
      </div>

      <InstallAppCard />

      <div className="mt-6 rounded-md border border-hairline-subtle bg-surface p-5 text-sm text-text-tertiary">
        Signed in as <span className="font-mono text-text-primary">{user?.email}</span>
      </div>

      <style>{`.settings-input { width: 100%; border: 1px solid hsl(var(--input)); background: hsl(var(--bg-surface)); border-radius: 3px; padding: 0.55rem 0.75rem; font-size: 14px; color: hsl(var(--text-primary)); outline: none; }
.settings-input:focus { border-color: hsl(var(--brand-saffron)); box-shadow: 0 0 0 3px hsl(var(--brand-saffron) / 0.12); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-eyebrow mb-2 text-text-tertiary">{label}</div>
      {children}
    </label>
  );
}
