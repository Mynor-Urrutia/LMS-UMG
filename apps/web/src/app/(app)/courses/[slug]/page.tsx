import type { Metadata } from 'next';
import { api } from '@/lib/api';
import type { Course } from '@/types/api';
import { CourseDetailClient } from './course-detail-client';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const course = await api.get<Course>(`/courses/${params.slug}`);
    return { title: course.title };
  } catch {
    return { title: 'Curso no encontrado' };
  }
}

export default function CoursePage({ params }: Props) {
  return <CourseDetailClient slug={params.slug} />;
}
