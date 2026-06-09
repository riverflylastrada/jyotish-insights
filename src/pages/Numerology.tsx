import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Languages, Hash } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { SiteFooter } from '@/components/layout/SiteFooter';
import {
  computeProfile, NUMBER_MEANINGS, NUMEROLOGY_CITATION,
  type CoreNumber,
} from '@/lib/numerology';
import { useLocale, pick, localizedPath, alternatesFor } from '@/lib/i18n/locale';

const BASE_PATH = '/numerology';

export default function Numerology() {
  const { locale } = useLocale();
  const [dob, setDob] = useState('');
  const [name, setName] = useState('');

  const profile = useMemo(() => (dob ? computeProfile(dob, name) : null), [dob, name]);

  const t = {
    eyebrow: pick(locale, 'Numerology · अंक ज्योतिष', 'अंक ज्योतिष · Numerology'),
    h1: pick(locale, 'अंक ज्योतिष', 'अंक ज्योतिष'),
    h2: pick(locale, 'Free Numerology Calculator', 'निःशुल्क अंक ज्योतिष कैलकुलेटर'),
    intro: pick(
      locale,
      'Discover your Life Path, Destiny, Soul Urge and Personality numbers — instantly and free. Pythagorean numerology with the graha (planet) each number carries in the Indian tradition.',
      'अपना मूलांक (Life Path), भाग्यांक (Destiny), अंतरांक (Soul Urge) और व्यक्तित्व अंक जानें — तुरंत और निःशुल्क। पाइथागोरस अंक ज्योतिष, प्रत्येक अंक के ग्रह सहित।',
    ),
    dobLabel: pick(locale, 'Date of birth', 'जन्म तिथि'),
    nameLabel: pick(locale, 'Full name (optional, Latin spelling)', 'पूरा नाम (वैकल्पिक, रोमन वर्तनी)'),
    namePlaceholder: pick(locale, 'e.g. Arjun Sharma', 'जैसे Arjun Sharma'),
    prompt: pick(locale, 'Enter your date of birth to begin.', 'आरंभ करने के लिए अपनी जन्म तिथि दर्ज करें।'),
    lifePath: pick(locale, 'Life Path (Mulank)', 'मूलांक (Life Path)'),
    destiny: pick(locale, 'Destiny (Bhagyank)', 'भाग्यांक (Destiny)'),
    soulUrge: pick(locale, "Soul Urge (Heart's Desire)", 'अंतरांक (Soul Urge)'),
    personality: pick(locale, 'Personality', 'व्यक्तित्व अंक'),
    luckyColor: pick(locale, 'Lucky colour', 'शुभ रंग'),
    luckyDay: pick(locale, 'Lucky day', 'शुभ दिन'),
    planet: pick(locale, 'Planet', 'ग्रह'),
    chooseLang: pick(locale, 'हिन्दी में पढ़ें', 'Read in English'),
    castChart: pick(locale, 'Cast a chart', 'कुंडली बनाएँ'),
    home: pick(locale, 'Home', 'होम'),
    rashifal: pick(locale, 'Rashifal', 'राशिफल'),
    cardsNote: pick(
      locale,
      'Numbers from your name use its Latin spelling (A–Z). Life Path comes from your date of birth.',
      'नाम के अंक उसकी रोमन वर्तनी (A–Z) पर आधारित हैं। मूलांक आपकी जन्म तिथि से आता है।',
    ),
  };

  const cards: { label: string; value?: CoreNumber }[] = profile
    ? [
        { label: t.lifePath, value: profile.lifePath },
        { label: t.destiny, value: profile.destiny },
        { label: t.soulUrge, value: profile.soulUrge },
        { label: t.personality, value: profile.personality },
      ].filter((c) => c.value !== undefined)
    : [];

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Seo
        title={pick(
          locale,
          'Numerology Calculator — Life Path, Destiny & Lucky Number (Free) | Acharya Jyotish',
          'अंक ज्योतिष कैलकुलेटर — मूलांक, भाग्यांक व शुभ अंक (निःशुल्क) | Acharya Jyotish',
        )}
        description={pick(
          locale,
          'Free numerology calculator: find your Life Path, Destiny, Soul Urge & Personality numbers, lucky colour, day and ruling planet. Ank Jyotish online.',
          'निःशुल्क अंक ज्योतिष कैलकुलेटर: मूलांक, भाग्यांक, अंतरांक व व्यक्तित्व अंक, शुभ रंग, दिन और ग्रह जानें। Ank Jyotish online.',
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
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 font-mono text-sm text-text-primary focus:border-brand-maroon focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">{t.nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 text-sm text-text-primary focus:border-brand-maroon focus:outline-none"
            />
          </div>
        </div>

        {!profile && (
          <p className="mt-8 text-center text-sm text-text-tertiary">{t.prompt}</p>
        )}

        {profile && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {cards.map((c) => {
                const m = NUMBER_MEANINGS[c.value!];
                return (
                  <motion.div
                    key={c.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-eyebrow text-text-tertiary">{c.label}</div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-maroon font-display text-h3 text-white">
                        {c.value}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(locale === 'hi' ? m.keywordsHi : m.keywords).map((k) => (
                        <span key={k} className="rounded-full bg-elevated px-2 py-0.5 text-[11px] text-text-secondary">{k}</span>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">{locale === 'hi' ? m.hi : m.en}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline-subtle pt-3 text-xs">
                      <div>
                        <div className="text-text-muted">{t.planet}</div>
                        <div className="text-text-primary">{locale === 'hi' ? m.planetHi : m.planet}</div>
                      </div>
                      <div>
                        <div className="text-text-muted">{t.luckyColor}</div>
                        <div className="text-text-primary">{locale === 'hi' ? m.luckyColorHi : m.luckyColor}</div>
                      </div>
                      <div>
                        <div className="text-text-muted">{t.luckyDay}</div>
                        <div className="text-text-primary">{locale === 'hi' ? m.luckyDayHi : m.luckyDay}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-text-muted"><Hash className="h-3 w-3" /> {t.cardsNote}</p>
          </>
        )}

        <p className="mt-6 text-xs text-text-muted">{NUMEROLOGY_CITATION}</p>
      </div>

      <SiteFooter />
    </div>
  );
}
