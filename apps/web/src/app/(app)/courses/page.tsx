import type { Metadata } from 'next';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { CourseCard } from '@/components/courses/course-card';
import { Spinner } from '@/components/ui/spinner';
import type { Course } from '@/types/api';

export const metadata: Metadata = { title: 'Cursos' };

async function CourseGrid() {
  let courses: Course[] = [];
  try {
    const result = await api.get<{ items: Course[]; total: number }>('/courses?status=PUBLISHED');
    courses = result.items ?? [];
  } catch {
    courses = [];
  }

  if (courses.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400 dark:text-gray-500">
        <p className="text-lg">No hay cursos publicados todavía.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map(c => <CourseCard key={c.id} course={c} />)}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Cursos disponibles</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Explorá el catálogo y empezá a aprender hoy.</p>
      </div>
      <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>}>
        <CourseGrid />
      </Suspense>
    </div>
  );
}
