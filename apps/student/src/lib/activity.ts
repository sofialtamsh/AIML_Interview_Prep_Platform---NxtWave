import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { api } from './api';

let lastPath = '';
let lastAt = 0;

/**
 * Tells the server each time a signed-in student opens a page, for the team's analytics (who was
 * active on which day). One report per page: the same path again within two seconds is the same
 * visit (React runs effects twice in development). It sends the path only, never a query string,
 * and a failure is ignored: analytics must never get in a student's way.
 */
export function useTrackVisits() {
  const { pathname } = useLocation();
  useEffect(() => {
    const now = Date.now();
    if (pathname === lastPath && now - lastAt < 2000) return;
    lastPath = pathname;
    lastAt = now;
    void api.post('/student/activity', { kind: 'VISIT', target: pathname }).catch(() => {});
  }, [pathname]);
}
