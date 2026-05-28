import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';

export interface CurrentLocation {
  placeName: string | null;
  lat: number;
  lon: number;
  timezone: string;
}

/**
 * Returns the user's current location from their profile.
 * Falls back to the provided birth-chart location when the profile
 * has no current_lat/current_lon stored.
 */
export function useCurrentLocation(fallbackLat?: number, fallbackLon?: number, fallbackTz?: string) {
  const { user } = useSession();
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFromProfile, setIsFromProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation(fallbackLat != null && fallbackLon != null
        ? { placeName: null, lat: fallbackLat, lon: fallbackLon, timezone: fallbackTz ?? 'UTC' }
        : null);
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('current_place_name,current_lat,current_lon,current_timezone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.current_lat != null && data?.current_lon != null) {
        setLocation({
          placeName: data.current_place_name,
          lat: data.current_lat,
          lon: data.current_lon,
          timezone: data.current_timezone ?? 'UTC',
        });
        setIsFromProfile(true);
      } else if (fallbackLat != null && fallbackLon != null) {
        setLocation({
          placeName: null,
          lat: fallbackLat,
          lon: fallbackLon,
          timezone: fallbackTz ?? 'UTC',
        });
        setIsFromProfile(false);
      } else {
        setLocation(null);
        setIsFromProfile(false);
      }
      setLoading(false);
    })();
  }, [user, fallbackLat, fallbackLon, fallbackTz]);

  return { location, loading, isFromProfile };
}
