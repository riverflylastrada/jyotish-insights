# Devin spec — JHora features, batch 2 (Sudarshana, 10-Porutham, Sahams)

Three classical features mined from **PyJHora 4.8.6** (the Python port of Jagannatha
Hora, the project's parity oracle). Each is **one PR**, independently shippable.

## Lessons baked in (read first)
Two failure modes bit the last batch — both are now closed by process, and each
spec enforces them:

1. **Parity must be against REAL JHora, not your own engine.** Earlier tests
   asserted the engine's own output and passed while wrong. **Use PyJHora as the
   oracle:** in your environment, `pip install PyJHora pyswisseph numpy scipy
   pandas geopy pytz geocoder timezonefinder`, compute the reference chart, read
   the actual values, and hard-code THOSE as the expected values in the Deno
   parity test. State in the PR which PyJHora module/function you validated against.
2. **The engine has a hard edge-function CPU limit.** A lifetime ephemeris scan
   already blew it once (Saturn). These three features are cheap (no time scans) —
   keep them O(1)-ish, no per-day loops over years. The maintainer will deploy
   your engine to a throwaway test function and confirm no `WORKER_RESOURCE_LIMIT`
   **before merge** — so make it lean.

## Reference chart (use for every parity test)
Born **23 Aug 1983, 15:35 IST, Patan, Gujarat** (lat 23.85, lon 72.12, tz +5.5),
Lahiri ayanamsa. PyJHora: `drik.Date(1983,8,23)`, `drik.Place('Patan',23.85,72.12,5.5)`.
Known: Moon in **Dhanishta** (Kumbha ~3.85°), Lagna **Sagittarius**.

## Shared guardrails (LOVABLE.md)
- Branch off `main`; ONE PR per feature; never commit to `main`; do NOT merge —
  the maintainer verifies + merges.
- Do NOT touch `.env`, `.do/app.yaml`, `src/integrations/supabase/types.ts`
  (except adding your new optional field to it surgically), `.github/workflows/**`,
  `supabase/migrations/**`. No `(x as any)`. No fabricated data.
- ENGINE WORK AUTHORIZED: add NEW modules under
  `supabase/functions/calculate-kundli/`, wire into `engine.ts`, and **bump
  `CURRENT_SNAPSHOT_VERSION` (src/lib/astro/types.ts) and the engine
  `snapshotVersion` (engine.ts) together**. Add a `*_test.ts` parity test
  (PyJHora-validated). Do not alter existing modules' outputs.
- Match the design system (tokens `text-text-*`, `bg-surface/elevated/canvas`,
  `brand-maroon/saffron/gold`; `font-display`; page = `mx-auto max-w-* px-6 py-8`
  + eyebrow + h1 + intro + `Loader2` + dashed empty state). Cite the classical
  source in the UI. CI (deno tests + tsc + vitest + build) must pass for real.

---

## PR 1 — Sudarshana Chakra (सुदर्शन चक्र)
**What:** a tri-wheel overlaying three D1 rasi charts cast from three reference
points — **Lagna, Moon, and Sun** — read together for prediction (a house/event
is judged strong if confirmed from all three). Classical: BPHS / Jaimini; PVR
Narasimha Rao "Integrated Approach".

**Engine:** mostly reuses what exists — the engine already casts a chart with
`chartBasis` of rasi (Lagna), `moon` (Moon-as-Lagna), and `solar` (Sun-as-Lagna).
Add a `sudarshana` field to `KundliData` that exposes the three ascendant signs
(Lagna sign, Moon sign, Sun sign) and, per house 1–12, the planets falling in that
house **from each of the three references**, so the UI can show the tri-wheel and
"confirmed from N/3" without re-deriving. Cheap (no new ephemeris).
- Parity: PyJHora — the three rasi charts from Lagna/Moon/Sun (`charts.rasi_chart`
  with the appropriate reference). Assert the per-reference sign of each planet
  matches PyJHora for the reference chart.

**UI:** `SudarshanaChakra.tsx` (route `/app/chart/:id/sudarshana`, tile on
ChartDetail) — three concentric/side-by-side D1 wheels (reuse `KundliChart`), a
house-strength row ("confirmed from 1/2/3 references"), depth layers + citation.

---

## PR 2 — South-Indian compatibility · 10 Porutham (பத்து பொருத்தம்)
**What:** the **South-Indian** marriage-matching system (10 poruthams: Dina,
Gana, Mahendra, Stree-Dheerga, Yoni, Rasi, Rajju, Vedha, Vasya, Nadi), alongside
the existing North-Indian 36-point Ashta Koota. Expands the market to South-Indian
users. Classical: South-Indian Jyotish texts.

**Engine:** new module `south_indian_match.ts` computing the 10 poruthams from the
two charts' Moon nakshatras/rashis (boy + girl), each with met/not-met + a short
reason + classical citation, and an overall verdict. Pure nakshatra/rashi math,
O(1).
- Parity: PyJHora `jhora.horoscope.match.compatibility` (the `*_porutham`
  functions). Generate boy/girl reference pairs in PyJHora and assert each
  porutham's result matches.

**UI:** extend the existing **Compatibility** page (`/app/compatibility`) with a
"South Indian (10 Porutham)" tab next to Ashta Koota — a per-porutham ✓/✗
checklist with reasons + citations + overall score. Reuse the existing two-chart
input.

---

## PR 3 — Sahams (36 sensitive points) on the annual chart
**What:** the **36 Sahams** (Arabic-parts-style sensitive points: Punya, Vidya,
Yasas, Mitra, Mahatmya, Asha, Samartha, Bhratri, Gaurava, Pitri, … ) computed from
planetary longitudes, used in Tajik/Varshphal prediction. Deepens the existing
**Varshphal** feature. Classical: Tajik texts / Varshphal.

**Engine:** new module `sahams.ts` — each saham = a formula on natal (or annual)
planet/lagna longitudes (e.g. Punya = Moon + (Sun→Moon arc), day/night variants).
Return each saham's longitude, sign, nakshatra, and the house it falls in. O(1).
- Parity: PyJHora `jhora.horoscope.transit.saham` (`punya_saham`, `vidya_saham`,
  …). Assert each saham's longitude/sign matches PyJHora for the reference chart
  (within ±0.5°). Honour the day/night birth rule (Sun above/below horizon).

**UI:** add a "Sahams" section to the **Varshphal** page — a table (Saham | Sign |
Nakshatra | House | meaning) with citations; optionally plot on the annual wheel.

---

## Per-PR deliverable
Corrected engine module + a **PyJHora-validated** parity test (stating the PyJHora
function used) + the UI + the snapshot-version bump. Keep it cheap (no time scans).
Open a PR against `main`; do NOT merge — the maintainer edge-gates the deploy first.
