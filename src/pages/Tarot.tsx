import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Languages, Sparkles, RotateCcw } from 'lucide-react';
import dayjs from 'dayjs';
import { Seo } from '@/components/Seo';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { drawCards, meaning, TAROT_CITATION, type DrawnCard } from '@/lib/tarot';
import { useLocale, pick, localizedPath, alternatesFor, type Locale } from '@/lib/i18n/locale';

const BASE_PATH = '/tarot';

function CardView({ d, position, locale }: { d: DrawnCard; position?: string; locale: Locale }) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm"
    >
      {position && <div className="text-eyebrow text-brand-saffron">{position}</div>}
      <div className="mt-1 flex items-baseline justify-between">
        <h3 className="font-display text-h3 text-text-primary">{locale === 'hi' ? d.card.nameHi : d.card.name}</h3>
        {d.reversed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[11px] text-text-tertiary">
            <RotateCcw className="h-3 w-3" /> {pick(locale, 'Reversed', 'उल्टा')}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {d.card.keywords.map((k) => (
          <span key={k} className="rounded-full bg-elevated px-2 py-0.5 text-[11px] text-text-secondary">{k}</span>
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">{meaning(d, locale)}</p>
    </motion.div>
  );
}

export default function Tarot() {
  const { locale } = useLocale();
  const today = dayjs().format('YYYY-MM-DD');
  const [question, setQuestion] = useState('');
  const [drawn, setDrawn] = useState<DrawnCard[] | null>(null);

  const dailyCard = useMemo(() => drawCards(`daily-${today}`, 1)[0], [today]);

  const drawThree = () => {
    const seed = `spread-${today}-${question.trim().toLowerCase() || 'general'}`;
    setDrawn(drawCards(seed, 3));
  };

  const positions = [
    pick(locale, 'Past', 'भूतकाल'),
    pick(locale, 'Present', 'वर्तमान'),
    pick(locale, 'Future', 'भविष्य'),
  ];

  const t = {
    eyebrow: pick(locale, 'Tarot · टैरो', 'टैरो · Tarot'),
    h1: pick(locale, 'टैरो रीडिंग', 'टैरो रीडिंग'),
    h2: pick(locale, 'Free Tarot Reading', 'निःशुल्क टैरो रीडिंग'),
    intro: pick(
      locale,
      "Pull your free Card of the Day, or ask a question for a three-card past–present–future spread. A 78-card Rider–Waite deck — for reflection, not fortune-telling.",
      'अपना निःशुल्क "आज का कार्ड" निकालें, या कोई प्रश्न पूछकर भूत–वर्तमान–भविष्य का तीन-कार्ड स्प्रेड पाएँ। 78-कार्ड राइडर–वेट डेक — चिंतन हेतु, भविष्यवाणी नहीं।',
    ),
    cardOfDay: pick(locale, 'Card of the Day', 'आज का कार्ड'),
    cardOfDayNote: pick(locale, `Your card for ${dayjs(today).format('DD MMM YYYY')} — the same all day.`, `${dayjs(today).format('DD MMM YYYY')} का आपका कार्ड — पूरे दिन एक ही।`),
    threeCard: pick(locale, 'Three-Card Reading', 'तीन-कार्ड रीडिंग'),
    qLabel: pick(locale, 'Your question (optional)', 'आपका प्रश्न (वैकल्पिक)'),
    qPlaceholder: pick(locale, 'e.g. What should I focus on in my career?', 'जैसे करियर में किस पर ध्यान दूँ?'),
    draw: pick(locale, 'Draw cards', 'कार्ड निकालें'),
    redraw: pick(locale, 'Draw again', 'फिर निकालें'),
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
          'Free Tarot Reading — Card of the Day & 3-Card Spread | Acharya Jyotish',
          'निःशुल्क टैरो रीडिंग — आज का कार्ड व 3-कार्ड स्प्रेड | Acharya Jyotish',
        )}
        description={pick(
          locale,
          'Free online tarot reading: pull your daily tarot card or a three-card past-present-future spread from a full 78-card deck. Instant, no sign-up.',
          'निःशुल्क ऑनलाइन टैरो रीडिंग: 78-कार्ड डेक से आज का टैरो कार्ड या भूत-वर्तमान-भविष्य का तीन-कार्ड स्प्रेड निकालें। तुरंत, बिना साइन-अप।',
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
        {/* Card of the day */}
        <section>
          <h2 className="flex items-center gap-1.5 font-display text-h2 text-text-primary"><Sparkles className="h-5 w-5 text-brand-gold" /> {t.cardOfDay}</h2>
          <p className="mt-1 text-xs text-text-tertiary">{t.cardOfDayNote}</p>
          <div className="mt-4 max-w-md">
            <CardView d={dailyCard} locale={locale} />
          </div>
        </section>

        {/* Three-card spread */}
        <section className="mt-10">
          <h2 className="font-display text-h2 text-text-primary">{t.threeCard}</h2>
          <div className="mt-4 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
            <label className="mb-1 block text-sm font-medium text-text-secondary">{t.qLabel}</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t.qPlaceholder}
                className="w-full rounded-sm border border-hairline-subtle bg-canvas px-2.5 py-2 text-sm text-text-primary focus:border-brand-maroon focus:outline-none"
              />
              <button
                onClick={drawThree}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm bg-brand-maroon px-5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                {drawn ? t.redraw : t.draw}
              </button>
            </div>
          </div>

          {drawn && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {drawn.map((d, i) => (
                <CardView key={d.card.id} d={d} position={positions[i]} locale={locale} />
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-xs text-text-muted">{TAROT_CITATION}</p>
      </div>

      <SiteFooter />
    </div>
  );
}
