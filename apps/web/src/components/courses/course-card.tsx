import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { difficultyLabel, enrollmentTypeLabel } from '@/lib/utils';
import type { Course } from '@/types/api';

const difficultyVariant: Record<string, 'info' | 'warning' | 'danger'> = {
  BEGINNER: 'info',
  INTERMEDIATE: 'warning',
  ADVANCED: 'danger',
};

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link href={`/courses/${course.slug}`} className="card flex flex-col hover:shadow-md transition-shadow">
      {/* Thumbnail placeholder */}
      <div className="h-36 rounded-t-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
        <span className="text-4xl font-bold text-white/30">{course.title.charAt(0)}</span>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">{course.title}</h3>
        </div>

        {course.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{course.description}</p>
        )}

        <div className="mt-auto flex flex-wrap gap-1.5">
          <Badge variant={difficultyVariant[course.difficulty] ?? 'default'}>
            {difficultyLabel(course.difficulty)}
          </Badge>
          <Badge variant="default">{enrollmentTypeLabel(course.enrollmentType)}</Badge>
          {course.category && <Badge variant="default">{course.category.name}</Badge>}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700">
          <span>{course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}`.trim() : ''}</span>
          <span className="text-green-600 dark:text-green-400 font-medium">Gratis</span>
        </div>
      </div>
    </Link>
  );
}
