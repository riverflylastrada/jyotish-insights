# UI/UX Plan — surfacing the engine in the app

**Audience:** the UI/UX builder (Lovable). **Goal:** build front-end views for the
engine outputs that currently have **no UI** — they're computed and used by the
Guru Debate but a user can't see them.

> **This is a frontend-only task.** Build in `src/` only. Do **NOT** modify
> `supabase/functions/**` (the calculation engine + edge functions),
> `.github/workflows/**` (CI + repo mirror), `supabase/migrations/**`, or the
> snapshot-version logic. Work on a branch (not `main`); changes are reviewed
> before merge.

---

## 1. How the data reaches the UI

Every page already loads the chart via the **`useKundli(chartId)`** hook
([src/hooks/useKundli.ts](src/hooks/useKundli.ts)), which returns a `KundliData`
object (full type in [src/lib/astro/types.ts](src/lib/astro/types.ts)). **Read
from that — do not call the backend directly, do not invent shapes.**

```ts
const { data: chart, isLoading } = useKundli(id);
// chart.shadbala, chart.bhavaBala, chart.vargeeyaBala, chart.kp,
// chart.jaimini, chart.varshphal, chart.dashas, ...
```

**All the new fields are optional** (`?`) — older snapshots may not have them.
Always guard: if a field is missing, show a tasteful empty state ("Recalculate
this chart to generate …"), never crash.

---

## 2. Existing structure to extend (don't reinvent)

- **Routes** live in [src/App.tsx](src/App.tsx). Chart sub-pages are
  `/app/chart/:id/<slug>` (e.g. `dashas`, `yogas`, `ashtakavarga`, `transits`).
- **The chart module grid** in [src/pages/app/ChartDetail.tsx](src/pages/app/ChartDetail.tsx)
  (~line 233) is a list of `{ slug, label, icon }` linking to those sub-pages.
  **Add the new pages here** so they're discoverable.
- **Reuse `KundliChart`** ([src/components/kundli/KundliChart.tsx](src/components/kundli/KundliChart.tsx))
  for any chart-wheel rendering (North/South Indian), and `KundliBiWheel` for overlays.
- **Design system:** Tailwind tokens already defined — `brand-maroon`,
  `brand-saffron`, `brand-gold`, `text-primary/secondary/tertiary/muted`,
  `surface`, `canvas`, `elevated`, `hairline-subtle`, `semantic-positive/negative`.
  Fonts: **Fraunces** (display, `font-display`), **Inter** (body), **JetBrains
  Mono** (`font-mono`, for numbers/tables), **Tiro Devanagari** (`font-deva`).
  Use existing `shadcn/ui` components (`Card`, `Table`, `Tabs`, `Progress`,
  `Tooltip`, `Badge`). Match the calm, research-terminal aesthetic of the
  existing pages.
- **Planet labels:** use `PLANET_LABELS` from types.ts (`{short, full, deva}`)
  and `SIGN_NAMES` / `SIGN_NAMES_DEVA` for sign names.

---

## 3. New pages to build

### A. Strengths — `/app/chart/:id/strengths`
Three sections (tabs or stacked cards):

1. **Shadbala** (planet strength) — `chart.shadbala`:
   - `shadbala.planets[planet]` → `{ sthanaBala, digBala, kalaBala, cheshtaBala, naisargikaBala, drikBala, totalVirupas, totalRupas, required, ratio }`.
   - `shadbala.rank: string[]` (strongest → weakest planet).
   - Suggested viz: a table of the 7 planets (Sun–Saturn) with the six balas as columns (in Rupas = virupas/60) + **Total Rupas**, **Required**, **Ratio**; a small stacked bar per planet showing the six-component composition; highlight strongest/weakest from `rank`. Flag planets with `ratio < 1` (below required strength).

2. **Bhava Bala** (house strength) — `chart.bhavaBala`:
   - `bhavaBala.houses[]` → `{ house, bhavadhipathiBala, bhavaDigBala, bhavaDrikBala, totalVirupas, totalRupas }`; `bhavaBala.rank: number[]`.
   - Suggested viz: 12-house bar chart / heatmap of `totalRupas`, strongest/weakest labeled.

3. **Vargeeya Bala** (divisional strength) — `chart.vargeeyaBala`:
   - `vargeeyaBala.panchaVargeeya: Record<planet, number>` and `vargeeyaBala.dwadasaVargeeya: Record<planet, number>` (a count out of 12).
   - Suggested viz: per-planet two small bars (Pancha value, Dwadasa count/12).

### B. KP (Krishnamurti Paddhati) — `/app/chart/:id/kp`
`chart.kp`:
- `kp.planetSubLords[]` → `{ planet, signLord, starLord, subLord }` — a table.
- `kp.cuspalSubLords[]` (optional) → `{ cusp, longitude, signLord, starLord, subLord }` — a 12-cusp table.
- `kp.rulingPlanets` (optional) → `{ ascSignLord, ascStarLord, moonSignLord, moonStarLord, dayLord }` — a compact card.
- `kp.houseSignificators[]` (optional) → `{ house, levelA, levelB, levelC, levelD, nodesActingFor, ordered }` — per house, show the 4 levels (A strongest → D weakest) as grouped chips, plus `nodesActingFor`.

### C. Jaimini — `/app/chart/:id/jaimini`
`chart.jaimini`:
- **Chara Karakas:** `charaKarakas[]` → `{ planet, degreeInSign, karaka }` (AK→DK), and `atmakaraka` (highlight). `karakamsa: { sign, signName }`.
- **Arudha Padas:** `arudhaPadas[]` → `{ house, label, sign, signName }` (label e.g. "Arudha Lagna (AL)", "Upapada (UL)").
- **Chara Dasha:** `charaDasha.timeline[]` → `{ sign, signName, startDate, endDate, durationYears }` (Maha sign periods; **each may carry antardasha sub-periods** — render expandable rows if present). Mark the current period via `charaDasha.currentSignName`. A timeline/Gantt-style view fits well (mirror the Vimshottari Dashas page treatment).
- **Special Lagnas:** `specialLagnas[]` → `{ name, sign, signName, degree }` (Bhava/Hora/Ghati/Vighati/Pranapada/Sree) — a small table.
- **Argala:** `argala[]` → per house `{ argala: { from2nd, from4th, from5th, from11th }, virodha: { from12th, from10th, from9th, from3rd } }` — a per-house view of intervening (argala) vs counter (virodha) planets.

### D. Varshphal (annual chart) — `/app/chart/:id/varshphal`
`chart.varshphal`:
- Header: "Year N" (`years`), Varsha Pravesh date (derive from `varshaPraveshJd`).
- **Annual chart wheel:** ascendant `annualAscSign` (1–12) + `annualAscDeg`, and `planets[]` → `{ planet, signNumber, signName, signDegree, nakshatra, houseNumber, isRetrograde }`. **Reuse `KundliChart`** to render it.
- **Muntha:** `munthaSign` (1–12) + `munthaHouse`. **Year Lord (Varshesh):** `yearLord`.
- **Tajik yogas:** `tajikYogas` → `{ ithasala[], eesarpha[], nakta[], yamaya[], ishkavala, induvara }`. Show active yogas with the planet pair(s); `ithasalaType` (1/2/3) as a small label.

### E. Enhance the Dashas page — `/app/chart/:id/dashas`
Currently shows **Vimshottari only**. `chart.dashas` is now `DashaSystem[]` with
`system` ∈ `'vimshottari' | 'yogini' | 'ashtottari'` (and others later). Add a
**system selector (tabs)** so the user can switch between Vimshottari (existing
treatment), **Yogini** (36-yr), and **Ashtottari** (108-yr) — each has
`currentMahaDasha` + `timeline[]` with the same `DashaPeriod` shape (with
`children` for sub-periods). Reuse the existing timeline component.

---

## 4. Navigation integration
- Add routes for the new pages in [src/App.tsx](src/App.tsx) under the
  `/app/chart/:id` group: `strengths`, `kp`, `jaimini`, `varshphal`.
- Add matching entries to the **chart module grid** in `ChartDetail.tsx` (slug +
  label + a `lucide-react` icon), grouped sensibly (e.g. a "Strength & Bala"
  group, an "Advanced systems" group).

---

## 5. Acceptance criteria
- Builds clean: `npm ci && npm run build` and `npx tsc --noEmit -p tsconfig.app.json`.
- Each new page **reads the real `KundliData` fields above** (verified by opening
  a recalculated chart) — not mock data.
- **Graceful empty states** when an optional field is absent (older snapshot).
- Visually consistent with existing pages (tokens, fonts, shadcn/ui); responsive
  (mobile → desktop); sensible loading/empty/error states.
- **No changes outside `src/`** (engine, edge functions, CI, migrations untouched).
