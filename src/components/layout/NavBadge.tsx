import { cn } from '@/lib/utils';

/**
 * Small saffron pill badge for nav items (e.g. "NEW"). Mirrors the inline
 * notification-count span used on the Alerts nav item. The parent NavLink must
 * be `relative`.
 */
export function NavBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'absolute -right-1 -top-1 rounded-full bg-brand-saffron px-1 text-[9px] font-bold uppercase leading-tight text-white',
        className,
      )}
    >
      {children}
    </span>
  );
}
