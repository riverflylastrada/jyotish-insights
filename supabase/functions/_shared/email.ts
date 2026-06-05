/**
 * Email delivery adapter. Currently backed by listmonk's transactional API
 * (`POST /api/tx`), which relays through whatever SMTP provider listmonk is
 * configured with (Amazon SES, Brevo, etc. — a listmonk config choice, no code).
 *
 * Kept deliberately thin: the rest of the codebase calls `sendDailyEmail()` and
 * never sees listmonk, so a future swap to Resend/SES-direct is a one-file change.
 *
 * listmonk owns subscriber state, one-click unsubscribe, and bounce handling. We
 * render the full HTML body ourselves and pass it as transactional `data`; the
 * listmonk transactional template should output `{{ .Tx.Data.body }}` plus the
 * unsubscribe footer.
 */

export interface EmailConfig {
  listmonkUrl: string;        // e.g. https://mail.example.com (no trailing slash)
  apiUser: string;
  apiToken: string;
  listId: number | null;      // numeric list id new subscribers are added to
  txTemplateId: number | null;
}

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export function loadEmailConfig(get: (k: string) => string): EmailConfig {
  const num = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    listmonkUrl: (get("listmonk_url") || "").replace(/\/+$/, ""),
    apiUser: get("listmonk_api_user") || "",
    apiToken: get("listmonk_api_token") || "",
    listId: num(get("listmonk_list_id") || ""),
    txTemplateId: num(get("listmonk_tx_template_id") || ""),
  };
}

export function isEmailConfigured(c: EmailConfig): boolean {
  return !!(c.listmonkUrl && c.apiUser && c.apiToken && c.txTemplateId);
}

function authHeader(c: EmailConfig): string {
  return "Basic " + btoa(`${c.apiUser}:${c.apiToken}`);
}

/** Create the subscriber if missing (idempotent — a duplicate is fine). */
async function ensureSubscriber(c: EmailConfig, email: string, name: string): Promise<void> {
  const res = await fetch(`${c.listmonkUrl}/api/subscribers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader(c) },
    body: JSON.stringify({
      email,
      name: name || email,
      status: "enabled",
      lists: c.listId ? [c.listId] : [],
      preconfirm_subscriptions: true,
    }),
  });
  // 200/201 created; 409 (or 4xx mentioning "already exists") means it's there already.
  if (res.ok || res.status === 409) return;
  const txt = await res.text().catch(() => "");
  if (/already exist|duplicate/i.test(txt)) return;
  throw new Error(`listmonk subscriber upsert failed (${res.status}): ${txt.slice(0, 200)}`);
}

export async function sendDailyEmail(
  c: EmailConfig,
  msg: { email: string; name: string; subject: string; html: string },
): Promise<SendResult> {
  try {
    await ensureSubscriber(c, msg.email, msg.name);
    const res = await fetch(`${c.listmonkUrl}/api/tx`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader(c) },
      body: JSON.stringify({
        subscriber_email: msg.email,
        template_id: c.txTemplateId,
        data: { subject: msg.subject, body: msg.html, name: msg.name },
        content_type: "html",
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `listmonk /api/tx ${res.status}: ${txt.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
