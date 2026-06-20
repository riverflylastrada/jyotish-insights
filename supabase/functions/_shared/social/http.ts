/**
 * Shared HTTP + DB helpers for the social-* edge functions.
 * Mirrors the corsHeaders / json() / service-client / admin-gate conventions used
 * by daily-email and learn-content.
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeTz, tzOffsetHours } from "./time.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Service-role client, or null if env is missing. */
export function serviceClient(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type AdminGate = { ok: true; uid: string } | { ok: false; status: number; error: string };

/** Verify the bearer JWT belongs to a profiles.role = 'admin' user. */
export async function requireAdmin(sb: SupabaseClient, req: Request): Promise<AdminGate> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: userData } = await sb.auth.getUser(jwt);
  const uid = userData?.user?.id;
  if (!uid) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: prof } = await sb.from("profiles").select("role").eq("user_id", uid).maybeSingle();
  if ((prof?.role as string) !== "admin") return { ok: false, status: 403, error: "Admin access required" };
  return { ok: true, uid };
}

export interface SocialSettings {
  twitter_enabled: boolean;
  max_per_day: number;
  max_per_hour: number;
  poll_interval_min: number;
  default_city: string;
  default_lat: number;
  default_lon: number;
  default_tz: string;
  languages: string[];
  include_link: boolean;
  fetch_metrics: boolean;
  last_poll_at: string | null;
}

const SETTINGS_DEFAULTS: SocialSettings = {
  twitter_enabled: false, max_per_day: 16, max_per_hour: 10, poll_interval_min: 15,
  default_city: "Bharuch", default_lat: 21.7051, default_lon: 72.9959, default_tz: "Asia/Kolkata",
  languages: ["hi", "en"], include_link: false, fetch_metrics: false, last_poll_at: null,
};

export async function loadSettings(sb: SupabaseClient): Promise<SocialSettings> {
  const { data } = await sb.from("social_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return { ...SETTINGS_DEFAULTS };
  const langs = Array.isArray((data as Record<string, unknown>).languages) ? (data as Record<string, unknown>).languages as string[] : SETTINGS_DEFAULTS.languages;
  return { ...SETTINGS_DEFAULTS, ...(data as Partial<SocialSettings>), languages: langs };
}

export async function isFlagEnabled(sb: SupabaseClient, key: string): Promise<boolean> {
  const { data } = await sb.from("social_feature_flags").select("enabled").eq("key", key).maybeSingle();
  return !!(data as { enabled?: boolean } | null)?.enabled;
}

export async function logRun(sb: SupabaseClient, action: string, result: "ok" | "skipped" | "error", detail: unknown): Promise<void> {
  try {
    await sb.from("social_runs").insert({ action, result, detail });
  } catch { /* logging is best-effort */ }
}

/** Convenience: place-of-posting derived from settings (tz offset resolved now). */
export function placeFromSettings(s: SocialSettings, at: Date) {
  const tz = safeTz(s.default_tz);
  return { lat: s.default_lat, lon: s.default_lon, tz, tzOffsetHours: tzOffsetHours(tz, at) };
}
