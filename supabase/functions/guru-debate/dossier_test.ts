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
    {
      system: "yogini",
      currentMahaDasha: {
        level: "maha",
        planet: "Mars",
        startDate: "2023-01-01T00:00:00.000Z",
        endDate: "2027-01-01T00:00:00.000Z",
        durationYears: 4,
        children: [
          {
            level: "antar",
            planet: "Mars",
            startDate: "2023-01-01T00:00:00.000Z",
            endDate: "2023-07-01T00:00:00.000Z",
            durationYears: 0.5,
          },
          {
            level: "antar",
            planet: "Mercury",
            startDate: "2025-07-01T00:00:00.000Z",
            endDate: "2026-01-01T00:00:00.000Z",
            durationYears: 0.5,
          },
          {
            level: "antar",
            planet: "Saturn",
            startDate: "2026-01-01T00:00:00.000Z",
            endDate: "2026-07-01T00:00:00.000Z",
            durationYears: 0.5,
          },
        ],
      },
      timeline: [],
    },
    {
      system: "ashtottari",
      currentMahaDasha: {
        level: "maha",
        planet: "Venus",
        startDate: "2010-01-01T00:00:00.000Z",
        endDate: "2031-01-01T00:00:00.000Z",
        durationYears: 21,
        children: [
          {
            level: "antar",
            planet: "Jupiter",
            startDate: "2024-01-01T00:00:00.000Z",
            endDate: "2027-09-01T00:00:00.000Z",
            durationYears: 3.69,
          },
        ],
      },
      timeline: [],
    },
    {
      system: "kalachakra",
      currentMahaDasha: {
        level: "maha",
        planet: "Tula",
        startDate: "2020-01-01T00:00:00.000Z",
        endDate: "2036-01-01T00:00:00.000Z",
        durationYears: 16,
        children: [
          {
            level: "antar",
            planet: "Tula",
            startDate: "2024-01-01T00:00:00.000Z",
            endDate: "2027-09-01T00:00:00.000Z",
            durationYears: 3.56,
          },
        ],
      },
      timeline: [
        {
          level: "maha",
          planet: "Tula",
          startDate: "2020-01-01T00:00:00.000Z",
          endDate: "2036-01-01T00:00:00.000Z",
          durationYears: 16,
        },
        {
          level: "maha",
          planet: "Kanya",
          startDate: "2036-01-01T00:00:00.000Z",
          endDate: "2045-01-01T00:00:00.000Z",
          durationYears: 9,
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
    planets: {
      sun:     { sthanaBala: 150, digBala: 40, kalaBala: 120, cheshtaBala: 0, naisargikaBala: 60, drikBala: 10, totalVirupas: 380, totalRupas: 6.33, required: 6.5, ratio: 0.97 },
      moon:    { sthanaBala: 130, digBala: 50, kalaBala: 100, cheshtaBala: 0, naisargikaBala: 51.43, drikBala: 5, totalVirupas: 336.43, totalRupas: 5.61, required: 6, ratio: 0.93 },
      mars:    { sthanaBala: 100, digBala: 30, kalaBala: 90, cheshtaBala: 30, naisargikaBala: 17.14, drikBala: -5, totalVirupas: 262.14, totalRupas: 4.37, required: 5, ratio: 0.87 },
      mercury: { sthanaBala: 120, digBala: 20, kalaBala: 140, cheshtaBala: 30, naisargikaBala: 25.71, drikBala: 8, totalVirupas: 343.71, totalRupas: 5.73, required: 7, ratio: 0.82 },
      jupiter: { sthanaBala: 110, digBala: 30, kalaBala: 95, cheshtaBala: 45, naisargikaBala: 34.28, drikBala: 12, totalVirupas: 326.28, totalRupas: 5.44, required: 6.5, ratio: 0.84 },
      venus:   { sthanaBala: 105, digBala: 50, kalaBala: 85, cheshtaBala: 30, naisargikaBala: 42.85, drikBala: 7, totalVirupas: 319.85, totalRupas: 5.33, required: 5.5, ratio: 0.97 },
      saturn:  { sthanaBala: 115, digBala: 40, kalaBala: 110, cheshtaBala: 60, naisargikaBala: 8.57, drikBala: -3, totalVirupas: 330.57, totalRupas: 5.51, required: 5, ratio: 1.10 },
    },
    rank: ["sun", "mercury", "moon", "saturn", "jupiter", "venus", "mars"],
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
  kp: {
    planetSubLords: [
      { planet: "sun", signLord: "Sun", starLord: "Sun", subLord: "Mercury" },
      { planet: "moon", signLord: "Moon", starLord: "Mercury", subLord: "Venus" },
    ],
    houseSignificators: [
      { house: 1, levelA: ["venus"], levelB: ["moon", "venus"], levelC: ["sun", "mercury", "rahu"], levelD: ["mars"], nodesActingFor: [], ordered: ["venus", "moon", "sun", "mercury", "rahu", "mars"] },
      { house: 2, levelA: [], levelB: [], levelC: ["mars", "jupiter"], levelD: ["jupiter"], nodesActingFor: [], ordered: ["mars", "jupiter"] },
      { house: 3, levelA: [], levelB: [], levelC: [], levelD: ["saturn"], nodesActingFor: [], ordered: ["saturn"] },
      { house: 4, levelA: [], levelB: ["ketu"], levelC: [], levelD: ["saturn"], nodesActingFor: ["ketu"], ordered: ["ketu", "saturn"] },
      { house: 5, levelA: [], levelB: [], levelC: [], levelD: ["jupiter"], nodesActingFor: [], ordered: ["jupiter"] },
      { house: 6, levelA: [], levelB: [], levelC: [], levelD: ["mars"], nodesActingFor: [], ordered: ["mars"] },
      { house: 7, levelA: [], levelB: [], levelC: [], levelD: ["venus"], nodesActingFor: [], ordered: ["venus"] },
      { house: 8, levelA: [], levelB: [], levelC: [], levelD: ["mercury"], nodesActingFor: [], ordered: ["mercury"] },
      { house: 9, levelA: [], levelB: [], levelC: [], levelD: ["moon"], nodesActingFor: [], ordered: ["moon"] },
      { house: 10, levelA: ["saturn", "jupiter"], levelB: ["sun", "mercury", "rahu"], levelC: ["moon", "venus"], levelD: ["sun"], nodesActingFor: ["rahu"], ordered: ["saturn", "jupiter", "sun", "mercury", "rahu", "moon", "venus"] },
      { house: 11, levelA: ["moon", "venus"], levelB: ["mars", "jupiter", "saturn"], levelC: [], levelD: ["mercury"], nodesActingFor: [], ordered: ["moon", "venus", "mars", "jupiter", "saturn", "mercury"] },
      { house: 12, levelA: [], levelB: [], levelC: [], levelD: ["venus"], nodesActingFor: [], ordered: ["venus"] },
    ],
  },
  jaimini: {
    charaKarakas: [
      { planet: "sun", degreeInSign: 28.68, karaka: "AK" },
      { planet: "moon", degreeInSign: 17.2, karaka: "AmK" },
    ],
    atmakaraka: "sun",
    karakamsa: { sign: 4, signName: "Karka" },
    arudhaPadas: [
      { house: 1, label: "AL (Arudha Lagna)", sign: 6, signName: "Kanya" },
      { house: 12, label: "UL (Upapada Lagna)", sign: 5, signName: "Simha" },
    ],
    charaDasha: {
      timeline: [
        { sign: 8, signName: "Vrischika", startDate: "1980-08-15T09:00:00.000Z", endDate: "1990-08-15T09:00:00.000Z", durationYears: 10, children: [
          { sign: 7, signName: "Tula", startDate: "1980-08-15T09:00:00.000Z", endDate: "1981-06-15T09:00:00.000Z", durationYears: 0.8333 },
        ] },
        { sign: 7, signName: "Tula", startDate: "1990-08-15T09:00:00.000Z", endDate: "2000-08-15T09:00:00.000Z", durationYears: 10, children: [] },
        { sign: 6, signName: "Kanya", startDate: "2000-08-15T09:00:00.000Z", endDate: "2028-08-15T09:00:00.000Z", durationYears: 12, children: [
          { sign: 5, signName: "Simha", startDate: "2025-08-15T09:00:00.000Z", endDate: "2026-08-15T09:00:00.000Z", durationYears: 1.0 },
          { sign: 4, signName: "Karka", startDate: "2026-08-15T09:00:00.000Z", endDate: "2027-08-15T09:00:00.000Z", durationYears: 1.0 },
        ] },
      ],
      currentSign: 6,
      currentSignName: "Kanya",
      currentAntarSign: 5,
      currentAntarSignName: "Simha",
    },
    specialLagnas: [
      { name: "Bhava Lagna", longitude: 120.5, sign: 5, signName: "Simha", degree: 0.5 },
      { name: "Hora Lagna", longitude: 45.2, sign: 2, signName: "Vrishabha", degree: 15.2 },
    ],
    argala: [
      { house: 1, argala: { from2nd: [], from4th: ["jupiter"], from5th: [], from11th: ["sun"] }, virodha: { from12th: [], from10th: [], from9th: [], from3rd: [] } },
      { house: 5, argala: { from2nd: ["saturn"], from4th: [], from5th: [], from11th: [] }, virodha: { from12th: ["moon"], from10th: [], from9th: [], from3rd: [] } },
    ],
  },
  bhavaBala: {
    houses: [
      { house: 1, bhavadhipathiBala: 350, bhavaDigBala: 30, bhavaDrikBala: 5, totalVirupas: 385, totalRupas: 6.42 },
      { house: 2, bhavadhipathiBala: 400, bhavaDigBala: 50, bhavaDrikBala: -2, totalVirupas: 448, totalRupas: 7.47 },
      { house: 3, bhavadhipathiBala: 320, bhavaDigBala: 40, bhavaDrikBala: 0, totalVirupas: 360, totalRupas: 6.00 },
      { house: 4, bhavadhipathiBala: 380, bhavaDigBala: 60, bhavaDrikBala: 10, totalVirupas: 450, totalRupas: 7.50 },
      { house: 5, bhavadhipathiBala: 430, bhavaDigBala: 10, bhavaDrikBala: 3, totalVirupas: 443, totalRupas: 7.38 },
      { house: 6, bhavadhipathiBala: 280, bhavaDigBala: 20, bhavaDrikBala: 0, totalVirupas: 300, totalRupas: 5.00 },
      { house: 7, bhavadhipathiBala: 400, bhavaDigBala: 0, bhavaDrikBala: -5, totalVirupas: 395, totalRupas: 6.58 },
      { house: 8, bhavadhipathiBala: 430, bhavaDigBala: 20, bhavaDrikBala: 8, totalVirupas: 458, totalRupas: 7.63 },
      { house: 9, bhavadhipathiBala: 380, bhavaDigBala: 50, bhavaDrikBala: 0, totalVirupas: 430, totalRupas: 7.17 },
      { house: 10, bhavadhipathiBala: 320, bhavaDigBala: 30, bhavaDrikBala: 4, totalVirupas: 354, totalRupas: 5.90 },
      { house: 11, bhavadhipathiBala: 400, bhavaDigBala: 40, bhavaDrikBala: 0, totalVirupas: 440, totalRupas: 7.33 },
      { house: 12, bhavadhipathiBala: 350, bhavaDigBala: 10, bhavaDrikBala: 0, totalVirupas: 360, totalRupas: 6.00 },
    ],
    rank: [8, 4, 2, 5, 11, 9, 7, 1, 3, 12, 10, 6],
  },
  vargeeyaBala: {
    panchaVargeeya: { sun: 13.76, moon: 9.95, mars: 2.28, mercury: 26.76, jupiter: 11.41, venus: 12.13, saturn: 26.23 },
    dwadasaVargeeya: { sun: 4, moon: 2, mars: 5, mercury: 8, jupiter: 8, venus: 7, saturn: 6 },
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

Deno.test("dossier contains Yogini dasha section", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "YOGINI DASHA");
  assertStringIncludes(d, "Mars");
});

Deno.test("dossier contains Ashtottari dasha section", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "ASHTOTTARI DASHA");
  assertStringIncludes(d, "Venus");
});

Deno.test("dossier lists unavailable systems", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "SYSTEMS NOT YET COMPUTED");
  assertStringIncludes(d, "Sahams");
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

Deno.test("dossier contains Shadbala data with six-source breakdown", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "SHADBALA");
  assertStringIncludes(d, "Sthana");
  assertStringIncludes(d, "Rupas");
  assertStringIncludes(d, "Strongest");
  assertStringIncludes(d, "Weakest");
  assertStringIncludes(d, "Strength rank");
});

Deno.test("dossier contains Bhava Bala data", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "BHAVA BALA");
  assertStringIncludes(d, "Rupas");
  assertStringIncludes(d, "Strongest");
  assertStringIncludes(d, "Weakest");
  assertStringIncludes(d, "House strength rank");
});

Deno.test("dossier contains Vargeeya Bala section", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "VARGEEYA BALA");
  assertStringIncludes(d, "PanchaVB");
  assertStringIncludes(d, "DwadasaVB");
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

Deno.test("dossier contains KP sub-lord table", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "KP SUB-LORDS");
  assertStringIncludes(d, "Sub-lord");
  assertStringIncludes(d, "Placidus cuspal sub-lords are not yet computed");
});

Deno.test("dossier contains KP 4-fold house significators", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "KP 4-FOLD HOUSE SIGNIFICATORS");
  assertStringIncludes(d, "Level A");
  assertStringIncludes(d, "House 1:");
  assertStringIncludes(d, "House 10:");
  assertStringIncludes(d, "Ordered:");
});

Deno.test("dossier contains Jaimini Chara Karakas, Arudha, and Chara Dasha current", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "JAIMINI");
  assertStringIncludes(d, "Chara Karakas:");
  assertStringIncludes(d, "AL (Arudha Lagna): Kanya");
  assertStringIncludes(d, "Chara Dasha (KN Rao): current Maha: Kanya, Antar: Simha.");
  assertStringIncludes(d, "current Maha");
  assertStringIncludes(d, "current Antar");
});

Deno.test("dossier contains Special Lagnas section", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "Special Lagnas:");
  assertStringIncludes(d, "Bhava Lagna: Simha");
  assertStringIncludes(d, "Hora Lagna: Vrishabha");
});

Deno.test("dossier contains Argala section", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "Argala");
  assertStringIncludes(d, "House 1:");
});

Deno.test("dossier contains Varshphal section when present", () => {
  const chartWithVarshphal = {
    ...sampleChart,
    varshphal: {
      years: 45,
      varshaPraveshJd: 2460910.678,
      annualAscSign: 6,
      annualAscDeg: 22.21,
      planets: [
        { planet: "sun", signNumber: 5, signDegree: 6.10, signName: "Simha", nakshatra: "Pushya", nakshatraPada: 1, houseNumber: 12, isRetrograde: false, longitude: 126.10 },
        { planet: "moon", signNumber: 5, signDegree: 5.17, signName: "Simha", nakshatra: "Pushya", nakshatraPada: 1, houseNumber: 12, isRetrograde: false, longitude: 125.17 },
      ],
      munthaSign: 4,
      munthaHouse: 11,
      yearLord: "sun",
    },
  };
  const d = buildChartDossier(chartWithVarshphal, sampleTransits, fixedNow);
  assertStringIncludes(d, "VARSHPHAL");
  assertStringIncludes(d, "Year Lord (Varshesh): Sun");
  assertStringIncludes(d, "Karka (House 11)");
  assertStringIncludes(d, "Annual Lagna: Kanya");
});

Deno.test("dossier contains Tajik yogas when present in Varshphal", () => {
  const chartWithTajikYogas = {
    ...sampleChart,
    varshphal: {
      years: 43,
      varshaPraveshJd: 2460910.678,
      annualAscSign: 6,
      annualAscDeg: 22.21,
      planets: [
        { planet: "sun", signNumber: 5, signDegree: 6.10, signName: "Simha", nakshatra: "Pushya", nakshatraPada: 1, houseNumber: 12, isRetrograde: false, longitude: 126.10 },
        { planet: "moon", signNumber: 5, signDegree: 5.17, signName: "Simha", nakshatra: "Pushya", nakshatraPada: 1, houseNumber: 12, isRetrograde: false, longitude: 125.17 },
      ],
      munthaSign: 4,
      munthaHouse: 11,
      yearLord: "sun",
      tajikYogas: {
        ithasala: [
          { yoga: "ithasala", planet1: "sun", planet2: "moon", ithasalaType: 2 },
          { yoga: "ithasala", planet1: "sun", planet2: "venus", ithasalaType: 1 },
        ],
        eesarpha: [
          { yoga: "eesarpha", planet1: "moon", planet2: "venus" },
        ],
        nakta: [],
        yamaya: [],
        ishkavala: false,
        induvara: false,
      },
    },
  };
  const d = buildChartDossier(chartWithTajikYogas, sampleTransits, fixedNow);
  assertStringIncludes(d, "Tajik Yogas (Annual Chart):");
  assertStringIncludes(d, "Ithasala (applying");
  assertStringIncludes(d, "Sun\u2013Moon [Poorna]");
  assertStringIncludes(d, "Sun\u2013Venus [Varthamaana]");
  assertStringIncludes(d, "Eesarpha (separating");
  assertStringIncludes(d, "Moon\u2013Venus");
  assertStringIncludes(d, "Ishkavala: absent");
  assertStringIncludes(d, "Induvara: absent");
  assertStringIncludes(d, "Nakta: none");
  assertStringIncludes(d, "Yamaya: none");
});

Deno.test("dossier omits Varshphal section when not present", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  // Should not contain VARSHPHAL header (but should not error)
  assertEquals(d.includes("VARSHPHAL"), false);
});

Deno.test("dossier unavailable systems no longer lists Varshphal", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  // Varshphal is now computed, so it should not appear in "not yet computed" list
  assertEquals(d.includes("Varshphal (annual/solar return chart)"), false);
});

Deno.test("dossier contains Kalachakra Dasha section", () => {
  const d = buildChartDossier(sampleChart, sampleTransits, fixedNow);
  assertStringIncludes(d, "KALACHAKRA DASHA");
  assertStringIncludes(d, "Tula");
});
