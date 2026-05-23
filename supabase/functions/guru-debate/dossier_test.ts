import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildChartDossier } from "./dossier.ts";

// ─── Sample chart fixture (demo: 15 Aug 1980, 14:30, Ahmedabad) ────────────

const sampleChart = {
  birthDetails: {
    fullName: "Demo Native",
    dateOfBirth: "1980-08-15",
    timeOfBirth: "14:30:00",
    placeOfBirth: {
      name: "Ahmedabad, Gujarat",
      latitude: 23.0225,
      longitude: 72.5714,
      timezone: "Asia/Kolkata",
      timezoneOffset: 5.5,
    },
    gender: "male",
    ayanamsa: "lahiri",
    houseSystem: "Whole Sign",
  },
  ascendant: {
    planet: "ascendant",
    signNumber: 8,
    signName: "Vrischika",
    signDegree: 15.5,
    nakshatra: "Anuradha",
    nakshatraPada: 2,
    houseNumber: 1,
    isRetrograde: false,
    isCombust: false,
    longitude: 225.5,
  },
  divisionalCharts: [
    {
      varga: "D1",
      vargaName: "Rasi",
      significance: "Body, overall life, self",
      ascendantSign: 8,
      planets: [
        { planet: "ascendant", signNumber: 8, signName: "Vrischika", signDegree: 15.5, nakshatra: "Anuradha", nakshatraPada: 2, houseNumber: 1, isRetrograde: false, isCombust: false, longitude: 225.5 },
        { planet: "sun", signNumber: 5, signName: "Simha", signDegree: 28.68, nakshatra: "Uttara Phalguni", nakshatraPada: 2, houseNumber: 10, isRetrograde: false, isCombust: false, dignity: "own_sign", longitude: 148.68 },
        { planet: "moon", signNumber: 4, signName: "Karka", signDegree: 17.2, nakshatra: "Ashlesha", nakshatraPada: 4, houseNumber: 9, isRetrograde: false, isCombust: false, dignity: "own_sign", longitude: 107.2 },
        { planet: "mars", signNumber: 6, signName: "Kanya", signDegree: 10.3, nakshatra: "Hasta", nakshatraPada: 1, houseNumber: 11, isRetrograde: false, isCombust: false, dignity: "enemy", longitude: 160.3 },
        { planet: "mercury", signNumber: 5, signName: "Simha", signDegree: 12.45, nakshatra: "Magha", nakshatraPada: 4, houseNumber: 10, isRetrograde: false, isCombust: true, dignity: "neutral", longitude: 132.45 },
        { planet: "jupiter", signNumber: 6, signName: "Kanya", signDegree: 4.8, nakshatra: "Uttara Phalguni", nakshatraPada: 3, houseNumber: 11, isRetrograde: false, isCombust: false, dignity: "enemy", longitude: 154.8 },
        { planet: "venus", signNumber: 4, signName: "Karka", signDegree: 5.6, nakshatra: "Pushya", nakshatraPada: 1, houseNumber: 9, isRetrograde: false, isCombust: false, dignity: "enemy", longitude: 95.6 },
        { planet: "saturn", signNumber: 6, signName: "Kanya", signDegree: 1.2, nakshatra: "Uttara Phalguni", nakshatraPada: 2, houseNumber: 11, isRetrograde: true, isCombust: false, dignity: "neutral", longitude: 151.2 },
        { planet: "rahu", signNumber: 5, signName: "Simha", signDegree: 21.0, nakshatra: "Purva Phalguni", nakshatraPada: 3, houseNumber: 10, isRetrograde: false, isCombust: false, longitude: 141.0 },
        { planet: "ketu", signNumber: 11, signName: "Kumbha", signDegree: 21.0, nakshatra: "Purva Bhadrapada", nakshatraPada: 1, houseNumber: 4, isRetrograde: false, isCombust: false, longitude: 321.0 },
      ],
    },
    {
      varga: "D9",
      vargaName: "Navamsha",
      significance: "Marriage, dharma, fruition",
      ascendantSign: 4,
      planets: [
        { planet: "ascendant", signNumber: 4, signName: "Karka", signDegree: 0, nakshatra: "Pushya", nakshatraPada: 1, houseNumber: 1, isRetrograde: false, isCombust: false, longitude: 90 },
        { planet: "sun", signNumber: 2, signName: "Vrishabha", signDegree: 15, nakshatra: "Rohini", nakshatraPada: 3, houseNumber: 11, isRetrograde: false, isCombust: false, longitude: 45 },
        { planet: "moon", signNumber: 8, signName: "Vrischika", signDegree: 10, nakshatra: "Anuradha", nakshatraPada: 1, houseNumber: 5, isRetrograde: false, isCombust: false, longitude: 220 },
        { planet: "mars", signNumber: 1, signName: "Mesha", signDegree: 5, nakshatra: "Ashwini", nakshatraPada: 2, houseNumber: 10, isRetrograde: false, isCombust: false, longitude: 5 },
        { planet: "mercury", signNumber: 9, signName: "Dhanu", signDegree: 20, nakshatra: "Purva Ashadha", nakshatraPada: 1, houseNumber: 6, isRetrograde: false, isCombust: false, longitude: 260 },
        { planet: "jupiter", signNumber: 12, signName: "Meena", signDegree: 3, nakshatra: "Purva Bhadrapada", nakshatraPada: 4, houseNumber: 9, isRetrograde: false, isCombust: false, longitude: 333 },
        { planet: "venus", signNumber: 10, signName: "Makara", signDegree: 12, nakshatra: "Shravana", nakshatraPada: 2, houseNumber: 7, isRetrograde: false, isCombust: false, longitude: 282 },
        { planet: "saturn", signNumber: 3, signName: "Mithuna", signDegree: 8, nakshatra: "Ardra", nakshatraPada: 1, houseNumber: 12, isRetrograde: false, isCombust: false, longitude: 68 },
        { planet: "rahu", signNumber: 7, signName: "Tula", signDegree: 10, nakshatra: "Swati", nakshatraPada: 1, houseNumber: 4, isRetrograde: false, isCombust: false, longitude: 190 },
        { planet: "ketu", signNumber: 1, signName: "Mesha", signDegree: 10, nakshatra: "Ashwini", nakshatraPada: 3, houseNumber: 10, isRetrograde: false, isCombust: false, longitude: 10 },
      ],
    },
    {
      varga: "D10",
      vargaName: "Dasamsa",
      significance: "Career, public life",
      ascendantSign: 2,
      planets: [
        { planet: "ascendant", signNumber: 2, signName: "Vrishabha", signDegree: 0, nakshatra: "Krittika", nakshatraPada: 2, houseNumber: 1, isRetrograde: false, isCombust: false, longitude: 30 },
        { planet: "sun", signNumber: 10, signName: "Makara", signDegree: 20, nakshatra: "Shravana", nakshatraPada: 4, houseNumber: 9, isRetrograde: false, isCombust: false, longitude: 290 },
        { planet: "moon", signNumber: 5, signName: "Simha", signDegree: 15, nakshatra: "Purva Phalguni", nakshatraPada: 1, houseNumber: 4, isRetrograde: false, isCombust: false, longitude: 135 },
        { planet: "mars", signNumber: 8, signName: "Vrischika", signDegree: 5, nakshatra: "Anuradha", nakshatraPada: 1, houseNumber: 7, isRetrograde: false, isCombust: false, longitude: 215 },
        { planet: "mercury", signNumber: 6, signName: "Kanya", signDegree: 10, nakshatra: "Hasta", nakshatraPada: 1, houseNumber: 5, isRetrograde: false, isCombust: false, longitude: 160 },
        { planet: "jupiter", signNumber: 12, signName: "Meena", signDegree: 8, nakshatra: "Uttara Bhadrapada", nakshatraPada: 2, houseNumber: 11, isRetrograde: false, isCombust: false, longitude: 338 },
        { planet: "venus", signNumber: 3, signName: "Mithuna", signDegree: 22, nakshatra: "Mrigashira", nakshatraPada: 4, houseNumber: 2, isRetrograde: false, isCombust: false, longitude: 82 },
        { planet: "saturn", signNumber: 11, signName: "Kumbha", signDegree: 4, nakshatra: "Dhanishtha", nakshatraPada: 3, houseNumber: 10, isRetrograde: false, isCombust: false, longitude: 304 },
        { planet: "rahu", signNumber: 4, signName: "Karka", signDegree: 15, nakshatra: "Ashlesha", nakshatraPada: 4, houseNumber: 3, isRetrograde: false, isCombust: false, longitude: 105 },
        { planet: "ketu", signNumber: 10, signName: "Makara", signDegree: 15, nakshatra: "Shravana", nakshatraPada: 3, houseNumber: 9, isRetrograde: false, isCombust: false, longitude: 285 },
      ],
    },
  ],
  dashas: [
    {
      system: "vimshottari",
      currentMahaDasha: {
        level: "maha",
        planet: "Saturn",
        startDate: "2021-01-15T00:00:00.000Z",
        endDate: "2040-01-15T00:00:00.000Z",
        durationYears: 19,
        children: [
          {
            level: "antar",
            planet: "Saturn",
            startDate: "2021-01-15T00:00:00.000Z",
            endDate: "2024-01-18T00:00:00.000Z",
            durationYears: 3.01,
            children: [],
          },
          {
            level: "antar",
            planet: "Mercury",
            startDate: "2024-01-18T00:00:00.000Z",
            endDate: "2026-09-26T00:00:00.000Z",
            durationYears: 2.69,
            children: [
              {
                level: "pratyantar",
                planet: "Venus",
                startDate: "2025-12-01T00:00:00.000Z",
                endDate: "2026-05-15T00:00:00.000Z",
                durationYears: 0.45,
              },
              {
                level: "pratyantar",
                planet: "Sun",
                startDate: "2026-05-15T00:00:00.000Z",
                endDate: "2026-06-28T00:00:00.000Z",
                durationYears: 0.12,
              },
            ],
          },
          {
            level: "antar",
            planet: "Ketu",
            startDate: "2026-09-26T00:00:00.000Z",
            endDate: "2027-11-05T00:00:00.000Z",
            durationYears: 1.11,
            children: [],
          },
        ],
      },
      timeline: [
        {
          level: "maha",
          planet: "Jupiter",
          startDate: "2002-01-15T00:00:00.000Z",
          endDate: "2018-01-15T00:00:00.000Z",
          durationYears: 16,
        },
        {
          level: "maha",
          planet: "Saturn",
          startDate: "2021-01-15T00:00:00.000Z",
          endDate: "2040-01-15T00:00:00.000Z",
          durationYears: 19,
        },
        {
          level: "maha",
          planet: "Mercury",
          startDate: "2040-01-15T00:00:00.000Z",
          endDate: "2057-01-15T00:00:00.000Z",
          durationYears: 17,
        },
        {
          level: "maha",
          planet: "Ketu",
          startDate: "2057-01-15T00:00:00.000Z",
          endDate: "2064-01-15T00:00:00.000Z",
          durationYears: 7,
        },
      ],
    },
  ],
  yogas: [
    {
      name: "Gajakesari Yoga",
      category: "chandra",
      isPresent: false,
      strength: "weak",
      formedBy: [],
      explanation: "Jupiter is not in a kendra from Moon.",
      effects: [],
    },
    {
      name: "Budhaditya Yoga",
      category: "sun",
      isPresent: true,
      strength: "moderate",
      formedBy: ["Sun & Mercury conjunct in H10 Simha"],
      explanation: "Conjunction of Sun and Mercury within close orb.",
      effects: ["Sharp analytical mind", "Success in communication-led careers"],
    },
  ],
  doshas: [
    {
      name: "mangal",
      isPresent: false,
      explanation: "Mars is not in houses 1, 2, 4, 7, 8, or 12 from Lagna. No Mangal Dosha.",
      affectedAreas: [],
      remedies: [],
    },
    {
      name: "sade_sati",
      isPresent: false,
      explanation: "Saturn is not transiting within one sign of natal Moon. No active Sade Sati.",
      affectedAreas: [],
      remedies: [],
    },
  ],
  ashtakavarga: {
    sarva: [25, 29, 22, 32, 26, 28, 30, 24, 27, 31, 26, 37],
  },
  shadbala: {
    sun: 70,
    moon: 65,
    mars: 40,
    mercury: 35,
    jupiter: 38,
    venus: 42,
    saturn: 55,
    rahu: 50,
    ketu: 50,
  },
  panchang: {
    tithi: "Shukla Paksha Shashthi",
    vara: "Shukravara (Friday)",
    nakshatra: "Ashlesha",
    yoga: "Saubhagya",
    karana: "Kaulava",
    sunrise: "06:12",
    sunset: "19:08",
  },
};

const sampleTransits = [
  { planet: "sun", signNumber: 2, signName: "Vrishabha", signDegree: 7.37, nakshatra: "Krittika", nakshatraPada: 4, isRetrograde: false },
  { planet: "moon", signNumber: 9, signName: "Dhanu", signDegree: 15.2, nakshatra: "Purva Ashadha", nakshatraPada: 1, isRetrograde: false },
  { planet: "mars", signNumber: 5, signName: "Simha", signDegree: 3.8, nakshatra: "Magha", nakshatraPada: 2, isRetrograde: false },
  { planet: "mercury", signNumber: 2, signName: "Vrishabha", signDegree: 22.1, nakshatra: "Rohini", nakshatraPada: 3, isRetrograde: false },
  { planet: "jupiter", signNumber: 4, signName: "Karka", signDegree: 18.5, nakshatra: "Ashlesha", nakshatraPada: 4, isRetrograde: false },
  { planet: "venus", signNumber: 1, signName: "Mesha", signDegree: 12.9, nakshatra: "Ashwini", nakshatraPada: 4, isRetrograde: false },
  { planet: "saturn", signNumber: 11, signName: "Kumbha", signDegree: 24.92, nakshatra: "Purva Bhadrapada", nakshatraPada: 3, isRetrograde: true },
  { planet: "rahu", signNumber: 12, signName: "Meena", signDegree: 2.5, nakshatra: "Purva Bhadrapada", nakshatraPada: 4, isRetrograde: false },
  { planet: "ketu", signNumber: 6, signName: "Kanya", signDegree: 2.5, nakshatra: "Uttara Phalguni", nakshatraPada: 2, isRetrograde: false },
];

const fixedNow = new Date("2026-05-22T12:00:00Z");

// ─── Tests ──────────────────────────────────────────────────────────────────

Deno.test("dossier contains current date", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "2026-05-22");
});

Deno.test("dossier contains birth details with gender", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "Gender: Male");
  assertStringIncludes(d, "Demo Native");
});

Deno.test("dossier contains transit Saturn sign", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "Kumbha");
});

Deno.test("dossier contains Sade Sati status", () => {
  // Natal Moon is sign 4 (Karka), Saturn transit is sign 11 (Kumbha)
  // diff = (11 - 4 + 12) % 12 = 7 → Ashtama Shani, NOT Sade Sati
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "SADE SATI");
  assertStringIncludes(d, "NOT currently in Sade Sati");
});

Deno.test("dossier contains Ashtama Shani detection", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "ASHTAMA SHANI");
});

Deno.test("dossier contains current Antardasha", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "Antardasha");
  assertStringIncludes(d, "Mercury");
});

Deno.test("dossier contains Atmakaraka", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "Atmakaraka");
});

Deno.test("dossier lists unavailable systems", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "KP cuspal sub-lords");
  assertStringIncludes(d, "NOT fabricate");
});

Deno.test("dossier contains house lordships", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "HOUSE LORDSHIPS");
  assertStringIncludes(d, "House 1 (Vrischika): mars");
});

Deno.test("dossier contains double transit section", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "DOUBLE TRANSIT");
  assertStringIncludes(d, "Jupiter");
  assertStringIncludes(d, "Saturn");
});

Deno.test("dossier contains Ashtakavarga data", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "ASHTAKAVARGA");
  assertStringIncludes(d, "SAV");
});

Deno.test("dossier contains Shadbala data", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "SHADBALA");
  assertStringIncludes(d, "Strongest");
  assertStringIncludes(d, "Weakest");
});

Deno.test("dossier contains Panchang data", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "PANCHANG");
  assertStringIncludes(d, "Tithi");
});

Deno.test("dossier contains divisional chart summary", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "DIVISIONAL CHARTS");
  assertStringIncludes(d, "D9 (Navamsa");
  assertStringIncludes(d, "D10 (Dasamsa");
});

Deno.test("dossier contains yoga information", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "Budhaditya Yoga");
});

Deno.test("dossier contains dosha information", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "DOSHAS");
  assertStringIncludes(d, "mangal");
});

Deno.test("dossier handles empty chart gracefully", () => {
  const d = buildChartDossier({}, [], fixedNow);
  assertStringIncludes(d, "2026-05-22");
  assertStringIncludes(d, "SYSTEMS NOT YET COMPUTED");
});

Deno.test("dossier handles null chart gracefully", () => {
  const d = buildChartDossier(null, [], fixedNow);
  assertStringIncludes(d, "2026-05-22");
});
