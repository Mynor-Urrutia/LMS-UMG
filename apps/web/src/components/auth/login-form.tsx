'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { performLogin } from '@/hooks/use-session';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type Fields = z.infer<typeof schema>;
type Errors = Partial<Record<keyof Fields, string>>;

export function LoginForm() {
  const [fields, setFields] = useState<Fields>({ email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  function set(key: keyof Fields, value: string) {
    setFields(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const result = schema.safeParse(fields);
    if (!result.success) {
      const fieldErrors: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Fields;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      try {
        const session = await performLogin(fields.email, fields.password);
        const from = searchParams.get('from');
        const dest = from ?? (session.user.role === 'TEACHER' ? '/teacher' : session.user.role === 'ADMIN' ? '/admin' : '/dashboard');
        router.push(dest);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setServerError('Email o contraseña incorrectos.');
        } else {
          setServerError('Error al iniciar sesión. Intentá de nuevo.');
        }
      }
    });
  }

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Iniciar sesión</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ingresá tus credenciales para continuar.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={e => set('email', e.target.value)}
            className="mt-1 input-base"
            placeholder="tu@email.com"
            disabled={isPending}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={fields.password}
            onChange={e => set('password', e.target.value)}
            className="mt-1 input-base"
            placeholder="••••••••"
            disabled={isPending}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {serverError}
          </div>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">
          {isPending ? <><Spinner size="sm" /> Ingresando...</> : 'Iniciar sesión'}
        </button>
      </form>

    </div>
  );
}
