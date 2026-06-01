'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import type { TeacherDashboard } from '@/types/api';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1';

async function downloadCsv(courseId: string, token: string) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/grades/export`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `grades-${courseId}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const statusVariant: Record<string, 'success' | 'warning' | 'default'> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'default',
};

const statusLabel: Record<string, string> = {
  PUBLISHED: 'Publicado',
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivado',
};

export default function TeacherDashboardPage() {
  const { token, user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) router.push('/login?from=/teacher');
  }, [sessionLoading, isAuthenticated, router]);

  const { data, isLoading, error } = useQuery<TeacherDashboard>({
    queryKey: ['dashboard', 'teacher'],
    queryFn: () => api.get('/dashboard/teacher', token ?? undefined),
    enabled: !!token,
  });

  if (sessionLoading || isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;
  }

  if (error) {
    return <div className="py-20 text-center text-red-600">Error al cargar el dashboard.</div>;
  }

  const totalStudents = data?.courses.reduce((acc, c) => acc + c.activeStudentCount, 0) ?? 0;
  const totalPending = data?.courses.reduce((acc, c) => acc + c.pendingGradeCount, 0) ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Panel docente</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Hola, {user?.firstName}. Acá podés ver y gestionar tus cursos.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{data?.courses.length ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cursos</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalStudents}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Estudiantes activos</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-yellow-500">{totalPending}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Entregas pendientes</p>
        </div>
      </div>

      {/* Courses table */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Mis cursos</h2>
        {!data?.courses.length ? (
          <div className="card p-10 text-center text-gray-400 dark:text-gray-500">
            <p>Todavía no tenés cursos asignados.</p>
            <p className="mt-1 text-sm">El administrador te asignará cursos desde el panel de administración.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Curso</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Estudiantes</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-400">Pendientes</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.courses.map(c => (
                  <tr key={c.courseId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{c.title}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusVariant[c.status] ?? 'default'}>{statusLabel[c.status] ?? c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{c.activeStudentCount}</td>
                    <td className="px-4 py-3 text-center">
                      {c.pendingGradeCount > 0 ? (
                        <Badge variant="warning">{c.pendingGradeCount}</Badge>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/teacher/courses/${c.slug}`}
                          className="text-xs text-primary-600 hover:text-primary-800 border border-primary-200 rounded px-3 py-1 hover:bg-primary-50 whitespace-nowrap dark:text-primary-400 dark:hover:text-primary-300 dark:border-primary-800 dark:hover:bg-primary-900/30">
                          Gestionar
                        </Link>
                        {token && (
                          <button onClick={() => downloadCsv(c.courseId, token)}
                            className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-3 py-1 hover:bg-gray-50 whitespace-nowrap dark:text-gray-400 dark:hover:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800">
                            Exportar CSV
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
