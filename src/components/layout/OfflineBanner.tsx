import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Thin banner shown while the device is offline. Saved charts you've already
 * opened stay viewable (served from the IndexedDB-persisted cache); features
 * that need the network (new charts, the Guru debate, Voice, live Panchang)
 * will be unavailable until the connection returns.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-brand-maroon px-4 py-1.5 text-center text-xs text-white">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>You're offline — saved charts still work; new charts, Voice &amp; debate need a connection.</span>
    </div>
  );
}
