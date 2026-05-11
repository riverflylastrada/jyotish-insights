import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Gem, Sparkles, HandHeart, Flame, Leaf, BookOpen } from 'lucide-react';
import { useKundli } from '@/hooks/useKundli';
import { PLANET_LABELS, type PlanetName, type PlanetPosition } from '@/lib/astro/types';

type RemedyKind = 'gemstone' | 'mantra' | 'donation' | 'fast' | 'lifestyle';

interface PlanetRemedy {
  gemstone: { stone: string; metal: string; finger: string; weight: string; day: string };
  mantra:   { beej: string; vedic: string; count: number };
  donation: string[];
  fast:     { day: string; food: string };
  lifestyle: string[];
  deity:    string;
}

const REMEDY_BOOK: Record<Exclude<PlanetName, 'ascendant'>, PlanetRemedy> = {
  sun:     { gemstone: { stone: 'Ruby (Manik)',         metal: 'Gold',     finger: 'Ring',   weight: '3–5 ratti', day: 'Sunday' },
             mantra:   { beej: 'ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः', vedic: 'Aaditya Hridaya Stotra', count: 7000 },
             donation: ['Wheat', 'Jaggery', 'Copper vessel', 'Red cloth'],
             fast:     { day: 'Sunday', food: 'One meal, no salt after sunset' },
             lifestyle: ['Offer water to the rising Sun (Arghya)', 'Honour father and elders', 'Wake before sunrise'],
             deity: 'Lord Surya / Lord Vishnu' },
  moon:    { gemstone: { stone: 'Pearl (Moti)',         metal: 'Silver',   finger: 'Little', weight: '4–6 ratti', day: 'Monday' },
             mantra:   { beej: 'ॐ श्रां श्रीं श्रौं सः चन्द्रमसे नमः', vedic: 'Chandra Kavacham', count: 11000 },
             donation: ['Rice', 'Milk', 'White cloth', 'Silver'],
             fast:     { day: 'Monday', food: 'Milk and fruits only' },
             lifestyle: ['Drink water from a silver vessel', 'Honour mother', 'Avoid late-night screens'],
             deity: 'Lord Shiva / Goddess Parvati' },
  mars:    { gemstone: { stone: 'Red Coral (Moonga)',   metal: 'Copper',   finger: 'Ring',   weight: '6–10 ratti', day: 'Tuesday' },
             mantra:   { beej: 'ॐ क्रां क्रीं क्रौं सः भौमाय नमः', vedic: 'Hanuman Chalisa', count: 10000 },
             donation: ['Red lentils (masoor)', 'Red cloth', 'Copper', 'Jaggery'],
             fast:     { day: 'Tuesday', food: 'No salt; sweets to monkeys' },
             lifestyle: ['Recite Hanuman Chalisa daily', 'Practise restraint in speech and anger', 'Donate blood quarterly'],
             deity: 'Lord Hanuman / Lord Kartikeya' },
  mercury: { gemstone: { stone: 'Emerald (Panna)',      metal: 'Gold',     finger: 'Little', weight: '4–6 ratti', day: 'Wednesday' },
             mantra:   { beej: 'ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः', vedic: 'Vishnu Sahasranama', count: 9000 },
             donation: ['Green moong dal', 'Green cloth', 'Books to students', 'Bronze'],
             fast:     { day: 'Wednesday', food: 'Green vegetables, no rice' },
             lifestyle: ['Feed grass to cows', 'Speak truthfully and concisely', 'Avoid gossip and flattery'],
             deity: 'Lord Vishnu / Lord Ganesha' },
  jupiter: { gemstone: { stone: 'Yellow Sapphire (Pukhraj)', metal: 'Gold', finger: 'Index', weight: '4–7 ratti', day: 'Thursday' },
             mantra:   { beej: 'ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः', vedic: 'Sri Guru Stotra', count: 19000 },
             donation: ['Turmeric', 'Yellow lentils (chana dal)', 'Yellow cloth', 'Books on dharma'],
             fast:     { day: 'Thursday', food: 'Yellow food once; no salt' },
             lifestyle: ['Honour teachers (gurus) and Brahmins', 'Wear yellow on Thursday', 'Study sacred texts weekly'],
             deity: 'Lord Brihaspati / Lord Vishnu' },
  venus:   { gemstone: { stone: 'Diamond (Heera)',      metal: 'Platinum', finger: 'Middle', weight: '0.25–1 ct', day: 'Friday' },
             mantra:   { beej: 'ॐ द्रां द्रीं द्रौं सः शुक्राय नमः', vedic: 'Sri Suktam', count: 16000 },
             donation: ['White rice', 'Sugar', 'Curd', 'White cloth, perfumes'],
             fast:     { day: 'Friday', food: 'White food, dairy' },
             lifestyle: ['Honour the feminine; respect spouse', 'Practise an art form regularly', 'Avoid intoxication'],
             deity: 'Goddess Lakshmi / Goddess Saraswati' },
  saturn:  { gemstone: { stone: 'Blue Sapphire (Neelam)', metal: 'Iron / Panchadhatu', finger: 'Middle', weight: '4–6 ratti', day: 'Saturday' },
             mantra:   { beej: 'ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः', vedic: 'Dasaratha Shani Stotra', count: 23000 },
             donation: ['Black sesame', 'Mustard oil', 'Black cloth', 'Iron, leather shoes'],
             fast:     { day: 'Saturday', food: 'One meal, salty allowed' },
             lifestyle: ['Serve labourers and the elderly', 'Visit Shani temple on Saturdays', 'Honour discipline and routine'],
             deity: 'Lord Shani / Lord Hanuman' },
  rahu:    { gemstone: { stone: 'Hessonite (Gomedha)',  metal: 'Silver',   finger: 'Middle', weight: '5–7 ratti', day: 'Saturday' },
             mantra:   { beej: 'ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः', vedic: 'Durga Saptashati Ch. 11', count: 18000 },
             donation: ['Black gram (urad)', 'Mustard oil', 'Blanket', 'Coconut to flowing water'],
             fast:     { day: 'Saturday', food: 'No salt; dark foods' },
             lifestyle: ['Avoid shortcuts and deception', 'Feed leftover bread to dogs', 'Practise pranayama daily'],
             deity: 'Goddess Durga / Lord Bhairava' },
  ketu:    { gemstone: { stone: "Cat's Eye (Lehsunia)", metal: 'Silver',   finger: 'Middle', weight: '5–7 ratti', day: 'Tuesday' },
             mantra:   { beej: 'ॐ स्रां स्रीं स्रौं सः केतवे नमः', vedic: 'Maha Mrityunjaya Mantra', count: 17000 },
             donation: ['Multi-coloured cloth', 'Sesame', 'Goats / dogs care', 'Iron'],
             fast:     { day: 'Tuesday', food: 'Fruits only' },
             lifestyle: ['Practise meditation and silence', 'Care for stray dogs', 'Renounce one indulgence'],
             deity: 'Lord Ganesha / Lord Bhairava' },
};

function planetAfflictionScore(p: PlanetPosition): number {
  let s = 0;
  if (p.dignity === 'debilitated') s += 3;
  if (p.dignity === 'enemy') s += 2;
  if (p.isCombust) s += 2;
  if (p.isRetrograde) s += 1;
  if ([6, 8, 12].includes(p.houseNumber)) s += 1;
  return s;
}

export default function Remedies() {
  const { id = 'demo' } = useParams();
  const { data } = useKundli(id);

  if (!data) return <div className="p-12 text-center text-text-tertiary">Loading…</div>;

  const d1 = data.divisionalCharts.find((c) => c.varga === 'D1')!;
  const planets = d1.planets.filter((p) => p.planet !== 'ascendant') as PlanetPosition[];
  const ranked = [...planets]
    .map((p) => ({ p, score: planetAfflictionScore(p) }))
    .sort((a, b) => b.score - a.score);

  const md = data.dashas[0]?.currentMahaDasha;
  const dashaPlanet = md?.planet?.toLowerCase() as Exclude<PlanetName, 'ascendant'> | undefined;

  const priority = new Set<string>();
  ranked.slice(0, 3).forEach((r) => priority.add(r.p.planet));
  if (dashaPlanet && REMEDY_BOOK[dashaPlanet]) priority.add(dashaPlanet);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to={`/app/chart/${id}`} className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to chart
      </Link>
      <div className="mt-3 text-eyebrow text-brand-saffron">Upayas · Classical remedial prescriptions</div>
      <h1 className="mt-1 font-display text-h1 text-text-primary">Remedies</h1>
      <p className="mt-2 max-w-2xl text-body text-text-secondary">
        Remedies for {data.birthDetails.fullName}, prioritised by planetary affliction in the D1 and the active Mahadasha lord. Drawn from BPHS, Lal Kitab, and contemporary commentaries.
      </p>

      {/* Priority banner */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-brand-maroon/30 bg-surface p-4 shadow-sm">
          <div className="text-eyebrow text-brand-maroon">Mahadasha lord</div>
          <div className="mt-1 font-display text-h3 text-text-primary capitalize">{md?.planet ?? '—'}</div>
          <div className="mt-1 font-mono text-xs text-text-tertiary">Strengthen this planet first.</div>
        </div>
        <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
          <div className="text-eyebrow text-text-tertiary">Most afflicted</div>
          <div className="mt-1 font-display text-h3 text-text-primary capitalize">
            {ranked[0]?.p.planet} · {ranked[1]?.p.planet}
          </div>
          <div className="mt-1 font-mono text-xs text-text-tertiary">By dignity, combustion, dusthana placement.</div>
        </div>
        <div className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
          <div className="text-eyebrow text-text-tertiary">Active Doshas</div>
          <div className="mt-1 font-display text-h3 text-text-primary">
            {data.doshas.filter((d) => d.isPresent).length} present
          </div>
          <div className="mt-1 font-mono text-xs text-text-tertiary">See Doshas page for parihara.</div>
        </div>
      </div>

      {/* Affliction table */}
      <div className="mt-8 overflow-hidden rounded-md border border-hairline-subtle bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-4 py-2 font-medium">Planet</th>
              <th className="px-4 py-2 font-medium">Sign · House</th>
              <th className="px-4 py-2 font-medium">Dignity</th>
              <th className="px-4 py-2 font-medium">Flags</th>
              <th className="px-4 py-2 font-medium text-right">Affliction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-subtle">
            {ranked.map(({ p, score }) => (
              <tr key={p.planet}>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs" style={{ color: `hsl(var(--planet-${p.planet}))` }}>{PLANET_LABELS[p.planet].short}</span>
                  <span className="ml-2 text-text-primary capitalize">{p.planet}</span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{p.signName} · H{p.houseNumber}</td>
                <td className="px-4 py-3 text-text-tertiary capitalize">{p.dignity?.replace('_', ' ') ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-text-tertiary">
                  {p.isRetrograde && <span className="mr-1 rounded-sm bg-elevated px-1.5 py-0.5 font-mono">℞</span>}
                  {p.isCombust && <span className="mr-1 rounded-sm bg-elevated px-1.5 py-0.5 font-mono">combust</span>}
                  {[6, 8, 12].includes(p.houseNumber) && <span className="rounded-sm bg-elevated px-1.5 py-0.5 font-mono">dusthana</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <AfflictionBar score={score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-planet remedy cards */}
      <h2 className="mt-12 font-display text-h2 text-text-primary">Prescriptions</h2>
      <p className="mt-1 text-body text-text-secondary">
        Begin on the day ruled by the planet, after consulting a qualified astrologer for gemstones above ~3 ratti.
      </p>

      <div className="mt-6 space-y-6">
        {(Object.keys(REMEDY_BOOK) as Array<keyof typeof REMEDY_BOOK>).map((key) => {
          const r = REMEDY_BOOK[key];
          const isPriority = priority.has(key);
          return (
            <article
              key={key}
              className={`rounded-md border bg-surface p-6 shadow-sm ${isPriority ? 'border-brand-maroon/40' : 'border-hairline-subtle'}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-eyebrow text-text-tertiary">{r.deity}</div>
                  <h3 className="font-display text-h3 text-text-primary capitalize">
                    {key} <span className="ml-2 font-deva text-sm text-text-tertiary">{PLANET_LABELS[key].deva}</span>
                  </h3>
                </div>
                {isPriority && (
                  <span className="rounded-sm border border-brand-maroon/40 bg-surface px-2 py-0.5 text-eyebrow text-brand-maroon">
                    Priority
                  </span>
                )}
              </div>
              <div className="gold-rule mt-4" />

              <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <RemedyBlock icon={Gem} title="Gemstone">
                  <p className="text-body text-text-primary">{r.gemstone.stone}</p>
                  <p className="mt-1 font-mono text-xs text-text-tertiary">
                    {r.gemstone.metal} · {r.gemstone.finger} finger · {r.gemstone.weight} · wear on {r.gemstone.day}
                  </p>
                </RemedyBlock>
                <RemedyBlock icon={Sparkles} title="Mantra">
                  <p className="font-deva text-body text-text-primary">{r.mantra.beej}</p>
                  <p className="mt-1 text-sm text-text-secondary">{r.mantra.vedic}</p>
                  <p className="mt-1 font-mono text-xs text-text-tertiary">{r.mantra.count.toLocaleString()} repetitions (anushthana)</p>
                </RemedyBlock>
                <RemedyBlock icon={HandHeart} title="Donation (Daana)">
                  <ul className="space-y-1 text-sm text-text-secondary">
                    {r.donation.map((d) => <li key={d}>· {d}</li>)}
                  </ul>
                </RemedyBlock>
                <RemedyBlock icon={Flame} title="Fast (Vrata)">
                  <p className="text-body text-text-primary">{r.fast.day}</p>
                  <p className="mt-1 text-sm text-text-secondary">{r.fast.food}</p>
                </RemedyBlock>
                <RemedyBlock icon={Leaf} title="Lifestyle">
                  <ul className="space-y-1 text-sm text-text-secondary">
                    {r.lifestyle.map((l) => <li key={l}>· {l}</li>)}
                  </ul>
                </RemedyBlock>
                <RemedyBlock icon={BookOpen} title="Source">
                  <p className="text-sm text-text-secondary">
                    BPHS Ch. on Graha Shanti; Lal Kitab Ch. on {key}; classical Stotra paths.
                  </p>
                </RemedyBlock>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-12 rounded-md border border-hairline-subtle bg-elevated/40 p-5 text-sm text-text-tertiary">
        <strong className="text-text-secondary">Disclaimer:</strong> These prescriptions are classical and educational. Gemstones and prolonged anushthana should be undertaken only after a qualified astrologer's review of the full chart, including dasha, transit, and divisional analysis.
      </div>
    </div>
  );
}

function AfflictionBar({ score }: { score: number }) {
  const max = 8;
  const pct = Math.min(100, (score / max) * 100);
  const color = score >= 5 ? 'hsl(var(--semantic-negative))' : score >= 3 ? 'hsl(var(--semantic-warning))' : 'hsl(var(--semantic-positive))';
  return (
    <div className="inline-flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs text-text-tertiary">{score}</span>
    </div>
  );
}

function RemedyBlock({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-eyebrow text-text-tertiary">
        <Icon className="h-3.5 w-3.5 text-brand-saffron" /> {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}