'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/hooks/use-session';
import { Spinner } from '@/components/ui/spinner';
import type { EnrollmentType } from '@/types/api';

interface EnrollButtonProps {
  courseId: string;
  enrollmentType: EnrollmentType;
  enrolled?: boolean;
}

const typeLabel: Record<EnrollmentType, string> = {
  OPEN: 'Inscribirse ahora',
  APPROVAL: 'Solicitar inscripción',
  INVITATION: 'Solo por invitación',
};

export function EnrollButton({ courseId, enrollmentType, enrolled }: EnrollButtonProps) {
  const { token, isAuthenticated } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  if (enrolled) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium text-center dark:bg-green-900/30 dark:border-green-800 dark:text-green-300">
        Ya estás inscripto en este curso
      </div>
    );
  }

  if (enrollmentType === 'INVITATION') {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500 text-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
        Este curso es solo por invitación
      </div>
    );
  }

  async function handleEnroll() {
    if (!isAuthenticated) {
      router.push(`/login?from=/courses`);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post(`/courses/${courseId}/enroll`, undefined, token ?? undefined);
      const msg = enrollmentType === 'APPROVAL'
        ? 'Tu solicitud fue enviada. Esperá la aprobación del docente.'
        : 'Te inscribiste correctamente. ¡Empezá a aprender!';
      setMessage(msg);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setMessage('Ya tenés una inscripción en este curso.');
      } else {
        setMessage('Error al procesar la inscripción. Intentá de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? <><Spinner size="sm" /> Procesando...</> : typeLabel[enrollmentType]}
      </button>
      {message && (
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
}
