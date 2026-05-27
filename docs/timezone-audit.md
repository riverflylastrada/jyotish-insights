# Timezone Audit — `getUTC*` / `new Date()` / `Date.now()` usage

Classified every current-time usage across `src/` and `supabase/functions/`
as INSTANT (keep UTC), CIVIL (localize to user tz), or LOCATION-dependent
(needs lat/lon + timezone).

## Classification

### INSTANT — correct as-is (UTC epoch comparison)

These use `Date.now()` or `new Date(iso).getTime()` purely for comparing
stored ISO-8601 dasha/period boundaries. Since the boundaries themselves are
UTC timestamps and the comparison is "is now inside this range?", UTC is the
correct frame. No localization needed.

| File | Line(s) | Pattern | Notes |
|------|---------|---------|-------|
| `src/components/dashas/DashaTimeline.tsx` | 22–37, 51, 57–58, 80–81, 129–130, 161–162, 190–191 | `Date.now()`, `new Date(p.startDate).getTime()` | Dasha timeline range checks |
| `src/pages/app/Dashboard.tsx` | 209, 214–215, 237–238, 257–258, 265–266 | `Date.now()`, `new Date(…).getTime()` | Active dasha detection |
| `src/pages/app/ChartDetail.tsx` | 37 | `Date.now()`, `new Date(c.startDate/endDate)` | Current antar-dasha detection |
| `src/pages/app/Jaimini.tsx` | 207–208, 211, 225–226, 259–260, 288–289 | `Date.now()`, `new Date(p.startDate)` | Chara Dasha timeline |
| `src/stores/useDebateStore.ts` | 27 | `Date.now()` | History timestamp (UI-only) |
| `src/pages/app/Varshphal.tsx` | 23 | `new Date((jd - …) * …)` | JD→Date conversion |
| `src/pages/app/NewChart.tsx` | 379 | `new Date(utcMillis)` | Formatting UTC millis for display |
| `src/lib/astro/providers/mock.ts` | 91–114, 191 | `new Date(…)`, `Date.now()` | Mock data generation, all internal |
| `src/lib/astro/sun.ts` | 183, 233 | `new Date(Date.UTC(…))`, `new Date()` | JD→UTC conversion, localDateInTz default instant |
| `supabase/functions/calculate-kundli/dashas.ts` | 27, 65, 71, 86, 100–102, 106, 128–129, 137–138 | `new Date()`, `Date.now()` | Dasha computation + active detection |
| `supabase/functions/calculate-kundli/ashtottari.ts` | 51, 113, 118, 131–133, 141, 152–153 | Same pattern | Ashtottari Dasha |
| `supabase/functions/calculate-kundli/yogini.ts` | 74, 110, 116, 130–132, 139, 148–149 | Same pattern | Yogini Dasha |
| `supabase/functions/calculate-kundli/kalachakra.ts` | 84, 193, 198, 211–213, 222, 230–231 | Same pattern | Kalachakra Dasha |
| `supabase/functions/calculate-kundli/jaimini.ts` | 350, 440, 445, 451, 455 | Same pattern | Chara Dasha |
| `supabase/functions/calculate-kundli/engine.ts` | 135, 237, 255–260, 349 | `new Date(…)`, `Date.now()` | Birth date parsing, generatedAt, active dasha, egress JD |
| `supabase/functions/calculate-kundli/engine.ts` | 282–285 | `now.getUTC*()` | Transit JD from current UTC instant |
| `supabase/functions/guru-debate/index.ts` | 81 | `new Date()` | Passed to dossier for "today" (UTC instant) |
| `supabase/functions/render-report/index.ts` | 14 | `new Date(iso)` | ISO string parsing |
| `supabase/functions/guru-debate/dossier_test.ts` | 427, 707 | `new Date("…Z")` | Fixed test instants |
| `supabase/functions/calculate-kundli/jaimini_test.ts` | 165 | `new Date('1980-08-15')` | Fixed test date |
| `supabase/functions/calculate-kundli/kp_test.ts` | 100, 110 | `new Date('…Z')` | Fixed test dates |
| `supabase/functions/calculate-kundli/varshphal.ts` | 430 | `new Date()` | Current time for return chart (UTC instant is correct) |
| `src/pages/admin/AdminUsers.tsx` | 21 | `new Date(iso)` | ISO → display (uses `toLocaleDateString`, browser-local) |

### CIVIL — already fixed in Phase 1

| File | Line(s) | Pattern | Notes |
|------|---------|---------|-------|
| `supabase/functions/guru-debate/dossier.ts` | 64–81 | `localDateParts()` with `getUTC*` | **Already localized** — Phase 1 added `tzName` param; when present uses `Intl.DateTimeFormat` with user's IANA tz. The `getUTC*` fallback path only fires when tzName is unavailable (legacy clients). |
| `supabase/functions/guru-debate/dossier.ts` | 32 | `getUTCMonth()`, `getUTCFullYear()` | `monthYear()` helper — formats stored ISO dates (not "now"). These are historical dates, correctly UTC. |
| `supabase/functions/guru-debate/dossier.ts` | 290–383 | `Date.now()`, `new Date(a.startDate)` | Active dasha/transit detection — INSTANT pattern, correct. |

### LOCATION-dependent — fixed in PR B

| File | Line(s) | Pattern | Notes |
|------|---------|---------|-------|
| `src/lib/astro/providers/custom.ts` | 17–24 | `new Date()` → transit computation | **Fixed in PR B**: Dashboard/Transits now pass user's current_location lat/lon instead of hardcoded coords. The `new Date()` inside `getCurrentTransits` correctly captures the UTC instant. |
| `src/pages/app/Dashboard.tsx` | 65–74 (old) | Hardcoded Ahmedabad coords | **Fixed in PR B**: uses `useCurrentLocation` hook. |
| `src/pages/app/Transits.tsx` | 20 (old) | `getCurrentTransits(0, 0)` | **Fixed in PR B**: uses `useCurrentLocation` hook. |
| `src/pages/app/Muhurta.tsx` | all | Sunrise/sunset from birth panchang | **Fixed in PR B**: computes from lat/lon via `computeSunTimes`. |

## Summary

| Category | Count | Status |
|----------|-------|--------|
| INSTANT (UTC is correct) | 105+ usages | No change needed |
| CIVIL (localize to user tz) | 6 usages in dossier.ts | Already fixed in Phase 1 |
| LOCATION-dependent | 4 call sites | Fixed in PR B |

**No remaining CIVIL or LOCATION-dependent cases that still use UTC.**
