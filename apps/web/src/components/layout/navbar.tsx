'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/providers/theme-provider';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ open, token, onClose }: { open: boolean; token: string; onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setForm({ currentPassword: '', newPassword: '', confirm: '' });
    setError(null);
    setSuccess(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }, token);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cambiar contraseña" maxWidth="sm">
      {success ? (
        <div className="space-y-4 text-center py-2">
          <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
            Contraseña actualizada. Tu sesión en otros dispositivos fue cerrada.
          </p>
          <button onClick={handleClose} className="btn-primary px-6 py-2 text-sm">Cerrar</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contraseña actual <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="input-base" required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nueva contraseña <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              className="input-base" minLength={8} required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confirmar nueva contraseña <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              className="input-base" minLength={8} required
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg dark:bg-red-900/20 dark:text-red-300">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary px-5 py-2 text-sm flex items-center gap-2">
              {loading && <Spinner size="sm" />}Cambiar contraseña
            </button>
            <button type="button" onClick={handleClose} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const { user, token, isLoading, logout, isAuthenticated } = useSession();
  const pathname = usePathname();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = isAuthenticated
    ? [
        { href: '/courses', label: 'Cursos' },
        ...(user?.role === 'STUDENT' ? [{ href: '/dashboard', label: 'Mi aprendizaje' }] : []),
        ...(user?.role === 'TEACHER' ? [{ href: '/teacher', label: 'Mis cursos' }] : []),
        ...(user?.role === 'ADMIN' ? [
          { href: '/teacher', label: 'Gestión académica' },
          { href: '/admin', label: 'Administración' },
        ] : []),
      ]
    : [{ href: '/courses', label: 'Cursos' }];

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Left: Logo + Desktop Nav Links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">LMS</Link>
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname.startsWith(l.href)
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {isLoading ? (
              <Spinner size="sm" className="text-gray-400 mx-2" />
            ) : isAuthenticated ? (
              <>
                {token && <NotificationBell token={token} />}

                {/* Desktop user dropdown */}
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <span>{user?.firstName} {user?.lastName}</span>
                    <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-gray-200 bg-white shadow-lg py-1 dark:border-gray-700 dark:bg-gray-900">
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
                        </div>
                        <button
                          onClick={() => { setShowUserMenu(false); setShowChangePassword(true); }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Cambiar contraseña
                        </button>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                          <button
                            onClick={() => { setShowUserMenu(false); logout(); }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Cerrar sesión
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Hamburger button — mobile only */}
                <button
                  onClick={() => setMobileMenuOpen(v => !v)}
                  className="sm:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                  aria-expanded={mobileMenuOpen}
                  aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                >
                  {mobileMenuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              <Link href="/login" className="btn-primary py-1.5 text-xs">Iniciar sesión</Link>
            )}
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && isAuthenticated && (
          <div className="sm:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 space-y-1">
            {navLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  pathname.startsWith(l.href)
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
              <div className="px-3 pb-2">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setMobileMenuOpen(false); setShowChangePassword(true); }}
                className="w-full text-left rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cambiar contraseña
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full text-left rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </nav>

      {token && (
        <ChangePasswordModal
          open={showChangePassword}
          token={token}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </>
  );
}
