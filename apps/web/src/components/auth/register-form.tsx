'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { performRegister } from '@/hooks/use-session';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api';

const schema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido').max(100),
  lastName: z.string().min(1, 'El apellido es requerido').max(100),
  email: z.string().min(1, 'El email es requerido').email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm: z.string().min(1, 'Confirmá la contraseña'),
}).refine(d => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
});

type Fields = z.infer<typeof schema>;
type Errors = Partial<Record<keyof Fields, string>>;

export function RegisterForm() {
  const [fields, setFields] = useState<Fields>({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      try {
        await performRegister(fields.email, fields.password, fields.firstName, fields.lastName);
        router.push('/login?registered=1');
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setErrors(e => ({ ...e, email: 'Este email ya está registrado.' }));
        } else {
          setServerError('Error al crear la cuenta. Intentá de nuevo.');
        }
      }
    });
  }

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-gray-900">Crear cuenta</h2>
      <p className="mt-1 text-sm text-gray-500">Completá tus datos para registrarte.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Nombre</label>
            <input id="firstName" value={fields.firstName} onChange={e => set('firstName', e.target.value)}
              className="mt-1 input-base" placeholder="Juan" disabled={isPending} />
            {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Apellido</label>
            <input id="lastName" value={fields.lastName} onChange={e => set('lastName', e.target.value)}
              className="mt-1 input-base" placeholder="Pérez" disabled={isPending} />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input id="email" type="email" autoComplete="email" value={fields.email}
            onChange={e => set('email', e.target.value)} className="mt-1 input-base"
            placeholder="tu@email.com" disabled={isPending} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
          <input id="password" type="password" autoComplete="new-password" value={fields.password}
            onChange={e => set('password', e.target.value)} className="mt-1 input-base"
            placeholder="Mínimo 8 caracteres" disabled={isPending} />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
          <input id="confirm" type="password" autoComplete="new-password" value={fields.confirm}
            onChange={e => set('confirm', e.target.value)} className="mt-1 input-base"
            placeholder="••••••••" disabled={isPending} />
          {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm}</p>}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">
          {isPending ? <><Spinner size="sm" /> Creando cuenta...</> : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
