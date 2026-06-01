'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getClientSession, setClientSession, clearClientSession, isExpiringSoon, type Session } from '@/lib/session';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1';

async function silentRefresh(currentUser: Session['user']): Promise<Session | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const { accessToken } = await res.json() as { accessToken: string };
    const [, b64] = accessToken.split('.');
    const payload = JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/'))) as { exp: number };
    const refreshed: Session = { user: currentUser, accessToken, expiresAt: payload.exp * 1000 };
    setClientSession(refreshed);
    return refreshed;
  } catch {
    return null;
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshingRef = useRef(false);

  useEffect(() => {
    setSession(getClientSession());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!session) return;

    async function checkAndRefresh() {
      if (refreshingRef.current || !session) return;
      const cookie = getClientSession();
      const needsRefresh = !cookie || isExpiringSoon(cookie);
      if (!needsRefresh) return;

      refreshingRef.current = true;
      const refreshed = await silentRefresh(session.user);
      refreshingRef.current = false;

      if (refreshed) {
        setSession(refreshed);
      } else {
        clearClientSession();
        setSession(null);
        router.push('/login');
      }
    }

    const id = setInterval(checkAndRefresh, 60_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkAndRefresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [session, router]);

  const login = useCallback((s: Session) => {
    setClientSession(s);
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.delete('/auth/logout', session?.accessToken);
    } catch {
      // ignore — clear session regardless
    }
    clearClientSession();
    setSession(null);
    router.push('/login');
  }, [session?.accessToken, router]);

  return {
    session,
    user: session?.user ?? null,
    token: session?.accessToken ?? null,
    isLoading,
    isAuthenticated: session !== null,
    login,
    logout,
  };
}

// Standalone login helper (used by the login form before the hook is mounted)
export async function performLogin(email: string, password: string): Promise<Session> {
  const { accessToken, user } = await api.post<{
    accessToken: string;
    user: { id: string; email: string; firstName: string; lastName: string; role: string };
  }>('/auth/login', { email, password });

  const [, payloadB64] = accessToken.split('.');
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as { exp: number };

  const session: Session = {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as Session['user']['role'],
    },
    expiresAt: payload.exp * 1000,
  };

  setClientSession(session);
  return session;
}

export async function performRegister(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  await api.post('/auth/register', { email, password, firstName, lastName });
}
