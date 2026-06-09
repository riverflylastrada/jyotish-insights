import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { ArrowRight, Sparkles, Languages } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { computeDayPanchang } from '@/lib/muhurta/panchangLite';
import { localDateInTz } from '@/lib/astro/sun';
import {
  getAllReadings, RASHIS, RASHIFAL_CITATION,
  type RashifalPeriod, type Quality,
} from '@/lib/astro/rashifal';
import { useLocale, pick, localizedPath, alternatesFor, type Locale } from '@/lib/i18n/locale';

const BASE_PATH = '/rashifal';

/* ── Quality styling + labels ── */
const QUALITY_STYLE: Record<Quality, string> = {
  good: 'border-semantic-positive/30 bg-semantic-positive/5',
  neutral: 'border-hairline-subtle bg-surface',
  challenging: 'border-semantic-negative/30 bg-semantic-negative/5',
};
const QUALITY_DOT: Record<Quality, string> = {
  good: 'bg-semantic-positive',
  neutral: 'bg-brand-gold',
  challenging: 'bg-semantic-negative',
};
function qualityLabel(q: Quality, locale: Locale): string {
  if (locale === 'hi') return q === 'good' ? 'शुभ' : q === 'challenging' ? 'सावधानी' : 'सामान्य';
  return q === 'good' ? 'Favourable' : q === 'challenging' ? 'Caution' : 'Mixed';
}

export default function Rashifal() {
  const { locale } = useLocale();
  const [period, setPeriod] = useState<RashifalPeriod>('daily');

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = localDateInTz(tz);
  const tzOffsetHours = -new Date().getTimezoneOffset() / 60;

  // Sign-level transits are global; location only affects sunrise/sunset (unused here).
  const panchang = useMemo(
    () => computeDayPanchang(today, 28.6139, 77.209, tzOffsetHours),
    [today, tzOffsetHours],
  );

  const transitIndex = period === 'daily' ? panchang.moonRashiIndex : panchang.sunRashiIndex;
  const readings = useMemo(
    () => getAllReadings(period, transitIndex, locale),
    [period, transitIndex, locale],
  );

  const dateLabel = dayjs(today).format('DD MMM YYYY');
  const monthLabel = dayjs(today).format('MMMM YYYY');
  const transitRashi = RASHIS[transitIndex];

  const t = {
    eyebrow: pick(locale, 'Daily Horoscope · दैनिक राशिफल', 'दैनिक राशिफल · Daily Horoscope'),
    h1: pick(locale, 'आज का राशिफल', 'आज का राशिफल'),
    h2: pick(locale, `Today's Rashifal — ${dateLabel}`, `आज का राशिफल — ${dateLabel}`),
    intro: pick(
      locale,
      'Free daily and monthly horoscope for all 12 moon-signs — computed from the actual transit (gochar) of the Moon and Sun using a sidereal (Lahiri) engine, not generic blurbs. No account needed.',
      'सभी 12 राशियों के लिए निःशुल्क दैनिक व मासिक राशिफल — चंद्र व सूर्य के वास्तविक गोचर पर आधारित (लाहिड़ी सायन गणना), सामान्य अनुमान नहीं। बिना खाते के।',
    ),
    daily: pick(locale, 'Daily', 'दैनिक'),
    monthly: pick(locale, 'Monthly', 'मासिक'),
    basisDaily: pick(
      locale,
      `Moon transits ${transitRashi.western} (${transitRashi.sanskrit}) today`,
      `आज चंद्रमा ${transitRashi.devanagari} राशि में गोचर कर रहा है`,
    ),
    basisMonthly: pick(
      locale,
      `Sun transits ${transitRashi.western} (${transitRashi.sanskrit}) this month`,
      `इस माह सूर्य ${transitRashi.devanagari} राशि में गोचर कर रहा है`,
    ),
    chooseLang: pick(locale, 'हिन्दी में पढ़ें', 'Read in English'),
    personal: pick(
      locale,
      'Want a reading from your own chart, not just your sign? Cast a free Kundli for dasha + full-transit personalised guidance.',
      'सिर्फ़ राशि नहीं, अपनी कुंडली से सटीक फल चाहिए? निःशुल्क कुंडली बनाएँ — दशा व पूर्ण गोचर आधारित व्यक्तिगत मार्गदर्शन।',
    ),
    castChart: pick(locale, 'Cast a chart', 'कुंडली बनाएँ'),
    home: pick(locale, 'Home', 'होम'),
    panchang: pick(locale, 'Panchang', 'पंचांग'),
  };

  const seoTitle = pick(
    locale,
    `Aaj Ka Rashifal — Today's Horoscope (All 12 Signs), ${dateLabel} | Acharya Jyotish`,
    `आज का राशिफल — सभी 12 राशियों का दैनिक राशिफल, ${dateLabel} | Acharya Jyotish`,
  );
  const seoDesc = pick(
    locale,
    `Free daily & monthly rashifal for all 12 zodiac signs, ${dateLabel}, from real Moon/Sun transits (sidereal). आज का राशिफल — मेष से मीन तक।`,
    `सभी 12 राशियों का निःशुल्क दैनिक व मासिक राशिफल, ${dateLabel} — चंद्र/सूर्य गोचर आधारित। Aaj ka rashifal for Aries to Pisces.`,
  );

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Seo
        title={seoTitle}
        description={seoDesc}
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
            <Link to={localizedPath(locale, '/panchang')} className="hidden text-sm text-text-secondary hover:text-text-primary sm:inline">{t.panchang}</Link>
            <Link
              to={localizedPath(locale === 'hi' ? 'en' : 'hi', BASE_PATH)}
              className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
            >
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
        {/* Period toggle */}
        <div className="flex items-center gap-2">
          {(['daily', 'monthly'] as RashifalPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-brand-maroon text-white'
                  : 'border border-hairline-subtle bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              {p === 'daily' ? t.daily : t.monthly}
            </button>
          ))}
          <span className="ml-2 text-xs text-text-tertiary">
            {period === 'daily' ? dateLabel : monthLabel}
          </span>
        </div>

        {/* Transit basis note */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-elevated px-3 py-1.5 text-xs text-text-secondary">
          <Sparkles className="h-3 w-3 text-brand-gold" />
          {period === 'daily' ? t.basisDaily : t.basisMonthly}
        </div>

        {/* Sign grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {readings.map((r) => (
            <motion.div
              key={r.rashi.index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: r.rashi.index * 0.015 }}
              className={`rounded-md border p-5 shadow-sm ${QUALITY_STYLE[r.quality]}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-h3 text-text-primary">
                    <span className="mr-1.5 text-brand-gold">{r.rashi.symbol}</span>
                    {locale === 'hi' ? r.rashi.devanagari : r.rashi.sanskrit}
                  </h3>
                  <p className="text-xs text-text-tertiary">
                    {locale === 'hi'
                      ? `${r.rashi.sanskrit} · ${r.rashi.western}`
                      : `${r.rashi.devanagari} · ${r.rashi.western}`}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas/60 px-2 py-1 text-[11px] font-medium text-text-secondary">
                  <span className={`h-1.5 w-1.5 rounded-full ${QUALITY_DOT[r.quality]}`} />
                  {qualityLabel(r.quality, locale)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{r.text}</p>
              <p className="mt-3 text-[11px] uppercase tracking-wide text-text-muted">{r.transitNote}</p>
            </motion.div>
          ))}
        </div>

        {/* Personalised CTA */}
        <div className="mt-8 rounded-md border border-brand-saffron/30 bg-brand-saffron/5 p-5">
          <p className="text-sm text-text-secondary">{t.personal}</p>
          <Link
            to="/app/new"
            className="mt-3 inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-brand-saffron-hover"
          >
            {t.castChart} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Citation */}
        <p className="mt-6 text-xs text-text-muted">{RASHIFAL_CITATION}</p>
      </div>

      <SiteFooter />
    </div>
  );
}
