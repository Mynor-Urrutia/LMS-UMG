import type { UserRole } from '@/types/api';

export const SESSION_COOKIE = 'lms_session';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface Session {
  accessToken: string;
  user: SessionUser;
  expiresAt: number;
}

export function encodeSession(session: Session): string {
  return btoa(JSON.stringify(session));
}

export function decodeSession(encoded: string): Session | null {
  try {
    return JSON.parse(atob(encoded)) as Session;
  } catch {
    return null;
  }
}

export function isExpired(session: Session): boolean {
  return Date.now() >= session.expiresAt;
}

export function isExpiringSoon(session: Session, withinMs = 2 * 60 * 1000): boolean {
  return Date.now() >= session.expiresAt - withinMs;
}

// Client-only helpers
export function getClientSession(): Session | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  if (!match) return null;
  const session = decodeSession(decodeURIComponent(match[1]));
  if (!session || isExpired(session)) return null;
  return session;
}

export function setClientSession(session: Session): void {
  const encoded = encodeURIComponent(encodeSession(session));
  const expires = new Date(session.expiresAt).toUTCString();
  document.cookie = `${SESSION_COOKIE}=${encoded}; expires=${expires}; path=/; SameSite=Strict`;
}

export function clearClientSession(): void {
  document.cookie = `${SESSION_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
}
