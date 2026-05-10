import { Link } from 'react-router-dom';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-20">
        <Link to="/" className="font-display text-h3 text-brand-maroon">Jyotish Sage</Link>
        <div className="mt-10 rounded-md border border-hairline-subtle bg-surface p-8 shadow-sm">
          <div className="text-eyebrow text-brand-saffron">{mode === 'login' ? 'Sign in' : 'Create an account'}</div>
          <h1 className="mt-2 font-display text-h1 text-text-primary">{mode === 'login' ? 'Welcome back' : 'Begin your reading'}</h1>
          <p className="mt-3 text-sm text-text-tertiary">Authentication will be enabled once Lovable Cloud is connected. For now, jump in.</p>
          <Link to="/app" className="mt-6 inline-flex w-full items-center justify-center rounded-sm bg-brand-saffron px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover">
            Continue as guest
          </Link>
          <div className="mt-6 text-center text-sm text-text-tertiary">
            {mode === 'login' ? (<>No account? <Link to="/signup" className="text-brand-maroon">Sign up</Link></>) : (<>Already a user? <Link to="/login" className="text-brand-maroon">Sign in</Link></>)}
          </div>
        </div>
      </div>
    </div>
  );
}
