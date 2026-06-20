/**
 * Slot → tweet content. Shared by social-generate (manual) and
 * social-generate-week (auto cadence). Pure: facts in from astro.ts, copy out
 * from content.ts. No DB, no network.
 */

import * as astro from "./astro.ts";
import * as tpl from "./content.ts";
import { getAllReadings, RASHIS, type Locale } from "./rashifal.ts";
import type { TransitEvent } from "./astro.ts";

export type ContentType = "panchang" | "rashifal" | "transit" | "rashi_effect";

export interface SlotPlace { lat: number; lon: number; tzOffsetHours: number; tz: string }

export interface BuildOpts extends SlotPlace {
  content_type: ContentType;
  variant?: string | null;
  dateISO: string;
  rashi?: string | null;
  locale: Locale;
  includeLink: boolean;
  transit?: TransitEvent | null; // supplied by generate-week; auto-detected if absent
}

/** Map a rashi label (sanskrit / western / devanagari) to its 0-based index, or -1. */
export function rashiNameToIndex(name: string | null | undefined): number {
  if (!name) return -1;
  const n = name.trim().toLowerCase();
  const r = RASHIS.find((x) => x.sanskrit.toLowerCase() === n || x.western.toLowerCase() === n || x.devanagari === name.trim());
  return r ? r.index : -1;
}

/** First upcoming transit at/after dateISO within `days`; major-only if requested. */
export function nextTransit(dateISO: string, place: SlotPlace, days: number, majorOnly: boolean): TransitEvent | null {
  const to = astro.detectTransits(dateISO, addDays(dateISO, days), place.lat, place.lon, place.tzOffsetHours, place.tz);
  const list = majorOnly ? to.filter((e) => e.major && e.type === "ingress") : to;
  return list[0] ?? null;
}

function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function buildSlotContent(o: BuildOpts): tpl.TweetContent {
  const place: SlotPlace = { lat: o.lat, lon: o.lon, tzOffsetHours: o.tzOffsetHours, tz: o.tz };

  switch (o.content_type) {
    case "panchang": {
      const p = astro.getPanchang(o.dateISO, o.lat, o.lon, o.tzOffsetHours);
      return o.variant === "muhurat" ? tpl.buildMuhurat(p, o.locale) : tpl.buildPanchang(p, o.locale);
    }

    case "rashifal": {
      const p = astro.getPanchang(o.dateISO, o.lat, o.lon, o.tzOffsetHours);
      if (o.variant === "rashifal_thread") {
        const readings = getAllReadings("daily", p.moonRashiIndex, o.locale);
        return tpl.buildRashifalThread(p, readings, o.locale);
      }
      return tpl.buildRashifalHook(p, o.locale);
    }

    case "transit": {
      const ev = o.transit ?? nextTransit(o.dateISO, place, 60, false);
      if (!ev) {
        return { body: o.locale === "hi" ? "अगले 60 दिनों में कोई बड़ा गोचर नहीं — गोचर अलर्ट घटना-आधारित हैं।" : "No major sign-ingress in the next 60 days — transit alerts are event-driven." };
      }
      return tpl.buildTransit(ev, o.locale);
    }

    case "rashi_effect": {
      if (o.variant === "proof_flex") {
        const ev = o.transit ?? nextTransit(o.dateISO, place, 120, true);
        const sample = ev ? astro.getRashiEffect(ev.toSign, 0, o.locale) : null;
        return tpl.buildProofFlex(ev, sample, o.includeLink, o.locale);
      }
      const ev = o.transit ?? nextTransit(o.dateISO, place, 120, true);
      if (!ev) {
        return { body: o.locale === "hi" ? "अगले 120 दिनों में कोई बड़ा गोचर नहीं।" : "No major transit in the next 120 days." };
      }
      const idx = rashiNameToIndex(o.rashi);
      if (idx >= 0) {
        const e = astro.getRashiEffect(ev.toSign, idx, o.locale);
        const graha = o.locale === "hi" ? ev.grahaHi : ev.graha;
        return { body: `${graha} → ${e.rashi[o.locale === "hi" ? "devanagari" : "western"]}: ${e.text}` };
      }
      return tpl.buildRashiEffect(ev, astro.getAllRashiEffects(ev.toSign, o.locale), o.locale);
    }
  }
}
