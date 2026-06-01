import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  decodeSession,
  encodeSession,
  isExpiringSoon,
  isExpired,
  type Session,
} from '@/lib/session';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1';

// Routes that redirect to dashboard when already authenticated
const AUTH_ROUTES = ['/login'];

// Routes that require authentication (and optionally a specific role)
const PROTECTED: { pattern: RegExp; roles?: string[] }[] = [
  { pattern: /^\/dashboard/, roles: ['STUDENT'] },
  { pattern: /^\/teacher/, roles: ['TEACHER', 'ADMIN'] },
  { pattern: /^\/admin/, roles: ['ADMIN'] },
];

async function refreshSession(refreshToken: string): Promise<Session | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refresh_token=${refreshToken}` },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const { accessToken } = await res.json() as { accessToken: string };

    // Decode the new token to get expiry — JWT middle segment is base64 payload
    const [, payloadB64] = accessToken.split('.');
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as { exp: number; sub: string; email: string; role: string };

    return {
      accessToken,
      expiresAt: payload.exp * 1000,
      user: {
        id: payload.sub,
        email: payload.email,
        firstName: '',
        lastName: '',
        role: payload.role as Session['user']['role'],
      },
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  let session = sessionCookie ? decodeSession(sessionCookie.value) : null;

  // Refresh if session is expiring soon or already expired
  if (session && isExpiringSoon(session)) {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (refreshToken) {
      const refreshed = await refreshSession(refreshToken);
      if (refreshed) {
        session = { ...refreshed, user: { ...refreshed.user, firstName: session.user.firstName, lastName: session.user.lastName } };
      } else {
        session = null;
      }
    } else {
      if (isExpired(session)) session = null;
    }
  }

  const isAuthenticated = session !== null;

  // Auth routes: redirect to dashboard if already logged in
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(homepageForRole(session!.user.role), request.url));
    }
    return NextResponse.next();
  }

  // Protected routes: check auth + role
  const protection = PROTECTED.find(p => p.pattern.test(pathname));
  if (protection) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (protection.roles && !protection.roles.includes(session!.user.role)) {
      return NextResponse.redirect(new URL(homepageForRole(session!.user.role), request.url));
    }
  }

  // If session was refreshed, update the cookie in the response
  const response = NextResponse.next();
  if (session && sessionCookie && session.accessToken !== decodeSession(sessionCookie.value)?.accessToken) {
    response.cookies.set(SESSION_COOKIE, encodeSession(session), {
      expires: new Date(session.expiresAt),
      path: '/',
      sameSite: 'strict',
    });
  }

  return response;
}

function homepageForRole(role: string): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'TEACHER') return '/teacher';
  return '/dashboard';
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
