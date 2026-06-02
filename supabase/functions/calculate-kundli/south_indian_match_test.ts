/**
 * Parity test — South-Indian 10-Porutham engine vs PyJHora 4.8.6.
 *
 * Oracle: PyJHora `jhora.horoscope.match.compatibility` (Ashtakoota class,
 * method='South') and the pre-computed CSV `all_nak_pad_boy_girl_south.csv`.
 *
 * CSV columns (0-based):
 *   0:boy_star 1:boy_pad 2:girl_star 3:girl_pad
 *   4:Varna 5:Vasiya 6:Gana 7:Star(=Dina) 8:Yoni
 *   9:Adhipathi 10:Rasi 11:Nadi 12:Score
 *   13:Mahendra 14:Vedha 15:Rajju 16:Stree_Dheerga
 *
 * Each test case hard-codes the ACTUAL PyJHora result for that pair.
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeSouthIndianMatch, rasiFromNakshatraPada } from "./south_indian_match.ts";

// ─── Helper ─────────────────────────────────────────────────────────────────

function assertMatch(
  label: string,
  boyNak: number, boyPada: number,
  girlNak: number, girlPada: number,
  expected: {
    dina: boolean; gana: boolean; mahendra: boolean; streeDheerga: boolean;
    yoni: boolean; rasi: boolean; rajju: boolean; vedha: boolean;
    vasya: boolean; nadi: boolean;
  },
) {
  const r = computeSouthIndianMatch(boyNak, boyPada, girlNak, girlPada);
  const byName = Object.fromEntries(r.poruthams.map(p => [p.name, p.met]));
  assertEquals(byName['Dina'], expected.dina, `${label}: Dina`);
  assertEquals(byName['Gana'], expected.gana, `${label}: Gana`);
  assertEquals(byName['Mahendra'], expected.mahendra, `${label}: Mahendra`);
  assertEquals(byName['Stree-Dheerga'], expected.streeDheerga, `${label}: Stree-Dheerga`);
  assertEquals(byName['Yoni'], expected.yoni, `${label}: Yoni`);
  assertEquals(byName['Rasi'], expected.rasi, `${label}: Rasi`);
  assertEquals(byName['Rajju'], expected.rajju, `${label}: Rajju`);
  assertEquals(byName['Vedha'], expected.vedha, `${label}: Vedha`);
  assertEquals(byName['Vasya'], expected.vasya, `${label}: Vasya`);
  assertEquals(byName['Nadi'], expected.nadi, `${label}: Nadi`);
  const expectedMetCount = Object.values(expected).filter(Boolean).length;
  assertEquals(r.metCount, expectedMetCount, `${label}: metCount`);
}

// ─── rasiFromNakshatraPada sanity ───────────────────────────────────────────

Deno.test("rasiFromNakshatraPada — known mappings", () => {
  // Ashwini pada 1 → Mesha (1)
  assertEquals(rasiFromNakshatraPada(1, 1), 1);
  // Dhanishta pada 1 → Makara (10)
  assertEquals(rasiFromNakshatraPada(23, 1), 10);
  // Dhanishta pada 3 → Kumbha (11)
  assertEquals(rasiFromNakshatraPada(23, 3), 11);
  // Revati pada 4 → Meena (12)
  assertEquals(rasiFromNakshatraPada(27, 4), 12);
  // Magha pada 2 → Simha (5)
  assertEquals(rasiFromNakshatraPada(10, 2), 5);
  // Mula pada 3 → Dhanu (9)
  assertEquals(rasiFromNakshatraPada(19, 3), 9);
});

// ─── Pair 1: Dhanishta-1 boy × Ashwini-1 girl ─────────────────────────────

Deno.test("10 Porutham — Dhanishta-1 × Ashwini-1 (PyJHora parity)", () => {
  assertMatch("Dhanishta-1 × Ashwini-1", 23, 1, 1, 1, {
    dina: true, gana: false, mahendra: false, streeDheerga: true,
    yoni: true, rasi: true, rajju: true, vedha: true, vasya: false, nadi: true,
  });
});

// ─── Pair 2: Dhanishta-1 boy × Mrigashira-3 girl ──────────────────────────

Deno.test("10 Porutham — Dhanishta-1 × Mrigashira-3 (PyJHora parity)", () => {
  assertMatch("Dhanishta-1 × Mrigashira-3", 23, 1, 5, 3, {
    dina: false, gana: false, mahendra: true, streeDheerga: true,
    yoni: true, rasi: true, rajju: false, vedha: false, vasya: false, nadi: false,
  });
});

// ─── Pair 3: Dhanishta-1 boy × Chitra-2 girl ──────────────────────────────

Deno.test("10 Porutham — Dhanishta-1 × Chitra-2 (PyJHora parity)", () => {
  assertMatch("Dhanishta-1 × Chitra-2", 23, 1, 14, 2, {
    dina: true, gana: false, mahendra: true, streeDheerga: true,
    yoni: true, rasi: false, rajju: false, vedha: false, vasya: false, nadi: false,
  });
});

// ─── Pair 4: Ashwini-1 boy × Dhanishta-1 girl ─────────────────────────────

Deno.test("10 Porutham — Ashwini-1 × Dhanishta-1 (PyJHora parity)", () => {
  assertMatch("Ashwini-1 × Dhanishta-1", 1, 1, 23, 1, {
    dina: false, gana: false, mahendra: false, streeDheerga: false,
    yoni: true, rasi: false, rajju: true, vedha: true, vasya: true, nadi: true,
  });
});

// ─── Pair 5: Magha-2 boy × Mula-3 girl ────────────────────────────────────

Deno.test("10 Porutham — Magha-2 × Mula-3 (PyJHora parity)", () => {
  assertMatch("Magha-2 × Mula-3", 10, 2, 19, 3, {
    dina: false, gana: true, mahendra: true, streeDheerga: true,
    yoni: true, rasi: true, rajju: false, vedha: true, vasya: false, nadi: true,
  });
});

// ─── Pair 6: Rohini-1 boy × Vishakha-2 girl ───────────────────────────────

Deno.test("10 Porutham — Rohini-1 × Vishakha-2 (PyJHora parity)", () => {
  assertMatch("Rohini-1 × Vishakha-2", 4, 1, 16, 2, {
    dina: true, gana: false, mahendra: true, streeDheerga: true,
    yoni: true, rasi: true, rajju: true, vedha: true, vasya: false, nadi: false,
  });
});

// ─── Pair 7: Punarvasu-3 boy × Uttara Ashadha-4 girl ──────────────────────

Deno.test("10 Porutham — Punarvasu-3 × Uttara Ashadha-4 (PyJHora parity)", () => {
  assertMatch("Punarvasu-3 × Uttara Ashadha-4", 7, 3, 21, 4, {
    dina: true, gana: true, mahendra: false, streeDheerga: true,
    yoni: true, rasi: false, rajju: true, vedha: false, vasya: false, nadi: true,
  });
});

// ─── Structure / shape tests ────────────────────────────────────────────────

Deno.test("computeSouthIndianMatch returns correct shape", () => {
  const r = computeSouthIndianMatch(23, 1, 1, 1);
  assertEquals(r.poruthams.length, 10);
  assertEquals(r.total, 10);
  assertEquals(typeof r.metCount, "number");
  assertEquals(typeof r.verdict, "string");
  assertEquals(typeof r.citation, "string");
  for (const p of r.poruthams) {
    assertEquals(typeof p.name, "string");
    assertEquals(typeof p.nameTamil, "string");
    assertEquals(typeof p.met, "boolean");
    assertEquals(typeof p.reason, "string");
    assertEquals(typeof p.citation, "string");
  }
});
