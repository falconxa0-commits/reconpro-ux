"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuthHeaders } from './use-auth-headers';

export interface CurrentUser {
  name: string;
  email: string;
  role: string;
  initials: string;
}

const STORAGE_KEY = 'reconpro_user';

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<CurrentUser>(() => {
    if (typeof window === 'undefined') return { name: '', email: '', role: '', initials: '' };
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return { name: '', email: '', role: '', initials: '' };
  });

  const authHeaders = useAuthHeaders();

  const fetchUser = useCallback(() => {
    fetch('/api/members', { headers: authHeaders })
      .then(r => r.json())
      .then(data => {
        const m = (data.members || [])[0];
        if (m) {
          const initials = (m.name || m.email || 'U')
            .split(/\s+/)
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          const u = { name: m.name, email: m.email, role: m.role, initials };
          setUser(u);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        }
      })
      .catch(() => {});
  }, [authHeaders]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  return user;
}

export function clearUserCache() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('reconpro_api_key');
    localStorage.removeItem('reconpro_auth');
  }
}
