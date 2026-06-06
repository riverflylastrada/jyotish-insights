/**
 * Supabase Edge Function: learn-content
 *
 * Admin-only authoring pipeline for the learn.acharyajyotish.com SEO site.
 *   action 'generate' → drafts a complete Markdown article (frontmatter + body)
 *                       in the learn content schema/style via the configured LLM.
 *   action 'publish'  → commits the (admin-reviewed) Markdown to the learn repo via
 *                       the GitHub Contents API; deploy_on_push then auto-deploys.
 *
 * Gated to admins: requires a valid Supabase JWT (verify_jwt = true) AND
 * profiles.role = 'admin'. The GitHub token + repo live in app_settings.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { generateText } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const CATEGORIES = ["nakshatras", "dashas", "yogas", "doshas", "planets", "houses", "guides", "compatibility"];

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// deno-lint-ignore no-explicit-any
async function getSetting(sb: any, key: string, fallback = ""): Promise<string> {
  try {
    const { data } = await sb.from("app_settings").select("value").eq("key", key).maybeSingle();
    return (data?.value as string) || fallback;
  } catch { return fallback; }
}

const SYSTEM_PROMPT = `You are a senior Vedic astrology (Jyotish) writer producing ONE SEO article for learn.acharyajyotish.com, the knowledge site of the Acharya Jyotish platform.

Output ONE complete Markdown file: YAML frontmatter delimited by --- lines, then the article body. Output NOTHING else — no code fences, no preamble, no commentary.

FRONTMATTER — use exactly these keys:
- title: compelling, includes the primary keyword; SEO modifiers like ": Meaning, Effects & Remedies" are good. Keep it natural.
- description: <= 160 characters, keyword-rich, plain (no quotes inside).
- kicker: the human category label (e.g. "Doshas", "Dashas", "Guides", "Houses").
- category: EXACTLY the category you are given (one of: nakshatras, dashas, yogas, doshas, planets, houses, guides, compatibility).
- tags: array of 3-6 short lowercase tags.
- publishedAt: the date you are given (YYYY-MM-DD).
- author: "Acharya Jyotish"
- primaryKeyword: the primary keyword you are given (or the best one for the topic).
- secondaryKeywords: array of 3-5 related real search phrases.
- sanskritTerm: Devanagari + transliteration if applicable (e.g. "मंगल दोष (Maṅgala Doṣa)"); omit the key entirely if not applicable.
- classicalSource: the REAL classical text(s) if applicable (e.g. "Brihat Parashara Hora Shastra, Ch. 46–47"). If the topic is NOT in the classical canon, state that honestly. Omit if none.
- guruRelevance: array from [parashari, jaimini, kp, nadi, tajik]; default ["parashari"].
- relatedSlugs: array of 2-3 bare slugs of plausibly-related articles, e.g. ["what-is-kundli", "vimshottari-dasha", "mangal-dosha"].
- faqItems: array of exactly 3 objects {question, answer}; answers 1-3 sentences, answering real user questions.

BODY (Markdown):
- Open with a bold-led 2-3 sentence intro that defines the topic and uses the primary keyword naturally.
- Use ## section headings (they become the table of contents). Scannable, logical structure; tables where they help.
- Be ACCURATE and grounded in classical Jyotish. NEVER fabricate shlokas, fake citations, or invented facts. If a concept is modern/popular rather than classical (e.g. Kaal Sarp Dosha), say so plainly.
- Anti-fear, evidence-based tone. For any dosha or challenging factor, ALWAYS cover its cancellations / mitigations and keep proportion. Never fear-monger.
- Reference the Acharya Jyotish app ONLY for what it genuinely does: a free Kundli calculator; 19 divisional charts; 12 dasha systems including Vimshottari (Maha/Antar/Pratyantar); 150+ yogas evaluated with strength and cancellation; dosha detection with classical cancellation rules shown as a ✓/✗ checklist; Sade Sati phases; 36-point Ashtakoota Guna Milan plus South-Indian 10 Porutham; Shadbala/Bhava Bala; KP and Jaimini; an eight-guru debate; and it shows the classical rule behind each claim. Do NOT invent features.
- Include 1-3 internal links to other learn articles using relative URLs of the form /learn/<category>/<slug>/, and a call-to-action linking to https://acharyajyotish.com/app/new with anchor text like "Generate your free Kundli".
- End with a short CTA paragraph.
- Length ~700-1100 words. Indian English. No emojis.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server not configured" }, 500);
  const sb = createClient(supabaseUrl, serviceRoleKey);

  // ── Admin gate ──────────────────────────────────────────────────────────────
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);
  const { data: userData } = await sb.auth.getUser(jwt);
  const uid = userData?.user?.id;
  if (!uid) return json({ error: "Unauthorized" }, 401);
  const { data: prof } = await sb.from("profiles").select("role").eq("user_id", uid).maybeSingle();
  if ((prof?.role as string) !== "admin") return json({ error: "Admin access required" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = body.action;

  // ── Generate a draft ─────────────────────────────────────────────────────────
  if (action === "generate") {
    const topic = String(body.topic ?? "").trim();
    const category = String(body.category ?? "").trim();
    const primaryKeyword = String(body.primaryKeyword ?? "").trim() || topic;
    if (!topic) return json({ error: "topic is required" }, 400);
    if (!CATEGORIES.includes(category)) return json({ error: `category must be one of: ${CATEGORIES.join(", ")}` }, 400);

    const today = new Date().toISOString().slice(0, 10);
    const model = (await getSetting(sb, "learn_content_model")) || undefined;
    const userPrompt =
      `Topic: ${topic}\nCategory: ${category}\nPrimary keyword: ${primaryKeyword}\nToday's date (publishedAt): ${today}\n\n` +
      `Write the complete Markdown article now.`;

    const r = await generateText(SYSTEM_PROMPT, userPrompt, { maxTokens: 4000, temperature: 0.6, model, timeoutMs: 90_000 });
    if (!r.text) return json({ error: r.error ?? "generation failed" }, 502);

    // Strip any stray code fences the model may add despite instructions.
    const markdown = r.text.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return json({
      ok: true,
      markdown,
      suggestedSlug: slugify(topic),
      category,
      model: r.model,
      tokens: r.usage?.total_tokens ?? 0,
      cost: r.cost ?? 0,
    });
  }

  // ── Publish to the learn repo via GitHub Contents API ────────────────────────
  if (action === "publish") {
    const category = String(body.category ?? "").trim();
    const slug = slugify(String(body.slug ?? ""));
    const markdown = String(body.markdown ?? "");
    if (!CATEGORIES.includes(category)) return json({ error: "invalid category" }, 400);
    if (!slug) return json({ error: "slug is required" }, 400);
    if (markdown.length < 50) return json({ error: "markdown is empty" }, 400);

    const token = await getSetting(sb, "github_content_token");
    const repo = await getSetting(sb, "github_content_repo", "Viewofmind/learn-acharyajyotish");
    const branch = await getSetting(sb, "github_content_branch", "main");
    if (!token) return json({ error: "github_content_token is not set in Admin → API Keys" }, 400);

    const path = `src/content/learn/${category}/${slug}.md`;
    const ghHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "acharya-jyotish-learn-content",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const apiBase = `https://api.github.com/repos/${repo}/contents/${path}`;

    try {
      // If the file already exists, we need its SHA to update it.
      let sha: string | undefined;
      const existing = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, { headers: ghHeaders });
      if (existing.ok) {
        const ej = await existing.json();
        sha = ej?.sha;
      } else if (existing.status !== 404) {
        const t = await existing.text().catch(() => "");
        return json({ error: `GitHub read failed (${existing.status}): ${t.slice(0, 200)}` }, 502);
      }

      const put = await fetch(apiBase, {
        method: "PUT",
        headers: { ...ghHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${sha ? "content: update" : "content: add"} learn/${category}/${slug}`,
          content: encodeBase64(new TextEncoder().encode(markdown)),
          branch,
          ...(sha ? { sha } : {}),
        }),
      });
      if (!put.ok) {
        const t = await put.text().catch(() => "");
        return json({ error: `GitHub write failed (${put.status}): ${t.slice(0, 200)}` }, 502);
      }
      const pj = await put.json();
      return json({
        ok: true,
        updated: !!sha,
        path,
        url: `https://learn.acharyajyotish.com/learn/${category}/${slug}/`,
        commitUrl: pj?.commit?.html_url ?? null,
      });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 502);
    }
  }

  return json({ error: "unknown action — use 'generate' or 'publish'" }, 400);
});
