# Devin spec — JHora features, batch 3 (depth: vargas, eclipse, Tripataki)

Three classical features mined from **PyJHora 4.8.6** (the parity oracle). Each is
**one PR**, independently shippable. Same proven process as batch 2.

## Lessons baked in (read first — these are non-negotiable)
1. **Parity against REAL PyJHora, not your own engine.** In your environment:
   `pip install PyJHora pyswisseph numpy scipy pandas geopy pytz geocoder
   timezonefinder` (PyJHora needs **Python 3.10+**). Compute the reference chart,
   read PyJHora's actual output, and hard-code THOSE as the expected values in the
   Deno parity test. State which PyJHora module/function you validated against.
2. **The engine has a hard edge-function CPU limit** (a lifetime ephemeris scan
   broke prod once). Keep everything O(1)/O(small) — no per-day loops over years.
   The maintainer deploys your engine to a throwaway test function to confirm no
   `WORKER_RESOURCE_LIMIT` **before merge**.

## Reference chart (for every parity test)
Born **23 Aug 1983, 15:35 IST, Patan, Gujarat** (lat 23.85, lon 72.12, tz +5.5),
Lahiri. PyJHora: `drik.Date(1983,8,23)`, `drik.Place('Patan',23.85,72.12,5.5)`.

## Shared guardrails (LOVABLE.md)
- Branch off `main`; ONE PR per feature; never commit to `main`; do NOT merge.
- Off-limits: `.env`, `.do/app.yaml`, `src/integrations/supabase/types.ts`
  (except a surgical add of your new optional field), `.github/workflows/**`,
  `supabase/migrations/**`. No `(x as any)`. No fabricated data.
- Engine work authorized: new modules under
  `supabase/functions/calculate-kundli/`, wire into `engine.ts`, and **bump
  `CURRENT_SNAPSHOT_VERSION` + engine `snapshotVersion` together**. Add a
  PyJHora-validated `*_test.ts`. Don't alter existing modules' outputs.
- Match the design system (tokens, `font-display`, page pattern, `Loader2`,
  dashed empty state). Cite the classical source in the UI. CI must pass for real.

---

## PR 1 — Divisional charts D-5, D-6, D-8, D-11 (reach 23+ vargas)
**What:** add four missing Varga charts — **D-5 Panchamsa** (fame/power), **D-6
Shashthamsa** (health), **D-8 Ashtamsa** (longevity/sudden events), **D-11
Rudramsa/Ekadasamsa** (gains/death of desires). The app currently has 19 vargas
(D1…D60, D81/108/144).

**Engine:** extend [divisional.ts](../supabase/functions/calculate-kundli/divisional.ts)
with the D-5/6/8/11 division rules (each maps a planet's sign+degree to a varga
sign). Add `'D5'|'D6'|'D8'|'D11'` to `VargaCode` in
[types.ts](../src/lib/astro/types.ts). These slot into the existing
`divisionalCharts` array — **no new page needed**.

**UI:** add tiles + display metadata for the four new vargas in
[vargaData.ts](../src/components/research/vargaData.ts) and the DivisionalCharts
grid; they automatically get the existing 🔬 interactive explorer (depth layers,
division formula on Math Proof, cross-chart `?planet=` nav). Cite BPHS Ch. 7.

**Parity:** PyJHora `charts.divisional_chart(jd, place,
divisional_chart_factor=5|6|8|11)`. Assert each planet's varga **sign** matches
PyJHora for the reference chart, for all four vargas.

---

## PR 2 — Eclipse computation + public page
**What:** compute the **next solar and lunar eclipses** (date/time, type, and
whether visible from a given place), plus a list of upcoming eclipses — and which
natal points they activate (within ±a few degrees). Eclipses are high-interest;
make the page **public** (no auth, like `/panchang` and `/mundane`) for SEO.

**Engine:** new module `eclipse.ts` computing eclipse timings from the existing
Sun/Moon/node ephemeris (Swiss-Eph-grade positions already in the engine). Return
the next solar + lunar eclipse (date, type — total/partial/annular, sidereal
sign/nakshatra) and a short upcoming list. Keep it bounded (e.g. next N eclipses,
not a lifetime scan).

**UI:** a public `Eclipses.tsx` page (route `/eclipses`, no auth — mirror the
Panchang/Mundane anon-invoke pattern), with date/location pickers, the next
solar + lunar eclipse cards, and an upcoming-eclipses list. Bilingual labels +
SEO meta + WhatsApp share. Link from the landing page.

**Parity:** PyJHora `jhora.panchanga.eclipse` (e.g. `next_solar_eclipse` /
`next_lunar_eclipse`). Assert the next eclipse date(s) match PyJHora within ±1
day for a couple of reference dates/places.

---

## PR 3 — Tripataki Chakra (transit-analysis chakra)
**What:** the **Tripataki Chakra** — a triangular/nakshatra chakra used (esp. for
Saturn/Jupiter) to judge whether a transit is benefic or malefic via the chakra
position relative to the Moon's nakshatra. Sibling of the recently-shipped
Sarvatobhadra and Kalachakra chakras.

**Engine:** new module `tripataki.ts` placing the 27 nakshatras on the Tripataki
layout and mapping natal/transit planets onto it, returning the structure the UI
needs (positions + benefic/malefic verdict per transiting planet vs natal Moon).
O(1) nakshatra math — no time scans.

**UI:** a `TripatakiChakra.tsx` page (route `/app/chart/:id/tripataki`, tile on
ChartDetail "Advanced systems") rendering the chakra with planet chips and a
benefic/malefic readout. Reuse the SVG/depth-layer pattern from
[SarvatobhadraChakra.tsx](../src/pages/app/SarvatobhadraChakra.tsx) /
[KalachakraChakra.tsx](../src/pages/app/KalachakraChakra.tsx). Cite the source.

**Parity:** PyJHora `jhora.ui.chakra` / its underlying Tripataki computation.
Assert the nakshatra→position layout and the planet placements match PyJHora for
the reference chart.

---

## Per-PR deliverable
Corrected engine module + a **PyJHora-validated** parity test (state the PyJHora
function) + UI + the snapshot-version bump. Keep it cheap. Open a PR against
`main`; do NOT merge — the maintainer cross-checks vs the PyJHora oracle and
edge-gates the deploy before merging (and integrates the batch as one unit).
