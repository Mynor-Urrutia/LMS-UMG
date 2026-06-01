export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(dateStr));
}

export function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days !== 1 ? 's' : ''}`;
  return formatDate(dateStr);
}

export function progressPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function difficultyLabel(d: string): string {
  return { BEGINNER: 'Principiante', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado' }[d] ?? d;
}

export function roleLabel(r: string): string {
  return { STUDENT: 'Estudiante', TEACHER: 'Docente', ADMIN: 'Administrador' }[r] ?? r;
}

export function enrollmentTypeLabel(t: string): string {
  return { OPEN: 'Abierta', INVITATION: 'Por invitación', APPROVAL: 'Requiere aprobación' }[t] ?? t;
}
