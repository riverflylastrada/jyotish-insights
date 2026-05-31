import {
  Library,
  Settings,
  PlusCircle,
  LayoutDashboard,
  Users,
  HelpCircle,
  Building2,
  GitCompareArrows,
} from 'lucide-react';

/** Top-level destinations shared by the desktop header and the mobile tab bar. */
export const primaryNav = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/library', label: 'Library', icon: Library },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

/** Chart-casting flows surfaced under the "New Chart" menu. */
export const chartTypes = [
  { to: '/app/new', label: 'Birth Chart', desc: 'Standard natal Kundli', icon: PlusCircle },
  { to: '/app/compatibility', label: 'Compatibility', desc: 'Kundli Milan matching', icon: Users },
  { to: '/app/prashna', label: 'Prashna', desc: 'Horary (KP) chart', icon: HelpCircle },
  { to: '/app/business/new', label: 'Business', desc: 'Business / venture chart', icon: Building2 },
  { to: '/app/twins/new', label: 'Twins', desc: 'Compare two close births', icon: GitCompareArrows },
];

/** Routes that keep the "New Chart" trigger highlighted as active. */
export const CHART_PREFIXES = [
  '/app/new',
  '/app/compatibility',
  '/app/prashna',
  '/app/business',
  '/app/twins',
];
