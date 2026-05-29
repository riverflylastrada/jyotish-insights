import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Library, Settings, PlusCircle, LayoutDashboard, LogOut, Shield, Users, HelpCircle, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from '@/components/ui/sonner';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/new', label: 'New Chart', icon: PlusCircle },
  { to: '/app/library', label: 'Library', icon: Library },
  { to: '/app/prashna', label: 'Prashna', icon: HelpCircle },
  { to: '/app/business/new', label: 'Business', icon: Building2 },
  { to: '/app/compatibility', label: 'Compatibility', icon: Users },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const nav = useNavigate();
  const { user } = useSession();
  const { isAdmin } = useAdmin();
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else nav('/login');
  };
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-hairline-subtle bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="truncate font-display text-h3 text-brand-maroon">Acharya Jyotish</span>
            <span className="hidden text-xs text-text-muted sm:inline">Vedic Research Terminal</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => cn(
                  'inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors',
                  isActive ? 'bg-elevated text-text-primary' : 'text-text-tertiary hover:text-text-primary'
                )}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin"
                className={({ isActive }) => cn(
                  'inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors',
                  isActive ? 'bg-elevated text-text-primary' : 'text-text-tertiary hover:text-text-primary'
                )}>
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </NavLink>
            )}
            {user && (
              <button onClick={signOut} title={user.email ?? 'Sign out'}
                className="ml-2 inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm text-text-tertiary hover:text-text-primary">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
