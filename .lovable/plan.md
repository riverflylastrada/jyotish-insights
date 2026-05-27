# Implement UI_UX_PLAN.md — surface engine outputs in the app

Frontend-only work in `src/`. Reads from `useKundli(id)` → `KundliData`. All new fields treated as optional with graceful empty states. Reuses existing tokens, fonts, shadcn/ui, `KundliChart`, `PLANET_LABELS`, `SIGN_NAMES`.

## Scope

### 1. New page: Strengths — `/app/chart/:id/strengths`
`src/pages/app/Strengths.tsx` with three tabbed sections:
- **Shadbala** — table of 7 planets × 6 balas (in Rupas) + Total Rupas / Required / Ratio; small stacked bar per planet for the six components; highlight strongest/weakest from `rank`; flag `ratio < 1`.
- **Bhava Bala** — 12-house bar chart of `totalRupas`; label strongest/weakest from `rank`.
- **Vargeeya Bala** — per planet, two small bars: Pancha value and Dwadasa count (/12).

### 2. New page: KP — `/app/chart/:id/kp`
`src/pages/app/Kp.tsx`:
- Planet Sub-Lords table (planet, signLord, starLord, subLord).
- Cuspal Sub-Lords table (12 cusps) — optional.
- Ruling Planets compact card — optional.
- House Significators — per-house A/B/C/D chips + `nodesActingFor` — optional.

### 3. New page: Jaimini — `/app/chart/:id/jaimini`
`src/pages/app/Jaimini.tsx`:
- Chara Karakas table (AK highlighted) + Karakamsa card.
- Arudha Padas table.
- Chara Dasha timeline (Gantt-style mirroring Vimshottari treatment), current sign marked, expandable antardasha rows when present.
- Special Lagnas table.
- Argala per-house view (argala vs virodha planets).

### 4. New page: Varshphal — `/app/chart/:id/varshphal`
`src/pages/app/Varshphal.tsx`:
- Header: "Year N" + Varsha Pravesh date (derived from JD).
- Annual chart wheel via reused `KundliChart` (synthesize a minimal KundliData-shaped object from `varshphal.planets` + `annualAscSign/Deg`).
- Muntha (sign + house) and Year Lord cards.
- Tajik yogas: active ithasala/eesarpha/nakta/yamaya pairs with planet labels and `ithasalaType` chip; ishkavala/induvara badges.

### 5. Enhance Dashas — `/app/chart/:id/dashas`
Refactor `src/pages/app/Dashas.tsx` to a Tabs UI keyed off `chart.dashas` array (`system` discriminator). Tabs: Vimshottari (existing treatment), Yogini, Ashtottari — only render tabs for systems present in the array. Reuse the existing timeline component for each system since all share the `DashaPeriod` shape with `children`.

### 6. Navigation integration
- `src/App.tsx` — register 4 new routes under `/app/chart/:id`: `strengths`, `kp`, `jaimini`, `varshphal`.
- `src/pages/app/ChartDetail.tsx` (~line 233) — add matching entries to the module grid with lucide-react icons, grouped sensibly (e.g. a "Strength & Bala" group around Strengths/Shadbala and an "Advanced systems" group for KP / Jaimini / Varshphal).

## Technical notes

- Each page guards on `isLoading` and on each optional field — when missing, render a tasteful empty state ("Recalculate this chart to generate …"), never throw.
- Convert virupas → rupas by `/60` for display; show 2 decimals; use `font-mono` for all numeric cells.
- Highlights use semantic tokens (`semantic-positive` / `semantic-negative`, `brand-saffron` / `brand-gold`); no raw colors. Display headings use `font-display` (Fraunces); Devanagari uses `font-deva` (Tiro) via `SIGN_NAMES_DEVA` / `PLANET_LABELS[x].deva` where appropriate.
- Bars are simple Tailwind divs with width % — no new chart lib.
- Varshphal wheel: build a small adapter that maps `VarshphalPlanetData[]` + ascendant into the shape `KundliChart` expects (ascendant `PlanetPosition` + `planets` array); house numbers come straight from `houseNumber`.
- Chara Dasha timeline reuses the same row component used by Vimshottari (extract from `Dashas.tsx` into `src/components/dashas/DashaTimeline.tsx` during the Dashas refactor so Jaimini's page can import it).
- All pages responsive (stack on mobile, multi-column on desktop), match existing research-terminal aesthetic.

## Files touched

New:
- `src/pages/app/Strengths.tsx`
- `src/pages/app/Kp.tsx`
- `src/pages/app/Jaimini.tsx`
- `src/pages/app/Varshphal.tsx`
- `src/components/dashas/DashaTimeline.tsx` (extracted)
- Small per-page section components as needed (kept colocated)

Modified:
- `src/App.tsx` (4 routes)
- `src/pages/app/ChartDetail.tsx` (module grid entries)
- `src/pages/app/Dashas.tsx` (tabs for the 3 systems)

Untouched: `supabase/**`, `.github/**`, migrations, snapshot-version logic, `src/integrations/supabase/{client,types}.ts`.

## Acceptance

- `npm run build` and `npx tsc --noEmit -p tsconfig.app.json` clean.
- Each new page reads real fields from a recalculated `KundliData` (no mocks).
- Missing optional fields render empty states, never crash.
- Visual parity with existing pages (tokens, fonts, shadcn/ui); mobile → desktop responsive.
- No changes outside `src/`.
