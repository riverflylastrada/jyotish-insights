/**
 * Native deep-link handler for Capacitor.
 *
 * Catches auth deep links (email-confirm / password-reset) that arrive via the
 * custom URL scheme `acharyajyotish://` and completes the session in-app by
 * exchanging the tokens with Supabase Auth.
 *
 * Only active on native platforms — the web app uses normal browser navigation.
 */
import { Capacitor } from "@capacitor/core";
import { App as CapApp, type URLOpenListenerEvent } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

export function initNativeAuthDeepLink(): void {
  if (!Capacitor.isNativePlatform()) return;

  CapApp.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
    const url = new URL(event.url);

    // Handle hash-based tokens (Supabase implicit grant flow)
    // e.g. acharyajyotish://auth#access_token=...&refresh_token=...
    const hash = url.hash.startsWith("#") ? url.hash.substring(1) : "";
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      return;
    }

    // Handle PKCE code exchange flow
    // e.g. acharyajyotish://auth?code=...
    const code = url.searchParams.get("code");
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      return;
    }
  });
}
