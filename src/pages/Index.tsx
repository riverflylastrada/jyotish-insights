import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, ScrollText, Scale, Sparkles, GitBranch, Calendar } from 'lucide-react';
import { SiteFooter } from '@/components/layout/SiteFooter';

const fadeUp = { initial: { opacity: 0, y: 8 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="text-eyebrow text-brand-saffron">{children}</div>
);

const SectionTitle = ({ kicker, title, lead }: { kicker: string; title: string; lead?: string }) => (
  <div className="mx-auto max-w-3xl text-center">
    <Eyebrow>{kicker}</Eyebrow>
    <h2 className="mt-3 font-display text-h1 text-text-primary">{title}</h2>
    <div className="gold-rule mx-auto mt-5 w-24" />
    {lead && <p className="mt-5 text-body text-text-secondary">{lead}</p>}
  </div>
);

const HeroKundli = () => (
  <svg viewBox="0 0 360 360" className="w-full max-w-md">
    <rect x="6" y="6" width="348" height="348" fill="hsl(var(--bg-surface))" stroke="hsl(var(--brand-maroon))" strokeWidth="1.5" />
    <g fill="none" stroke="hsl(var(--brand-maroon))" strokeWidth="1">
      <line x1="6" y1="6" x2="354" y2="354" />
      <line x1="354" y1="6" x2="6" y2="354" />
      <polygon points="180,6 354,180 180,354 6,180" />
    </g>
    {[[16,16],[344,16],[16,344],[344,344]].map(([x,y],i)=>(
      <g key={i}>
        <circle cx={x} cy={y} r="3" fill="hsl(var(--brand-gold))" />
        <circle cx={x} cy={y} r="7" fill="none" stroke="hsl(var(--brand-gold))" strokeWidth="0.5" />
      </g>
    ))}
    <text x="180" y="100" textAnchor="middle" className="font-display" fontSize="14" fill="hsl(var(--brand-maroon))">As</text>
    <text x="100" y="180" textAnchor="middle" className="font-display" fontSize="14" fill="hsl(var(--planet-jupiter))">Ju</text>
    <text x="260" y="180" textAnchor="middle" className="font-display" fontSize="14" fill="hsl(var(--planet-venus))">Ve</text>
    <text x="180" y="260" textAnchor="middle" className="font-display" fontSize="14" fill="hsl(var(--planet-saturn))">Sa</text>
    <text x="180" y="330" textAnchor="middle" className="font-deva" fontSize="11" fill="hsl(var(--text-tertiary))">कुण्डली</text>
  </svg>
);

const gurus = [
  { name: 'Maharishi Parashara', school: 'Brihat Parashara Hora Sastra', focus: 'Houses, planetary lordships, classical yogas', tone: 'Authoritative, scriptural — reasons from Lagna and bhava strength' },
  { name: 'Varahamihira', school: 'Brihat Jataka', focus: 'Planetary vs house strength, dignities, aspects', tone: 'Mathematical — weighs the evidence precisely' },
  { name: 'Dr. B. V. Raman', school: 'Modern Hindu Astrology', focus: 'Dasamsa & career, transits, practical synthesis', tone: 'Modern, classically grounded' },
  { name: 'K. N. Rao', school: 'Dasha-led judgment', focus: 'Vimshottari Maha/Antar/Pratyantar, double-transit', tone: 'Direct, decisive — judges by dasha first' },
  { name: 'K. S. Krishnamurti', school: 'Krishnamurti Paddhati (KP)', focus: 'Sub-lords, ruling planets, cuspal significators', tone: 'Engineering-precise, time-focused' },
  { name: 'Maharishi Jaimini', school: 'Jaimini Sutras', focus: 'Chara karakas, Karakamsa, Arudha, Chara Dasha', tone: 'Sutra-like, logical rigor' },
  { name: 'Mantreshwara', school: 'Phaladeepika', focus: 'Yogas, planetary avasthas, definitive results', tone: 'Practical, judgment-focused' },
  { name: 'Kalyanavarman', school: 'Saravali', focus: 'Yogas and richly descriptive planetary portraits', tone: 'Poetic, descriptive' },
];

const reportPanels = [
  { icon: GitBranch, title: 'Sixteen Vargas', body: 'D1 through D60 divisional charts with classical interpretation per varga.' },
  { icon: Calendar, title: 'Vimshottari Timeline', body: '120-year dasha timeline drilled to five sub-period levels.' },
  { icon: Scale, title: 'Yogas & Doshas', body: 'Strength-rated detection with cancellations and contextual remedies.' },
  { icon: ScrollText, title: 'Multi-Guru Verdict', body: 'Eight specialist reports synthesized by a Master Acharya.' },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-hairline-subtle bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-h3 text-brand-maroon">Acharya Jyotish</Link>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#how" className="text-sm text-text-secondary hover:text-text-primary">How it works</a>
            <a href="#gurus" className="text-sm text-text-secondary hover:text-text-primary">Gurus</a>
            <a href="#report" className="text-sm text-text-secondary hover:text-text-primary">Report</a>
            <Link to="/mundane" className="text-sm text-text-secondary hover:text-text-primary">Mundane</Link>
            <Link to="/panchang" className="text-sm text-text-secondary hover:text-text-primary">Panchang</Link>
            <Link to="/eclipses" className="text-sm text-text-secondary hover:text-text-primary">Eclipses</Link>
            <a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary">Sign in</Link>
            <Link to="/app/new" className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-brand-saffron-hover">
              Cast a chart <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="yantra-bg">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-12 lg:py-28">
          <motion.div {...fadeUp} className="lg:col-span-7">
            <Eyebrow>Professional Vedic Astrology</Eyebrow>
            <h1 className="mt-4 font-display text-display text-text-primary">
              Eight Gurus.<br />One Chart.<br />
              <span className="text-brand-maroon">The Truth in Your Stars.</span>
            </h1>
            <p className="mt-6 max-w-xl text-body text-text-secondary">
              Acharya Jyotish runs your birth chart through eight classical schools of Vedic astrology — from Parashara and Varahamihira to Jaimini, KP, Phaladeepika and Saravali. Then a Master Acharya weighs the evidence and delivers the verdict no single astrologer could give you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/app/new" className="inline-flex items-center gap-2 rounded-sm bg-brand-saffron px-5 py-3 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:bg-brand-saffron-hover">
                Generate my Kundli <ArrowRight className="h-4 w-4" />
              </Link>
              {/* Pre-computed demo chart (15 Aug 1980, 14:30, Ahmedabad — see
                  DEMO_BIRTH). The fixed `?share=demo` token lets RequireAuth
                  through and renders the chart read-only, so no login is needed
                  to view the sample. */}
              <Link to="/app/chart/demo?share=demo" className="inline-flex items-center gap-2 rounded-sm border border-hairline px-5 py-3 text-sm font-medium text-text-primary hover:bg-elevated">
                See sample report
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-text-tertiary">
              <span>Built on BPHS · Saravali · Phaladeepika</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline font-deva">सत्यमेव जयते</span>
            </div>
          </motion.div>
          <motion.div {...fadeUp} className="flex justify-center lg:col-span-5">
            <HeroKundli />
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t border-hairline-subtle py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle kicker="The method" title="How a chart becomes a verdict"
            lead="Each report is the product of computation, classical interpretation, structured debate, and editorial synthesis." />
          <div className="mt-14 grid gap-px overflow-hidden rounded-md border border-hairline-subtle bg-hairline-subtle md:grid-cols-4">
            {[
              { n: '०१', t: 'Compute', d: 'High-precision planetary positions across 23 divisional charts and dasha systems.' },
              { n: '०२', t: 'Interpret', d: 'Eight Gurus read the chart from their own classical lineage, in parallel.' },
              { n: '०३', t: 'Debate', d: 'Verdicts are compared. Agreements and disagreements are surfaced explicitly.' },
              { n: '०४', t: 'Synthesize', d: 'A Master Acharya weighs evidence and issues the consensus reading.' },
            ].map((step) => (
              <div key={step.n} className="bg-surface p-8">
                <div className="font-deva text-h2 text-brand-gold">{step.n}</div>
                <div className="mt-4 font-display text-h3 text-text-primary">{step.t}</div>
                <p className="mt-2 text-sm text-text-tertiary">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GURUS */}
      <section id="gurus" className="bg-elevated py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle kicker="The panel" title="Meet the eight Gurus"
            lead="Each Guru represents an established lineage of Jyotish. They reason from different premises and agree to disagree." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {gurus.map((g, i) => (
              <motion.div key={g.name} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm" style={{ background: `hsl(var(--brand-${i % 2 ? 'gold' : 'maroon'}) / 0.08)` }}>
                  <BookOpen className="h-5 w-5 text-brand-maroon" />
                </div>
                <div className="mt-4 font-display text-h3 text-text-primary">{g.name}</div>
                <div className="mt-1 text-xs text-text-tertiary">{g.school}</div>
                <div className="my-4 h-px bg-hairline-subtle" />
                <div className="text-sm text-text-secondary">{g.focus}</div>
                <div className="mt-3 text-xs italic text-text-tertiary">{g.tone}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 mx-auto max-w-2xl rounded-md border border-brand-maroon/30 bg-surface p-6 text-center shadow-sm">
            <Eyebrow>The Acharya</Eyebrow>
            <div className="mt-2 font-display text-h2 text-brand-maroon">Main Guru — the Synthesis</div>
            <p className="mt-3 text-sm text-text-secondary">
              Reads all eight reports, weighs the evidence, and issues the final verdict with a confidence score and dissenting opinions noted.
            </p>
          </div>
        </div>
      </section>

      {/* REPORT */}
      <section id="report" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle kicker="Inside a report" title="Built like research, not horoscopes"
            lead="Data-rich, citation-backed, and printable. Treat it like a research dossier on yourself." />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {reportPanels.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4 rounded-md border border-hairline-subtle bg-surface p-6 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-elevated">
                  <Icon className="h-5 w-5 text-brand-maroon" />
                </div>
                <div>
                  <div className="font-display text-h3 text-text-primary">{title}</div>
                  <p className="mt-1 text-sm text-text-secondary">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDATIONS */}
      <section className="border-t border-hairline-subtle bg-elevated py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Eyebrow>Classical foundations</Eyebrow>
          <h2 className="mt-3 font-display text-h1 text-text-primary">Rooted in the source texts</h2>
          <div className="gold-rule mx-auto mt-5 w-24" />
          <p className="mt-6 text-body text-text-secondary">
            Every interpretation cites its lineage. We draw from Brihat Parashara Hora Shastra, Saravali, Phaladeepika, Jaimini Sutras, and modern KP literature — and we tell you which one is speaking.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-left sm:grid-cols-3">
            {['BPHS', 'Saravali', 'Phaladeepika', 'Jaimini Sutras', 'KP Reader', 'Varshphal', 'Mundane'].map((t) => (
              <div key={t} className="rounded-sm border border-hairline-subtle bg-surface px-4 py-3 text-sm text-text-secondary">
                <Sparkles className="mb-1 inline h-3 w-3 text-brand-gold" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle kicker="Pricing" title="Choose your depth" />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { tier: 'Free', price: '₹0', features: ['1 saved chart', 'D1 + D9 charts', 'Basic dasha & yoga read'] },
              { tier: 'Pro', price: '₹499', highlight: true, features: ['Unlimited charts', 'All 23 vargas', 'Multi-Guru debate', 'PDF export'] },
              { tier: 'Acharya', price: '₹1,999', features: ['Pro + transit alerts', 'Custom debate questions', 'Annual Varshphal', 'Priority compute'] },
            ].map((p) => (
              <div key={p.tier} className={`rounded-md border p-8 shadow-sm ${p.highlight ? 'border-brand-maroon bg-surface' : 'border-hairline-subtle bg-surface'}`}>
                {p.highlight && <div className="text-eyebrow text-brand-saffron">Most popular</div>}
                <div className="mt-2 font-display text-h2 text-text-primary">{p.tier}</div>
                <div className="mt-2 font-mono text-h1 text-brand-maroon">{p.price}<span className="ml-1 text-sm text-text-tertiary">/mo</span></div>
                <ul className="mt-6 space-y-2 text-sm text-text-secondary">
                  {p.features.map(f => <li key={f}>· {f}</li>)}
                </ul>
                <Link to="/app/new" className={`mt-8 inline-flex w-full items-center justify-center rounded-sm px-4 py-2.5 text-sm font-medium transition-colors ${p.highlight ? 'bg-brand-saffron text-accent-foreground hover:bg-brand-saffron-hover' : 'border border-hairline text-text-primary hover:bg-elevated'}`}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
