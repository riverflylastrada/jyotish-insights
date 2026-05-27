import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { toast } from '@/components/ui/sonner';
import { useSession } from '@/hooks/useSession';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const nav = useNavigate();
  const { user } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav('/app', { replace: true }); }, [user, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { display_name: name || email.split('@')[0] },
          },
        });
        if (error) throw error;
        toast.success('Account created. Check your email to confirm, then sign in.');
        nav('/login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav('/app');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      nav('/app');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-20">
        <Link to="/" className="font-display text-h3 text-brand-maroon">Acharya Jyotish</Link>
        <div className="mt-10 rounded-md border border-hairline-subtle bg-surface p-8 shadow-sm">
          <div className="text-eyebrow text-brand-saffron">{mode === 'login' ? 'Sign in' : 'Create an account'}</div>
          <h1 className="mt-2 font-display text-h1 text-text-primary">{mode === 'login' ? 'Welcome back' : 'Begin your reading'}</h1>

          <button
            type="button" onClick={onGoogle} disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm border border-hairline-subtle bg-surface px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-elevated disabled:opacity-50"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-text-tertiary">
            <div className="h-px flex-1 bg-hairline-subtle" /> or <div className="h-px flex-1 bg-hairline-subtle" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'signup' && (
              <Field label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)} className="auth-input" placeholder="Your name" />
              </Field>
            )}
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" placeholder="you@example.com" />
            </Field>
            <Field label="Password">
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" placeholder="••••••••" />
            </Field>
            <button type="submit" disabled={busy}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-brand-saffron px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-brand-saffron-hover disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-tertiary">
            {mode === 'login' ? (<>No account? <Link to="/signup" className="text-brand-maroon">Sign up</Link></>) : (<>Already a user? <Link to="/login" className="text-brand-maroon">Sign in</Link></>)}
          </div>
        </div>
      </div>
      <style>{`.auth-input { width: 100%; border: 1px solid hsl(var(--input)); background: hsl(var(--bg-surface)); border-radius: 3px; padding: 0.55rem 0.75rem; font-size: 14px; color: hsl(var(--text-primary)); outline: none; }
.auth-input:focus { border-color: hsl(var(--brand-saffron)); box-shadow: 0 0 0 3px hsl(var(--brand-saffron) / 0.12); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-eyebrow mb-1.5 text-text-tertiary">{label}</div>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.2 0 9.8-2 13.3-5.2l-6.1-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1L6.1 32C9.4 38 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.5 5.6l6.1 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.4-.3-3.5z"/>
    </svg>
  );
}
