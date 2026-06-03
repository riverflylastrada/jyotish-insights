import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users, Heart, Sparkles, HelpCircle, ArrowRight, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getAstroProvider } from '@/lib/astro/factory';
import { computeSouthIndianMatch, type SouthIndianMatchResult } from '@/lib/astro/south_indian_match';
import { computeGunMilan, getNakshatraIndex } from '@/lib/astro/gun_milan';

interface SavedChart {
  id: string;
  name: string;
  birth_details: any;
  snapshot: any;
}

const RASHI_NAMES = [
  "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)", "Simha (Leo)", "Kanya (Virgo)",
  "Tula (Libra)", "Vrischika (Scorpio)", "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)"
];

export default function Compatibility() {
  const [charts, setCharts] = useState<SavedChart[] | null>(null);
  const [chart1Id, setChart1Id] = useState<string>('');
  const [chart2Id, setChart2Id] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any | null>(null);
  const [southResult, setSouthResult] = useState<SouthIndianMatchResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ashta-koota');

  useEffect(() => {
    async function loadCharts() {
      try {
        const { data, error } = await supabase
          .from('charts')
          .select('id, name, birth_details, snapshot')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const loaded = (data ?? []) as SavedChart[];
        setCharts(loaded);
        if (loaded.length >= 2) {
          setChart1Id(loaded[0].id);
          setChart2Id(loaded[1].id);
        }
      } catch (e: any) {
        toast.error("Failed to load charts: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    loadCharts();
  }, []);

  const calculateCompatibility = async () => {
    if (!chart1Id || !chart2Id) {
      toast.error("Select two charts to perform Milan");
      return;
    }
    if (chart1Id === chart2Id) {
      toast.error("Please select two different charts");
      return;
    }

    let groom = charts?.find(c => c.id === chart1Id);
    let bride = charts?.find(c => c.id === chart2Id);

    if (!groom || !bride) {
      toast.error("Error loading selected charts");
      return;
    }

    // Resolve each chart's natal Moon, computing the kundli on the fly when the
    // saved snapshot lacks one. We never fall back to placeholder values — a
    // fabricated Moon would yield a confident but meaningless match score.
    const resolveMoon = async (chart: SavedChart) => {
      const moonOf = (snap: any) =>
        snap?.divisionalCharts?.find((c: any) => c.varga === 'D1')?.planets?.find((p: any) => p.planet === 'moon');
      let moon = moonOf(chart.snapshot);
      if (!moon) {
        try {
          toast.info(`Computing birth chart for ${chart.name}…`);
          const fresh = await getAstroProvider().generateKundli(chart.birth_details);
          chart.snapshot = fresh;
          void supabase.from('charts').update({ snapshot: fresh as unknown as never }).eq('id', chart.id);
          moon = moonOf(fresh);
        } catch (err) {
          console.error(`Failed to compute snapshot for ${chart.name}:`, err);
        }
      }
      return moon?.nakshatra && moon?.signNumber ? moon : null;
    };

    const gMoon = await resolveMoon(groom);
    const bMoon = await resolveMoon(bride);
    if (!gMoon || !bMoon) {
      toast.error('Could not determine the Moon for one of the charts. Open it and Recalculate, then try again.');
      return;
    }

    const gNakName = gMoon.nakshatra;
    const bNakName = bMoon.nakshatra;
    const gRashiNum = gMoon.signNumber;
    const bRashiNum = bMoon.signNumber;
    const gNakIdx = getNakshatraIndex(gNakName);
    const bNakIdx = getNakshatraIndex(bNakName);

    // ── 8-Koota scoring: delegated to shared gun_milan module (no rule drift) ──
    const milan = computeGunMilan(gNakName, gRashiNum, bNakName, bRashiNum);
    const { total } = milan;
    let category = "Poor";
    let color = "text-semantic-negative bg-semantic-negative/10 border-semantic-negative/30";
    if (total >= 28) {
      category = "Excellent (Highly Auspicious)";
      color = "text-semantic-positive bg-semantic-positive/10 border-semantic-positive/30";
    } else if (total >= 18) {
      category = "Good (Recommended)";
      color = "text-brand-saffron bg-brand-saffron/10 border-brand-saffron/30";
    } else if (total >= 14) {
      category = "Average (Requires Remedies)";
      color = "text-brand-gold bg-brand-gold/10 border-brand-gold/30";
    }

    setResult({
      groom: { name: groom.name, nakshatra: gNakName, rashi: RASHI_NAMES[gRashiNum - 1] },
      bride: { name: bride.name, nakshatra: bNakName, rashi: RASHI_NAMES[bRashiNum - 1] },
      total,
      category,
      color,
      breakdown: milan.kootas.map(k => {
        const s = k.scored;
        const statusMap: Record<string, string> = {
          Varna:         s === 1 ? "Perfect Match" : "Imbalanced",
          Vasya:         s === 2 ? "Excellent" : s > 0 ? "Neutral" : "Averse",
          Tara:          s === 3 ? "Highly Auspicious" : s > 0 ? "Fair" : "Challenging",
          Yoni:          s === 4 ? "Perfect Yoni Match" : s === 3 ? "Friendly" : s === 2 ? "Neutral" : "Enmity",
          "Graha Maitri": s === 5 ? "Best Friends" : s >= 3 ? "Good Harmony" : "Conflict/Disharmony",
          Gana:          s === 6 ? "Perfect Harmony" : s === 5 ? "Compatible" : s === 1 ? "Incompatible" : "Gana Dosha",
          Bhakoot:       s === 7 ? "Blessed" : "Bhakoot Dosha",
          Nadi:          s === 8 ? "Perfect Health Match" : "Nadi Dosha (Genetic Warning)",
        };
        return {
          name: k.name + " (" + k.nameHi + ")",
          max: k.max,
          scored: k.scored,
          desc: k.description,
          status: statusMap[k.name] ?? "",
        };
      }),
    });

    // South Indian 10 Porutham
    const groomPada = gMoon.nakshatraPada ?? 1;
    const bridePada = bMoon.nakshatraPada ?? 1;
    const southMatch = computeSouthIndianMatch(gNakIdx, groomPada, bNakIdx, bridePada);
    setSouthResult(southMatch);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-saffron" />
        <p className="mt-4 text-text-secondary font-display">Parsing birth coordinates and loading libraries...</p>
      </div>
    );
  }

  if (!charts || charts.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-12 shadow-sm">
          <Users className="mx-auto h-12 w-12 text-text-tertiary" />
          <h2 className="mt-4 font-display text-h2 text-text-primary">Library contains {charts?.length || 0} charts</h2>
          <p className="mt-2 text-body text-text-tertiary max-w-md mx-auto">
            Vedic Kundli Milan (Relationship compatibility) requires at least two saved charts in your library.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/app/new" className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-brand-saffron-hover transition-colors shadow-sm">
              Cast a new chart <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="text-eyebrow text-brand-saffron flex items-center gap-1.5">
        <Heart className="h-3.5 w-3.5 fill-brand-saffron" /> Relationship Compatibility
      </div>
      <h1 className="mt-2 font-display text-h1 text-text-primary">Kundli Milan</h1>
      <p className="mt-2 text-body text-text-secondary">
        Select two natal charts from your saved research archives to compute marriage compatibility.
      </p>

      {/* Selectors Panel */}
      <div className="mt-8 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              First Chart (Groom / Partner 1)
            </label>
            <select
              value={chart1Id}
              onChange={(e) => { setChart1Id(e.target.value); setResult(null); setSouthResult(null); }}
              className="mt-2 block w-full rounded-sm border border-hairline-subtle bg-elevated px-3 py-2 text-sm text-text-primary focus:border-brand-saffron focus:outline-none"
            >
              {charts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.birth_details?.dateOfBirth})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Second Chart (Bride / Partner 2)
            </label>
            <select
              value={chart2Id}
              onChange={(e) => { setChart2Id(e.target.value); setResult(null); setSouthResult(null); }}
              className="mt-2 block w-full rounded-sm border border-hairline-subtle bg-elevated px-3 py-2 text-sm text-text-primary focus:border-brand-saffron focus:outline-none"
            >
              {charts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.birth_details?.dateOfBirth})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={calculateCompatibility}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-brand-maroon py-3 text-sm font-semibold text-primary-foreground hover:bg-brand-maroon/90 transition-colors shadow"
        >
          <Sparkles className="h-4 w-4 text-brand-gold animate-pulse" /> Compute Match Score
        </button>
      </div>

      {/* Tab Switcher */}
      {(result || southResult) && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ashta-koota">Ashta Koota (North Indian)</TabsTrigger>
            <TabsTrigger value="south-porutham">South Indian (10 Porutham)</TabsTrigger>
          </TabsList>

      {/* Ashta Koota Results */}
      <TabsContent value="ashta-koota">
      {result && (
        <div className="mt-8 space-y-8 animate-in fade-in duration-500">
          {/* Main Dial and Card */}
          <div className="grid gap-6 md:grid-cols-12">
            {/* Dial */}
            <div className="md:col-span-4 rounded-md border border-hairline-subtle bg-surface p-6 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="text-eyebrow text-text-tertiary">Total Score</div>
              <div className="relative mt-6 flex h-40 w-40 items-center justify-center rounded-full border-4 border-hairline-subtle">
                {/* SVG Radial circle decoration */}
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    fill="transparent"
                    stroke="hsl(var(--brand-maroon) / 0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    fill="transparent"
                    stroke="hsl(var(--brand-maroon))"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 72}
                    strokeDashoffset={2 * Math.PI * 72 * (1 - result.total / 36)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="text-center z-10">
                  <span className="font-display text-4xl font-bold text-text-primary">{result.total}</span>
                  <span className="text-sm text-text-muted"> / 36</span>
                </div>
              </div>
              <div className={`mt-6 px-4 py-1.5 rounded-full border text-xs font-semibold ${result.color}`}>
                {result.category}
              </div>
            </div>

            {/* Overview */}
            <div className="md:col-span-8 rounded-md border border-hairline-subtle bg-surface p-6 flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="font-display text-h2 text-text-primary">Compatibility Synthesis</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  Based on ancient Vedic calculations, the matching of <strong>{result.groom.name}</strong> ({result.groom.nakshatra} Nakshatra) and <strong>{result.bride.name}</strong> ({result.bride.nakshatra} Nakshatra) scores <strong>{result.total}</strong> out of 36 points.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {result.total >= 28 ? (
                    "This is an extraordinary match with strong alignment across emotional, mental, and spiritual planes. The high score promises great domestic peace, natural understanding, and shared prosperity."
                  ) : result.total >= 18 ? (
                    "This combination is highly viable and recommended for long-term commitment. There are minor friction areas, but the key foundations like Graha Maitri and Nadi are healthy, indicating successful adaptations."
                  ) : result.total >= 14 ? (
                    "The matching is moderate and could require conscious efforts. Certain Doshas might be present (such as Nadi or Bhakoot). Recommending dedicated mantras and lifestyle alignments before final union."
                  ) : (
                    "The compatibility is low. Core emotional or health parameters might be afflicted. Please consult a professional advisor to understand specific remediation paths or check matching details below."
                  )}
                </p>
              </div>

              {/* Quick Info Bar */}
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline-subtle pt-6">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Groom Star / Moon Sign</span>
                  <div className="mt-1 font-display text-sm font-semibold text-text-primary">{result.groom.nakshatra} ({result.groom.rashi})</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Bride Star / Moon Sign</span>
                  <div className="mt-1 font-display text-sm font-semibold text-text-primary">{result.bride.nakshatra} ({result.bride.rashi})</div>
                </div>
              </div>
            </div>
          </div>

          {/* Accordion Table Breakdowns */}
          <div>
            <h3 className="font-display text-h3 text-text-primary mb-4">Detailed Ashta Koota Breakdown</h3>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {result.breakdown.map((item: any, idx: number) => {
                const isZero = item.scored === 0;
                return (
                  <AccordionItem
                    key={idx}
                    value={`item-${idx}`}
                    className="border border-hairline-subtle bg-surface rounded-md overflow-hidden"
                  >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline">
                      <div className="flex w-full items-center justify-between text-left pr-4">
                        <div>
                          <div className="font-display text-sm font-semibold text-text-primary">{item.name}</div>
                          <div className="text-xs text-text-muted mt-0.5">{item.status}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isZero && (
                            <span className="flex items-center gap-1 rounded bg-semantic-negative/10 border border-semantic-negative/20 px-2 py-0.5 text-[10px] font-bold text-semantic-negative uppercase">
                              <ShieldAlert className="h-3 w-3" /> Dosha/Afflicted
                            </span>
                          )}
                          <div className="font-mono text-sm font-bold text-text-primary">
                            <span className={isZero ? "text-semantic-negative" : "text-brand-saffron"}>{item.scored}</span>
                            <span className="text-text-muted font-normal"> / {item.max}</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-1 text-sm text-text-secondary border-t border-hairline-subtle/50 leading-relaxed bg-canvas/30">
                      {item.desc}
                      <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>This Koota accounts for {((item.max / 36) * 100).toFixed(0)}% of the total relationship score.</span>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      )}
      </TabsContent>

      {/* South Indian 10 Porutham Results */}
      <TabsContent value="south-porutham">
      {southResult && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Score Dial and Summary */}
          <div className="grid gap-6 md:grid-cols-12">
            {/* Dial */}
            <div className="md:col-span-4 rounded-md border border-hairline-subtle bg-surface p-6 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="text-eyebrow text-text-tertiary">Poruthams Met</div>
              <div className="relative mt-6 flex h-40 w-40 items-center justify-center rounded-full border-4 border-hairline-subtle">
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                  <circle
                    cx="80" cy="80" r="72" fill="transparent"
                    stroke="hsl(var(--brand-maroon) / 0.1)" strokeWidth="8"
                  />
                  <circle
                    cx="80" cy="80" r="72" fill="transparent"
                    stroke="hsl(var(--brand-maroon))" strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 72}
                    strokeDashoffset={2 * Math.PI * 72 * (1 - southResult.metCount / southResult.total)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="text-center z-10">
                  <span className="font-display text-4xl font-bold text-text-primary">{southResult.metCount}</span>
                  <span className="text-sm text-text-muted"> / {southResult.total}</span>
                </div>
              </div>
              <div className={`mt-6 px-4 py-1.5 rounded-full border text-xs font-semibold ${
                southResult.metCount >= 8
                  ? 'text-semantic-positive bg-semantic-positive/10 border-semantic-positive/30'
                  : southResult.metCount >= 6
                    ? 'text-brand-saffron bg-brand-saffron/10 border-brand-saffron/30'
                    : southResult.metCount >= 4
                      ? 'text-brand-gold bg-brand-gold/10 border-brand-gold/30'
                      : 'text-semantic-negative bg-semantic-negative/10 border-semantic-negative/30'
              }`}>
                {southResult.verdict.split('—')[0].trim()}
              </div>
            </div>

            {/* Overview */}
            <div className="md:col-span-8 rounded-md border border-hairline-subtle bg-surface p-6 flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="font-display text-h2 text-text-primary">10 Porutham Synthesis</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {southResult.verdict}
                </p>
                <p className="mt-2 text-xs text-text-tertiary italic">
                  {southResult.citation}
                </p>
              </div>

              {result && (
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline-subtle pt-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Groom Star / Moon Sign</span>
                    <div className="mt-1 font-display text-sm font-semibold text-text-primary">{result.groom.nakshatra} ({result.groom.rashi})</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Bride Star / Moon Sign</span>
                    <div className="mt-1 font-display text-sm font-semibold text-text-primary">{result.bride.nakshatra} ({result.bride.rashi})</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Porutham Checklist */}
          <div>
            <h3 className="font-display text-h3 text-text-primary mb-4">Detailed 10-Porutham Breakdown</h3>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {southResult.poruthams.map((p, idx) => (
                <AccordionItem
                  key={idx}
                  value={`south-${idx}`}
                  className="border border-hairline-subtle bg-surface rounded-md overflow-hidden"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline">
                    <div className="flex w-full items-center justify-between text-left pr-4">
                      <div className="flex items-center gap-3">
                        {p.met
                          ? <CheckCircle2 className="h-5 w-5 text-semantic-positive flex-shrink-0" />
                          : <XCircle className="h-5 w-5 text-semantic-negative flex-shrink-0" />}
                        <div>
                          <div className="font-display text-sm font-semibold text-text-primary">
                            {p.name} <span className="text-text-tertiary font-normal">({p.nameTamil})</span>
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">{p.met ? 'Met' : 'Not Met'}</div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-1 text-sm text-text-secondary border-t border-hairline-subtle/50 leading-relaxed bg-canvas/30">
                    <p>{p.reason}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>{p.citation}</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      )}
      {!southResult && result && (
        <div className="rounded-md border border-dashed border-hairline-subtle bg-surface p-12 text-center shadow-sm">
          <p className="text-text-tertiary text-sm">Press "Compute Match Score" above to calculate the South Indian 10-Porutham compatibility.</p>
        </div>
      )}
      </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
