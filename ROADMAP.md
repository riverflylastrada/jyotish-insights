# Roadmap — Jyotish Sage

This document tracks the direction of the project. It is grounded in the current
state of the codebase: what already works, what is stubbed, and where the
highest-leverage improvements are. Dates are intentionally omitted; items are
grouped by horizon and theme.

**Legend:** ✅ done · 🟡 partial / in progress · ⬜ planned · 💡 idea

---

## Where we are today

The platform delivers a **Swiss-Ephemeris-grade** engine: 16 divisional charts,
Vimshottari + Yogini + Ashtottari + Jaimini Chara dashas, yogas, doshas,
Ashtakavarga, Panchang, **six-source Shadbala**, **Bhava Bala**, **KP (with
Placidus cuspal sub-lords)**, full **Jaimini** (Chara Karakas, Karakamsa, Arudha,
Chara Dasha), **Varshphal** (annual chart, Muntha, Year Lord, Tajik yogas),
transits, 36-point compatibility, the multi-Guru debate engine, auth, a chart
library with public sharing, an admin panel, and PDF report export. Every
calculation is JHora-validated by a **parity harness** + **CI** on each PR.

**Engine vs. UI:** all of the above is computed and fed to the Guru Debate
dossier, but many of the newer outputs have **no dedicated front-end view yet**
— that's the upcoming **UI/UX phase** (see below). The **core engine is now
feature-complete**; only optional items remain (Kalachakra dasha, Muhurta,
expanded yoga catalog). Product gaps: transit alerts, monetization.

---

## Recently shipped ✅

- ✅ **Grounded Guru Debate.** Replaced the lossy chart context with a modular
  ~17-section **chart dossier** ([dossier.ts](supabase/functions/guru-debate/dossier.ts)):
  server-computed live transits (houses from Lagna and Moon), authoritative Sade
  Sati phase, multi-level dashas, gender, yogas/doshas, Ashtakavarga, Shadbala,
  divisional summaries, KP and Jaimini sections.
- ✅ **Anti-hallucination guardrail** — gurus must reason only from provided
  data and state computed values (e.g. the Sade Sati phase) verbatim. Fixed the
  bug where gurus placed the same planet in different signs on the same day.
- ✅ **Truncation retry** — the client captures `finish_reason` and retries
  short/cut-off readings up to twice instead of showing them as complete.
- ✅ **KP sub-lord engine** ([kp.ts](supabase/functions/calculate-kundli/kp.ts)) —
  planet sub-lords (sign/star/sub) and Ruling Planets.
- ✅ **Jaimini engine** ([jaimini.ts](supabase/functions/calculate-kundli/jaimini.ts)) —
  8 Chara Karakas (Rahu reversed), Karakamsa, Arudha Padas (AL/UL with exception
  handling), surfaced as first-class chart data.
- ✅ **Self-updating snapshots** — saved charts are version-stamped and
  auto-recalculate when the engine gains new data (no manual "Recalculate").
- ✅ **Swiss-Ephemeris-grade positions** — VSOP87 planets + ELP-2000/82 Moon,
  IAU nutation, true/mean node; matches Swiss Ephemeris to the arc-minute
  (replaced the Keplerian ~0.5° engine).
- ✅ **KP Placidus cuspal sub-lords** + Ruling Planets (sub-arcminute cusp parity).
- ✅ **Jaimini Chara Dasha** (KN Rao method, dual lords).
- ✅ **Six-source Shadbala** ([shadbala.ts](supabase/functions/calculate-kundli/shadbala.ts)) —
  Sthana/Dig/Kala/Cheshta/Naisargika/Drik in Rupas, **validated against
  Jagannatha Hora to ±0.03 Rupa** across 3 reference charts.
- ✅ **Parity harness + CI** — [parity_test.ts](supabase/functions/calculate-kundli/parity_test.ts)
  diffs positions vs Swiss Ephemeris and Shadbala vs JHora;
  [CI](.github/workflows/ci.yml) runs all suites (141 Deno + 10 Vitest) per PR.
- ✅ **CONTRIBUTING.md + repo auto-mirror** — codified conventions
  (parity-over-plausibility, version bumps) and a workflow that mirrors `main`
  to the fork.
- ✅ **PDF report export** — `render-report` renders the dossier to a multi-page
  PDF via PDFShift (key configured in Admin → API Keys).
- ✅ **Bhava Bala** ([bhavabala.ts](supabase/functions/calculate-kundli/bhavabala.ts)) —
  house strength (Bhavadhipathi + Dig + Drishti) in Rupas, JHora-validated.
- ✅ **Yogini + Ashtottari dashas** ([yogini.ts](supabase/functions/calculate-kundli/yogini.ts),
  [ashtottari.ts](supabase/functions/calculate-kundli/ashtottari.ts)) — Maha + Antar, JHora-validated.
- ✅ **Varshphal (Tajik annual chart)** ([varshphal.ts](supabase/functions/calculate-kundli/varshphal.ts)) —
  solar return, Muntha, Year Lord (full Panchavargeeya-Bala tie-break), JHora-validated.
- ✅ **Tajik yogas** ([tajik_yogas.ts](supabase/functions/calculate-kundli/tajik_yogas.ts)) —
  Ithasala, Eesarpha, Ishkavala, Induvara, Nakta, Yamaya on the annual chart, JHora-validated.
- ✅ **KP 4-fold house significators** ([kp.ts](supabase/functions/calculate-kundli/kp.ts)) —
  occupants / occupants' star-lords / owner / owner's star-lords per house, with
  Rahu/Ketu node agency. (Rule-validated; **completes the KP system**.)
- ✅ **Chara Dasha antardasha** ([jaimini.ts](supabase/functions/calculate-kundli/jaimini.ts)) —
  KN Rao sub-periods on the existing Maha-level dasha. Along the way the Maha
  rule was corrected to match JHora (Savya/Apasavya direction + stronger-co-lord
  durations for dual-lord signs); GJC & Rajiv now match PyJHora exactly.
- ✅ **Jaimini extras** ([special_lagna.ts](supabase/functions/calculate-kundli/special_lagna.ts)) —
  Special Lagnas (Bhava/Hora/Ghati/Vighati/Pranapada/Sree, all ≤0.06°) and
  Argala / Virodha Argala. **Completes the Jaimini system.**
- ✅ **Vargeeya Bala** ([vargeeya_bala.ts](supabase/functions/calculate-kundli/vargeeya_bala.ts)) —
  Pancha-vargeeya (±0.1) and Dwadasa-vargeeya (exact) divisional strength.
  **Completes the strength suite.**

> All engine work above is validated against **Jagannatha Hora (PyJHora)** and
> surfaced in the Guru Debate dossier — but **not yet in dedicated UI** (see the
> UI/UX phase). With this, the **core engine is feature-complete**; only
> optional items remain (below), and the next major focus is the UI/UX phase.

---

## Near-term

### Optional engine additions (the core engine is otherwise complete)
- ⬜ **More dasha systems** — Kalachakra (and other nakshatra dashas) as desired.
- ⬜ **Muhurta** (electional) and an **expanded yoga catalog** — see Mid-term.
- ⬜ **House systems** (Placidus/Sripati/Equal as selectable) — parked for the
  UI/UX phase (it's a user setting).

### Engine accuracy polish
- ⬜ **Exact Lahiri ayanamsa.** A ~0.007° systematic delta vs Swiss Ephemeris's
  Lahiri remains (our linear-precession formula). Match SwissEph's Lahiri model
  to close it. (Well below arc-minute; cosmetic.)
- ⬜ **Full Shadbala extras** — Ishta/Kashta phala and Vimsopaka bala, building
  on the shipped six-source Shadbala.

### Quality & testing
- 🟡 **Engine unit coverage.** KP, Jaimini, Shadbala, the dossier, and a
  Swiss-Eph/JHora parity harness are covered; extend to vedic, divisional,
  dashas, yogas, doshas, ashtakavarga, panchang with golden-snapshot tests.

### Provider layer
- 🟡 **Finish the provider abstraction.** `normalizers.ts` is a no-op and the
  `vedicrishi` provider is a stub. `custom` is confirmed working against the
  edge function; remove dead paths or complete the VedicRishi adapter.

---

## UI/UX phase — surface the engine in the app

**The plan: finish the engine features, then build the UI for them.** Every
calculation below is computed and used by the Guru Debate gurus, but has **no
dedicated front-end view** yet. This is the next major phase after the engine
finishers.

| Engine feature | Front-end work |
|----------------|----------------|
| Shadbala | ⬜ Planet-strength view (six balas + total Rupas + rank) — new section in ChartDetail or a "Strengths" page |
| Bhava Bala | ⬜ House-strength view (bar chart / heatmap), alongside Shadbala |
| Yogini + Ashtottari dashas | ⬜ Add as selectable systems on the **Dashas** page (currently Vimshottari only) |
| Varshphal (annual chart) | ⬜ New **Varshphal** page: annual chart wheel, Muntha, Year Lord, year selector |
| Tajik yogas | ⬜ Show active Tajik yogas within the Varshphal view |
| KP (sub-lords, cuspal sub-lords, Ruling Planets, significators) | ⬜ New **KP** page: planet/cusp sub-lord tables + 4-fold significators |
| Jaimini (Chara Karakas, Karakamsa, Arudha, Chara Dasha) | ⬜ New **Jaimini** page or section |
| Navigation / IA | ⬜ Surface the new pages in the app nav; tie into the per-feature routes that already exist as placeholders |

Cross-cutting UI/UX (also in this phase): responsive/mobile polish,
accessibility pass, loading/empty/error states, and visual consistency across
the new views.

---

## Mid-term

### Additional classical systems
- ⬜ **More dasha systems** — Kalachakra (Vimshottari, Yogini, Ashtottari, and
  Jaimini Chara dasha already ship).
- ⬜ **Multiple house systems in the chart.** Whole Sign is the default and
  **Placidus cusps already exist** (computed for KP). Expose Placidus as a
  selectable house system and add Sripati/Equal (`profiles.house_system` already
  stores the preference). *(Best paired with the UI/UX phase — it's a
  user-selectable setting, and changing the default house assignment is risky.)*
- ⬜ **Expanded yoga catalog** — grow well beyond the current 15+, organized by
  category with cancellation rules.

### Features
- 🟡 **Muhurta (electional astrology).** A route exists; build out
  auspicious-timing selection (Panchang-driven, with Choghadiya/Hora).
- ⬜ **Transit alerts & notifications.** Promised by the "Acharya" pricing tier;
  detect significant gochara/Sade Sati events and notify users.
- ⬜ **Annual chart (Varshphal / Tajik).** Solar-return chart and year analysis.
- 💡 **RAG-backed citations** for the Guru debate — ground readings in the
  actual source texts (BPHS, Saravali, Phaladeepika) for verifiable quotes.

### Monetization & accounts
- ⬜ **Billing integration.** Pricing tiers (Free / Pro / Acharya) are shown on
  the landing page but not enforced. Integrate a payment provider
  (Razorpay/Stripe) and a `subscriptions` table.
- ⬜ **Plan gating** — enforce limits (saved charts, vargas, debate access,
  exports) per tier.
- ⬜ **Usage metering** for LLM debate calls, surfaced in the admin dashboard.

---

## Long-term

- ⬜ **Internationalization** — full Hindi UI and Devanagari rendering
  throughout (fonts are already loaded).
- ⬜ **Mobile / PWA** — installable, offline-capable chart viewing.
- ⬜ **Prashna (horary) astrology** — charts cast for the moment of a question.
- ⬜ **Collaboration / consultations** — let a professional astrologer annotate
  and share reports with clients.
- 💡 **Public API** — expose the calculation engine as a documented API for
  third-party developers.
- 💡 **Chart comparison & synastry** beyond Ashta Koota — composite charts and
  full relationship transits.

---

## Cross-cutting / hygiene

- ⬜ **Accessibility pass** (keyboard nav, ARIA, contrast) across all pages.
- ⬜ **Performance** — profile and lazy-load heavy routes; extend the
  version-stamped snapshot cache in `useKundli`.
- ⬜ **Security review** of RLS policies and the public share-token path.
- ⬜ **Observability** — structured logging and error tracking for edge
  functions.
- 🟡 **Documentation** — CONTRIBUTING.md ships; still want engine math notes and
  an ADR log.

---

## How to contribute to the roadmap

Open an issue describing the system, calculation, or feature, and reference the
relevant module (e.g. `supabase/functions/calculate-kundli/dashas.ts`). For
engine work, include a reference calculation (AstroSage / Jagannatha Hora) so we
can validate parity.
