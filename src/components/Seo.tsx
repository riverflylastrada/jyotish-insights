import { useEffect } from 'react';
import type { Locale, LocaleAlternate } from '@/lib/i18n/locale';
import { HREFLANG } from '@/lib/i18n/locale';

/**
 * Per-route <head> manager for the public (crawlable) pages.
 *
 * Why a hand-rolled component instead of inline <title>/<meta> in JSX: React 18
 * does NOT hoist metadata tags to <head> (that landed in React 19), so the
 * inline tags some pages used rendered into the <body> and were invisible to
 * crawlers. This imperatively upserts the real <head> tags — updating the ones
 * already in index.html in place (no duplicates) and creating the rest. Googlebot
 * renders JS, so the per-route title/description/canonical are picked up.
 *
 * SPA caveat: tags are set client-side after hydration. For the highest-value
 * pages a future prerender step would put them in the initial HTML; this is the
 * low-risk first step that makes per-page meta actually work.
 */

const SITE = 'https://acharyajyotish.com';
const DEFAULT_IMAGE = `${SITE}/pwa-512x512.png`;

interface SeoProps {
  title: string;
  description: string;
  /** Path ("/panchang") or absolute URL. Defaults to the current path. */
  canonical?: string;
  image?: string;
  type?: 'website' | 'article';
  /** Keep this page out of the index (e.g. auth screens). */
  noindex?: boolean;
  /** Active page locale — sets <html lang> + og:locale. */
  locale?: Locale;
  /** hreflang alternates (use alternatesFor(basePath) from lib/i18n/locale). */
  alternates?: LocaleAlternate[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Replace all <link rel="alternate" hreflang=...> tags managed by Seo. */
function syncHreflang(alternates: LocaleAlternate[]) {
  // Remove the ones we previously added so stale variants don't linger on nav.
  document.head
    .querySelectorAll('link[rel="alternate"][data-seo-hreflang]')
    .forEach((el) => el.remove());
  for (const alt of alternates) {
    const el = document.createElement('link');
    el.setAttribute('rel', 'alternate');
    el.setAttribute('hreflang', alt.hreflang);
    el.setAttribute('href', alt.href.startsWith('http') ? alt.href : `${SITE}${alt.href}`);
    el.setAttribute('data-seo-hreflang', '');
    document.head.appendChild(el);
  }
}

export function Seo({ title, description, canonical, image, type = 'website', noindex = false, locale = 'en', alternates }: SeoProps) {
  useEffect(() => {
    const path = canonical ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
    const url = path.startsWith('http') ? path : `${SITE}${path}`;
    const img = image ?? DEFAULT_IMAGE;

    document.title = title;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'hi' ? 'hi' : 'en';
    }
    upsertMeta('name', 'description', description);
    upsertLink('canonical', url);

    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:locale', HREFLANG[locale].replace('-', '_'));

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', img);

    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    syncHreflang(noindex ? [] : (alternates ?? []));
  }, [title, description, canonical, image, type, noindex, locale, alternates]);

  return null;
}
