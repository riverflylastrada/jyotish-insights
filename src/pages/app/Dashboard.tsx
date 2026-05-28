import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Loader2,
  Calendar,
  Users,
  Compass,
  Briefcase,
  Moon,
  Info,
  ShieldCheck,
  Bookmark,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAstroProvider } from '@/lib/astro/factory';
import { PLANET_LABELS, type PlanetPosition, type KundliData } from '@/lib/astro/types';
import { toast } from '@/components/ui/sonner';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';

interface Profile {
  id: string;
  name: string;
  birth_details: any;
  snapshot: KundliData | null;
}

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [transits, setTransits] = useState<PlanetPosition[]>([]);
  const [loadingTransits, setLoadingTransits] = useState(true);
  const [computedSnapshots, setComputedSnapshots] = useState<Record<string, KundliData>>({});
  const [attemptedComputes, setAttemptedComputes] = useState<Record<string, boolean>>({});

  // Load saved profiles from Library
  useEffect(() => {
    async function loadProfiles() {
      try {
        const { data, error } = await supabase
          .from('charts')
          .select('id, name, birth_details, snapshot')
          .order('created_at', { ascending: false });
        if (error) throw error;
        
        setProfiles((data ?? []).map(p => ({
          id: p.id,
          name: p.name,
          birth_details: p.birth_details,
          snapshot: p.snapshot as unknown as KundliData | null
        })));

        if (data && data.length > 0) {
          setSelectedProfileId(data[0].id);
        }
      } catch (e: any) {
        toast.error("Failed to load dashboard profiles: " + e.message);
      }
    }
    loadProfiles();
  }, []);

  // Fetch user's current location for transit computation
  const { location: currentLocation, isFromProfile: transitUsingProfile } = useCurrentLocation(23.0225, 72.5714, 'Asia/Kolkata');

  // Fetch current transits using user's current location
  useEffect(() => {
    const lat = currentLocation?.lat ?? 23.0225;
    const lon = currentLocation?.lon ?? 72.5714;
    getAstroProvider().getCurrentTransits(lat, lon)
      .then((t) => {
        setTransits(t);
      })
      .catch((e) => {
        console.error("Transit load failed:", e);
      })
      .finally(() => {
        setLoadingTransits(false);
      });
  }, [currentLocation?.lat, currentLocation?.lon]);

  // Profile selection logic
  const activeProfile = profiles ? (profiles.find(p => p.id === selectedProfileId) || profiles[0]) : null;

  // Dynamically compute snapshot if it doesn't exist
  useEffect(() => {
    if (!activeProfile) return;
    if (activeProfile.snapshot) return;
    if (attemptedComputes[activeProfile.id]) return;

    async function computeSnapshot() {
      setAttemptedComputes((prev) => ({ ...prev, [activeProfile!.id]: true }));
      try {
        const fresh = await getAstroProvider().generateKundli(activeProfile!.birth_details);
        setComputedSnapshots((prev) => ({ ...prev, [activeProfile!.id]: fresh }));
        
        // Cache to database
        void supabase
          .from('charts')
          .update({ snapshot: fresh as unknown as never })
          .eq('id', activeProfile!.id);
      } catch (e) {
        console.error("Failed to dynamically compute snapshot on dashboard:", e);
      }
    }
    computeSnapshot();
  }, [activeProfile, attemptedComputes]);

  if (profiles === null || loadingTransits) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
        <p className="mt-4 text-text-secondary font-display">Assembling your personalized research feed...</p>
      </div>
    );
  }

  // Fallback: If no profiles exist, show the standard onboarding welcome
  if (profiles.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-eyebrow text-brand-saffron">Dashboard</div>
        <h1 className="mt-2 font-display text-h1 text-text-primary">Welcome to Acharya Jyotish</h1>
        <p className="mt-2 text-body text-text-secondary max-w-2xl">
          Your premium Vedic Research Terminal is fully configured. Cast your birth chart to unlock your personalized daily transit feeds, vimshottari dasha updates, and compatibility matching engines.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/app/new" className="group rounded-md border border-hairline-subtle bg-surface p-8 shadow-sm transition-shadow hover:shadow-md">
            <div className="text-eyebrow text-brand-saffron">Cast Chart</div>
            <div className="mt-2 font-display text-h2 text-text-primary">New Kundli</div>
            <p className="mt-2 text-sm text-text-secondary">Two-step birthplace geocoding wizard. We compute all 16 divisional charts.</p>
            <div className="mt-6 inline-flex items-center gap-1 text-sm text-brand-maroon font-semibold">
              Get Started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
          <Link to="/app/chart/demo" className="group rounded-md border border-brand-maroon/30 bg-surface p-8 shadow-sm transition-shadow hover:shadow-md">
            <div className="text-eyebrow text-brand-saffron flex items-center gap-1">Reference</div>
            <div className="mt-2 font-display text-h2 text-text-primary">Explore Demo Chart</div>
            <p className="mt-2 text-sm text-text-secondary">Explore sample planetary strengths, ashtakavarga scores, and Vimshottari cycles.</p>
            <div className="mt-6 inline-flex items-center gap-1 text-sm text-brand-maroon font-semibold">
              Open Demo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
          <div className="rounded-md border border-hairline-subtle bg-surface p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-eyebrow text-brand-saffron">Features Ready</div>
              <div className="mt-2 font-display text-h2 text-text-primary">Compatibility & Transits</div>
              <p className="mt-2 text-sm text-text-secondary">36-Point Milan matching and Live Transit Bi-Wheel diagrams are fully operational.</p>
            </div>
            <div className="mt-6 text-xs text-text-muted">
              Add at least two charts to run compatibility tests.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chartData = activeProfile?.snapshot || computedSnapshots[activeProfile?.id] || null;

  // Every feed value is derived from real data below. `null` means "not available
  // yet" and renders as an honest placeholder — never a fabricated specific.
  let auspiciousScore: number | null = null;
  let moonHouseText: string | null = null;
  let dashaText: string | null = null;
  let activeMaha: string | null = null;
  let activeAntar: string | null = null;
  let natalMoonSign: string | null = null;
  let natalLagnaSign: string | null = null;

  if (chartData) {
    const d1 = chartData.divisionalCharts?.find(c => c.varga === 'D1');
    const moonNatal = d1?.planets?.find((p: any) => p.planet === 'moon');
    const ascendant = d1?.planets?.find((p: any) => p.planet === 'ascendant') || chartData.ascendant;
    
    natalMoonSign = moonNatal?.signName ?? null;
    natalLagnaSign = ascendant?.signName ?? null;

    const tMoon = transits.find(p => p.planet === 'moon');
    if (tMoon && moonNatal) {
      const hFromLagna = ((tMoon.signNumber - (d1?.ascendantSign || 1) + 12) % 12) + 1;
      const hFromMoon = ((tMoon.signNumber - moonNatal.signNumber + 12) % 12) + 1;

      // Auspiciousness scoring logic
      const goodHouses = [1, 3, 6, 10, 11];
      const neutralHouses = [2, 5, 7, 9];
      let moonScore = 60;
      if (goodHouses.includes(hFromMoon)) {
        moonScore = 90;
        moonHouseText = `The transit Moon is in your ${hFromMoon}H from natal Moon (${tMoon.nakshatra} Nakshatra). This creates an exceptionally positive, productive mindset and triggers gains.`;
      } else if (neutralHouses.includes(hFromMoon)) {
        moonScore = 75;
        moonHouseText = `The transit Moon is in your ${hFromMoon}H from natal Moon. A stable, steady day suited for communication, family, and focused study.`;
      } else {
        moonScore = 45;
        moonHouseText = `The transit Moon is in your ${hFromMoon}H (Dusthana transit) from natal Moon. Focus on inner meditation, rest, and avoid taking major financial risks today.`;
      }

      auspiciousScore = Math.round(moonScore);
    }

    // Dashas (dynamically calculated at runtime based on Date.now())
    if (chartData.dashas && chartData.dashas.length > 0) {
      const tl = chartData.dashas[0]?.timeline;
      if (tl && tl.length > 0) {
        const now = Date.now();
        
        const currentMaha = tl.find(
          p => {
            if (!p || !p.startDate || !p.endDate) return false;
            const sTime = new Date(p.startDate).getTime();
            const eTime = new Date(p.endDate).getTime();
            return !isNaN(sTime) && !isNaN(eTime) && sTime <= now && eTime > now;
          }
        ) ?? tl[0];
        
        if (currentMaha && currentMaha.planet) {
          activeMaha = currentMaha.planet;

          const sequence: Array<[string, number]> = [
            ['Mercury', 17], ['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10],
            ['Mars', 7], ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19],
          ];
          
          const reorderSequence = (startLord: string): Array<[string, number]> => {
            if (!startLord) return [...sequence];
            const idx = sequence.findIndex(([p]) => p.toLowerCase() === startLord.toLowerCase());
            if (idx === -1) return [...sequence];
            return [...sequence.slice(idx), ...sequence.slice(0, idx)];
          };

          const orderedAntar = reorderSequence(currentMaha.planet);
          const total = 120;
          const rawStart = currentMaha.startDate ? new Date(currentMaha.startDate).getTime() : now;
          const rawEnd = currentMaha.endDate ? new Date(currentMaha.endDate).getTime() : now + 1000 * 60 * 60 * 24;
          
          const start = isNaN(rawStart) ? now : rawStart;
          const end = isNaN(rawEnd) ? now + 1000 * 60 * 60 * 24 : rawEnd;
          const span = end - start;
          let cursor = start;
          
          const children = currentMaha.children || orderedAntar.map(([planet, years]) => {
            const slice = (years / total) * span;
            const s = cursor;
            cursor += slice;
            
            const safeS = isNaN(s) ? now : s;
            const safeCursor = isNaN(cursor) ? now : cursor;
            
            return {
              level: 'antar' as const,
              planet,
              durationYears: (years / total) * (currentMaha.durationYears || 1),
              startDate: new Date(safeS).toISOString(),
              endDate: new Date(safeCursor).toISOString(),
            };
          });

          const currentAntar = children.find(
            (c: any) => {
              if (!c || !c.startDate || !c.endDate) return false;
              const sTime = new Date(c.startDate).getTime();
              const eTime = new Date(c.endDate).getTime();
              return !isNaN(sTime) && !isNaN(eTime) && sTime <= now && eTime > now;
            }
          );
          
          activeAntar = currentAntar?.planet || children[0]?.planet || null;

          // Tailored Vimshottari guidance
          const dashaGuidance: Record<string, string> = {
            Sun: "Focus on establishing professional authority, solar vitality, and claiming leadership roles. Actively stand out in your community.",
            Moon: "A phase highly suited for emotional alignment, artistic creativity, household upgrades, and expanding family/personal relationships.",
            Mars: "Channels high courage, mechanical work, competitive drive, physical training, and land investments. Keep rash anger in check.",
            Mercury: "Excellent time for business growth, intellectual learning, launching a website, accounting, and writing articles.",
            Jupiter: "Period of supreme growth, expansion, spiritual guidance, teaching, expanding wisdom, and seeking noble endeavors.",
            Venus: "Focuses on relationship maturity, appreciation of fine arts, acquiring comforts, vehicles, and nurturing deep marriages.",
            Saturn: "Demands meticulous discipline, structural reforms, hard persistence, dealing with delays with extreme patience, and spiritual realism.",
            Rahu: "Unconventional growth, ambition, technological expertise, and learning through intense desire. Watch out for illusions.",
            Ketu: "Excellent for spiritual detachment, deep meditation, yogic research, letting go of outdated patterns, and sudden insights."
          };
          const mahaKey = activeMaha.charAt(0).toUpperCase() + activeMaha.slice(1).toLowerCase();
          dashaText = dashaGuidance[mahaKey] || "A major foundational shift is manifesting in your Vimshottari sequence. Focus on patience and steady self-study.";
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header Profile Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline-subtle pb-6">
        <div>
          <div className="text-eyebrow text-brand-saffron flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-brand-saffron" /> Premium Vedic Dashboard</div>
          <h1 className="mt-1 font-display text-h1 text-text-primary">Research Terminal</h1>
        </div>
        
        {/* Profile Switcher dropdown */}
        <div className="flex items-center gap-2 rounded-sm border border-hairline-subtle bg-surface px-3 py-1.5 shadow-sm">
          <Bookmark className="h-4 w-4 text-brand-saffron" />
          <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Active Profile:</span>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="bg-transparent text-sm font-semibold text-text-primary focus:outline-none cursor-pointer"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Auspiciousness Meter + Main Feed Cards */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        {/* Left: Auspiciousness Meter Gauge */}
        <div className="lg:col-span-4 rounded-md border border-hairline-subtle bg-surface p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-eyebrow text-text-tertiary">Personal Auspiciousness</div>
          
          <div className="relative mt-6 flex h-44 w-44 items-center justify-center rounded-full border-4 border-hairline-subtle bg-canvas/20">
            <svg className="absolute inset-0 h-full w-full -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="78"
                fill="transparent"
                stroke="hsl(var(--brand-saffron) / 0.1)"
                strokeWidth="8"
              />
              <circle
                cx="88"
                cy="88"
                r="78"
                fill="transparent"
                stroke="hsl(var(--brand-saffron))"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 78}
                strokeDashoffset={2 * Math.PI * 78 * (1 - (auspiciousScore ?? 0) / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="text-center z-10">
              <span className="font-display text-4xl font-bold text-text-primary">{auspiciousScore !== null ? `${auspiciousScore}%` : '—'}</span>
              <span className="block text-[10px] text-text-muted mt-1 uppercase font-bold tracking-widest">Auspicious</span>
            </div>
          </div>

          <div className="mt-6 text-xs text-text-secondary px-4 leading-relaxed font-medium">
            {auspiciousScore === null ? (
              "Live transit data is unavailable right now. Open this chart to refresh today's gochara."
            ) : auspiciousScore >= 80 ? (
              "Highly auspicious. Perfect alignment for launching key ventures, travel, or critical agreements."
            ) : auspiciousScore >= 60 ? (
              "Moderate auspiciousness. Suitable for routine transactions, research projects, and consultations."
            ) : (
              "Low planetary trigger. Highly recommended to pursue spiritual practices and postpone risk-prone actions."
            )}
          </div>
        </div>

        {/* Right: Personalized Feed Cards */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Transit Card */}
          <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-brand-saffron">
                <Moon className="h-4.5 w-4.5 fill-brand-saffron/20" />
                <h3 className="font-display text-h3 text-text-primary">Today's Transit Impact (Chandra Gochara)</h3>
              </div>
              {currentLocation && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-elevated px-2 py-1 text-[10px] text-text-tertiary">
                  <MapPin className="h-2.5 w-2.5" />
                  {transitUsingProfile ? (currentLocation.placeName ?? 'Current location') : 'default coords'}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {moonHouseText ?? "Live transit data isn't available yet. Reopen this chart to refresh today's Moon gochara."}
            </p>
            {(natalMoonSign || natalLagnaSign) && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {natalMoonSign && <span className="rounded bg-elevated px-2.5 py-1 text-text-tertiary font-mono">Natal Moon: {natalMoonSign}</span>}
                {natalLagnaSign && <span className="rounded bg-elevated px-2.5 py-1 text-text-tertiary font-mono">Natal Lagna: {natalLagnaSign}</span>}
              </div>
            )}
          </div>

          {/* Dasha Card */}
          <div className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center gap-2.5 text-brand-maroon">
              <Briefcase className="h-4.5 w-4.5 text-brand-maroon" />
              <h3 className="font-display text-h3 text-text-primary">Active Vimshottari Cycle Guidelines</h3>
            </div>
            {activeMaha ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  You are currently under the major planetary influence of <strong className="capitalize">{activeMaha} Maha Dasha</strong>{activeAntar && <> and <strong className="capitalize">{activeAntar} Antar Dasha</strong></>}.
                </p>
                {dashaText && (
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {dashaText}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Dasha periods aren't available for this chart yet. Open it and Recalculate to populate the Vimshottari timeline.
              </p>
            )}
            <div className="mt-4 border-t border-hairline-subtle/50 pt-4 flex items-center justify-between text-xs text-text-tertiary">
              <span>Timeline viewable in the full Dasha matrix.</span>
              <Link to={`/app/chart/${activeProfile.id}/dashas`} className="inline-flex items-center gap-1 text-brand-maroon font-semibold hover:underline">
                View Dasha Timeline <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Quick Actions Grid */}
      <section className="mt-8">
        <h3 className="font-display text-h3 text-text-primary mb-4">Quick Research Shortcuts</h3>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Link to="/app/compatibility" className="group rounded-md border border-hairline-subtle bg-surface p-5 hover:border-brand-saffron/40 hover:shadow-sm transition-all">
            <Users className="h-5 w-5 text-brand-saffron mb-2.5 group-hover:scale-105 transition-transform" />
            <div className="font-display text-sm font-semibold text-text-primary">Kundli Milan</div>
            <p className="text-xs text-text-tertiary mt-1">36-point relationship matching engine.</p>
          </Link>
          
          <Link to={`/app/chart/${activeProfile.id}/transits`} className="group rounded-md border border-hairline-subtle bg-surface p-5 hover:border-brand-saffron/40 hover:shadow-sm transition-all">
            <Compass className="h-5 w-5 text-brand-saffron mb-2.5 group-hover:scale-105 transition-transform" />
            <div className="font-display text-sm font-semibold text-text-primary">Transit Bi-Wheel</div>
            <p className="text-xs text-text-tertiary mt-1">Overlay today's sky over your natal chart.</p>
          </Link>

          <Link to={`/app/chart/${activeProfile.id}`} className="group rounded-md border border-hairline-subtle bg-surface p-5 hover:border-brand-saffron/40 hover:shadow-sm transition-all">
            <Calendar className="h-5 w-5 text-brand-saffron mb-2.5 group-hover:scale-105 transition-transform" />
            <div className="font-display text-sm font-semibold text-text-primary">Natal Kundli</div>
            <p className="text-xs text-text-tertiary mt-1">Open full natal charts, aspects, and D1/D9.</p>
          </Link>

          <Link to={`/app/chart/${activeProfile.id}/remedies`} className="group rounded-md border border-hairline-subtle bg-surface p-5 hover:border-brand-saffron/40 hover:shadow-sm transition-all">
            <ShieldCheck className="h-5 w-5 text-brand-saffron mb-2.5 group-hover:scale-105 transition-transform" />
            <div className="font-display text-sm font-semibold text-text-primary">Remedies & Gems</div>
            <p className="text-xs text-text-tertiary mt-1">Astrological recommendations and gemstone guides.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
