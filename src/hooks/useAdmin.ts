import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';

export function useAdmin() {
  const { user, loading: sessionLoading } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.warn("useAdmin: Profile role query error:", error);
          if (active) setIsAdmin(false);
        } else {
          const role = data?.role;
          if (active) setIsAdmin(role === 'admin');
          
          if (role !== 'admin') {
            console.log(
              `🔑 [Admin Setup] To grant admin privileges to this account, execute this SQL in your Supabase SQL Editor:\n` +
              `UPDATE public.profiles SET role = 'admin' WHERE user_id = '${user.id}';`
            );
          }
        }
      } catch (err) {
        console.error("useAdmin: Unexpected error during admin check:", err);
        if (active) setIsAdmin(false);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, sessionLoading]);

  return { isAdmin, loading, user };
}
