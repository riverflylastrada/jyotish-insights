import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/hooks/useSession';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const loc = useLocation();

  // Public share links (?share=<token>) — including the landing-page demo
  // (?share=demo) — render read-only without authentication. The page itself
  // hides write actions when a share token is present, so it's safe to let an
  // anonymous visitor through here. Checked before `loading` so shared links
  // render immediately without waiting on the auth session.
  const hasShareToken = !!new URLSearchParams(loc.search).get('share');
  if (hasShareToken) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-brand-saffron" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  }
  return <>{children}</>;
}
