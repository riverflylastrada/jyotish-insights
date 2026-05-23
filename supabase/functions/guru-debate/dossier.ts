/**
 * Chart Dossier Builder for the Guru Debate LLM context.
 *
 * Architecture: each section is a standalone function that takes chart/transit data
 * and returns a formatted string block. To add new sections:
 * 1. Create a new `sectionXxx(chart, ...)` function
 * 2. Add it to the array in `buildChartDossier()`
 *
 * Planned future sections:
 * - KP cuspal sub-lords and significators (when KP engine is built)
 * - Jaimini Arudha padas (A1-A12) (when Jaimini module is added)
 * - Varshphal / Solar Return chart (annual predictions)
 * - Prashna (horary) chart overlay
 * - Compatibility/synastry data (for relationship questions)
 */

import { signName, wholeSignHouse, getSignLord } from "../calculate-kundli/vedic.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDeg(deg: number): string {
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}'`;
}

function houseFrom(targetSign: number, refSign: number): number {
  return ((targetSign - refSign + 12) % 12) + 1;
}

function pad(s: string, len: number): string {
  return s.padEnd(len);
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Section builders ───────────────────────────────────────────────────────

function sectionDate(now: Date): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const dayName = WEEKDAY_NAMES[now.getUTCDay()];
  const monthName = MONTH_NAMES[now.getUTCMonth()];
  return `═══ TODAY'S DATE ═══\nDate: ${yyyy}-${mm}-${dd} (${dayName}, ${now.getUTCDate()} ${monthName} ${yyyy})`;
}

function sectionBirthDetails(chart: any): string {
  const bd = chart?.birthDetails;
  if (!bd) return "";
  const place = bd.placeOfBirth;
  const offsetSign = (place?.timezoneOffset ?? 0) >= 0 ? "+" : "";
  const lines = [
    `═══ BIRTH DETAILS ═══`,
    `Name: ${bd.fullName ?? "Unknown"}`,
    `Gender: ${bd.gender ? bd.gender.charAt(0).toUpperCase() + bd.gender.slice(1) : "Not specified"}`,
    `Born: ${bd.dateOfBirth ?? "?"} at ${bd.timeOfBirth ?? "?"}`,
    `Place: ${place?.name ?? "?"} (Lat ${place?.latitude ?? "?"}, Lon ${place?.longitude ?? "?"})`,
    `Timezone: ${place?.timezone ?? "?"} (UTC${offsetSign}${place?.timezoneOffset ?? "?"})`,
    `Ayanamsa: ${bd.ayanamsa ?? "?"}`,
    `House System: ${bd.houseSystem ?? "Whole Sign"}`,
  ];
  return lines.join("\n");
}

function sectionAscendant(chart: any): string {
  const asc = chart?.ascendant;
  if (!asc) return "";
  const d1 = chart.divisionalCharts?.find((c: any) => c.varga === "D1");
  const planets = d1?.planets ?? [];
  const lagnaLord = getSignLord(asc.signNumber);
  const lordPlanet = planets.find((p: any) => p.planet === lagnaLord);
  const lordInfo = lordPlanet
    ? `${lagnaLord} in House ${lordPlanet.houseNumber} (${lordPlanet.signName})`
    : `${lagnaLord}`;
  return [
    `═══ ASCENDANT (LAGNA) ═══`,
    `Lagna: ${asc.signName} ${fmtDeg(asc.signDegree)} (${asc.nakshatra} Pada ${asc.nakshatraPada})`,
    `Lagna Lord: ${lordInfo}`,
  ].join("\n");
}

function sectionHouseLordships(ascSign: number): string {
  if (!ascSign) return "";
  const lines = [`═══ HOUSE LORDSHIPS (from Lagna) ═══`];
  for (let i = 0; i < 12; i++) {
    const houseSign = ((ascSign - 1 + i) % 12) + 1;
    const lord = getSignLord(houseSign);
    lines.push(`House ${i + 1} (${signName(houseSign)}): ${lord}`);
  }
  return lines.join("\n");
}

function sectionNatalPlanets(chart: any): string {
  const d1 = chart?.divisionalCharts?.find((c: any) => c.varga === "D1");
  const planets = d1?.planets ?? [];
  const rows = planets.filter((p: any) => p.planet !== "ascendant");
  if (rows.length === 0) return "";

  const header = `${pad("Planet", 10)}| ${pad("Sign", 13)}| ${pad("Degree", 8)}| ${pad("Nakshatra (Pada)", 21)}| ${pad("House", 6)}| R | Comb | Dignity`;
  const lines = [`═══ NATAL PLANET TABLE ═══`, header];
  for (const p of rows) {
    const retro = p.isRetrograde ? "℞" : " ";
    const comb = p.isCombust ? "Y" : " ";
    const dig = p.dignity ?? "";
    const nakStr = `${p.nakshatra} (${p.nakshatraPada})`;
    lines.push(
      `${pad(p.planet, 10)}| ${pad(p.signName, 13)}| ${pad(fmtDeg(p.signDegree), 8)}| ${pad(nakStr, 21)}| ${pad("H" + p.houseNumber, 6)}| ${retro} | ${pad(comb, 5)}| ${dig}`,
    );
  }
  return lines.join("\n");
}

function sectionCurrentTransits(
  transits: any[],
  natalAscSign: number,
  natalMoonSign: number,
  now: Date,
): string {
  if (!transits || transits.length === 0) return "";

  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const header = `${pad("Planet", 10)}| ${pad("Sign", 13)}| ${pad("Degree", 8)}| ${pad("Nakshatra", 20)}| R | ${pad("House(Lagna)", 13)}| House(Moon)`;
  const lines = [`═══ CURRENT TRANSITS (Gochara) — as of ${dateStr} ═══`, header];

  for (const t of transits) {
    const retro = t.isRetrograde ? "℞" : " ";
    const hLagna = natalAscSign ? `H${houseFrom(t.signNumber, natalAscSign)}` : "?";
    const hMoon = natalMoonSign ? `H${houseFrom(t.signNumber, natalMoonSign)}` : "?";
    const nakStr = t.nakshatraPada ? `${t.nakshatra} (${t.nakshatraPada})` : t.nakshatra;
    lines.push(
      `${pad(t.planet, 10)}| ${pad(t.signName, 13)}| ${pad(fmtDeg(t.signDegree), 8)}| ${pad(nakStr, 20)}| ${retro} | ${pad(hLagna, 13)}| ${hMoon}`,
    );
  }

  lines.push(`Natal Moon sign: ${natalMoonSign ? signName(natalMoonSign) : "?"} (for Sade Sati reference)`);
  lines.push(`Natal Lagna sign: ${natalAscSign ? signName(natalAscSign) : "?"}`);
  return lines.join("\n");
}

function sectionSadeSatiStatus(transits: any[], natalMoonSign: number): string {
  if (!transits || transits.length === 0 || !natalMoonSign) return "";
  const saturn = transits.find((t: any) => t.planet === "saturn");
  if (!saturn) return "";

  const diff = ((saturn.signNumber - natalMoonSign + 12) % 12);
  const lines = [`═══ SADE SATI / SATURN TRANSIT STATUS (AUTHORITATIVE — state this exact phase) ═══`];

  if (diff === 11) {
    lines.push(`SADE SATI: Phase 1 of 3 (Rising/Ascending) — Saturn transiting the 12th from the natal Moon. Trend: INTENSIFYING (early phase).`);
  } else if (diff === 0) {
    lines.push(`SADE SATI: Phase 2 of 3 (Peak/Janma) — Saturn transiting OVER the natal Moon. Trend: this is the MOST INTENSE phase.`);
  } else if (diff === 1) {
    lines.push(`SADE SATI: Phase 3 of 3 (Setting/Descending) — Saturn transiting the 2nd from the natal Moon. Trend: WANING (final phase, weakening).`);
  } else {
    lines.push(`NOT currently in Sade Sati period (Saturn is not in the 12th, 1st, or 2nd from the natal Moon).`);
  }

  // Ashtama Shani (Saturn 8th from Moon)
  if (diff === 7) {
    lines.push(`ASHTAMA SHANI: Saturn transiting 8th from natal Moon — period of stress and obstacles.`);
  }

  // Kantaka/Dhaiya (Saturn 4th from Moon)
  if (diff === 3) {
    lines.push(`KANTAKA SHANI (Dhaiya): Saturn transiting 4th from natal Moon — domestic and emotional pressure.`);
  }

  lines.push(`Transit Saturn: ${saturn.signName} ${fmtDeg(saturn.signDegree)}${saturn.isRetrograde ? " ℞" : ""}`);
  lines.push(`Natal Moon: ${signName(natalMoonSign)}`);
  lines.push(`DIRECTIVE: State the SADE SATI phase and trend EXACTLY as given above. Do NOT recompute, renumber, or relabel the phase, and do NOT contradict the stated trend (intensifying vs. waning).`);
  return lines.join("\n");
}

function sectionDoubleTransit(
  transits: any[],
  natalAscSign: number,
  natalMoonSign: number,
): string {
  if (!transits || transits.length === 0) return "";
  const jupiter = transits.find((t: any) => t.planet === "jupiter");
  const saturn = transits.find((t: any) => t.planet === "saturn");
  if (!jupiter || !saturn) return "";

  const jupHouseLagna = natalAscSign ? houseFrom(jupiter.signNumber, natalAscSign) : 0;
  const jupHouseMoon = natalMoonSign ? houseFrom(jupiter.signNumber, natalMoonSign) : 0;
  const satHouseLagna = natalAscSign ? houseFrom(saturn.signNumber, natalAscSign) : 0;
  const satHouseMoon = natalMoonSign ? houseFrom(saturn.signNumber, natalMoonSign) : 0;

  // Jupiter aspects: 5th, 7th, 9th from position (plus own house)
  const jupAspectsLagna = natalAscSign
    ? [jupHouseLagna, ((jupHouseLagna + 4 - 1) % 12) + 1, ((jupHouseLagna + 6 - 1) % 12) + 1, ((jupHouseLagna + 8 - 1) % 12) + 1]
    : [];
  // Saturn aspects: 3rd, 7th, 10th from position (plus own house)
  const satAspectsLagna = natalAscSign
    ? [satHouseLagna, ((satHouseLagna + 2 - 1) % 12) + 1, ((satHouseLagna + 6 - 1) % 12) + 1, ((satHouseLagna + 9 - 1) % 12) + 1]
    : [];

  const bothLagna = jupAspectsLagna.filter((h) => satAspectsLagna.includes(h)).sort((a, b) => a - b);

  const jupAspectsMoon = natalMoonSign
    ? [jupHouseMoon, ((jupHouseMoon + 4 - 1) % 12) + 1, ((jupHouseMoon + 6 - 1) % 12) + 1, ((jupHouseMoon + 8 - 1) % 12) + 1]
    : [];
  const satAspectsMoon = natalMoonSign
    ? [satHouseMoon, ((satHouseMoon + 2 - 1) % 12) + 1, ((satHouseMoon + 6 - 1) % 12) + 1, ((satHouseMoon + 9 - 1) % 12) + 1]
    : [];

  const bothMoon = jupAspectsMoon.filter((h) => satAspectsMoon.includes(h)).sort((a, b) => a - b);

  return [
    `═══ DOUBLE TRANSIT (Jupiter + Saturn) ═══`,
    `Transit Jupiter: House ${jupHouseLagna} from Lagna, House ${jupHouseMoon} from Moon`,
    `Transit Saturn: House ${satHouseLagna} from Lagna, House ${satHouseMoon} from Moon`,
    `Houses aspected by BOTH (from Lagna): ${bothLagna.length > 0 ? bothLagna.map((h) => `H${h}`).join(", ") : "none"}`,
    `Houses aspected by BOTH (from Moon): ${bothMoon.length > 0 ? bothMoon.map((h) => `H${h}`).join(", ") : "none"}`,
  ].join("\n");
}

function sectionDashas(chart: any): string {
  const dashaSystem = chart?.dashas?.[0];
  if (!dashaSystem) return "";

  const maha = dashaSystem.currentMahaDasha;
  if (!maha) return "";

  const lines = [`═══ VIMSHOTTARI DASHA ═══`];
  lines.push(`Current Mahadasha: ${maha.planet} (${maha.startDate?.slice(0, 10)} to ${maha.endDate?.slice(0, 10)})`);

  // Find current Antardasha
  const now = Date.now();
  const currentAntar = maha.children?.find(
    (a: any) => new Date(a.startDate).getTime() <= now && new Date(a.endDate).getTime() > now,
  );
  if (currentAntar) {
    lines.push(`Current Antardasha: ${currentAntar.planet} (${currentAntar.startDate?.slice(0, 10)} to ${currentAntar.endDate?.slice(0, 10)})`);

    // Find current Pratyantardasha
    const currentPratyantar = currentAntar.children?.find(
      (p: any) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now,
    );
    if (currentPratyantar) {
      lines.push(`Current Pratyantardasha: ${currentPratyantar.planet} (${currentPratyantar.startDate?.slice(0, 10)} to ${currentPratyantar.endDate?.slice(0, 10)})`);
    }
  }

  // Next 3 upcoming Mahadashas
  const timeline = dashaSystem.timeline ?? [];
  const currentIdx = timeline.findIndex(
    (p: any) => new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() > now,
  );
  if (currentIdx >= 0) {
    const upcoming = timeline.slice(currentIdx + 1, currentIdx + 4);
    if (upcoming.length > 0) {
      lines.push(`Next upcoming Mahadashas: ${upcoming.map((p: any) => `${p.planet} (${p.startDate?.slice(0, 10)} to ${p.endDate?.slice(0, 10)})`).join(", ")}`);
    }
  }

  return lines.join("\n");
}

function sectionYogas(chart: any): string {
  const yogas = chart?.yogas;
  if (!yogas || yogas.length === 0) return "";

  const active = yogas.filter((y: any) => y.isPresent);
  const inactive = yogas.filter((y: any) => !y.isPresent);

  const lines = [`═══ YOGAS (Active) ═══`];
  if (active.length === 0) {
    lines.push("No active yogas detected in this chart.");
  } else {
    for (const y of active) {
      const formedBy = y.formedBy?.length > 0 ? `formed by: ${y.formedBy.join("; ")}` : "";
      lines.push(`${y.name} (category: ${y.category}, strength: ${y.strength}) — ${formedBy}. ${y.explanation}`);
    }
  }

  if (inactive.length > 0) {
    lines.push("");
    lines.push(`═══ YOGAS (Inactive but present in chart) ═══`);
    for (const y of inactive) {
      lines.push(`${y.name} — ${y.explanation}`);
    }
  }

  return lines.join("\n");
}

function sectionDoshas(chart: any): string {
  const doshas = chart?.doshas;
  if (!doshas || doshas.length === 0) return "";

  const lines = [`═══ DOSHAS ═══`];
  for (const d of doshas) {
    const status = d.isPresent ? "Present" : "Absent";
    const sev = d.severity ? ` (severity: ${d.severity})` : "";
    lines.push(`${d.name}: ${status}${sev}`);
    lines.push(`  Explanation: ${d.explanation}`);
    if (d.affectedAreas?.length > 0) {
      lines.push(`  Affected areas: ${d.affectedAreas.join(", ")}`);
    }
    if (d.remedies?.length > 0) {
      lines.push(`  Remedies: ${d.remedies.map((r: any) => r.title).join(", ")}`);
    }
  }
  return lines.join("\n");
}

function sectionAshtakavarga(chart: any): string {
  const av = chart?.ashtakavarga;
  if (!av) return "";

  // SAV (Sarvashtakavarga) — aggregate per house
  const sav = av.sarva ?? av.sarvashtakavarga;
  if (!sav || !Array.isArray(sav)) return "";

  const lines = [`═══ ASHTAKAVARGA ═══`];
  const perHouse = sav.map((val: number, i: number) => `H${i + 1}=${val}`).join(" ");
  lines.push(`SAV (Sarvashtakavarga) per house: ${perHouse}`);

  let maxIdx = 0, minIdx = 0;
  for (let i = 1; i < sav.length; i++) {
    if (sav[i] > sav[maxIdx]) maxIdx = i;
    if (sav[i] < sav[minIdx]) minIdx = i;
  }
  lines.push(`Highest: House ${maxIdx + 1} (${sav[maxIdx]} bindus)`);
  lines.push(`Lowest: House ${minIdx + 1} (${sav[minIdx]} bindus)`);

  return lines.join("\n");
}

function sectionShadbala(chart: any): string {
  const sb = chart?.shadbala;
  if (!sb || typeof sb !== "object") return "";

  const entries = Object.entries(sb) as Array<[string, number]>;
  if (entries.length === 0) return "";

  const lines = [`═══ SHADBALA (Strength Scores, 0-100) ═══`];
  lines.push(entries.map(([p, s]) => `${p}: ${s}`).join(" | "));

  let strongest = entries[0];
  let weakest = entries[0];
  for (const e of entries) {
    if (e[1] > strongest[1]) strongest = e;
    if (e[1] < weakest[1]) weakest = e;
  }
  lines.push(`Strongest: ${strongest[0]} (${strongest[1]})`);
  lines.push(`Weakest: ${weakest[0]} (${weakest[1]})`);

  return lines.join("\n");
}

function sectionPanchang(chart: any): string {
  const p = chart?.panchang;
  if (!p) return "";
  return [
    `═══ PANCHANG (at birth) ═══`,
    `Tithi: ${p.tithi} | Vara: ${p.vara} | Nakshatra: ${p.nakshatra}`,
    `Yoga: ${p.yoga} | Karana: ${p.karana}`,
    `Sunrise: ${p.sunrise} | Sunset: ${p.sunset}`,
  ].join("\n");
}

function sectionDivisionalSummary(chart: any): string {
  const divCharts = chart?.divisionalCharts;
  if (!divCharts || divCharts.length === 0) return "";

  const available = divCharts.map((c: any) => c.varga).join(", ");
  const lines = [`═══ DIVISIONAL CHARTS (Summary) ═══`, `Available vargas: ${available}`];

  // D9 (Navamsa)
  const d9 = divCharts.find((c: any) => c.varga === "D9");
  if (d9) {
    const d9Asc = d9.planets?.find((p: any) => p.planet === "ascendant");
    lines.push("");
    lines.push(`D9 (Navamsa — Marriage, Dharma):`);
    if (d9Asc) lines.push(`  Navamsa Lagna: ${d9Asc.signName}`);
    const d9Line = d9.planets
      ?.filter((p: any) => p.planet !== "ascendant" && !["rahu", "ketu"].includes(p.planet))
      .map((p: any) => `${p.planet}: ${p.signName}`)
      .join(" | ");
    if (d9Line) lines.push(`  ${d9Line}`);
  }

  // D10 (Dasamsa)
  const d10 = divCharts.find((c: any) => c.varga === "D10");
  if (d10) {
    const d10Asc = d10.planets?.find((p: any) => p.planet === "ascendant");
    lines.push("");
    lines.push(`D10 (Dasamsa — Career):`);
    if (d10Asc) lines.push(`  Dasamsa Lagna: ${d10Asc.signName}`);
    const d10Line = d10.planets
      ?.filter((p: any) => p.planet !== "ascendant" && !["rahu", "ketu"].includes(p.planet))
      .map((p: any) => `${p.planet}: ${p.signName}`)
      .join(" | ");
    if (d10Line) lines.push(`  ${d10Line}`);
  }

  return lines.join("\n");
}

function sectionKP(chart: any): string {
  const kp = chart?.kp;
  if (!kp) return "";

  const lines = [`═══ KP SUB-LORDS (Krishnamurti Paddhati) ═══`];
  if (kp.planetSubLords?.length) {
    for (const e of kp.planetSubLords) {
      lines.push(`${capitalize(e.planet)}: Sign-lord ${e.signLord}, Star-lord ${e.starLord}, Sub-lord ${e.subLord}`);
    }
  }

  if (kp.cuspalSubLords?.length) {
    lines.push(`Cuspal Sub-Lords:`);
    for (const c of kp.cuspalSubLords) {
      lines.push(`  Cusp ${c.cusp}: Sign-lord ${c.signLord}, Star-lord ${c.starLord}, Sub-lord ${c.subLord}`);
    }
  } else {
    lines.push(`NOTE: Placidus cuspal sub-lords are not yet computed (Whole Sign houses in use) — do NOT fabricate cuspal sub-lords.`);
  }

  if (kp.rulingPlanets) {
    const rp = kp.rulingPlanets;
    lines.push(`Ruling Planets — Asc sign-lord ${rp.ascSignLord}, Asc star-lord ${rp.ascStarLord}, Moon sign-lord ${rp.moonSignLord}, Moon star-lord ${rp.moonStarLord}, Day-lord ${rp.dayLord}`);
  }

  return lines.join("\n");
}

function sectionJaimini(chart: any): string {
  const j = chart?.jaimini;
  if (!j) return "";

  const lines = [`═══ JAIMINI (Chara Karakas, Karakamsa, Arudha Padas) ═══`];

  if (j.charaKarakas?.length) {
    const ck = j.charaKarakas
      .map((c: any) => `${capitalize(c.planet)}=${c.karaka} (${fmtDeg(c.degreeInSign)})`)
      .join(", ");
    lines.push(`Chara Karakas: ${ck}`);
  }

  lines.push(`Atmakaraka: ${capitalize(j.atmakaraka ?? "unknown")}`);

  if (j.karakamsa?.signName) {
    lines.push(`Karakamsa (AK's Navamsa sign): ${j.karakamsa.signName}`);
  }

  if (j.arudhaPadas?.length) {
    for (const ap of j.arudhaPadas) {
      lines.push(`${ap.label}: ${ap.signName}`);
    }
  }

  if (j.charaDasha?.timeline?.length) {
    lines.push(`Chara Dasha: currently ${j.charaDasha.currentSignName ?? "see timeline"} (computed — use with caution pending parity validation).`);
  } else {
    lines.push(`Chara Dasha: not yet computed (stubbed pending parity validation with AstroSage/JHora) — do NOT fabricate.`);
  }

  return lines.join("\n");
}

function sectionUnavailableSystems(): string {
  return [
    `═══ SYSTEMS NOT YET COMPUTED ═══`,
    `The following are not available in this chart snapshot — do NOT fabricate them:`,
    `- KP cuspal sub-lords and significators (Placidus cusps pending)`,
    `- Varshphal (annual/solar return chart)`,
    `- Sahams (Arabic parts)`,
  ].join("\n");
}

// ─── Main builder ───────────────────────────────────────────────────────────

export function buildChartDossier(chart: any, transits: any[], now: Date): string {
  const ascSign = chart?.ascendant?.signNumber ?? 0;
  const d1 = chart?.divisionalCharts?.find((c: any) => c.varga === "D1");
  const moonPlanet = d1?.planets?.find((p: any) => p.planet === "moon");
  const natalMoonSign = moonPlanet?.signNumber ?? 0;

  return [
    sectionDate(now),
    sectionBirthDetails(chart),
    sectionAscendant(chart),
    sectionHouseLordships(ascSign),
    sectionNatalPlanets(chart),
    sectionCurrentTransits(transits, ascSign, natalMoonSign, now),
    sectionSadeSatiStatus(transits, natalMoonSign),
    sectionDoubleTransit(transits, ascSign, natalMoonSign),
    sectionDashas(chart),
    sectionYogas(chart),
    sectionDoshas(chart),
    sectionAshtakavarga(chart),
    sectionShadbala(chart),
    sectionPanchang(chart),
    sectionDivisionalSummary(chart),
    sectionKP(chart),
    sectionJaimini(chart),
    sectionUnavailableSystems(),
  ].filter(Boolean).join("\n\n");
}
