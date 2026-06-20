/**
 * Timezone + locale-date helpers for the social bot (Deno edge runtime).
 *
 * Intl is available in the edge runtime and handles DST. These mirror the helpers
 * inlined in supabase/functions/daily-email/index.ts, plus Hindi/English date
 * labels and minute→HH:MM formatting used by the tweet templates.
 */

const FALLBACK_TZ = "Asia/Kolkata";

export function safeTz(tz: string | null | undefined): string {
  if (!tz) return FALLBACK_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return FALLBACK_TZ;
  }
}

/** 'YYYY-MM-DD' in the given timezone. */
export function localDate(tz: string, at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Signed UTC offset (hours, may be fractional e.g. 5.5) for the tz at the instant. */
export function tzOffsetHours(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +(m.hour === "24" ? "0" : m.hour), +m.minute, +m.second);
  return (asUTC - at.getTime()) / 3_600_000;
}

/** JS weekday (0=Sun … 6=Sat) of a 'YYYY-MM-DD' date, timezone-independent. */
export function weekdayOf(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * UTC instant for a local wall-clock time on a given date in a tz.
 * e.g. instantForLocalTime('2026-06-20', 6, 0, 'Asia/Kolkata') → 00:30Z.
 */
export function instantForLocalTime(dateISO: string, hour: number, minute: number, tz: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  // First guess treats the wall-clock as if UTC, then correct by the tz offset
  // at that instant (offset is locally constant across a one-hour shift).
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
  const off = tzOffsetHours(tz, guess);
  return new Date(guess.getTime() - off * 3_600_000);
}

/** Add N calendar days to a 'YYYY-MM-DD' string (UTC arithmetic, tz-independent). */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Minutes-from-midnight → "HH:MM" (wraps a day). */
export function minutesToHHMM(min: number): string {
  let t = Math.round(min);
  t = ((t % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

const WEEKDAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
const MONTH_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_HI = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

/** Human date label, e.g. "गुरुवार, 18 जून 2026" / "Thursday, 18 June 2026". */
export function dateLabel(dateISO: string, locale: "en" | "hi"): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const wd = weekdayOf(dateISO);
  if (locale === "hi") return `${WEEKDAY_HI[wd]}, ${d} ${MONTH_HI[m - 1]} ${y}`;
  return `${WEEKDAY_EN[wd]}, ${d} ${MONTH_EN[m - 1]} ${y}`;
}
