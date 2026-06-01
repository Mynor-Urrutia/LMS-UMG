'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { progressPercent } from '@/lib/utils';
import type { StudentDashboard, UserBadge, LeaderboardEntry } from '@/types/api';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDashboardPage() {
  const { token, user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) router.push('/login?from=/dashboard');
  }, [sessionLoading, isAuthenticated, router]);

  const { data, isLoading, error } = useQuery<StudentDashboard>({
    queryKey: ['dashboard', 'student'],
    queryFn: () => api.get('/dashboard/student', token ?? undefined),
    enabled: !!token,
  });

  const { data: userBadges = [] } = useQuery<UserBadge[]>({
    queryKey: ['user-badges', user?.id],
    queryFn: () => api.get(`/users/${user!.id}/badges`, token ?? undefined),
    enabled: !!token && !!user?.id,
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard?limit=10', token ?? undefined),
    enabled: !!token,
  });

  if (sessionLoading || isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;
  }

  if (error) {
    return <div className="py-20 text-center text-red-600">Error al cargar el dashboard.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mi aprendizaje</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Hola, {user?.firstName}. Seguí avanzando.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-primary-600">{data?.totalXp ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Puntos XP</p>
          {data?.level && (
            <p className="mt-1 text-xs font-semibold text-primary-500 dark:text-primary-400">
              Nivel {data.level}
            </p>
          )}
        </div>
        <div className="card p-5 text-center">
          <p className="text-3xl font-bold text-yellow-500">{data?.badgeCount ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Badges</p>
        </div>
        <div className="card p-5 text-center col-span-2 sm:col-span-1">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{data?.courses?.length ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cursos activos</p>
        </div>
      </div>

      {/* Badges */}
      {userBadges.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Mis badges</h2>
          <div className="flex flex-wrap gap-3">
            {userBadges.map(ub => (
              <div key={ub.id} className="card p-4 flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-xl">
                  🏅
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{ub.badge.name}</p>
                  {ub.badge.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{ub.badge.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Ranking XP</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {leaderboard.map(entry => {
                  const isMe = entry.userId === user?.id;
                  return (
                    <tr key={entry.userId} className={isMe ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}>
                      <td className="px-4 py-2.5 w-8 text-center">
                        <span className={`text-xs font-bold ${entry.rank <= 3 ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'}`}>
                          #{entry.rank}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`font-medium ${isMe ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'}`}>
                          {entry.firstName} {entry.lastName}
                          {isMe && <span className="ml-1 text-xs text-primary-500 dark:text-primary-400">(vos)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">{entry.totalXp} XP</span>
                        {entry.level && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold">
                            Nv.{entry.level}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Courses */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Mis cursos</h2>
        {!data?.courses?.length ? (
          <div className="card p-10 text-center text-gray-400 dark:text-gray-500">
            <p>No estás inscripto en ningún curso todavía.</p>
            <Link href="/courses" className="mt-4 inline-block btn-primary">
              Explorar cursos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {data.courses.map(c => {
              const pct = progressPercent(c.completedLessons, c.totalLessons);
              const isCompleted = c.enrollmentStatus === 'COMPLETED';
              return (
                <div key={c.enrollmentId} className={`card p-5 ${isCompleted ? 'border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-900/10' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/courses/${c.courseSlug}`}
                          className="font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-1"
                        >
                          {c.courseTitle}
                        </Link>
                        {isCompleted && (
                          <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0 dark:bg-green-900/30 dark:text-green-300">
                            Completado
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {c.completedLessons} de {c.totalLessons} lecciones completadas
                      </p>
                    </div>
                    <Badge variant={isCompleted ? 'success' : pct > 0 ? 'info' : 'default'}>{pct}%</Badge>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className={`h-2 rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-primary-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
