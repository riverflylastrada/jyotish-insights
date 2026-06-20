/**
 * Edge Function: social-generate (admin-only; verify_jwt = true)
 *
 * POST { content_type, date?, rashi?, language?, variant? }
 *   → { body?, thread?, media_url? }
 *
 * Deterministic tweet copy from the in-house sidereal engine — no LLM, no facts
 * invented. Backs the Create Tweet modal's "Generate" button.
 */

import { corsHeaders, json, serviceClient, requireAdmin, loadSettings, placeFromSettings, logRun } from "../_shared/social/http.ts";
import { localDate } from "../_shared/social/time.ts";
import { buildSlotContent, type ContentType } from "../_shared/social/generate.ts";
import type { Locale } from "../_shared/social/rashifal.ts";

const VALID: ContentType[] = ["panchang", "rashifal", "transit", "rashi_effect"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = serviceClient();
  if (!sb) return json({ error: "server not configured" }, 500);
  const gate = await requireAdmin(sb, req);
  if (!gate.ok) return json({ error: gate.error }, gate.status);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const content_type = String(body.content_type ?? "") as ContentType;
  if (!VALID.includes(content_type)) return json({ error: `content_type must be one of: ${VALID.join(", ")}` }, 400);

  const rashi = typeof body.rashi === "string" ? body.rashi : null;
  const variant = typeof body.variant === "string" ? body.variant : null;
  const langIn = body.language === "en" || body.language === "hi" ? (body.language as Locale) : null;

  const settings = await loadSettings(sb);
  const now = new Date();
  const place = placeFromSettings(settings, now);
  const locale: Locale = langIn ?? (settings.languages[0] === "en" ? "en" : "hi");
  const dateISO = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(body.date)
    ? body.date.slice(0, 10)
    : localDate(place.tz, now);

  const content = buildSlotContent({
    content_type, variant, dateISO, rashi, locale,
    includeLink: settings.include_link, ...place,
  });

  await logRun(sb, "generate", "ok", { content_type, variant, dateISO, locale });
  return json({ ok: true, ...content });
});
