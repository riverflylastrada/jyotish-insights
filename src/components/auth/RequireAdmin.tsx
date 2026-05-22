import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdmin();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-canvas"><Loader2 className="h-6 w-6 animate-spin text-brand-saffron" /></div>;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
