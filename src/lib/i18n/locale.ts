/**
 * Lightweight, route-prefix based locale system for the public (crawlable) pages.
 *
 * Why not react-i18next: the app already renders bilingual content with inline
 * Devanagari constants (e.g. SIGN_NAMES_DEVA, PLANET_LABELS.deva) and ships no
 * i18n library. The new public SEO pages are content/data-driven, so a small
 * locale helper — paired with bilingual data tables — matches the existing
 * convention without adding a dependency (and avoids desyncing the three
 * committed lockfiles). The progressive full-app Hindi track can layer a heavier
 * framework on top later if needed; this stays the source of truth for the
 * locale ↔ URL mapping and hreflang generation.
 *
 * Convention: English lives at the bare path (`/rashifal`); Hindi at the `/hi`
 * prefix (`/hi/rashifal`). This keeps existing English URLs/canonicals stable.
 */

import { useLocation } from 'react-router-dom';

export type Locale = 'en' | 'hi';

export const LOCALES: Locale[] = ['en', 'hi'];
export const DEFAULT_LOCALE: Locale = 'en';

/** Map an i18n locale to the BCP-47 value used in <html lang> and hreflang. */
export const HREFLANG: Record<Locale, string> = { en: 'en-IN', hi: 'hi-IN' };

/** Derive the active locale from a pathname. */
export function localeFromPathname(pathname: string): Locale {
  return pathname === '/hi' || pathname.startsWith('/hi/') ? 'hi' : 'en';
}

/** Strip the locale prefix, returning the base path (always starts with '/'). */
export function stripLocale(pathname: string): string {
  if (pathname === '/hi') return '/';
  if (pathname.startsWith('/hi/')) return pathname.slice(3);
  return pathname || '/';
}

/** Build the path for a base route in a given locale. */
export function localizedPath(locale: Locale, basePath: string): string {
  const clean = basePath.startsWith('/') ? basePath : `/${basePath}`;
  if (locale === 'hi') return clean === '/' ? '/hi' : `/hi${clean}`;
  return clean;
}

/** Pick the value matching the active locale. */
export function pick<T>(locale: Locale, en: T, hi: T): T {
  return locale === 'hi' ? hi : en;
}

export interface LocaleAlternate {
  hreflang: string;
  href: string;
}

/**
 * hreflang alternates for a base path across every locale, plus x-default.
 * Pass these to <Seo alternates={...} /> so Google indexes both variants
 * without duplicate-content penalties.
 */
export function alternatesFor(basePath: string): LocaleAlternate[] {
  const alts: LocaleAlternate[] = LOCALES.map((l) => ({
    hreflang: HREFLANG[l],
    href: localizedPath(l, basePath),
  }));
  alts.push({ hreflang: 'x-default', href: localizedPath(DEFAULT_LOCALE, basePath) });
  return alts;
}

/** React hook: active locale + the current base path (locale prefix removed). */
export function useLocale(): { locale: Locale; basePath: string; isHindi: boolean } {
  const { pathname } = useLocation();
  const locale = localeFromPathname(pathname);
  return { locale, basePath: stripLocale(pathname), isHindi: locale === 'hi' };
}
