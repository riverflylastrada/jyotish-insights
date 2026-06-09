/**
 * Lightweight panchang calculator for the Muhurta Finder.
 *
 * Uses simplified Meeus algorithms for Sun and Moon longitude — sufficient
 * for tithi / nakshatra identification (accuracy ~0.5° Moon, ~0.01° Sun).
 * Full precision is in the Deno engine (ELP-2000/82 + VSOP87).
 */

// ── Math helpers ────────────────────────────────────────────────────

const RAD = Math.PI / 180;
function norm360(d: number): number { return ((d % 360) + 360) % 360; }

function julianDay(y: number, m: number, d: number, h: number): number {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const D = d + h / 24;
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
}

function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

// ── Simplified Sun longitude (Meeus Ch. 25) ─────────────────────────

function sunLongitude(T: number): number {
  const M = norm360(357.5291092 + 35999.0502909 * T);
  const C = (1.9146 - 0.004817 * T - 0.000014 * T * T) * Math.sin(RAD * M)
          + (0.019993 - 0.000101 * T) * Math.sin(RAD * 2 * M)
          + 0.00029 * Math.sin(RAD * 3 * M);
  const omega = 125.04 - 1934.136 * T;
  const apparentLon = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T + C)
                    - 0.00569 - 0.00478 * Math.sin(RAD * omega);
  return norm360(apparentLon);
}

// ── Simplified Moon longitude (Meeus Ch. 47, ~12 terms) ─────────────

function moonLongitude(T: number): number {
  const Lp = norm360(218.3164477 + 481267.88123421 * T);
  const D  = norm360(297.8501921 + 445267.1114034 * T);
  const M  = norm360(357.5291092 + 35999.0502909 * T);
  const Mp = norm360(134.9633964 + 477198.8675055 * T);
  const F  = norm360(93.2720950  + 483202.0175233 * T);

  let sumL = 0;
  // Major longitude terms (Meeus Table 47.A, top terms)
  sumL += 6288774 * Math.sin(RAD * Mp);
  sumL += 1274027 * Math.sin(RAD * (2 * D - Mp));
  sumL += 658314  * Math.sin(RAD * (2 * D));
  sumL += 213618  * Math.sin(RAD * (2 * Mp));
  sumL -= 185116  * Math.sin(RAD * M);
  sumL -= 114332  * Math.sin(RAD * (2 * F));
  sumL += 58793   * Math.sin(RAD * (2 * D - 2 * Mp));
  sumL += 57066   * Math.sin(RAD * (2 * D - M - Mp));
  sumL += 53322   * Math.sin(RAD * (2 * D + Mp));
  sumL += 45758   * Math.sin(RAD * (2 * D - M));
  sumL -= 40923   * Math.sin(RAD * (M - Mp));
  sumL -= 34720   * Math.sin(RAD * D);

  return norm360(Lp + sumL / 1000000);
}

// ── Lahiri Ayanamsa (simplified) ────────────────────────────────────

function lahiriAyanamsa(jd: number): number {
  const T = julianCenturies(jd);
  return 23.85 + 0.0137 * (jd - 2451545.0) / 365.25;
}

// ── Tithi, Nakshatra, Vara, Karana, Yoga names ──────────────────────

export const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
];

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha',
  'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha',
  'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

const NAKSHATRA_HI: Record<string, string> = {
  'Ashwini': 'अश्विनी', 'Bharani': 'भरणी', 'Krittika': 'कृत्तिका',
  'Rohini': 'रोहिणी', 'Mrigashira': 'मृगशिरा', 'Ardra': 'आर्द्रा',
  'Punarvasu': 'पुनर्वसु', 'Pushya': 'पुष्य', 'Ashlesha': 'आश्लेषा',
  'Magha': 'मघा', 'Purva Phalguni': 'पूर्वा फाल्गुनी', 'Uttara Phalguni': 'उत्तरा फाल्गुनी',
  'Hasta': 'हस्त', 'Chitra': 'चित्रा', 'Swati': 'स्वाति', 'Vishakha': 'विशाखा',
  'Anuradha': 'अनुराधा', 'Jyeshtha': 'ज्येष्ठा', 'Mula': 'मूल',
  'Purva Ashadha': 'पूर्वाषाढ़ा', 'Uttara Ashadha': 'उत्तराषाढ़ा', 'Shravana': 'श्रवण',
  'Dhanishtha': 'धनिष्ठा', 'Shatabhisha': 'शतभिषा', 'Purva Bhadrapada': 'पूर्वाभाद्रपद',
  'Uttara Bhadrapada': 'उत्तराभाद्रपद', 'Revati': 'रेवती',
};

export const WEEKDAY_NAMES = [
  { en: 'Sunday', hi: 'रविवार', key: 'Ravivara' },
  { en: 'Monday', hi: 'सोमवार', key: 'Somavara' },
  { en: 'Tuesday', hi: 'मंगलवार', key: 'Mangalavara' },
  { en: 'Wednesday', hi: 'बुधवार', key: 'Budhavara' },
  { en: 'Thursday', hi: 'गुरुवार', key: 'Guruvara' },
  { en: 'Friday', hi: 'शुक्रवार', key: 'Shukravara' },
  { en: 'Saturday', hi: 'शनिवार', key: 'Shanivara' },
];

const KARANA_REPEATING = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti'];

// ── Compute panchang for one day ────────────────────────────────────

export interface DayPanchang {
  date: string;
  tithi: string;
  tithiFull: string;       // e.g. "Shukla Panchami"
  tithiIndex: number;
  nakshatra: string;
  nakshatraHi: string;
  nakshatraIndex: number;
  vara: string;            // EN name
  varaHi: string;
  varaIndex: number;
  karana: string;
  /** Sidereal Moon rashi 0..11 (0 = Mesha/Aries). Basis for daily Chandra-gochar rashifal. */
  moonRashiIndex: number;
  /** Sidereal Sun rashi 0..11 (0 = Mesha/Aries). Basis for monthly Surya-gochar rashifal. */
  sunRashiIndex: number;
  sunriseMin: number;
  sunsetMin: number;
}

export function computeDayPanchang(
  dateStr: string,
  lat: number,
  lon: number,
  tzOffsetHours: number,
): DayPanchang {
  const [y, m, d] = dateStr.split('-').map(Number);

  // Julian Day at noon local → UT
  const jdNoon = julianDay(y, m, d, 12 - tzOffsetHours);
  const T = julianCenturies(jdNoon);

  const sunTrop = sunLongitude(T);
  const moonTrop = moonLongitude(T);
  const aya = lahiriAyanamsa(jdNoon);
  const moonSid = norm360(moonTrop - aya);
  const sunSid = norm360(sunTrop - aya);

  // Tithi
  const elong = norm360(moonTrop - sunTrop);
  const tithiIdx = Math.floor(elong / 12);
  const pakshaPrefix = tithiIdx < 15 ? 'Shukla' : 'Krishna';
  const tithiName = TITHI_NAMES[tithiIdx];
  const tithiFull = tithiIdx === 14 ? 'Purnima'
                  : tithiIdx === 29 ? 'Amavasya'
                  : `${pakshaPrefix} ${tithiName}`;

  // Vara
  const jsDate = new Date(Date.UTC(y, m - 1, d));
  const varaIdx = jsDate.getUTCDay();
  const weekday = WEEKDAY_NAMES[varaIdx];

  // Nakshatra
  const nakIdx = Math.floor(moonSid / (360 / 27));
  const nak = NAKSHATRA_NAMES[nakIdx % 27];

  // Karana
  const karanaIdx = Math.floor(elong / 6);
  let karana: string;
  if (karanaIdx === 0) karana = 'Kimstughna';
  else if (karanaIdx >= 57) {
    const fixed = ['Shakuni', 'Chatushpada', 'Naga'];
    karana = fixed[karanaIdx - 57] ?? 'Kimstughna';
  } else {
    karana = KARANA_REPEATING[(karanaIdx - 1) % 7];
  }

  // Sunrise / sunset (NOAA simplified)
  const jdNoonUT = julianDay(y, m, d, 12);
  const Tsr = julianCenturies(jdNoonUT);
  const Msr = norm360(357.5291 + 35999.0503 * Tsr);
  const Csr = 1.9148 * Math.sin(RAD * Msr) + 0.02 * Math.sin(RAD * 2 * Msr);
  const lambdaSr = norm360(Msr + Csr + 180 + 102.9372);
  const declSr = Math.asin(Math.sin(RAD * 23.44) * Math.sin(RAD * lambdaSr)) / RAD;
  const cosH = (Math.sin(RAD * -0.833) - Math.sin(RAD * lat) * Math.sin(RAD * declSr))
             / (Math.cos(RAD * lat) * Math.cos(RAD * declSr));
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD;

  const n = Math.round(jdNoonUT - 2451545.0009 + lon / 360);
  const Jstar = 2451545.0009 + n - lon / 360;
  const Jtransit = Jstar + 0.0053 * Math.sin(RAD * Msr) - 0.0069 * Math.sin(RAD * 2 * lambdaSr);
  const Jrise = Jtransit - H / 360;
  const Jset  = Jtransit + H / 360;

  const jdToLocalMin = (j: number) => {
    const utFrac = (j + 0.5) % 1;
    const utMin = utFrac * 1440;
    return Math.round(utMin + tzOffsetHours * 60);
  };

  return {
    date: dateStr,
    tithi: tithiName,
    tithiFull,
    tithiIndex: tithiIdx,
    nakshatra: nak,
    nakshatraHi: NAKSHATRA_HI[nak] ?? nak,
    nakshatraIndex: nakIdx % 27,
    vara: weekday.en,
    varaHi: weekday.hi,
    varaIndex: varaIdx,
    karana,
    moonRashiIndex: Math.floor(moonSid / 30) % 12,
    sunRashiIndex: Math.floor(sunSid / 30) % 12,
    sunriseMin: jdToLocalMin(Jrise),
    sunsetMin: jdToLocalMin(Jset),
  };
}

// ── Moon nakshatra + pada at a specific moment ──────────────────────

export interface MoonNakshatra {
  nakshatraIndex: number;   // 0..26
  nakshatra: string;        // English name
  nakshatraHi: string;      // Devanagari name
  pada: number;             // 1..4
  rashiIndex: number;       // 0..11 (0 = Mesha/Aries)
}

/**
 * Sidereal Moon nakshatra + pada for a given local date & time. Location-
 * independent (the Moon's longitude is global; only sign/nakshatra-change
 * *moments* shift slightly by timezone). Used for baby-name suggestions, where
 * the birth moment's nakshatra-pada fixes the auspicious naming syllables.
 */
export function computeMoonNakshatra(
  dateStr: string,
  timeStr: string,
  tzOffsetHours: number,
): MoonNakshatra {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh = 0, mm = 0] = (timeStr || '00:00').split(':').map(Number);
  const localHour = (hh || 0) + (mm || 0) / 60;
  const jd = julianDay(y, m, d, localHour - tzOffsetHours);
  const T = julianCenturies(jd);
  const moonSid = norm360(moonLongitude(T) - lahiriAyanamsa(jd));

  const nakSize = 360 / 27;            // 13°20′
  const nakIndex = Math.floor(moonSid / nakSize) % 27;
  const pada = Math.floor((moonSid % nakSize) / (nakSize / 4)) + 1;
  const nak = NAKSHATRA_NAMES[nakIndex];

  return {
    nakshatraIndex: nakIndex,
    nakshatra: nak,
    nakshatraHi: NAKSHATRA_HI[nak] ?? nak,
    pada,
    rashiIndex: Math.floor(moonSid / 30) % 12,
  };
}

// ── Abhijit Muhurta (8th of 15 daytime muhurtas) ────────────────────

export function computeAbhijitMuhurta(
  sunriseMin: number, sunsetMin: number, weekday: number,
): { startMin: number; endMin: number; active: boolean } {
  const dayLen = sunsetMin - sunriseMin;
  const muhurtaLen = dayLen / 15;
  const startMin = sunriseMin + 7 * muhurtaLen;
  return { startMin, endMin: startMin + muhurtaLen, active: weekday !== 3 };
}

export function minutesToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
