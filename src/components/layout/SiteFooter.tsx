export function SiteFooter() {
  return (
    <footer className="border-t border-hairline-subtle bg-elevated">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-display text-h3 text-brand-maroon">Acharya Jyotish</div>
            <p className="mt-3 max-w-md text-sm text-text-tertiary">
              A professional Vedic astrology platform that runs your Kundli through eight classical schools and synthesizes the verdict.
            </p>
          </div>
          <div>
            <div className="text-eyebrow text-text-tertiary">Product</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#how" className="text-text-secondary hover:text-text-primary">How it works</a></li>
              <li><a href="#gurus" className="text-text-secondary hover:text-text-primary">The Gurus</a></li>
              <li><a href="#report" className="text-text-secondary hover:text-text-primary">Inside a report</a></li>
            </ul>
          </div>
          <div>
            <div className="text-eyebrow text-text-tertiary">Company</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="text-text-secondary">Made in Ahmedabad, India</li>
              <li className="text-text-secondary">Privacy & DPDP-aligned</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-hairline-subtle pt-6 text-xs text-text-muted">
          These analyses are for self-reflection and educational purposes. Vedic astrology is a classical Indian science with thousands of years of tradition. Decisions about health, finance, or relationships should not rely solely on astrological readings.
        </div>
      </div>
    </footer>
  );
}
