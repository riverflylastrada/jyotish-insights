import { QueryClient, type Query } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";
import { CURRENT_SNAPSHOT_VERSION } from "@/lib/astro/types";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Shared QueryClient. Exported so the persister, the App provider, and the
 * sign-out purge all operate on the same instance.
 *
 * `gcTime` MUST be >= the persist `maxAge` below — React Query v5 will not
 * restore a query that has been garbage-collected, so the default 5-minute
 * gcTime would silently defeat offline persistence.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      gcTime: WEEK_MS,
    },
  },
});

/**
 * IndexedDB-backed persister. Chart snapshots are large JSONB blobs and a user
 * may have several saved charts, so localStorage (5 MB, synchronous) is not
 * viable — IndexedDB has a much larger quota and writes off the main thread.
 */
export const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: "ACHARYA_RQ_CACHE",
  throttleTime: 1000,
});

export const persistOptions = {
  persister: idbPersister,
  maxAge: WEEK_MS,
  // Discard the whole persisted cache when the engine snapshot version bumps —
  // mirrors CURRENT_SNAPSHOT_VERSION baked into the chart query key, so a deploy
  // never serves a stale snapshot from disk.
  buster: `snap-${CURRENT_SNAPSHOT_VERSION}`,
  dehydrateOptions: {
    // Persist ONLY the user's own saved-chart snapshots. Exclude auto-insights,
    // notifications, voice, and public share-token charts (queryKey[4] is the
    // share token in useKundli — empty string for owned charts).
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === "success" &&
      query.queryKey[0] === "chart" &&
      (query.queryKey[4] === "" || query.queryKey[4] === undefined),
  },
};

/** Wipe both the in-memory cache and the on-disk persisted cache. */
export async function purgeQueryCache(): Promise<void> {
  queryClient.removeQueries();
  await idbPersister.removeClient();
}

let purgeSubscribed = false;
let lastUserId: string | null = null;

/**
 * One-time subscription that clears cached chart data when the user signs out,
 * or when a different account signs in on a shared device (privacy: persisted
 * charts are written to this device's IndexedDB). Call once from main.tsx.
 */
export function initAuthCachePurge(): void {
  if (purgeSubscribed) return;
  purgeSubscribed = true;
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      void purgeQueryCache();
      lastUserId = null;
      return;
    }
    if (event === "SIGNED_IN") {
      const uid = session?.user?.id ?? null;
      if (lastUserId && uid && lastUserId !== uid) {
        void purgeQueryCache(); // account switch without an explicit sign-out
      }
      lastUserId = uid;
    }
  });
}
