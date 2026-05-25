/**
 * ELP-2000/82 Lunar theory — geocentric ecliptic longitude of the Moon.
 * Implements Meeus "Astronomical Algorithms" Chapter 47 with ~60 periodic
 * terms for longitude (~10 arcsecond accuracy) and 48 latitude terms.
 *
 * Also provides nutation in longitude/obliquity (Meeus Ch. 22) and
 * true node computation.
 */

// ─── Fundamental arguments (Meeus Ch. 47) ──────────────────────────────────

function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

function moonFundamentals(T: number) {
  // Mean longitude of the Moon (L')
  const Lp = norm360(
    218.3164477 + 481267.88123421 * T - 0.0015786 * T * T
    + T * T * T / 538841 - T * T * T * T / 65194000
  );
  // Mean elongation of the Moon (D)
  const D = norm360(
    297.8501921 + 445267.1114034 * T - 0.0018819 * T * T
    + T * T * T / 545868 - T * T * T * T / 113065000
  );
  // Sun's mean anomaly (M)
  const M = norm360(
    357.5291092 + 35999.0502909 * T - 0.0001536 * T * T
    + T * T * T / 24490000
  );
  // Moon's mean anomaly (M')
  const Mp = norm360(
    134.9633964 + 477198.8675055 * T + 0.0087414 * T * T
    + T * T * T / 69699 - T * T * T * T / 14712000
  );
  // Moon's argument of latitude (F)
  const F = norm360(
    93.2720950 + 483202.0175233 * T - 0.0036539 * T * T
    - T * T * T / 3526000 + T * T * T * T / 863310000
  );
  return { Lp, D, M, Mp, F };
}

// ─── Longitude terms (Table 47.A from Meeus) ───────────────────────────────

// [D, M, Mp, F, coeff_sin_l] — longitude coefficients in 1e-6 degrees
const LONG_TERMS: Array<[number, number, number, number, number]> = [
  [0,  0,  1,  0,  6288774],
  [2,  0, -1,  0,  1274027],
  [2,  0,  0,  0,   658314],
  [0,  0,  2,  0,   213618],
  [0,  1,  0,  0,  -185116],
  [0,  0,  0,  2,  -114332],
  [2,  0, -2,  0,    58793],
  [2, -1, -1,  0,    57066],
  [2,  0,  1,  0,    53322],
  [2, -1,  0,  0,    45758],
  [0,  1, -1,  0,   -40923],
  [1,  0,  0,  0,   -34720],
  [0,  1,  1,  0,   -30383],
  [2,  0,  0, -2,    15327],
  [0,  0,  1,  2,   -12528],
  [0,  0,  1, -2,    10980],
  [4,  0, -1,  0,    10675],
  [0,  0,  3,  0,    10034],
  [4,  0, -2,  0,     8548],
  [2,  1, -1,  0,    -7888],
  [2,  1,  0,  0,    -6766],
  [1,  0, -1,  0,    -5163],
  [1,  1,  0,  0,     4987],
  [2, -1,  1,  0,     4036],
  [2,  0,  2,  0,     3994],
  [4,  0,  0,  0,     3861],
  [2,  0, -3,  0,     3665],
  [0,  1, -2,  0,    -2689],
  [2,  0, -1,  2,    -2602],
  [2, -1, -2,  0,     2390],
  [1,  0,  1,  0,    -2348],
  [2, -2,  0,  0,     2236],
  [0,  1,  2,  0,    -2120],
  [0,  2,  0,  0,    -2069],
  [2, -2, -1,  0,     2048],
  [2,  0,  1, -2,    -1773],
  [2,  0,  0,  2,    -1595],
  [4, -1, -1,  0,     1215],
  [0,  0,  2,  2,    -1110],
  [3,  0, -1,  0,     -892],
  [2,  1,  1,  0,     -810],
  [4, -1, -2,  0,      759],
  [0,  2, -1,  0,     -713],
  [2,  2, -1,  0,     -700],
  [2,  1, -2,  0,      691],
  [2, -1,  0, -2,      596],
  [4,  0,  1,  0,      549],
  [0,  0,  4,  0,      537],
  [4, -1,  0,  0,      520],
  [1,  0, -2,  0,     -487],
  [2,  1,  0, -2,     -399],
  [0,  0,  2, -2,     -381],
  [1,  1,  1,  0,      351],
  [3,  0, -2,  0,     -340],
  [4,  0, -3,  0,      330],
  [2, -1,  2,  0,      327],
  [0,  2,  1,  0,     -323],
  [1,  1, -1,  0,      299],
  [2,  0,  3,  0,      294],
  [2,  0, -1, -2,        0],
];

// ─── Latitude terms (Table 47.B from Meeus) ────────────────────────────────

// [D, M, Mp, F, coeff_sin_b] — latitude coefficients in 1e-6 degrees
const LAT_TERMS: Array<[number, number, number, number, number]> = [
  [0,  0,  0,  1,  5128122],
  [0,  0,  1,  1,   280602],
  [0,  0,  1, -1,   277693],
  [2,  0,  0, -1,   173237],
  [2,  0, -1,  1,    55413],
  [2,  0, -1, -1,    46271],
  [2,  0,  0,  1,    32573],
  [0,  0,  2,  1,    17198],
  [2,  0,  1, -1,     9266],
  [0,  0,  2, -1,     8822],
  [2, -1,  0, -1,     8216],
  [2,  0, -2, -1,     4324],
  [2,  0,  1,  1,     4200],
  [2,  1,  0, -1,    -3359],
  [2, -1, -1,  1,     2463],
  [2, -1,  0,  1,     2211],
  [2, -1, -1, -1,     2065],
  [0,  1, -1, -1,    -1870],
  [4,  0, -1, -1,     1828],
  [0,  1,  0,  1,    -1794],
  [0,  0,  0,  3,    -1749],
  [0,  1, -1,  1,    -1565],
  [1,  0,  0,  1,    -1491],
  [0,  1,  1,  1,    -1475],
  [0,  1,  1, -1,    -1410],
  [0,  1,  0, -1,    -1344],
  [1,  0,  0, -1,    -1335],
  [0,  0,  3,  1,     1107],
  [4,  0,  0, -1,     1021],
  [4,  0, -1,  1,      833],
  [0,  0,  1, -3,      777],
  [4,  0, -2,  1,      671],
  [2,  0,  0, -3,      607],
  [2,  0,  2, -1,      596],
  [2, -1,  1, -1,      491],
  [2,  0, -2,  1,     -451],
  [0,  0,  3, -1,      439],
  [2,  0,  2,  1,      422],
  [2,  0, -3, -1,      421],
  [2,  1, -1,  1,     -366],
  [2,  1,  0,  1,     -351],
  [4,  0,  0,  1,      331],
  [2, -1,  1,  1,      315],
  [2, -2,  0, -1,      302],
  [0,  0,  1,  3,     -283],
  [2,  1,  1, -1,     -229],
  [1,  1,  0, -1,      223],
  [1,  1,  0,  1,      223],
];

// ─── Distance terms (Table 47.A, cosine column) ───────────────────────────

// [D, M, Mp, F, coeff_cos_r] — distance coefficients in meters (added to 385000.56 km)
const DIST_TERMS: Array<[number, number, number, number, number]> = [
  [0,  0,  1,  0, -20905355],
  [2,  0, -1,  0,  -3699111],
  [2,  0,  0,  0,  -2955968],
  [0,  0,  2,  0,   -569925],
  [0,  1,  0,  0,    48888],
  [0,  0,  0,  2,    -3149],
  [2,  0, -2,  0,   246158],
  [2, -1, -1,  0,  -152138],
  [2,  0,  1,  0,  -170733],
  [2, -1,  0,  0,  -204586],
  [0,  1, -1,  0,  -129620],
  [1,  0,  0,  0,   108743],
  [0,  1,  1,  0,   104755],
  [2,  0,  0, -2,    10321],
  [0,  0,  1,  2,        0],
  [0,  0,  1, -2,    79661],
  [4,  0, -1,  0,   -34782],
  [0,  0,  3,  0,   -23210],
  [4,  0, -2,  0,   -21636],
  [2,  1, -1,  0,    24208],
  [2,  1,  0,  0,    30824],
  [1,  0, -1,  0,    -8379],
  [1,  1,  0,  0,   -16675],
  [2, -1,  1,  0,   -12831],
  [2,  0,  2,  0,   -10445],
  [4,  0,  0,  0,   -11650],
  [2,  0, -3,  0,    14403],
  [0,  1, -2,  0,    -7003],
  [2,  0, -1,  2,        0],
  [2, -1, -2,  0,    10056],
  [1,  0,  1,  0,     6322],
  [2, -2,  0,  0,    -9884],
  [0,  1,  2,  0,     5751],
  [0,  2,  0,  0,        0],
  [2, -2, -1,  0,    -4950],
  [2,  0,  1, -2,     4130],
  [2,  0,  0,  2,        0],
  [4, -1, -1,  0,    -3958],
  [0,  0,  2,  2,        0],
  [3,  0, -1,  0,     3258],
  [2,  1,  1,  0,     2616],
  [4, -1, -2,  0,    -1897],
  [0,  2, -1,  0,    -2117],
  [2,  2, -1,  0,     2354],
  [2,  1, -2,  0,        0],
  [2, -1,  0, -2,        0],
  [4,  0,  1,  0,    -1423],
  [0,  0,  4,  0,    -1117],
  [4, -1,  0,  0,    -1571],
  [1,  0, -2,  0,    -1739],
];

/**
 * Geocentric ecliptic longitude of the Moon (degrees).
 * ELP-2000/82 per Meeus Ch. 47 (~60 terms, ~10 arcsecond accuracy).
 */
export function elp82MoonLongitude(T: number): number {
  const { Lp, D, M, Mp, F } = moonFundamentals(T);
  const Dr = D * Math.PI / 180;
  const Mr = M * Math.PI / 180;
  const Mpr = Mp * Math.PI / 180;
  const Fr = F * Math.PI / 180;

  // Eccentricity of Earth's orbit (affects terms with M)
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const E2 = E * E;

  let sumL = 0;
  for (const [iD, iM, iMp, iF, coeff] of LONG_TERMS) {
    if (coeff === 0) continue;
    const arg = iD * Dr + iM * Mr + iMp * Mpr + iF * Fr;
    let eCorr = 1;
    if (Math.abs(iM) === 1) eCorr = E;
    else if (Math.abs(iM) === 2) eCorr = E2;
    sumL += coeff * eCorr * Math.sin(arg);
  }

  // Additional corrections (Meeus p. 338)
  // A1 = 119.75 + 131.849 * T (Venus)
  // A2 = 53.09 + 479264.290 * T (Jupiter)
  // A3 = 313.45 + 481266.484 * T
  const A1 = (119.75 + 131.849 * T) * Math.PI / 180;
  const A2 = (53.09 + 479264.290 * T) * Math.PI / 180;
  const A3 = (313.45 + 481266.484 * T) * Math.PI / 180;
  sumL += 3958 * Math.sin(A1);
  sumL += 1962 * Math.sin(Lp * Math.PI / 180 - Fr);
  sumL += 318 * Math.sin(A2);

  return norm360(Lp + sumL / 1000000);
}

/**
 * Geocentric ecliptic latitude of the Moon (degrees).
 */
export function elp82MoonLatitude(T: number): number {
  const { Lp, D, M, Mp, F } = moonFundamentals(T);
  const Dr = D * Math.PI / 180;
  const Mr = M * Math.PI / 180;
  const Mpr = Mp * Math.PI / 180;
  const Fr = F * Math.PI / 180;

  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const E2 = E * E;

  let sumB = 0;
  for (const [iD, iM, iMp, iF, coeff] of LAT_TERMS) {
    if (coeff === 0) continue;
    const arg = iD * Dr + iM * Mr + iMp * Mpr + iF * Fr;
    let eCorr = 1;
    if (Math.abs(iM) === 1) eCorr = E;
    else if (Math.abs(iM) === 2) eCorr = E2;
    sumB += coeff * eCorr * Math.sin(arg);
  }

  // Additional corrections
  const A1 = (119.75 + 131.849 * T) * Math.PI / 180;
  const A3 = (313.45 + 481266.484 * T) * Math.PI / 180;
  sumB += -2235 * Math.sin(Lp * Math.PI / 180);
  sumB += 382 * Math.sin(A3);
  sumB += 175 * Math.sin(A1 - Fr);
  sumB += 175 * Math.sin(A1 + Fr);
  sumB += 127 * Math.sin(Lp * Math.PI / 180 - Mpr);
  sumB += -115 * Math.sin(Lp * Math.PI / 180 + Mpr);

  return sumB / 1000000;
}

// ─── Nutation (Meeus Ch. 22) ───────────────────────────────────────────────

/**
 * Nutation in longitude (deltaPsi) and obliquity (deltaEps) in degrees.
 * Uses IAU 1980 nutation series with 63 terms (first 5 dominant terms
 * give ~0.5 arcsecond accuracy).
 */
export function nutation(T: number): { deltaPsi: number; deltaEps: number } {
  // Fundamental arguments (degrees)
  const omega = norm360(125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000);
  const Ls = norm360(280.4665 + 36000.7698 * T); // Sun mean longitude
  const Lm = norm360(218.3165 + 481267.8813 * T); // Moon mean longitude
  const D = norm360(297.85036 + 445267.111480 * T - 0.0019142 * T * T + T * T * T / 189474);
  const M = norm360(357.52772 + 35999.050340 * T - 0.0001603 * T * T - T * T * T / 300000);
  const Mp = norm360(134.96298 + 477198.867398 * T + 0.0086972 * T * T + T * T * T / 56250);
  const F = norm360(93.27191 + 483202.017538 * T - 0.0036825 * T * T + T * T * T / 327270);

  const omR = omega * Math.PI / 180;
  const LsR = Ls * Math.PI / 180;
  const LmR = Lm * Math.PI / 180;
  const DR = D * Math.PI / 180;
  const MR = M * Math.PI / 180;
  const MpR = Mp * Math.PI / 180;
  const FR = F * Math.PI / 180;

  // IAU 1980 nutation: dominant terms (Meeus Table 22.A)
  // [D, M, Mp, F, omega_mult, psi_sin, psi_sin_T, eps_cos, eps_cos_T]
  // Coefficients in 0.0001 arcseconds
  const NUT_TERMS: Array<[number,number,number,number,number, number,number,number,number]> = [
    [ 0, 0, 0, 0, 1, -171996, -1742, 92025, 89],
    [-2, 0, 0, 2, 2,  -13187,   -16,  5736, -31],
    [ 0, 0, 0, 2, 2,   -2274,    -2,   977,  -5],
    [ 0, 0, 0, 0, 2,    2062,     2,  -895,   5],
    [ 0, 1, 0, 0, 0,    1426,   -34,    54,  -1],
    [ 0, 0, 1, 0, 0,     712,     1,    -7,   0],
    [-2, 1, 0, 2, 2,    -517,    12,   224,  -6],
    [ 0, 0, 0, 2, 1,    -386,    -4,   200,   0],
    [ 0, 0, 1, 2, 2,    -301,     0,   129,  -1],
    [-2,-1, 0, 2, 2,     217,    -5,   -95,   3],
    [-2, 0, 1, 0, 0,    -158,     0,     0,   0],
    [-2, 0, 0, 2, 1,     129,     1,   -70,   0],
    [ 0, 0,-1, 2, 2,     123,     0,   -53,   0],
    [ 2, 0, 0, 0, 0,      63,     0,     0,   0],
    [ 0, 0, 1, 0, 1,      63,     1,   -33,   0],
    [ 2, 0,-1, 2, 2,     -59,     0,    26,   0],
    [ 0, 0,-1, 0, 1,     -58,    -1,    32,   0],
    [ 0, 0, 1, 2, 1,     -51,     0,    27,   0],
    [-2, 0, 2, 0, 0,      46,     0,     0,   0],
    [ 0, 0,-2, 2, 1,      45,     0,   -24,   0],
    [ 2, 0, 0, 2, 2,     -38,     0,    16,   0],
    [ 0, 0, 2, 2, 2,     -31,     0,    13,   0],
    [ 0, 0, 2, 0, 0,      29,     0,     0,   0],
    [-2, 0, 1, 2, 2,      29,     0,   -12,   0],
    [ 0, 0, 0, 2, 0,      26,     0,     0,   0],
    [-2, 0, 0, 2, 0,     -22,     0,     0,   0],
    [ 0, 0,-1, 2, 1,      21,     0,   -10,   0],
    [ 0, 2, 0, 0, 0,      17,    -1,     0,   0],
    [ 2, 0,-1, 0, 1,      16,     0,    -8,   0],
    [-2, 0, 1, 0, 1,     -16,     1,     7,   0],
    [-2, 2, 0, 2, 2,     -15,     0,     9,   0],
    [ 0, 0, 0, 0, 0,     -13,     0,     7,   0],
    [ 2, 0, 1, 2, 2,     -12,     0,     6,   0],
  ];

  let deltaPsi = 0; // arcseconds * 10000
  let deltaEps = 0;

  for (const [iD, iM, iMp, iF, iOm, psiS, psiST, epsC, epsCT] of NUT_TERMS) {
    const arg = iD * DR + iM * MR + iMp * MpR + iF * FR + iOm * omR;
    deltaPsi += (psiS + psiST * T) * Math.sin(arg);
    deltaEps += (epsC + epsCT * T) * Math.cos(arg);
  }

  // Convert from 0.0001 arcseconds to degrees
  return {
    deltaPsi: deltaPsi * 0.0001 / 3600,
    deltaEps: deltaEps * 0.0001 / 3600,
  };
}

/**
 * Mean obliquity of the ecliptic (IAU formula, Meeus Ch. 22).
 * Returns degrees.
 */
export function meanObliquity(T: number): number {
  const U = T / 100;
  return 23 + 26/60 + 21.448/3600
    - 4680.93 / 3600 * U
    - 1.55 / 3600 * U * U
    + 1999.25 / 3600 * U * U * U
    - 51.38 / 3600 * U * U * U * U
    - 249.67 / 3600 * U * U * U * U * U
    - 39.05 / 3600 * U * U * U * U * U * U;
}

/**
 * True obliquity (mean + nutation in obliquity).
 */
export function trueObliquity(T: number): number {
  return meanObliquity(T) + nutation(T).deltaEps;
}

// ─── True Node (Meeus Ch. 47) ──────────────────────────────────────────────

/**
 * Mean ascending node of the Moon's orbit (degrees).
 */
export function meanNode(T: number): number {
  return norm360(
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T
    + T * T * T / 467441 - T * T * T * T / 60616000
  );
}

/**
 * True ascending node — mean node + periodic perturbations.
 * Uses Meeus perturbation terms for higher accuracy.
 */
export function trueNode(T: number): number {
  const omega = meanNode(T);
  const D = norm360(297.85036 + 445267.111480 * T - 0.0019142 * T * T + T * T * T / 189474);
  const M = norm360(357.52772 + 35999.050340 * T - 0.0001603 * T * T - T * T * T / 300000);
  const Mp = norm360(134.96298 + 477198.867398 * T + 0.0086972 * T * T + T * T * T / 56250);
  const F = norm360(93.27191 + 483202.017538 * T - 0.0036825 * T * T + T * T * T / 327270);

  const Dr = D * Math.PI / 180;
  const Mr = M * Math.PI / 180;
  const Mpr = Mp * Math.PI / 180;
  const Fr = F * Math.PI / 180;
  const omR = omega * Math.PI / 180;

  // Perturbation terms for the true node (Meeus)
  let correction = 0;
  correction += -1.4979 * Math.sin(2 * (Dr - Fr));
  correction +=  0.1518 * Math.sin(Mr);
  correction += -0.1518 * Math.sin(2 * (Dr - Fr - Mpr));
  correction +=  0.1316 * Math.sin(2 * Dr);
  correction += -0.0750 * Math.sin(Mpr);
  correction += -0.0749 * Math.sin(2 * (Dr - Fr) - Mr);
  correction +=  0.0650 * Math.sin(2 * (Dr - Fr) + Mpr);
  correction +=  0.0395 * Math.sin(2 * (Dr - Fr) - Mpr - Mr);
  correction += -0.0302 * Math.sin(2 * Fr);
  correction += -0.0247 * Math.sin(2 * (Mpr + Fr - Dr));
  correction +=  0.0199 * Math.sin(Dr + Mr - 2 * Fr);
  correction +=  0.0164 * Math.sin(Mpr - Mr + 2 * (Dr - Fr));
  correction += -0.0154 * Math.sin(2 * Dr + Mr - 2 * Fr);
  correction +=  0.0131 * Math.sin(Mpr + Mr + 2 * (Dr - Fr));

  return norm360(omega + correction);
}
