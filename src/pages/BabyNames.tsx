import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Languages, Baby, Star } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { computeMoonNakshatra } from '@/lib/muhurta/panchangLite';
import { RASHIS } from '@/lib/astro/rashifal';
import {
  PADA_SYLLABLES, suggestNames, BABYNAME_CITATION, type Gender,
} from '@/lib/astro/babyNameData';
import { useLocale, pick, localizedPath, alternatesFor } from '@/lib/i18n/locale';

const BASE_PATH = '/baby-names';

export default function BabyNames() {
  const { locale } = useLocale();
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('12:00');
  const [gender, setGender] = useState<Gender | 'all'>('all');

  const tzOffsetHours = -new Date().getTimezoneOffset() / 60;

  const result = useMemo(() => {
    if (!dob) return null;
    const moon = computeMoonNakshatra(dob, tob, tzOffsetHours);
    const syllables = PADA_SYLLABLES[moon.nakshatra] ?? [];
    const padaSyllable = syllables[moon.pada - 1];
    const names = suggestNames(
      padaSyllable ? [padaSyllable] : syllables,
      gender === 'all' ? undefined : gender,
    );
    // Fall back to all nakshatra syllables if the specific pada has no curated names.
    const fallbackNames = names.length === 0
      ? suggestNames(syllables, gender === 'all' ? undefined : gender)
      : names;
    return { moon, syllables, padaSyllable, names: fallbackNames, usedFallback: names.length === 0 };
  }, [dob, tob, gender, tzOffsetHours]);

  const t = {
    eyebrow: pick(locale, 'Baby Names · नामकरण', 'नामकरण · Baby Names'),
    h1: pick(locale, 'नक्षत्र अनुसार नामकरण', 'नक्षत्र अनुसार नामकरण'),
    h2: pick(locale, 'Baby Names by Nakshatra', 'नक्षत्र के अनुसार शिशु के नाम'),
    intro: pick(
      locale,
      "Find the auspicious starting syllable (akshara) for your baby's name from the Moon's nakshatra & pada at birth — the classical Namakarana method — plus matching name suggestions. Free, no account.",
      "जन्म के समय चंद्रमा के नक्षत्र व पाद से शिशु के नाम का शुभ प्रथम अक्षर जानें — पारंपरिक नामकरण विधि — साथ ही मिलते-जुलते नाम। निःशुल्क, बिना खाते के।",
    ),
    dobLabel: pick(locale, 'Date of birth', 'जन्म तिथि'),
    tobLabel: pick(locale, 'Time of birth', 'जन्म समय'),
    prompt: pick(locale, "Enter the baby's birth date & time to begin.", 'आरंभ करने के लिए शिशु की जन्म तिथि व समय दर्ज करें।'),
    nakshatra: pick(locale, 'Nakshatra', 'नक्षत्र'),
    pada: pick(locale, 'Pada', 'पाद'),
    rashi: pick(locale, 'Moon sign', 'राशि'),
    auspicious: pick(locale, 'Auspicious starting syllable', 'शुभ प्रथम अक्षर'),
    allSyllables: pick(locale, 'All syllables for this nakshatra', 'इस नक्षत्र के सभी अक्षर'),
    suggestions: pick(locale, 'Name suggestions', 'नाम सुझाव'),
    all: pick(locale, 'All', 'सभी'),
    boy: pick(locale, 'Boy', 'बालक'),
    girl: pick(locale, 'Girl', 'बालिका'),
    none: pick(locale, 'No curated names yet for this syllable — use the syllable above as your guide.', 'इस अक्षर के लिए अभी कोई सूचीबद्ध नाम नहीं — ऊपर दिए अक्षर को मार्गदर्शक मानें।'),
    fallbackNote: pick(locale, 'Showing names for all four syllables of this nakshatra.', 'इस नक्षत्र के चारों अक्षरों के नाम दिखाए जा रहे हैं।'),
    chooseLang: pick(locale, 'हिन्दी में पढ़ें', 'Read in English'),
    castChart: pick(locale, 'Cast a chart', 'कुंडली बनाएँ'),
    home: pick(locale, 'Home', 'होम'),
    rashifal: pick(locale, 'Rashifal', 'राशिफल'),
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Seo
        title={pick(
          locale,
          'Baby Names by Nakshatra — Auspicious Name Syllable Finder (Free) | Acharya Jyotish',
          'नक्षत्र अनुसार शिशु के नाम — शुभ नामाक्षर खोजक (निःशुल्क) | Acharya Jyotish',
        )}
        description={pick(
          locale,
          "Find your baby's auspicious name starting-letter (akshara) from the birth nakshatra & pada, with matching name suggestions. Free Vedic Namakarana tool.",
          'जन्म नक्षत्र व पाद से शिशु के नाम का शुभ प्रथम अक्षर और मिलते-जुलते नाम जानें। निःशुल्क वैदिक नामकरण उपकरण।',
        )}
        canonical={localizedPath(locale, BASE_PATH)}
        locale={locale}
        alternates={alternatesFor(BASE_PATH)}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-hairline-subtle bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to={localizedPath(locale, '/')} className="font-display text-h3 text-brand-maroon">Acharya Jyotish</Link>
          <nav className="flex items-center gap-4">
            <Link to={localizedPath(locale, '/')} className="text-sm text-text-secondary hover:text-text-primary">{t.home}</Link>
            <Link to={localizedPath(locale, '/rashifal')} className="hidden text-sm text-text-secondary hover:text-text-primary sm:inline">{t.rashifal}</Link>
            <Link to={localizedPath(locale === 'hi' ? 'en' : 'hi', BASE_PATH)} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
              <Languages className="h-3.5 w-3.5" /> {t.chooseLang}
            </Link>
            <Link to="/app/new" className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-brand-saffron-hover">
              {t.castChart} <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-hairline-subtle bg-elevated py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-eyebrow text-brand-saffron">{t.eyebrow}</div>
          <h1 className="mt-2 font-display text-display text-text-primary">{t.h1}</h1>
          <p className="mt-1 font-display text-h2 text-text-secondary">{t.h2}</p>
          <p className="mt-4 max-w-2xl text-body text-text-secondary">{t.intro}</p>
        </div>
      </section>

      {/* Main */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Inputs */}
        <div className="grid gap-4 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">{t.dobLabel}</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">{t.tobLabel}</label>
            <input type="time" value={tob} onChange={(e) => setTob(e.target.value)}
              className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none" />
          </div>
        </div>

        {!result && <p className="mt-8 text-center text-sm text-text-tertiary">{t.prompt}</p>}

        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Nakshatra summary */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-md border border-hairline-subtle bg-surface p-4">
                <div className="text-eyebrow text-text-tertiary">{t.nakshatra}</div>
                <div className="mt-1 font-display text-h3 text-text-primary">
                  {locale === 'hi' ? result.moon.nakshatraHi : result.moon.nakshatra}
                </div>
                <div className="text-xs text-text-tertiary">{result.moon.nakshatra} · {result.moon.nakshatraHi}</div>
              </div>
              <div className="rounded-md border border-hairline-subtle bg-surface p-4">
                <div className="text-eyebrow text-text-tertiary">{t.pada}</div>
                <div className="mt-1 font-display text-h3 text-text-primary">{result.moon.pada}</div>
              </div>
              <div className="rounded-md border border-hairline-subtle bg-surface p-4">
                <div className="text-eyebrow text-text-tertiary">{t.rashi}</div>
                <div className="mt-1 font-display text-h3 text-text-primary">
                  {locale === 'hi' ? RASHIS[result.moon.rashiIndex].devanagari : RASHIS[result.moon.rashiIndex].sanskrit}
                </div>
              </div>
            </div>

            {/* Auspicious syllable */}
            {result.padaSyllable && (
              <div className="mt-4 rounded-md border border-brand-gold/40 bg-brand-gold/5 p-5">
                <div className="flex items-center gap-1.5 text-eyebrow text-brand-gold"><Star className="h-3.5 w-3.5" /> {t.auspicious}</div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-display text-display text-brand-maroon">{result.padaSyllable.deva}</span>
                  <span className="font-display text-h2 text-text-secondary">{result.padaSyllable.roman}</span>
                </div>
                <div className="mt-3 text-xs text-text-tertiary">{t.allSyllables}:</div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {result.syllables.map((s, i) => (
                    <span key={i} className={`rounded-sm px-2.5 py-1 text-sm ${i === result.moon.pada - 1 ? 'bg-brand-maroon text-white' : 'bg-elevated text-text-secondary'}`}>
                      {s.deva} <span className="text-xs opacity-80">{s.roman}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Name suggestions */}
            <div className="mt-6 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-h2 text-text-primary"><Baby className="h-5 w-5 text-brand-saffron" /> {t.suggestions}</h2>
              <div className="flex gap-1.5">
                {(['all', 'boy', 'girl'] as const).map((g) => (
                  <button key={g} onClick={() => setGender(g)}
                    className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${gender === g ? 'bg-brand-maroon text-white' : 'border border-hairline-subtle bg-surface text-text-secondary hover:text-text-primary'}`}>
                    {g === 'all' ? t.all : g === 'boy' ? t.boy : t.girl}
                  </button>
                ))}
              </div>
            </div>

            {result.usedFallback && result.names.length > 0 && (
              <p className="mt-2 text-xs text-text-tertiary">{t.fallbackNote}</p>
            )}

            {result.names.length === 0 ? (
              <p className="mt-4 rounded-md border border-hairline-subtle bg-surface p-4 text-sm text-text-tertiary">{t.none}</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.names.map((n) => (
                  <div key={n.name} className="rounded-md border border-hairline-subtle bg-surface p-4 shadow-sm">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-h3 text-text-primary">{n.name}</span>
                      <span className="font-display text-lg text-brand-maroon">{n.deva}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-wide text-text-muted">
                      {n.gender === 'boy' ? t.boy : t.girl}
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">{locale === 'hi' ? n.hi : n.en}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <p className="mt-6 text-xs text-text-muted">{BABYNAME_CITATION}</p>
      </div>

      <SiteFooter />
    </div>
  );
}
