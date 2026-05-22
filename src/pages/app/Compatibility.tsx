import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users, Heart, Sparkles, HelpCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { getAstroProvider } from '@/lib/astro/factory';

interface SavedChart {
  id: string;
  name: string;
  birth_details: any;
  snapshot: any;
}

// 27 Nakshatras in order
const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

// Rashi Lords (1-based index matching signNumber)
const RASHI_LORDS: Record<number, string> = {
  1: 'mars',    // Aries
  2: 'venus',   // Taurus
  3: 'mercury', // Gemini
  4: 'moon',    // Cancer
  5: 'sun',     // Leo
  6: 'mercury', // Virgo
  7: 'venus',   // Libra
  8: 'mars',    // Scorpio
  9: 'jupiter', // Sagittarius
  10: 'saturn', // Capricorn
  11: 'saturn', // Aquarius
  12: 'jupiter' // Pisces
};

const RASHI_NAMES = [
  "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)", "Simha (Leo)", "Kanya (Virgo)",
  "Tula (Libra)", "Vrischika (Scorpio)", "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)"
];

// Nadi: 1 = Adi, 2 = Madhya, 3 = Antya
const NAKSHATRA_NADI: Record<string, number> = {
  ashwini: 1, bharani: 2, krittika: 3, rohini: 3, mrigashira: 2, ardra: 1, punarvasu: 1, pushya: 2, ashlesha: 3,
  magha: 3, purvaphalguni: 2, uttaraphalguni: 1, hasta: 1, chitra: 2, swati: 3, vishakha: 3, anuradha: 2, jyeshtha: 1,
  mula: 1, purvaashadha: 2, uttaraashadha: 3, shravana: 3, dhanishta: 2, shatabhisha: 1, purvabhadrapada: 1, uttarabhadrapada: 2, revati: 3
};

// Gana: 1 = Deva, 2 = Manushya, 3 = Rakshasa
const NAKSHATRA_GANA: Record<string, number> = {
  ashwini: 1, bharani: 2, krittika: 3, rohini: 2, mrigashira: 1, ardra: 2, punarvasu: 1, pushya: 1, ashlesha: 3,
  magha: 3, purvaphalguni: 2, uttaraphalguni: 2, hasta: 1, chitra: 2, swati: 1, vishakha: 3, anuradha: 1, jyeshtha: 3,
  mula: 3, purvaashadha: 2, uttaraashadha: 2, shravana: 1, dhanishta: 3, shatabhisha: 3, purvabhadrapada: 2, uttarabhadrapada: 2, revati: 1
};

// Yoni (Animals)
const NAKSHATRA_YONI: Record<string, string> = {
  ashwini: "Horse", bharani: "Elephant", krittika: "Sheep", rohini: "Serpent", mrigashira: "Serpent",
  ardra: "Dog", punarvasu: "Cat", pushya: "Sheep", ashlesha: "Cat", magha: "Rat",
  purvaphalguni: "Rat", uttaraphalguni: "Cow", hasta: "Buffalo", chitra: "Tiger", swati: "Buffalo",
  vishakha: "Tiger", anuradha: "Deer", jyeshtha: "Deer", mula: "Dog", purvaashadha: "Monkey",
  uttaraashadha: "Mongoose", shravana: "Monkey", dhanishta: "Lion", shatabhisha: "Horse",
  purvabhadrapada: "Lion", uttarabhadrapada: "Cow", revati: "Elephant"
};

// Yoni friendliness matrix (Same animal = 4, Friendly = 3, Neutral = 2, Unfriendly = 1, Enemy = 0)
const YONI_FRIENDS: Record<string, string[]> = {
  Horse: ["Elephant", "Monkey"],
  Elephant: ["Horse", "Sheep", "Buffalo"],
  Sheep: ["Elephant", "Cow", "Deer"],
  Serpent: ["Cat", "Rat", "Deer"],
  Dog: ["Cat", "Monkey"],
  Cat: ["Serpent", "Dog", "Rat"],
  Rat: ["Cat", "Serpent", "Monkey"],
  Cow: ["Sheep", "Buffalo", "Deer"],
  Buffalo: ["Elephant", "Cow", "Horse"],
  Tiger: ["Lion"],
  Deer: ["Sheep", "Serpent", "Cow"],
  Monkey: ["Horse", "Dog", "Rat"],
  Lion: ["Tiger"],
  Mongoose: ["Deer", "Cat"]
};

const YONI_ENEMIES: Record<string, string> = {
  Horse: "Buffalo",
  Elephant: "Lion",
  Sheep: "Monkey",
  Serpent: "Mongoose",
  Dog: "Deer",
  Cat: "Rat",
  Cow: "Tiger"
};

const YONI_UNFRIENDLY: Record<string, string[]> = {
  Horse: ["Dog", "Cat", "Rat", "Tiger", "Lion", "Mongoose"],
  Elephant: ["Dog", "Cat", "Rat", "Tiger", "Lion", "Mongoose"],
  Sheep: ["Dog", "Cat", "Rat", "Tiger", "Lion", "Mongoose"],
  Serpent: ["Dog", "Tiger", "Lion", "Mongoose"],
  Dog: ["Horse", "Elephant", "Sheep", "Serpent", "Cow", "Buffalo", "Tiger", "Lion", "Mongoose"],
  Cat: ["Horse", "Elephant", "Sheep", "Cow", "Buffalo", "Tiger", "Lion", "Mongoose"],
  Rat: ["Horse", "Elephant", "Sheep", "Cow", "Buffalo", "Tiger", "Lion", "Mongoose"],
  Cow: ["Dog", "Cat", "Rat", "Buffalo", "Tiger", "Mongoose"],
  Buffalo: ["Dog", "Cat", "Rat", "Cow", "Tiger", "Mongoose"],
  Tiger: ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Mongoose"],
  Lion: ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Mongoose"],
  Mongoose: ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Lion"]
};


// Planetary relationships
const PLANET_RELATIONSHIPS: Record<string, { friends: string[], enemies: string[], neutrals: string[] }> = {
  sun: { friends: ["moon", "mars", "jupiter"], enemies: ["venus", "saturn"], neutrals: ["mercury"] },
  moon: { friends: ["sun", "mercury"], enemies: [], neutrals: ["mars", "jupiter", "venus", "saturn"] },
  mars: { friends: ["sun", "moon", "jupiter"], enemies: ["mercury"], neutrals: ["venus", "saturn"] },
  mercury: { friends: ["sun", "venus"], enemies: ["moon"], neutrals: ["mars", "jupiter", "saturn"] },
  jupiter: { friends: ["sun", "moon", "mars"], enemies: ["mercury", "venus"], neutrals: ["saturn"] },
  venus: { friends: ["mercury", "saturn"], enemies: ["sun", "moon"], neutrals: ["mars", "jupiter"] },
  saturn: { friends: ["mercury", "venus"], enemies: ["sun", "moon", "mars"], neutrals: ["jupiter"] }
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function getNakshatraIndex(nakName: string): number {
  const norm = normalizeName(nakName);
  for (let i = 0; i < NAKSHATRAS.length; i++) {
    if (normalizeName(NAKSHATRAS[i]).includes(norm) || norm.includes(normalizeName(NAKSHATRAS[i]))) {
      return i + 1;
    }
  }
  return 1; // Default fallback
}

export default function Compatibility() {
  const [charts, setCharts] = useState<SavedChart[] | null>(null);
  const [chart1Id, setChart1Id] = useState<string>('');
  const [chart2Id, setChart2Id] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    async function loadCharts() {
      try {
        const { data, error } = await supabase
          .from('charts')
          .select('id, name, birth_details, snapshot')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Ensure snapshots exist, otherwise filter or fall back to mock
        const validCharts = (data ?? []).map(c => {
          if (!c.snapshot) {
            // Generate simple mock snapshot if empty
            c.snapshot = {
              isFallback: true,
              birthDetails: c.birth_details,
              divisionalCharts: [
                {
                  varga: 'D1',
                  ascendantSign: 8,
                  planets: [
                    { planet: 'moon', signNumber: 4, nakshatra: 'Ashlesha', signDegree: 18.7, houseNumber: 9 }
                  ]
                }
              ]
            };
          }
          return c;
        });

        setCharts(validCharts);
        if (validCharts.length >= 2) {
          setChart1Id(validCharts[0].id);
          setChart2Id(validCharts[1].id);
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

    // Check if either is using a fallback mock, and calculate real coordinates on the fly!
    let updatedCharts = [...(charts || [])];
    let needsUpdate = false;

    if (groom.snapshot?.isFallback) {
      try {
        toast.info(`Computing birth chart details for ${groom.name}...`);
        const fresh = await getAstroProvider().generateKundli(groom.birth_details);
        groom.snapshot = fresh;
        needsUpdate = true;
        // cache back to Supabase
        void supabase.from('charts').update({ snapshot: fresh as unknown as never }).eq('id', groom.id);
      } catch (err) {
        console.error("Failed to dynamically compute groom snapshot:", err);
      }
    }

    if (bride.snapshot?.isFallback) {
      try {
        toast.info(`Computing birth chart details for ${bride.name}...`);
        const fresh = await getAstroProvider().generateKundli(bride.birth_details);
        bride.snapshot = fresh;
        needsUpdate = true;
        // cache back to Supabase
        void supabase.from('charts').update({ snapshot: fresh as unknown as never }).eq('id', bride.id);
      } catch (err) {
        console.error("Failed to dynamically compute bride snapshot:", err);
      }
    }

    if (needsUpdate) {
      setCharts(updatedCharts);
    }

    // Extract D1 Moon details
    const getMoonPos = (chart: SavedChart) => {
      const d1 = chart.snapshot?.divisionalCharts?.find((c: any) => c.varga === 'D1');
      const moon = d1?.planets?.find((p: any) => p.planet === 'moon') || {
        nakshatra: 'Ashlesha',
        signNumber: 4,
        signDegree: 15
      };
      return moon;
    };

    const gMoon = getMoonPos(groom);
    const bMoon = getMoonPos(bride);

    const gNakName = gMoon.nakshatra || 'Ashlesha';
    const bNakName = bMoon.nakshatra || 'Ashlesha';
    const gRashiNum = gMoon.signNumber || 4;
    const bRashiNum = bMoon.signNumber || 4;

    const gNakIdx = getNakshatraIndex(gNakName);
    const bNakIdx = getNakshatraIndex(bNakName);

    const gNorm = normalizeName(gNakName);
    const bNorm = normalizeName(bNakName);

    // Kootas Calculations
    
    // 1. Varna (1 Point)
    // Brahmin (4), Kshatriya (3), Vaishya (2), Shudra (1)
    const getVarna = (rashi: number) => {
      if ([4, 8, 12].includes(rashi)) return { name: "Brahmin (Spiritual/Intuitive)", score: 4 };
      if ([1, 5, 9].includes(rashi)) return { name: "Kshatriya (Noble/Leader)", score: 3 };
      if ([2, 6, 10].includes(rashi)) return { name: "Vaishya (Merchant/Practical)", score: 2 };
      return { name: "Shudra (Service/Creative)", score: 1 }; // [3, 7, 11]
    };
    const gVarna = getVarna(gRashiNum);
    const bVarna = getVarna(bRashiNum);
    const varnaPoints = gVarna.score >= bVarna.score ? 1 : 0;

    // 2. Vasya (2 Points)
    // 1 = Chatushpada, 2 = Manushya, 3 = Jalachara, 4 = Vanachara, 5 = Keeta
    const getVasyaType = (rashi: number) => {
      if ([1, 2, 9].includes(rashi)) return { name: "Chatushpada (Quadrupedal)", type: 1 };
      if (rashi === 5) return { name: "Vanachara (Wild)", type: 4 };
      if (rashi === 8) return { name: "Keeta (Insect)", type: 5 };
      if ([4, 10, 12].includes(rashi)) return { name: "Jalachara (Water-dwelling)", type: 3 };
      return { name: "Manushya (Human)", type: 2 }; // 3, 6, 7, 11
    };
    const gVasya = getVasyaType(gRashiNum);
    const bVasya = getVasyaType(bRashiNum);
    // Vasya matrix: Bride (rows) \ Groom (columns)
    // 1 = Chatushpada, 2 = Manushya, 3 = Jalachara, 4 = Vanachara, 5 = Keeta
    const VASYA_MATRIX: Record<number, Record<number, number>> = {
      1: { 1: 2, 2: 1,   3: 1,   4: 1.5, 5: 1 }, // Row 1: Bride Chatushpada
      2: { 1: 1, 2: 2,   3: 1.5, 4: 0,   5: 1 }, // Row 2: Bride Nara/Manushya
      3: { 1: 1, 2: 1.5, 3: 2,   4: 1,   5: 1 }, // Row 3: Bride Jalachara
      4: { 1: 0, 2: 0,   3: 0,   4: 2,   5: 0 }, // Row 4: Bride Vanachara
      5: { 1: 1, 2: 1,   3: 1,   4: 0,   5: 2 }  // Row 5: Bride Keeta
    };

    const vasyaPoints = VASYA_MATRIX[bVasya.type]?.[gVasya.type] ?? 0;

    // 3. Tara (3 Points)
    // Distance from groom to bride and vice versa
    const t1 = (bNakIdx - gNakIdx + 27) % 9;
    const t2 = (gNakIdx - bNakIdx + 27) % 9;
    const auspiciousTara = [0, 1, 3, 5, 7, 8]; // Janma (0), Sampat (1), Kshema (3), Sadhaka (5), Mitra (7), Adhimitra (8)
    const gTaraOk = auspiciousTara.includes(t1);
    const bTaraOk = auspiciousTara.includes(t2);
    let taraPoints = 0;
    if (gTaraOk && bTaraOk) taraPoints = 3;
    else if (gTaraOk || bTaraOk) taraPoints = 1.5;

    // 4. Yoni (4 Points)
    const gYoni = NAKSHATRA_YONI[gNorm] || "Serpent";
    const bYoni = NAKSHATRA_YONI[bNorm] || "Serpent";
    let yoniPoints = 1;
    if (gYoni === bYoni) {
      yoniPoints = 4;
    } else if (YONI_ENEMIES[gYoni] === bYoni || YONI_ENEMIES[bYoni] === gYoni) {
      yoniPoints = 0;
    } else if (YONI_FRIENDS[gYoni]?.includes(bYoni) || YONI_FRIENDS[bYoni]?.includes(gYoni)) {
      yoniPoints = 3;
    } else if (YONI_UNFRIENDLY[gYoni]?.includes(bYoni) || YONI_UNFRIENDLY[bYoni]?.includes(gYoni)) {
      yoniPoints = 1;
    } else {
      yoniPoints = 2; // Neutral
    }

    // 5. Graha Maitri (5 Points)
    const gLord = RASHI_LORDS[gRashiNum] || 'moon';
    const bLord = RASHI_LORDS[bRashiNum] || 'moon';
    let grahaPoints = 0;
    if (gLord === bLord) {
      grahaPoints = 5;
    } else {
      const gRel = PLANET_RELATIONSHIPS[gLord];
      const bRel = PLANET_RELATIONSHIPS[bLord];
      const gIsFriend = gRel?.friends.includes(bLord);
      const bIsFriend = bRel?.friends.includes(gLord);
      const gIsEnemy = gRel?.enemies.includes(bLord);
      const bIsEnemy = bRel?.enemies.includes(gLord);

      if (gIsFriend && bIsFriend) grahaPoints = 5;
      else if ((gIsFriend && !gIsEnemy && !bIsEnemy) || (bIsFriend && !gIsEnemy && !bIsEnemy)) grahaPoints = 4;
      else if (!gIsEnemy && !bIsEnemy) grahaPoints = 3;
      else if ((gIsFriend && bIsEnemy) || (bIsFriend && gIsEnemy)) grahaPoints = 1;
      else grahaPoints = 0;
    }

    // 6. Gana (6 Points)
    // Deva = 1, Manushya = 2, Rakshasa = 3
    const gGana = NAKSHATRA_GANA[gNorm] || 2;
    const bGana = NAKSHATRA_GANA[bNorm] || 2;
    const getGanaName = (g: number) => g === 1 ? "Deva (Divine/Compassionate)" : g === 2 ? "Manushya (Human/Empathetic)" : "Rakshasa (Bold/Assertive)";
    let ganaPoints = 0;
    if (gGana === bGana) ganaPoints = 6;
    else if ((gGana === 1 && bGana === 2) || (gGana === 2 && bGana === 1)) ganaPoints = 5;
    else if ((gGana === 1 && bGana === 3) || (gGana === 3 && bGana === 1)) ganaPoints = 1;
    else ganaPoints = 0; // Manushya + Rakshasa

    // 7. Bhakoot (7 Points)
    // Distance in signs (1-based, from 1 to 12)
    const diff = (bRashiNum - gRashiNum + 12) % 12;
    const bDist = diff + 1;
    
    // Inauspicious Bhakoot in 1-based counting: 2/12 (Dwirdwadashe), 5/9 (Navapancham), 6/8 (Shadashtak)
    const inauspiciousBhakoot = [2, 12, 5, 9, 6, 8];
    const isBhakootOk = !inauspiciousBhakoot.includes(bDist);
    const bhakootPoints = isBhakootOk ? 7 : 0;

    // 8. Nadi (8 Points)
    // 1 = Adi, 2 = Madhya, 3 = Antya
    const gNadi = NAKSHATRA_NADI[gNorm] || 1;
    const bNadi = NAKSHATRA_NADI[bNorm] || 2;
    const getNadiName = (n: number) => n === 1 ? "Adi (Vata - nervous energy)" : n === 2 ? "Madhya (Pitta - fire energy)" : "Antya (Kapha - heavy/grounded energy)";
    const nadiPoints = gNadi !== bNadi ? 8 : 0;

    const total = varnaPoints + vasyaPoints + taraPoints + yoniPoints + grahaPoints + ganaPoints + bhakootPoints + nadiPoints;

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
      breakdown: [
        { name: "Varna (Work & Ego)", max: 1, scored: varnaPoints, desc: `Groom: ${gVarna.name} · Bride: ${bVarna.name}. Matches intellectual and societal values.`, status: varnaPoints === 1 ? "Perfect Match" : "Imbalanced" },
        { name: "Vasya (Influence & Control)", max: 2, scored: vasyaPoints, desc: `Groom: ${gVasya.name} · Bride: ${bVasya.name}. Defines mutual attraction and control dynamic.`, status: vasyaPoints === 2 ? "Excellent" : vasyaPoints > 0 ? "Neutral" : "Averse" },
        { name: "Tara (Destiny & Compatibility)", max: 3, scored: taraPoints, desc: `Relationship longevity and cosmic alignment of birth stars.`, status: taraPoints === 3 ? "Highly Auspicious" : taraPoints > 0 ? "Fair" : "Challenging" },
        { name: "Yoni (Physical & Intimate)", max: 4, scored: yoniPoints, desc: `Groom: ${gYoni} · Bride: ${bYoni}. Depicts sexual compatibility, passion, and innate nature.`, status: yoniPoints === 4 ? "Perfect Yoni Match" : yoniPoints === 3 ? "Friendly" : yoniPoints === 2 ? "Neutral" : "Enmity" },
        { name: "Graha Maitri (Mental Friendship)", max: 5, scored: grahaPoints, desc: `Groom's lord (${gLord}) & Bride's lord (${bLord}). Evaluates emotional, intellectual, and life outlook alignment.`, status: grahaPoints === 5 ? "Best Friends" : grahaPoints >= 3 ? "Good Harmony" : "Conflict/Disharmony" },
        { name: "Gana (Temperament & Behavior)", max: 6, scored: ganaPoints, desc: `Groom: ${getGanaName(gGana)} · Bride: ${getGanaName(bGana)}. Mental compatibility, patience, and lifestyle.`, status: ganaPoints === 6 ? "Perfect Harmony" : ganaPoints === 5 ? "Compatible" : ganaPoints === 1 ? "Incompatible" : "Gana Dosha" },
        { name: "Bhakoot (Family & Fortune)", max: 7, scored: bhakootPoints, desc: `Rashi distance: ${bDist} houses apart. Direct influence on prosperity, offspring, and long-term peace.`, status: bhakootPoints === 7 ? "Blessed" : "Bhakoot Dosha" },
        { name: "Nadi (Physical & Genetic Health)", max: 8, scored: nadiPoints, desc: `Groom: ${getNadiName(gNadi)} · Bride: ${getNadiName(bNadi)}. Represents physical health, nerve energy, and genetic compatibility.`, status: nadiPoints === 8 ? "Perfect Health Match" : "Nadi Dosha (Genetic Warning)" }
      ]
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-saffron" />
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
      <h1 className="mt-2 font-display text-h1 text-text-primary">Ashta Koota Milan</h1>
      <p className="mt-2 text-body text-text-secondary">
        Select two natal charts from your saved research archives to run the legendary 36-point Jyotish compatibility engine.
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
              onChange={(e) => { setChart1Id(e.target.value); setResult(null); }}
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
              onChange={(e) => { setChart2Id(e.target.value); setResult(null); }}
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

      {/* Results View */}
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
                <h3 className="font-display text-h2 text-text-primary">Compatability Synthesis</h3>
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
    </div>
  );
}
