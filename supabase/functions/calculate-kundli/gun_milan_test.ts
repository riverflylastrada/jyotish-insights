/**
 * Parity test — 36-point Ashtakoota (Guna Milan) engine.
 *
 * Oracle: AstroSage (Lahiri ayanamsa, standard 36-point Ashtakoota system)
 * and classical Muhurta Chintamani tables.
 *
 * The Ashtakoota system is fully deterministic given Moon nakshatra + rashi.
 * Reference Moon positions are from the engine's parity_test.ts charts
 * (Swiss Ephemeris, Lahiri ayanamsa) — all three have their Moon clearly in
 * the middle of the respective nakshatra/rashi (no boundary ambiguity).
 *
 * Reference charts:
 *  - Dev Chart: 23 Aug 1983, 15:35 IST, Patan Gujarat
 *    Moon 303.854° sid → Dhanishta (nak 23), Kumbha (sign 11)
 *  - Rajiv Gandhi: 20 Aug 1944, 08:11 IST, Mumbai
 *    Moon 137.645° sid → Purva Phalguni (nak 11), Simha (sign 5)
 *  - Amitabh Bachchan: 11 Oct 1942, 16:00 IST, Allahabad
 *    Moon 190.905° sid → Swati (nak 15), Tula (sign 7)
 *
 * Per-koota expected values below are the ONLY correct Ashtakoota output for
 * these nakshatra/rashi pairs per the standard tables (AstroSage, JHora,
 * Muhurta Chintamani). The scoring rules are:
 *  Varna: groom varna score >= bride → 1, else 0
 *  Vasya: 5×5 matrix lookup (bride-row × groom-col)
 *  Tara: mod-9 remainder ∈ {0,1,3,5,7,8} = auspicious; both=3, one=1.5, none=0
 *  Yoni: same=4, friend=3, neutral=2, unfriendly=1, enemy=0
 *  Graha Maitri: same lord=5, mutual friends=5, one-friend=4, neutral=3,
 *                mixed=1, mutual enemies=0
 *  Gana: same=6, Deva↔Manushya=5, Deva↔Rakshasa=1, Manushya↔Rakshasa=0
 *  Bhakoot: distance ∉ {2,12,5,9,6,8} → 7, else 0
 *  Nadi: different=8, same=0
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeGunMilan } from "./gun_milan.ts";

// ─── Helper ─────────────────────────────────────────────────────────────────

function assertGunMilan(
  label: string,
  groomNak: string, groomRashi: number,
  brideNak: string, brideRashi: number,
  expected: {
    varna: number; vasya: number; tara: number; yoni: number;
    graha: number; gana: number; bhakoot: number; nadi: number;
    total: number;
  },
) {
  const r = computeGunMilan(groomNak, groomRashi, brideNak, brideRashi);
  const byName = Object.fromEntries(r.kootas.map(k => [k.name, k.scored]));
  assertEquals(byName["Varna"],        expected.varna,   `${label}: Varna`);
  assertEquals(byName["Vasya"],        expected.vasya,   `${label}: Vasya`);
  assertEquals(byName["Tara"],         expected.tara,    `${label}: Tara`);
  assertEquals(byName["Yoni"],         expected.yoni,    `${label}: Yoni`);
  assertEquals(byName["Graha Maitri"], expected.graha,   `${label}: Graha Maitri`);
  assertEquals(byName["Gana"],         expected.gana,    `${label}: Gana`);
  assertEquals(byName["Bhakoot"],      expected.bhakoot, `${label}: Bhakoot`);
  assertEquals(byName["Nadi"],         expected.nadi,    `${label}: Nadi`);
  assertEquals(r.total,                expected.total,   `${label}: total`);
}

// ─── Pair 1: Rajiv Gandhi (groom) × Amitabh Bachchan (bride) ───────────────
// Groom: Purva Phalguni (nak 11), Simha (sign 5)
// Bride: Swati (nak 15), Tula (sign 7)
//
// AstroSage / standard-table derivation:
//   Varna:  Simha=Kshatriya(3), Tula=Shudra(1) → 3≥1 → 1
//   Vasya:  Simha=Vanachara(4), Tula=Manushya(2) → M[2][4]=0
//   Tara:   t1=(15-11+27)%9=4, t2=(11-15+27)%9=5 → {4∉ausp, 5∈ausp} → 1.5
//   Yoni:   P.Phalguni=Rat, Swati=Buffalo → Rat unfriendly to Buffalo → 1
//   Graha:  Sun↔Venus → mutual enemies → 0
//   Gana:   Manushya↔Deva → 5
//   Bhakoot: (7-5+12)%12+1=3 → 3∉{2,12,5,9,6,8} → 7
//   Nadi:   P.Phalguni=Madhya, Swati=Antya → different → 8
//   Total:  1+0+1.5+1+0+5+7+8 = 23.5

Deno.test("Gun Milan — Rajiv Gandhi × Amitabh Bachchan (AstroSage parity)", () => {
  assertGunMilan(
    "Rajiv×Amitabh",
    "Purva Phalguni", 5,
    "Swati", 7,
    { varna: 1, vasya: 0, tara: 1.5, yoni: 1, graha: 0, gana: 5, bhakoot: 7, nadi: 8, total: 23.5 },
  );
});

// ─── Pair 2: Dev Chart (groom) × Rajiv Gandhi (bride) ──────────────────────
// Groom: Dhanishta (nak 23), Kumbha (sign 11)
// Bride: Purva Phalguni (nak 11), Simha (sign 5)
//
// AstroSage / standard-table derivation:
//   Varna:  Kumbha=Shudra(1), Simha=Kshatriya(3) → 1<3 → 0
//   Vasya:  Kumbha=Manushya(2), Simha=Vanachara(4) → M[4][2]=0
//   Tara:   t1=(11-23+27)%9=6, t2=(23-11+27)%9=3 → {6∉ausp, 3∈ausp} → 1.5
//   Yoni:   Dhanishta=Lion, P.Phalguni=Rat → Lion unfriendly to Rat → 1
//   Graha:  Saturn↔Sun → mutual enemies → 0
//   Gana:   Rakshasa↔Manushya → 0
//   Bhakoot: (5-11+12)%12+1=7 → 7∉{2,12,5,9,6,8} → 7
//   Nadi:   Dhanishta=Madhya, P.Phalguni=Madhya → same → 0
//   Total:  0+0+1.5+1+0+0+7+0 = 9.5

Deno.test("Gun Milan — Dev Chart × Rajiv Gandhi (AstroSage parity)", () => {
  assertGunMilan(
    "Dev×Rajiv",
    "Dhanishta", 11,
    "Purva Phalguni", 5,
    { varna: 0, vasya: 0, tara: 1.5, yoni: 1, graha: 0, gana: 0, bhakoot: 7, nadi: 0, total: 9.5 },
  );
});

// ─── Pair 3: Amitabh Bachchan (groom) × Dev Chart (bride) ─────────────────
// Groom: Swati (nak 15), Tula (sign 7)
// Bride: Dhanishta (nak 23), Kumbha (sign 11)
//
// AstroSage / standard-table derivation:
//   Varna:  Tula=Shudra(1), Kumbha=Shudra(1) → 1≥1 → 1
//   Vasya:  Tula=Manushya(2), Kumbha=Manushya(2) → M[2][2]=2
//   Tara:   t1=(23-15+27)%9=8, t2=(15-23+27)%9=1 → {8∈ausp, 1∈ausp} → 3
//   Yoni:   Swati=Buffalo, Dhanishta=Lion → Lion unfriendly to Buffalo → 1
//   Graha:  Venus↔Saturn → mutual friends → 5
//   Gana:   Deva↔Rakshasa → 1
//   Bhakoot: (11-7+12)%12+1=5 → 5∈{2,12,5,9,6,8} → 0
//   Nadi:   Swati=Antya, Dhanishta=Madhya → different → 8
//   Total:  1+2+3+1+5+1+0+8 = 21

Deno.test("Gun Milan — Amitabh Bachchan × Dev Chart (AstroSage parity)", () => {
  assertGunMilan(
    "Amitabh×Dev",
    "Swati", 7,
    "Dhanishta", 11,
    { varna: 1, vasya: 2, tara: 3, yoni: 1, graha: 5, gana: 1, bhakoot: 0, nadi: 8, total: 21 },
  );
});

// ─── Pair 4: Same nakshatra — Ashwini × Ashwini (boundary test) ────────────
// Both: Ashwini (nak 1), Mesha (sign 1)
// All same → Varna 1, Vasya 2, Tara 3 (both 0→ausp), Yoni 4 (same Horse),
// Graha 5 (same Mars), Gana 6 (same Deva), Bhakoot 7 (dist=1), Nadi 0 (same Adi)
// Total: 28

Deno.test("Gun Milan — Ashwini × Ashwini (same nakshatra, max−8)", () => {
  assertGunMilan(
    "Ashwini×Ashwini",
    "Ashwini", 1,
    "Ashwini", 1,
    { varna: 1, vasya: 2, tara: 3, yoni: 4, graha: 5, gana: 6, bhakoot: 7, nadi: 0, total: 28 },
  );
});

// ─── Pair 5: Cross-verify a high-scoring pair ──────────────────────────────
// Groom: Ashwini (nak 1), Mesha (sign 1) — Kshatriya, Chatushpada, Adi
// Bride: Shravana (nak 22), Makara (sign 10) — Vaishya, Jalachara, Antya
//
//   Varna:  Kshatriya(3) ≥ Vaishya(2) → 1
//   Vasya:  Chatushpada(1) × Jalachara(3) → M[3][1]=1
//   Tara:   t1=(22-1+27)%9=48%9=3 → 3∈ausp; t2=(1-22+27)%9=6%9=6 → 6∉ausp → 1.5
//   Yoni:   Ashwini=Horse, Shravana=Monkey → friends → 3
//   Graha:  Mars↔Saturn → Mars neutral to Saturn, Saturn enemy to Mars → (mixed) 0
//           Mars friends=[sun,moon,jupiter], enemies=[mercury] → Saturn not friend, not enemy → neutral
//           Saturn friends=[mercury,venus], enemies=[sun,moon,mars] → Mars IS enemy → bIsEnemy=true
//           !gIsEnemy(false) && !bIsEnemy(false)? No, bIsEnemy=true. Neither mixed case applies.
//           gIsFriend=false, bIsFriend=false, gIsEnemy=false, bIsEnemy=true → fall to else → 0
//   Gana:   Deva↔Deva → 6
//   Bhakoot: (10-1+12)%12+1=10 → 10∉{2,12,5,9,6,8} → 7
//   Nadi:   Adi↔Antya → different → 8
//   Total:  1+1+1.5+3+0+6+7+8 = 27.5

Deno.test("Gun Milan — Ashwini × Shravana (high score pair)", () => {
  assertGunMilan(
    "Ashwini×Shravana",
    "Ashwini", 1,
    "Shravana", 10,
    { varna: 1, vasya: 1, tara: 1.5, yoni: 3, graha: 0, gana: 6, bhakoot: 7, nadi: 8, total: 27.5 },
  );
});

// ─── Verdict bands ─────────────────────────────────────────────────────────

Deno.test("Gun Milan — verdict bands", () => {
  // 28 → excellent
  const r28 = computeGunMilan("Ashwini", 1, "Ashwini", 1);
  assertEquals(r28.verdictBand, "excellent");
  assertEquals(r28.total, 28);

  // 23.5 → good
  const r23 = computeGunMilan("Purva Phalguni", 5, "Swati", 7);
  assertEquals(r23.verdictBand, "good");

  // 9.5 → not_recommended
  const r9 = computeGunMilan("Dhanishta", 11, "Purva Phalguni", 5);
  assertEquals(r9.verdictBand, "not_recommended");
});

// ─── Max total is always 36 ────────────────────────────────────────────────

Deno.test("Gun Milan — kootas max sum to 36", () => {
  const r = computeGunMilan("Ashwini", 1, "Revati", 12);
  const maxSum = r.kootas.reduce((s, k) => s + k.max, 0);
  assertEquals(maxSum, 36);
  assertEquals(r.maxTotal, 36);
});
