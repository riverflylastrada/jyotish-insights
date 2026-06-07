/**
 * Per-user weekly AI usage cap — shared by guru-debate and voice-session.
 *
 * Two rolling-7-day tiers (config in app_settings, category 'usage_limits'):
 *   - questions: all AI question-events (single-guru, debate, prashna, auto, voice)
 *   - debates:   the expensive multi-guru tribunal (Debate + Prashna)
 *
 * Admins (profiles.role='admin') and an admin-managed allowlist are exempt.
 * A master switch (usage_cap_enabled) turns the whole thing off. Counting is
 * by DISTINCT turn_id (one user submission = one event) via the
 * usage_turn_counts RPC, so a tribunal's ~9 LLM calls count as a single
 * question/debate. The in-progress turn is excluded so a multi-call
 * submission never blocks its own later calls (e.g. the verdict after the
 * gurus). Best-effort: any failure resolves to ALLOWED (never block users on
 * an infra hiccup).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type TurnKind = "debate" | "single" | "auto" | "voice";

export interface CapDecision {
  allowed: boolean;
  /** machine reason when blocked: 'debates' | 'questions' */
  reason?: "debates" | "questions";
  /** user-facing message when blocked */
  message?: string;
  used?: number;
  cap?: number;
}

const ALLOW: CapDecision = { allowed: true };

function admin() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Decide whether `userId` may make one more AI call of kind `turnKind`.
 * `turnId` is the current submission's id (excluded from the window count).
 */
export async function checkWeeklyCap(
  userId: string | null,
  turnKind: TurnKind,
  turnId: string | null,
): Promise<CapDecision> {
  try {
    // Anonymous calls can't be attributed to a user → not capped here.
    if (!userId) return ALLOW;
    const sb = admin();
    if (!sb) return ALLOW;

    // Load config (master switch, the two caps, allowlist).
    const { data: rows } = await sb
      .from("app_settings")
      .select("key, value")
      .eq("category", "usage_limits");
    const cfg: Record<string, string> = {};
    for (const r of rows ?? []) {
      const k = (r as Record<string, unknown>).key;
      const v = (r as Record<string, unknown>).value;
      if (typeof k === "string") cfg[k] = typeof v === "string" ? v : "";
    }

    if ((cfg["usage_cap_enabled"] ?? "true").toLowerCase() !== "true") return ALLOW;

    // Allowlist (JSON array of user_id strings) — best-effort parse.
    try {
      const list = JSON.parse(cfg["usage_cap_allowlist"] ?? "[]");
      if (Array.isArray(list) && list.includes(userId)) return ALLOW;
    } catch { /* malformed allowlist → ignore, fall through */ }

    // Admins are always exempt.
    const { data: prof } = await sb
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if ((prof as { role?: string } | null)?.role === "admin") return ALLOW;

    const capQuestions = Math.max(0, parseInt(cfg["usage_weekly_cap_questions"] ?? "25", 10) || 0);
    const capDebates = Math.max(0, parseInt(cfg["usage_weekly_cap_debates"] ?? "3", 10) || 0);

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: counts, error } = await sb.rpc("usage_turn_counts", {
      p_user: userId,
      p_since: since,
      p_exclude_turn: turnId,
    });
    if (error) {
      console.warn("usage_turn_counts failed, allowing:", error.message);
      return ALLOW;
    }
    // RPC returns a single row (or array with one row).
    const row = Array.isArray(counts) ? counts[0] : counts;
    const questionsUsed = Number(row?.questions_used ?? 0);
    const debatesUsed = Number(row?.debates_used ?? 0);

    // Debate tier first (only applies to tribunal submissions).
    if (turnKind === "debate" && debatesUsed >= capDebates) {
      return {
        allowed: false,
        reason: "debates",
        used: debatesUsed,
        cap: capDebates,
        message:
          `You've used all ${capDebates} full Guru Debates for this week. ` +
          `You can still ask any single guru as many times as your weekly question allowance permits. ` +
          `(This limit is temporary while we prepare paid plans.)`,
      };
    }

    // Overall question tier (applies to every kind).
    if (questionsUsed >= capQuestions) {
      return {
        allowed: false,
        reason: "questions",
        used: questionsUsed,
        cap: capQuestions,
        message:
          `You've reached your weekly limit of ${capQuestions} AI questions. ` +
          `It resets on a rolling 7-day basis. ` +
          `(This limit is temporary while we prepare paid plans.)`,
      };
    }

    return ALLOW;
  } catch (e) {
    console.warn("checkWeeklyCap error, allowing:", e);
    return ALLOW;
  }
}
