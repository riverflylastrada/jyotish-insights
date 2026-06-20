/**
 * Thin wrapper over twitter-api-v2 (OAuth 1.0a user context) for the bot.
 *
 * Credentials live in app_settings (category 'api_keys', is_secret) — set via
 * Admin → API Keys — with a Deno.env fallback. If any of the four OAuth secrets
 * is missing, loadXCreds throws MissingCredentialsError so callers can log a clear
 * "add X credentials" reason and skip (never silently fail).
 */

// twitter-api-v2 ships Node-flavoured .d.ts that reference @types/node, which the
// CI edge-functions job (no node_modules) can't resolve. `?no-dts` drops esm.sh's
// types header and the local shim (via @deno-types) supplies minimal `any` types,
// so `deno check` never touches the library's types. The real JS runs at runtime.
// @deno-types="./twitter_shim.d.ts"
import { TwitterApi } from "https://esm.sh/twitter-api-v2@1.18.2?no-dts";

export class MissingCredentialsError extends Error {
  constructor(message = "X (Twitter) credentials are not set — add them in Admin → API Keys.") {
    super(message);
    this.name = "MissingCredentialsError";
  }
}

export interface XCreds {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
  bearer: string;
}

// deno-lint-ignore no-explicit-any
async function readSetting(sb: any, key: string): Promise<string> {
  try {
    const { data } = await sb.from("app_settings").select("value").eq("key", key).maybeSingle();
    return (data?.value as string) || "";
  } catch {
    return "";
  }
}

/** Load OAuth creds from app_settings, falling back to env. Throws if incomplete. */
// deno-lint-ignore no-explicit-any
export async function loadXCreds(sb: any): Promise<XCreds> {
  const k = async (key: string) => (await readSetting(sb, key)) || Deno.env.get(key) || "";
  const creds: XCreds = {
    apiKey: await k("X_API_KEY"),
    apiSecret: await k("X_API_SECRET"),
    accessToken: await k("X_ACCESS_TOKEN"),
    accessSecret: await k("X_ACCESS_SECRET"),
    bearer: await k("X_BEARER_TOKEN"),
  };
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessSecret) {
    throw new MissingCredentialsError();
  }
  return creds;
}

/** Are the four posting secrets present? (Cheap check for status displays.) */
// deno-lint-ignore no-explicit-any
export async function hasXCreds(sb: any): Promise<boolean> {
  try {
    await loadXCreds(sb);
    return true;
  } catch {
    return false;
  }
}

export function makeClient(creds: XCreds) {
  return new TwitterApi({
    appKey: creds.apiKey,
    appSecret: creds.apiSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });
}

/** The (untyped) twitter-api-v2 client instance. */
export type XClient = ReturnType<typeof makeClient>;

export async function postTweet(client: XClient, text: string): Promise<{ id: string }> {
  const res = await client.v2.tweet(text);
  return { id: res.data.id };
}

/** Post a chain — each part replies to the previous (handled by tweetThread). */
export async function postThread(client: XClient, parts: string[]): Promise<{ ids: string[] }> {
  if (parts.length === 1) return { ids: [(await postTweet(client, parts[0])).id] };
  const res = await client.v2.tweetThread(parts);
  // deno-lint-ignore no-explicit-any
  return { ids: (res as any[]).map((r) => r.data.id) };
}

export async function getMetrics(client: XClient, id: string): Promise<{ impressions: number; likes: number }> {
  const r = await client.v2.singleTweet(id, { "tweet.fields": ["public_metrics"] });
  // deno-lint-ignore no-explicit-any
  const pm = ((r.data as any)?.public_metrics ?? {}) as Record<string, number>;
  return { impressions: pm.impression_count ?? 0, likes: pm.like_count ?? 0 };
}
