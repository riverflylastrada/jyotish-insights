import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/** The active public-share token from the URL (?share=…), or null. */
export function useShareToken(): string | null {
  const { search } = useLocation();
  return new URLSearchParams(search).get('share');
}

/**
 * Returns a helper that appends the current ?share= token to an in-app chart
 * link, preserving any query params the link already carries. Public share
 * links (and the landing-page demo, ?share=demo) are read-only and bypass auth
 * via RequireAuth — but only while the token rides along in the URL. Threading
 * it through every chart-to-chart link keeps shared/demo deep links working as
 * the visitor navigates between sub-pages instead of bouncing to /login.
 *
 * No-op when there's no share token, so authenticated navigation is unchanged.
 */
export function useChartLink(): (path: string) => string {
  const token = useShareToken();
  return useCallback(
    (path: string) => {
      if (!token) return path;
      const [base, query = ''] = path.split('?');
      const params = new URLSearchParams(query);
      params.set('share', token);
      return `${base}?${params.toString()}`;
    },
    [token],
  );
}
