
# Jyotish Sage — Phase 1 Plan

Goal: Lay down a production-grade foundation. Frontend-only. Mock astro provider returns realistic data so the Chart Detail view feels real. No backend, no LLM debate calls yet — those routes get polished placeholder pages so the IA is in place.

Reference birth used everywhere in mock data: 15 Aug 1980, 14:30, Ahmedabad.

---

## 1. Foundation

- Add Google Fonts to `index.html`: Fraunces, Inter Tight, JetBrains Mono, Tiro Devanagari Hindi.
- Update SEO meta (title, description, og) for Jyotish Sage.
- `src/index.css`: replace tokens with the warm-ivory editorial palette (HSL form), typography scale utilities, hairline borders, paper shadows, optional Sri Yantra background pattern utility at 4% opacity.
- `tailwind.config.ts`: extend colors (bg, text, brand saffron/maroon/gold, semantic, planet colors, borders), fontFamily (display/sans/mono/deva), fontSize for `display/h1/h2/h3/body/sm/xs/eyebrow`, boxShadow tokens, borderRadius capped at md.
- Keep all colors as HSL via CSS variables — no raw hex in components.

## 2. Provider Abstraction Layer

Folder `src/lib/astro/`:
- `types.ts` — exact types from the spec (BirthDetails, PlanetPosition, DivisionalChart, DashaPeriod, DashaSystem, Dosha, Yoga, AshtakavargaData, Remedy, KundliData, AstroProvider).
- `AstroProvider.ts` — interface re-export.
- `providers/mock.ts` — realistic Ahmedabad 1980 dataset: full D1 + D9 (others stubbed with same structure), Vimshottari timeline (3 levels deep around present), 4 doshas, ~12 yogas, ashtakavarga bindus, panchang.
- `providers/vedicrishi.ts` — class skeleton implementing the interface, methods throw `Not implemented` with TODO comments and the documented endpoint shape.
- `providers/custom.ts` — same skeleton.
- `factory.ts` — reads `import.meta.env.VITE_ASTRO_PROVIDER`, defaults to `mock`.
- `normalizers.ts` — placeholder mapping helpers.

Components NEVER import a concrete provider; they go through `getAstroProvider()`.

## 3. State & Data

- Install: `zustand`, `@tanstack/react-query` (already), `framer-motion`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`, `dayjs`.
- `src/stores/useUserStore.ts`, `useChartStore.ts`, `useDebateStore.ts` (minimal shape now).
- `src/hooks/useKundli.ts` — TanStack Query wrapper around provider, 24h staleTime.
- Seed the mock chart into the query cache on app start so `/app/chart/demo` renders instantly.

## 4. Routing

`src/App.tsx` routes:
- `/` Landing
- `/login`, `/signup` — minimal placeholder forms (no auth yet)
- `/app` Dashboard (recent charts + CTA)
- `/app/new` New chart form
- `/app/chart/:id` Chart Detail (real)
- `/app/chart/:id/charts|dashas|doshas|yogas|ashtakvarga|transits|debate|report` — placeholder pages with proper header + "Coming in next phase" empty state
- `/app/library`, `/app/settings` — placeholder
- `*` NotFound

Add `AppLayout` with top nav (logo, breadcrumb, user menu stub) + content area.

## 5. Landing Page (fully polished)

Sections per spec: Hero, How It Works (4 steps), Meet the Gurus (5 cards), Inside a Report, Built On Classical Foundations, Pricing (3 tiers placeholder), Footer. Custom SVG North Indian Kundli illustration in hero. Subtle Framer Motion fades only.

## 6. New Chart Form

Two-step wizard with progress indicator, RHF + Zod. Step 1 birth details, Step 2 place + advanced (Ayanamsa / House System / Chart Style). Hard-coded city list (Ahmedabad, Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune, Jaipur, Surat) with manual lat/lng/timezone fallback. On submit: simulated multi-stage loading screen, then route to `/app/chart/demo` (mock).

## 7. Chart Detail (`/app/chart/:id`) — built with mock data

- Header strip: name, DOB/TOB/POB inline; chips for Lagna / Moon / Sun; actions (Save, PDF, Share, Recalculate, Open Debate — buttons wired but non-destructive).
- 12-col grid:
  - Left (4): Kundli SVG component with toggle North/South + style switch; D1 on top, D9 below; click a house highlights state via `useChartStore`.
  - Center (5): Tabs — Overview, Houses, Planets. Tables use hairline borders + JetBrains Mono for degrees.
  - Right (3): Current Snapshot — current Maha+Antar with end dates from mock, Sade Sati status, top 3 transits, "Ask the Gurus" CTA.
- Mobile: panels stack; Kundli scales to width.

## 8. Kundli SVG Component (basic, both styles)

`src/components/kundli/KundliChart.tsx`:
- Props: `chart: DivisionalChart`, `style: 'north' | 'south'`, `onHouseClick?`.
- North Indian: diamond-in-square with 12 fixed house positions, planet abbreviations (Su, Mo, Ma…) placed in correct house, sign number in corner.
- South Indian: 4x4 grid with fixed sign positions, ascendant marked with diagonal.
- Decorative gold corner ornaments, hairline maroon frame. Not interactive beyond click-to-highlight; advanced interactivity in later phase.

## 9. Polish baseline

- Skeleton loaders for chart panels.
- Empty + error states for the form.
- Footer micro-copy with DPDP-style privacy note.
- WCAG AA contrast verified for tokens.

## 10. Out of scope this phase (explicitly placeholder)

Divisional/Dashas/Doshas/Yogas/Ashtakavarga/Transits pages, Debate engine UI, Report PDF, Supabase auth + Library persistence, real VedicRishi calls. All routes exist with a styled "Available in next phase" panel so navigation feels complete.

---

## Technical notes

- `tsconfig` path alias `@/*` already set; use it everywhere.
- All env reads through `import.meta.env.VITE_*`. Provide `.env.example` documenting `VITE_ASTRO_PROVIDER=mock` and `VITE_API_BASE_URL=`.
- No Supabase/Cloud calls in this phase; auth pages are non-functional placeholders styled to match.
- Strict semantic tokens — zero hex/`text-white`/`bg-black` in components.
- Framer Motion only for hero fade-in and tab transitions; no orbits, no glow.

## Deliverable check

After this phase you can: visit landing, walk through the chart form, land on a fully populated Chart Detail view with both North & South Indian Kundli styles, navigate to every other route and see consistent placeholders.
