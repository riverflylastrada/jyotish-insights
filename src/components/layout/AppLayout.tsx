import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PlusCircle, LayoutDashboard, LogOut, Shield, Bell, ChevronDown, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useAdmin } from '@/hooks/useAdmin';
import { useTransitAlerts } from '@/hooks/useTransitAlerts';
import { usePlanGate } from '@/hooks/usePlanGate';
import { toast } from '@/components/ui/sonner';
import { StaleSnapshotBanner } from '@/components/chart/StaleSnapshotBanner';
import { AutoInsightsLoader } from '@/components/chart/AutoInsightsLoader';
import { VoiceGuru } from '@/components/voice/VoiceGuru';
import { NavBadge } from '@/components/layout/NavBadge';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { primaryNav, chartTypes, CHART_PREFIXES } from '@/components/layout/navConfig';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors',
    isActive ? 'bg-elevated text-text-primary' : 'text-text-tertiary hover:text-text-primary',
  );

export function AppLayout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { user } = useSession();
  const { isAdmin } = useAdmin();
  const { unreadCount } = useTransitAlerts();
  const alertsGated = usePlanGate('transit_alerts');
  const chartActive = CHART_PREFIXES.some((p) => pathname.startsWith(p));
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else nav('/login');
  };
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-hairline-subtle bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap font-display text-h3 text-brand-maroon">Acharya Jyotish</span>
            <span className="hidden whitespace-nowrap text-xs text-text-muted lg:inline">Vedic Research Terminal</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1">
            {/* Desktop primary nav — hidden on mobile, where the bottom tab bar takes over */}
            <div className="hidden items-center gap-1 md:flex">
            {/* Dashboard */}
            <NavLink to="/app" end className={navLinkClass}>
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </NavLink>

            {/* New Chart — every chart-casting flow collapsed into one menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm outline-none transition-colors',
                    chartActive ? 'bg-elevated text-text-primary' : 'text-text-tertiary hover:text-text-primary',
                  )}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">New Chart</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-eyebrow text-text-tertiary">Cast a chart</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {chartTypes.map(({ to, label, desc, icon: Icon }) => (
                  <DropdownMenuItem key={to} asChild className="cursor-pointer">
                    <Link to={to} className="flex items-start gap-2.5">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-saffron" />
                      <span className="flex flex-col">
                        <span className="text-sm text-text-primary">{label}</span>
                        <span className="text-xs text-text-tertiary">{desc}</span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Library + Settings */}
            {primaryNav.slice(1).map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={navLinkClass}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}

            {/* Voice Guru */}
            <NavLink to="/app/voice"
              className={({ isActive }) => cn(
                'relative inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors',
                isActive ? 'bg-elevated text-text-primary' : 'text-text-tertiary hover:text-text-primary'
              )}>
              <Mic className="h-4 w-4" />
              <NavBadge>NEW</NavBadge>
              <span className="hidden sm:inline">Voice</span>
            </NavLink>
            </div>

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
            {alertsGated && (
              <NavLink to="/app/notifications"
                className={({ isActive }) => cn(
                  'relative inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors',
                  isActive ? 'bg-elevated text-text-primary' : 'text-text-tertiary hover:text-text-primary'
                )}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-saffron px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <span className="hidden sm:inline">Alerts</span>
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
      <OfflineBanner />
      <StaleSnapshotBanner />
      <AutoInsightsLoader />
      <VoiceGuru />
      {/* Extra bottom padding on mobile so content clears the fixed tab bar
          (4rem bar + the device safe-area inset). */}
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
