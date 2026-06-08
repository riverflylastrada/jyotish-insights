import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';

// Where account-deletion requests are received. Update to a monitored inbox
// before store submission if you set one up on acharyajyotish.com.
const CONTACT_EMAIL = 'gunjan.gjc@gmail.com';

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-8 font-display text-h2 text-text-primary">{children}</h2>
);

export default function DeleteAccount() {
  const subject = encodeURIComponent('Delete my Acharya Jyotish account');
  const body = encodeURIComponent(
    'Please delete my Acharya Jyotish account and all associated data. ' +
    'My account email is: ',
  );

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <Seo
        title="Delete Your Account & Data — Acharya Jyotish"
        description="How to request deletion of your Acharya Jyotish account and all associated data, including your charts and birth details."
        canonical="/delete-account"
      />

      <header className="border-b border-hairline-subtle bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="font-display text-h3 text-brand-maroon">Acharya Jyotish</Link>
          <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">Home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 text-body text-text-secondary">
        <h1 className="font-display text-display text-text-primary">Delete your account &amp; data</h1>
        <p className="mt-6">
          This page explains how to request deletion of your <strong>Acharya Jyotish</strong> account
          (app developer: SocialCoffee DigiTech Pvt Ltd) and the data associated with it.
        </p>

        <H>How to request account deletion</H>
        <p className="mt-3">
          Email us from the address linked to your account at{' '}
          <a href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`} className="text-brand-maroon underline">{CONTACT_EMAIL}</a>{' '}
          with the subject <em>"Delete my Acharya Jyotish account"</em>, and include your account email.
          To help us verify the request, please send it from the same email address you use to sign in.
        </p>
        <p className="mt-3">
          We will permanently delete your account and associated data within <strong>30 days</strong> of
          verifying your request, and confirm by email once it's done.
        </p>

        <H>What gets deleted</H>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Your account and login details (email address).</li>
          <li>Your saved birth charts and the birth details you entered (date, time, and place of birth).</li>
          <li>Your AI Guru questions and reading history.</li>
          <li>Any settings and preferences tied to your account.</li>
        </ul>

        <H>What may be retained</H>
        <p className="mt-3">
          We may retain a limited amount of information for as long as required by law or for legitimate
          security and fraud-prevention purposes. Any such data is kept only for the minimum period
          necessary and is then deleted.
        </p>

        <H>Delete individual data without closing your account</H>
        <p className="mt-3">
          You don't have to delete your whole account to remove data: you can delete any saved chart
          at any time from within the app. To remove other data while keeping your account, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-maroon underline">{CONTACT_EMAIL}</a>.
        </p>

        <div className="mt-12 border-t border-hairline-subtle pt-6 text-sm text-text-tertiary">
          See also our <Link to="/privacy" className="text-brand-maroon hover:underline">Privacy Policy</Link>.{' '}
          <Link to="/" className="text-brand-maroon hover:underline">← Back to Acharya Jyotish</Link>
        </div>
      </main>
    </div>
  );
}
