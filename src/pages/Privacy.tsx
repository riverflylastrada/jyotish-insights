import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';

// Contact address shown in the policy. Update to a monitored inbox before
// store submission (e.g. a Zoho/Workspace address on acharyajyotish.com).
const CONTACT_EMAIL = 'gunjan.gjc@gmail.com';
const EFFECTIVE_DATE = '8 June 2026';

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-8 font-display text-h2 text-text-primary">{children}</h2>
);

export default function Privacy() {
  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Seo
        title="Privacy Policy — Acharya Jyotish"
        description="How Acharya Jyotish collects, uses, and protects your data — including birth details, account information, and AI interactions."
        canonical="/privacy"
      />

      <header className="border-b border-hairline-subtle bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="font-display text-h3 text-brand-maroon">Acharya Jyotish</Link>
          <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">Home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 text-body text-text-secondary">
        <h1 className="font-display text-display text-text-primary">Privacy Policy</h1>
        <p className="mt-2 text-sm text-text-tertiary">Effective {EFFECTIVE_DATE}</p>

        <p className="mt-6">
          Acharya Jyotish ("we", "us", "our") provides Vedic astrology tools — birth-chart
          (Kundli) generation, analysis, and AI-assisted readings — via our website and mobile
          app (together, the "Service"). This policy explains what we collect, how we use it, and
          the choices you have. By using the Service you agree to this policy.
        </p>

        <H>Information we collect</H>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li><strong>Account information.</strong> Your email address (and authentication details) when you create an account.</li>
          <li><strong>Birth details.</strong> The date, time, and place of birth you enter to generate a chart. Place of birth is converted to coordinates and a timezone. This data is used to compute your chart and is sensitive — we treat it accordingly.</li>
          <li><strong>Charts and saved data.</strong> The charts you generate and choose to save, and related notes or settings.</li>
          <li><strong>AI interactions.</strong> The questions you ask the AI gurus and the readings generated, so we can provide and improve the feature.</li>
          <li><strong>Voice interactions.</strong> If you use the Voice Guru, audio is processed by our voice provider to power the conversation.</li>
          <li><strong>Usage and device data.</strong> Basic technical data (e.g. app/version, general usage) needed to operate, secure, and improve the Service.</li>
        </ul>

        <H>How we use your information</H>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>To generate your birth chart, divisional charts, dashas, and AI readings.</li>
          <li>To create, secure, and manage your account.</li>
          <li>To operate, maintain, and improve the Service.</li>
          <li>To communicate with you about the Service when necessary.</li>
          <li>To comply with legal obligations and prevent abuse.</li>
        </ul>

        <H>AI processing</H>
        <p className="mt-3">
          To produce readings, the relevant chart data and your question are sent to third-party
          AI (large language model) providers that generate the text on our behalf. We send only
          what is needed to answer your request. We do not use your personal questions to train
          public models, and we work with providers under their data-processing terms.
        </p>

        <H>Service providers we use</H>
        <p className="mt-3">We rely on trusted third parties to run the Service, including:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li><strong>Supabase</strong> — database, authentication, and backend hosting.</li>
          <li><strong>AI / LLM providers</strong> — to generate astrological readings from your chart and questions.</li>
          <li><strong>Voice AI provider</strong> — to power the optional Voice Guru.</li>
        </ul>
        <p className="mt-3">These providers process data only to provide their services to us.</p>

        <H>Data sharing</H>
        <p className="mt-3">
          <strong>We do not sell your personal data.</strong> We share information only with the
          service providers above (to operate the Service), or where required by law, or to protect
          our rights and users.
        </p>

        <H>Data retention</H>
        <p className="mt-3">
          We keep your account and chart data while your account is active. You can delete your
          saved charts at any time, and you may request deletion of your account and associated
          data by contacting us (see below). We may retain limited records as required by law.
        </p>

        <H>Security</H>
        <p className="mt-3">
          We use industry-standard measures to protect your data in transit and at rest. No method
          of transmission or storage is completely secure, but we work to safeguard your information.
        </p>

        <H>Your rights</H>
        <p className="mt-3">
          You can access and update your information in the app, delete saved charts, and request
          access to or deletion of your personal data by emailing us. Depending on your location,
          you may have additional rights under applicable law.
        </p>

        <H>Children</H>
        <p className="mt-3">
          The Service is not directed to children under 13 (or the minimum age in your country), and
          we do not knowingly collect their data.
        </p>

        <H>Changes to this policy</H>
        <p className="mt-3">
          We may update this policy from time to time. We will post the updated version here and
          revise the effective date above.
        </p>

        <H>Contact</H>
        <p className="mt-3">
          Questions or requests about this policy or your data? Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-maroon underline">{CONTACT_EMAIL}</a>.
        </p>

        <div className="mt-12 border-t border-hairline-subtle pt-6 text-sm text-text-tertiary">
          <Link to="/" className="text-brand-maroon hover:underline">← Back to Acharya Jyotish</Link>
        </div>
      </main>
    </div>
  );
}
