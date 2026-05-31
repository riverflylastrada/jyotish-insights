import { NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Library, PlusCircle, Mic, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chartTypes, CHART_PREFIXES } from '@/components/layout/navConfig';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const tabClass = (active: boolean) =>
  cn(
    'flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] transition-colors',
    'min-h-[44px]', // comfortable touch target
    active ? 'text-brand-maroon' : 'text-text-tertiary',
  );

const navTabClass = ({ isActive }: { isActive: boolean }) => tabClass(isActive);

/**
 * Bottom tab bar for mobile (hidden at md+). Mirrors the primary desktop
 * destinations. "New" opens the same chart-casting menu as the header, anchored
 * upward from the bar. Clears the iOS home indicator via safe-area padding.
 */
export function MobileTabBar() {
  const { pathname } = useLocation();
  const chartActive = CHART_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline-subtle bg-surface/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        <NavLink to="/app" end className={navTabClass}>
          <LayoutDashboard className="h-5 w-5" />
          <span>Home</span>
        </NavLink>

        <NavLink to="/app/library" className={navTabClass}>
          <Library className="h-5 w-5" />
          <span>Charts</span>
        </NavLink>

        {/* New — chart-casting menu, opens upward */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={tabClass(chartActive)} aria-label="Cast a new chart">
              <PlusCircle className="h-5 w-5" />
              <span>New</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className="mb-2 w-64">
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

        <NavLink to="/app/voice" className={navTabClass}>
          <Mic className="h-5 w-5" />
          <span>Voice</span>
        </NavLink>

        <NavLink to="/app/settings" className={navTabClass}>
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
