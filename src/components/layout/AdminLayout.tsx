import { Link, NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, Key, Bot, ArrowLeft } from 'lucide-react';

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/api-keys', label: 'API Keys', icon: Key },
  { to: '/admin/llm-config', label: 'LLM Config', icon: Bot },
];

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-hairline-subtle bg-surface">
        <div className="flex h-14 items-center gap-2 border-b border-hairline-subtle px-5">
          <span className="font-display text-h3 text-brand-maroon">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {adminNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-elevated text-text-primary font-medium' : 'text-text-tertiary hover:bg-elevated/50 hover:text-text-primary'
              )}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-hairline-subtle p-3">
          <Link to="/app"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-tertiary transition-colors hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-hairline-subtle bg-surface/85 px-8 backdrop-blur">
          <span className="font-display text-h3 text-brand-maroon">Acharya Jyotish</span>
          <span className="ml-2 text-xs text-text-muted">Admin Panel</span>
        </header>
        <main className="mx-auto max-w-5xl p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
