'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import type {
  Course, CourseModule, Lesson, Category, EnrollmentWithStudent,
  CourseDifficulty, EnrollmentType, EnrollmentStatus,
  Assignment, AssignmentType, ForumThread, ForumThreadWithPosts, ForumPost,
  StudentProgress, SubmissionWithStudentInfo, StudentCourseDetail, CourseAnnouncement,
} from '@/types/api';
import { EnrolledCourseView } from '@/app/(app)/courses/[slug]/course-detail-client';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1';

async function downloadFile(fileId: string, token: string) {
  const res = await fetch(`${API_BASE}/files/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const nameMatch = disposition.match(/filename\*=UTF-8''(.+)/);
  const filename = nameMatch ? decodeURIComponent(nameMatch[1]) : 'archivo';
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const statusVariant: Record<string, 'success' | 'warning' | 'default'> = {
  PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'default',
};
const statusLabel: Record<string, string> = {
  PUBLISHED: 'Publicado', DRAFT: 'Borrador', ARCHIVED: 'Archivado',
};
const enrollStatusVariant: Record<EnrollmentStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success', PENDING: 'warning', REJECTED: 'danger', COMPLETED: 'default',
};
const enrollStatusLabel: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Activo', PENDING: 'Pendiente', REJECTED: 'Rechazado', COMPLETED: 'Completado',
};

// ─── Edit Course Form ─────────────────────────────────────────────────────────

function EditCourseForm({
  course, categories, token, onClose,
}: { course: Course; categories: Category[]; token: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: course.title,
    description: course.description ?? '',
    difficulty: course.difficulty,
    enrollmentType: course.enrollmentType,
    categoryId: course.category?.id ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const update = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        title: form.title,
        difficulty: form.difficulty,
        enrollmentType: form.enrollmentType,
        description: form.description.trim() || null,
        categoryId: form.categoryId || null,
      };
      return api.patch<Course>(`/courses/${course.id}`, body, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'course'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al guardar.'),
  });

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Editar curso</h3>
        <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">×</button>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
        <input value={form.title} onChange={e => set('title', e.target.value)}
          className="input-base" required maxLength={200} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          className="input-base resize-none" rows={3} maxLength={5000} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nivel</label>
          <select value={form.difficulty} onChange={e => set('difficulty', e.target.value as CourseDifficulty)} className="input-base">
            <option value="BEGINNER">Principiante</option>
            <option value="INTERMEDIATE">Intermedio</option>
            <option value="ADVANCED">Avanzado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Inscripción</label>
          <select value={form.enrollmentType} onChange={e => set('enrollmentType', e.target.value as EnrollmentType)} className="input-base">
            <option value="OPEN">Abierto — acceso inmediato al inscribirse</option>
            <option value="APPROVAL">Con aprobación — requiere tu aprobación manual</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categoría</label>
        <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className="input-base">
          <option value="">Sin categoría</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={() => update.mutate()} disabled={update.isPending} className="btn-primary px-4 py-2 text-sm">
          {update.isPending ? <Spinner size="sm" /> : 'Guardar cambios'}
        </button>
        <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancelar</button>
      </div>
    </div>
  );
}

// ─── Add Module Form ──────────────────────────────────────────────────────────

function AddModuleForm({ courseId, token, onAdded }: { courseId: string; token: string; onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/modules`, { title }, token),
    onSuccess: () => { setTitle(''); onAdded(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al crear el módulo.'),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); setError(null); add.mutate(); }}
      className="flex gap-2 items-end">
      <div className="flex-1">
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="input-base" placeholder="Título del módulo" required maxLength={200} />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <button type="submit" disabled={add.isPending} className="btn-primary px-4 py-2 text-sm">
        {add.isPending ? <Spinner size="sm" /> : 'Agregar'}
      </button>
    </form>
  );
}

// ─── Add Lesson Form ──────────────────────────────────────────────────────────

const LESSON_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.mov,.webm';

function AddLessonForm({
  courseId, moduleId, token, onAdded, onCancel,
}: { courseId: string; moduleId: string; token: string; onAdded: () => void; onCancel: () => void }) {
  const [type, setType] = useState<'TEXT' | 'VIDEO' | 'FILE' | 'EMBED' | 'INFOGRAPHIC' | 'CASE_STUDY'>('TEXT');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(file: File) {
    setUploading(true);
    setError(null);
    setUploadedFile(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const asset = await api.upload<{ id: string }>('/files', formData, token);
      setUploadedFile({ id: asset.id, name: file.name });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al subir el archivo.');
    } finally {
      setUploading(false);
    }
  }

  const add = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { title, type };
      if (type === 'TEXT' && content.trim()) body.content = content.trim();
      if (type === 'VIDEO' && videoUrl.trim()) body.videoUrl = videoUrl.trim();
      if (type === 'FILE' && uploadedFile) body.fileAssetId = uploadedFile.id;
      if (type === 'EMBED' && embedUrl.trim()) body.embedUrl = embedUrl.trim();
      if (type === 'INFOGRAPHIC' && uploadedFile) body.fileAssetId = uploadedFile.id;
      if (type === 'CASE_STUDY' && content.trim()) body.content = content.trim();
      return api.post(`/courses/${courseId}/modules/${moduleId}/lessons`, body, token);
    },
    onSuccess: () => onAdded(),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al crear la lección.'),
  });

  const canSubmit = title.trim().length > 0 && (
    type === 'TEXT' ||
    (type === 'VIDEO' && videoUrl.trim().length > 0) ||
    (type === 'FILE' && !!uploadedFile) ||
    (type === 'EMBED' && embedUrl.trim().length > 0) ||
    (type === 'INFOGRAPHIC' && !!uploadedFile) ||
    type === 'CASE_STUDY'
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-3 border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Nueva lección</p>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="input-base"
        placeholder="Título de la lección"
        maxLength={200}
      />

      {/* Type selector */}
      <div className="flex flex-wrap gap-3">
        {([
          { value: 'TEXT', label: '📝 Texto' },
          { value: 'VIDEO', label: '▶ Video (URL)' },
          { value: 'FILE', label: '📎 Archivo' },
          { value: 'EMBED', label: '🔗 App embebida' },
          { value: 'INFOGRAPHIC', label: '🖼️ Infografía' },
          { value: 'CASE_STUDY', label: '📋 Caso de Estudio' },
        ] as const).map(opt => (
          <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              checked={type === opt.value}
              onChange={() => { setType(opt.value); setError(null); setUploadedFile(null); }}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Content by type */}
      {type === 'TEXT' && (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="input-base resize-none"
          rows={4}
          placeholder="Contenido de la lección..."
        />
      )}

      {type === 'VIDEO' && (
        <div className="space-y-1">
          <input
            type="url"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            className="input-base"
            placeholder="https://youtube.com/watch?v=... o cualquier URL de video"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">Soporta YouTube, Vimeo y cualquier URL de video embebible.</p>
        </div>
      )}

      {type === 'EMBED' && (
        <div className="space-y-1">
          <input
            type="url"
            value={embedUrl}
            onChange={e => setEmbedUrl(e.target.value)}
            className="input-base"
            placeholder="https://kahoot.it/... · Mentimeter · H5P · Canva · etc."
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">La app se mostrará en un iframe dentro de la lección.</p>
        </div>
      )}

      {type === 'FILE' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Formatos: PDF · Imágenes (JPG, PNG, WebP) · Word · PowerPoint · Excel · Video (MP4)
          </p>
          {uploadedFile ? (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              <span className="text-sm text-green-800 dark:text-green-300 flex-1 truncate">{uploadedFile.name}</span>
              <button
                onClick={() => { setUploadedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <input
              ref={fileRef}
              type="file"
              accept={LESSON_ACCEPT}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
              className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
              disabled={uploading}
            />
          )}
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Spinner size="sm" className="text-primary-500" /> Subiendo archivo...
            </div>
          )}
        </div>
      )}

      {type === 'INFOGRAPHIC' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Subí la infografía · Formatos: PDF · Imágenes (JPG, PNG, WebP)
          </p>
          {uploadedFile ? (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              <span className="text-sm text-green-800 dark:text-green-300 flex-1 truncate">{uploadedFile.name}</span>
              <button
                onClick={() => { setUploadedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
              className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
              disabled={uploading}
            />
          )}
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Spinner size="sm" className="text-primary-500" /> Subiendo infografía...
            </div>
          )}
        </div>
      )}

      {type === 'CASE_STUDY' && (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="input-base resize-none"
          rows={6}
          placeholder="Describí el caso de estudio: contexto, hechos relevantes, preguntas de análisis..."
        />
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => { setError(null); add.mutate(); }}
          disabled={add.isPending || !canSubmit || uploading}
          className="btn-primary px-3 py-1.5 text-xs"
        >
          {add.isPending ? <Spinner size="sm" /> : 'Agregar lección'}
        </button>
        <button onClick={onCancel} className="btn-secondary px-3 py-1.5 text-xs">Cancelar</button>
      </div>
    </div>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({
  mod, courseId, token,
}: { mod: CourseModule; courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [localLessons, setLocalLessons] = useState(() => [...(mod.lessons ?? [])]);
  const dragItem = useRef<string | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'modules'] });

  useEffect(() => { setLocalLessons([...(mod.lessons ?? [])]); }, [mod.lessons]);

  const deleteModule = useMutation({
    mutationFn: () => api.delete(`/courses/${courseId}/modules/${mod.id}`, token),
    onSuccess: invalidate,
  });

  const publishLesson = useMutation({
    mutationFn: ({ lessonId, published }: { lessonId: string; published: boolean }) =>
      api.patch(`/courses/${courseId}/modules/${mod.id}/lessons/${lessonId}/${published ? 'unpublish' : 'publish'}`, undefined, token),
    onSuccess: invalidate,
  });

  const deleteLesson = useMutation({
    mutationFn: (lessonId: string) =>
      api.delete(`/courses/${courseId}/modules/${mod.id}/lessons/${lessonId}`, token),
    onSuccess: invalidate,
  });

  const reorderLessons = useMutation({
    mutationFn: (lessonIds: string[]) =>
      api.patch(`/courses/${courseId}/modules/${mod.id}/lessons/reorder`, { lessonIds }, token),
    onSuccess: invalidate,
    onError: () => setLocalLessons([...(mod.lessons ?? [])]),
  });

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonContent, setEditLessonContent] = useState('');
  const [editLessonVideoUrl, setEditLessonVideoUrl] = useState('');
  const [editLessonEmbedUrl, setEditLessonEmbedUrl] = useState('');
  const [editLessonError, setEditLessonError] = useState<string | null>(null);

  const { data: editingLessonFull } = useQuery<Lesson>({
    queryKey: ['teacher', 'lesson', editingLessonId],
    queryFn: () => api.get(`/courses/${courseId}/modules/${mod.id}/lessons/${editingLessonId}`, token),
    enabled: !!editingLessonId,
  });

  useEffect(() => {
    if (editingLessonFull) {
      setEditLessonTitle(editingLessonFull.title);
      setEditLessonContent(editingLessonFull.content ?? '');
      setEditLessonVideoUrl(editingLessonFull.videoUrl ?? '');
      setEditLessonEmbedUrl(editingLessonFull.embedUrl ?? '');
    }
  }, [editingLessonFull]);

  const updateLesson = useMutation({
    mutationFn: () => {
      const type = editingLessonFull?.type;
      const body: Record<string, unknown> = { title: editLessonTitle.trim() };
      if (type === 'TEXT' || type === 'CASE_STUDY') body.content = editLessonContent;
      if (type === 'VIDEO') body.videoUrl = editLessonVideoUrl;
      if (type === 'EMBED') body.embedUrl = editLessonEmbedUrl;
      return api.patch(`/courses/${courseId}/modules/${mod.id}/lessons/${editingLessonId}`, body, token);
    },
    onSuccess: () => { setEditingLessonId(null); setEditLessonError(null); invalidate(); },
    onError: (err) => setEditLessonError(err instanceof ApiError ? err.message : 'Error al guardar.'),
  });

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragItem.current || dragItem.current === targetId) return;
    setLocalLessons(prev => {
      const arr = [...prev];
      const from = arr.findIndex(l => l.id === dragItem.current);
      const to = arr.findIndex(l => l.id === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{mod.order}</span>
          <span className="font-medium text-gray-800 dark:text-gray-100">{mod.title}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({mod.lessons?.length ?? 0} lecciones)</span>
        </div>
        <button onClick={() => deleteModule.mutate()} disabled={deleteModule.isPending}
          className="text-xs text-red-500 hover:text-red-700">
          {deleteModule.isPending ? <Spinner size="sm" /> : 'Eliminar módulo'}
        </button>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {localLessons.map((lesson, idx) => (
          <div key={lesson.id}>
            <div
              draggable
              onDragStart={() => { dragItem.current = lesson.id; }}
              onDragOver={(e) => handleDragOver(e, lesson.id)}
              onDrop={() => { reorderLessons.mutate(localLessons.map(l => l.id)); dragItem.current = null; }}
              onDragEnd={() => { dragItem.current = null; }}
              className="flex items-center justify-between px-4 py-2.5 cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-300 dark:text-gray-600 select-none">⠿</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono w-5">{idx + 1}.</span>
                <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{lesson.title}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{lesson.type}</span>
                {lesson.isPublished ? (
                  <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">Publicada</span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Borrador</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    if (editingLessonId === lesson.id) { setEditingLessonId(null); }
                    else { setEditingLessonId(lesson.id); setEditLessonError(null); }
                  }}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${editingLessonId === lesson.id ? 'border-gray-300 text-gray-500' : 'border-primary-200 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}>
                  {editingLessonId === lesson.id ? 'Cancelar' : '✏️ Editar'}
                </button>
                <button
                  onClick={() => publishLesson.mutate({ lessonId: lesson.id, published: lesson.isPublished })}
                  disabled={publishLesson.isPending}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${lesson.isPublished ? 'border-yellow-300 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'border-green-300 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30'}`}>
                  {lesson.isPublished ? 'Despublicar' : 'Publicar'}
                </button>
                <button onClick={() => deleteLesson.mutate(lesson.id)} disabled={deleteLesson.isPending}
                  className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20">
                  ×
                </button>
              </div>
            </div>
          {editingLessonId === lesson.id && (
            <div className="px-4 pb-3 pt-1 bg-primary-50 dark:bg-primary-900/10 border-t border-primary-100 dark:border-primary-900/30 space-y-2">
              {!editingLessonFull ? (
                <div className="flex items-center gap-2 py-2 text-xs text-gray-400"><Spinner size="sm" /> Cargando…</div>
              ) : (
                <>
                  <input
                    value={editLessonTitle}
                    onChange={e => setEditLessonTitle(e.target.value)}
                    className="input-base"
                    placeholder="Título"
                    maxLength={200}
                  />
                  {(editingLessonFull.type === 'TEXT' || editingLessonFull.type === 'CASE_STUDY') && (
                    <textarea
                      value={editLessonContent}
                      onChange={e => setEditLessonContent(e.target.value)}
                      className="input-base resize-none text-sm"
                      rows={5}
                      placeholder="Contenido (HTML permitido)"
                    />
                  )}
                  {editingLessonFull.type === 'VIDEO' && (
                    <input
                      type="url"
                      value={editLessonVideoUrl}
                      onChange={e => setEditLessonVideoUrl(e.target.value)}
                      className="input-base"
                      placeholder="URL del video"
                    />
                  )}
                  {(editingLessonFull.type === 'EMBED') && (
                    <input
                      type="url"
                      value={editLessonEmbedUrl}
                      onChange={e => setEditLessonEmbedUrl(e.target.value)}
                      className="input-base"
                      placeholder="URL de la app embebida"
                    />
                  )}
                  {editLessonError && <p className="text-xs text-red-600 dark:text-red-400">{editLessonError}</p>}
                  <button
                    onClick={() => updateLesson.mutate()}
                    disabled={updateLesson.isPending || !editLessonTitle.trim()}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    {updateLesson.isPending ? <Spinner size="sm" /> : 'Guardar cambios'}
                  </button>
                </>
              )}
            </div>
          )}
          </div>
        ))}

        <div className="px-4 py-3">
          {showAddLesson ? (
            <AddLessonForm
              courseId={courseId}
              moduleId={mod.id}
              token={token}
              onAdded={() => { setShowAddLesson(false); invalidate(); }}
              onCancel={() => setShowAddLesson(false)}
            />
          ) : (
            <button onClick={() => setShowAddLesson(true)}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium">
              + Agregar lección
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Content Section ──────────────────────────────────────────────────────────

function ContentSection({ courseId, token }: { courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const [showAddModule, setShowAddModule] = useState(false);
  const [localModules, setLocalModules] = useState<CourseModule[]>([]);
  const dragItem = useRef<string | null>(null);

  const { data: modules = [], isLoading } = useQuery<CourseModule[]>({
    queryKey: ['teacher', 'course', courseId, 'modules'],
    queryFn: () => api.get(`/courses/${courseId}/modules`, token),
    enabled: !!courseId,
  });

  useEffect(() => { setLocalModules([...modules]); }, [modules]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'modules'] });

  const reorderModules = useMutation({
    mutationFn: (moduleIds: string[]) =>
      api.patch(`/courses/${courseId}/modules/reorder`, { moduleIds }, token),
    onSuccess: invalidate,
    onError: () => setLocalModules([...modules]),
  });

  function handleModuleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragItem.current || dragItem.current === targetId) return;
    setLocalModules(prev => {
      const arr = [...prev];
      const from = arr.findIndex(m => m.id === dragItem.current);
      const to = arr.findIndex(m => m.id === targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  }

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{modules.length} módulo{modules.length !== 1 ? 's' : ''}</h2>
        <button onClick={() => setShowAddModule(f => !f)} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium">
          {showAddModule ? 'Cancelar' : '+ Nuevo módulo'}
        </button>
      </div>

      {showAddModule && (
        <div className="card p-4">
          <AddModuleForm courseId={courseId} token={token} onAdded={() => { setShowAddModule(false); invalidate(); }} />
        </div>
      )}

      {localModules.length === 0 && !showAddModule && (
        <div className="card p-8 text-center text-gray-400">
          <p>No hay módulos todavía.</p>
          <button onClick={() => setShowAddModule(true)} className="mt-3 text-sm text-primary-600 hover:text-primary-800 font-medium">
            Agregar el primer módulo
          </button>
        </div>
      )}

      <div className="space-y-3">
        {localModules.map(mod => (
          <div
            key={mod.id}
            draggable
            onDragStart={() => { dragItem.current = mod.id; }}
            onDragOver={(e) => handleModuleDragOver(e, mod.id)}
            onDrop={() => { reorderModules.mutate(localModules.map(m => m.id)); dragItem.current = null; }}
            onDragEnd={() => { dragItem.current = null; }}
            className="cursor-grab active:cursor-grabbing"
          >
            <ModuleCard mod={mod} courseId={courseId} token={token} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Student Progress Modal ───────────────────────────────────────────────────

function StudentProgressModal({ courseId, studentId, studentName, token, onClose }: {
  courseId: string; studentId: string; studentName: string; token: string; onClose: () => void;
}) {
  const { data, isLoading } = useQuery<StudentCourseDetail>({
    queryKey: ['teacher', 'course', courseId, 'student', studentId],
    queryFn: () => api.get(`/courses/${courseId}/students/${studentId}`, token),
  });

  const gradedAssignments = data?.assignments.filter(a => a.grade !== null) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Progreso — {studentName}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {isLoading && <div className="flex justify-center py-6"><Spinner size="lg" className="text-primary-500" /></div>}

        {data && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-3 text-center">
                <p className="text-lg font-bold text-primary-600">{data.progress.percentage}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Progreso</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{data.progress.completedLessons}/{data.progress.totalLessons}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lecciones</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-lg font-bold text-yellow-500">{data.assignments.filter(a => a.submission).length}/{data.assignments.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Entregas</p>
              </div>
            </div>

            {gradedAssignments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Calificaciones</p>
                <div className="space-y-1">
                  {gradedAssignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{a.title}</span>
                      <span className="font-medium ml-4 text-gray-900 dark:text-gray-100">
                        {a.grade!.score}/{a.grade!.maxScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Enrollments Section ──────────────────────────────────────────────────────

function EnrollmentsSection({ courseId, token }: { courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  const { data: enrollments = [], isLoading } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ['teacher', 'course', courseId, 'enrollments'],
    queryFn: () => api.get(`/courses/${courseId}/enrollments`, token),
    enabled: !!courseId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'enrollments'] });

  const approve = useMutation({
    mutationFn: (enrollmentId: string) => api.patch(`/enrollments/${enrollmentId}/approve`, undefined, token),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (enrollmentId: string) => api.patch(`/enrollments/${enrollmentId}/reject`, undefined, token),
    onSuccess: invalidate,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  if (enrollments.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <p>No hay inscripciones todavía.</p>
      </div>
    );
  }

  return (
    <>
      {selectedStudent && (
        <StudentProgressModal
          courseId={courseId}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          token={token}
          onClose={() => setSelectedStudent(null)}
        />
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estudiante</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Fecha</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {enrollments.map(e => {
              const name = e.student.firstName || e.student.lastName
                ? `${e.student.firstName ?? ''} ${e.student.lastName ?? ''}`.trim()
                : '(sin nombre)';
              return (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{e.student.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={enrollStatusVariant[e.status]}>{enrollStatusLabel[e.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(e.enrolledAt).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(e.status === 'ACTIVE' || e.status === 'COMPLETED') && (
                        <button
                          onClick={() => setSelectedStudent({ id: e.student.id, name })}
                          className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                          Ver progreso
                        </button>
                      )}
                      {e.status === 'PENDING' && (
                        <>
                          <button onClick={() => approve.mutate(e.id)} disabled={approve.isPending}
                            className="text-xs px-2 py-1 rounded border border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30">
                            Aprobar
                          </button>
                          <button onClick={() => reject.mutate(e.id)} disabled={reject.isPending}
                            className="text-xs px-2 py-1 rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Dilemma Config ───────────────────────────────────────────────────────────

function DilemmaConfigButton({ assignmentId, courseId, token }: { assignmentId: string; courseId: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState('');
  const [choices, setChoices] = useState([
    { text: '', consequence: '', ethicalScore: 50 },
    { text: '', consequence: '', ethicalScore: 50 },
  ]);
  const [error, setError] = useState<string | null>(null);

  const { data: existing } = useQuery({
    queryKey: ['dilemma', assignmentId],
    queryFn: () => api.get(`/courses/${courseId}/assignments/${assignmentId}/dilemma`, token).catch(() => null),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/assignments/${assignmentId}/dilemma`, { scenario, choices }, token),
    onSuccess: () => { setOpen(false); setError(null); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al guardar el dilema.'),
  });

  const updateChoice = (i: number, field: string, value: string | number) =>
    setChoices(cs => cs.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  if (existing) {
    return (
      <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
        ⚖️ Dilema configurado
      </span>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 border border-amber-200 dark:border-amber-800 rounded px-2 py-1 hover:bg-amber-50 dark:hover:bg-amber-900/20">
        ⚖️ Configurar dilema
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configurar Dilema Ético</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Escenario / situación</label>
              <textarea value={scenario} onChange={e => setScenario(e.target.value)}
                className="input-base resize-none" rows={4}
                placeholder="Describí la situación ética que debe evaluar el estudiante..." />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Opciones (mínimo 2)</label>
                <button onClick={() => setChoices(cs => [...cs, { text: '', consequence: '', ethicalScore: 50 }])}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800">+ Agregar opción</button>
              </div>
              {choices.map((c, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500">Opción {i + 1}</p>
                  <input value={c.text} onChange={e => updateChoice(i, 'text', e.target.value)}
                    className="input-base" placeholder="Texto de la opción" />
                  <textarea value={c.consequence} onChange={e => updateChoice(i, 'consequence', e.target.value)}
                    className="input-base resize-none" rows={2}
                    placeholder="Consecuencia que se revela al elegir esta opción..." />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 whitespace-nowrap">Puntaje ético (0-100):</label>
                    <input type="number" value={c.ethicalScore} onChange={e => updateChoice(i, 'ethicalScore', Number(e.target.value))}
                      className="input-base w-20" min={0} max={100} />
                  </div>
                  {choices.length > 2 && (
                    <button onClick={() => setChoices(cs => cs.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-500 hover:text-red-700">Eliminar opción</button>
                  )}
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => save.mutate()} disabled={save.isPending || !scenario.trim() || choices.some(c => !c.text.trim())}
                className="btn-primary px-4 py-2 text-sm">
                {save.isPending ? <Spinner size="sm" /> : 'Guardar dilema'}
              </button>
              <button onClick={() => setOpen(false)} className="btn-secondary px-4 py-2 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Assignments Section ──────────────────────────────────────────────────────

const assignmentTypeLabel: Record<AssignmentType, string> = {
  TEXT: 'Texto', FILE: 'Archivo', QUIZ: 'Quiz', DILEMMA: 'Dilema Ético',
};

function AssignmentsSection({ courseId, token }: { courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', type: 'TEXT' as AssignmentType,
    dueDate: '', maxScore: 100, weight: 1,
  });
  const [error, setError] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['teacher', 'course', courseId, 'assignments'],
    queryFn: () => api.get(`/courses/${courseId}/assignments`, token),
    enabled: !!courseId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'assignments'] });

  const create = useMutation({
    mutationFn: () => api.post<Assignment>(`/courses/${courseId}/assignments`, {
      title: form.title,
      type: form.type,
      description: form.description.trim() || undefined,
      dueDate: form.dueDate || undefined,
      maxScore: form.maxScore,
      weight: form.weight,
    }, token),
    onSuccess: () => { setShowForm(false); setForm({ title: '', description: '', type: 'TEXT', dueDate: '', maxScore: 100, weight: 1 }); invalidate(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al crear la tarea.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${courseId}/assignments/${id}`, token),
    onSuccess: invalidate,
  });

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editAssignmentForm, setEditAssignmentForm] = useState({
    title: '', description: '', dueDate: '', maxScore: 100, weight: 1,
  });

  const updateAssignment = useMutation({
    mutationFn: () => api.patch(`/courses/${courseId}/assignments/${editingAssignmentId}`, {
      title: editAssignmentForm.title,
      description: editAssignmentForm.description.trim() || null,
      dueDate: editAssignmentForm.dueDate || null,
      maxScore: editAssignmentForm.maxScore,
      weight: editAssignmentForm.weight,
    }, token),
    onSuccess: () => { setEditingAssignmentId(null); invalidate(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al guardar.'),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  if (selectedAssignment) {
    return <AssignmentSubmissions assignment={selectedAssignment} courseId={courseId} token={token} onBack={() => setSelectedAssignment(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{assignments.length} tarea{assignments.length !== 1 ? 's' : ''}</h2>
        <button onClick={() => { setShowForm(f => !f); setError(null); }} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium">
          {showForm ? 'Cancelar' : '+ Nueva tarea'}
        </button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nueva tarea</p>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input-base" placeholder="Título de la tarea" maxLength={255} />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="input-base resize-none" rows={2} placeholder="Descripción (opcional)" maxLength={5000} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AssignmentType }))} className="input-base">
                <option value="TEXT">Texto</option>
                <option value="FILE">Archivo</option>
                <option value="DILEMMA">⚖️ Dilema Ético</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Puntaje máx.</label>
              <input type="number" value={form.maxScore} onChange={e => setForm(f => ({ ...f, maxScore: Number(e.target.value) }))}
                className="input-base" min={1} max={10000} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Peso</label>
              <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))}
                className="input-base" min={0.1} max={10} step={0.1} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha límite (opcional)</label>
            <input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="input-base" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setError(null); create.mutate(); }} disabled={create.isPending || !form.title.trim()}
              className="btn-primary px-4 py-2 text-sm">
              {create.isPending ? <Spinner size="sm" /> : 'Crear tarea'}
            </button>
          </div>
        </div>
      )}

      {assignments.length === 0 && !showForm ? (
        <div className="card p-8 text-center text-gray-400">
          <p>No hay tareas todavía.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary-600 hover:text-primary-800 font-medium">
            Crear la primera tarea
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Título</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Fecha límite</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Puntaje / Peso</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {assignments.map(a => (
                <React.Fragment key={a.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{a.title}</p>
                      {a.description && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{a.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{assignmentTypeLabel[a.type]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {a.dueDate ? new Date(a.dueDate).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">
                      {a.maxScore} pts · ×{a.weight}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {a.type === 'DILEMMA' && (
                          <DilemmaConfigButton assignmentId={a.id} courseId={courseId} token={token} />
                        )}
                        <button
                          onClick={() => {
                            if (editingAssignmentId === a.id) { setEditingAssignmentId(null); }
                            else { setEditingAssignmentId(a.id); setEditAssignmentForm({ title: a.title, description: a.description ?? '', dueDate: a.dueDate ? a.dueDate.slice(0, 16) : '', maxScore: a.maxScore, weight: a.weight }); }
                          }}
                          className={`text-xs border rounded px-2 py-1 transition-colors ${editingAssignmentId === a.id ? 'border-gray-300 text-gray-500' : 'border-primary-200 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30'}`}>
                          {editingAssignmentId === a.id ? 'Cancelar' : '✏️ Editar'}
                        </button>
                        <button onClick={() => setSelectedAssignment(a)}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 border border-primary-200 dark:border-primary-800 rounded px-2 py-1 hover:bg-primary-50 dark:hover:bg-primary-900/30">
                          Ver entregas
                        </button>
                        <button onClick={() => remove.mutate(a.id)} disabled={remove.isPending}
                          className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingAssignmentId === a.id && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 bg-primary-50 dark:bg-primary-900/10 border-t border-primary-100 dark:border-primary-900/30">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Editar tarea</p>
                          <input value={editAssignmentForm.title} onChange={e => setEditAssignmentForm(f => ({ ...f, title: e.target.value }))}
                            className="input-base" placeholder="Título" maxLength={255} />
                          <textarea value={editAssignmentForm.description} onChange={e => setEditAssignmentForm(f => ({ ...f, description: e.target.value }))}
                            className="input-base resize-none text-sm" rows={2} placeholder="Descripción (opcional)" />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400">Fecha límite</label>
                              <input type="datetime-local" value={editAssignmentForm.dueDate} onChange={e => setEditAssignmentForm(f => ({ ...f, dueDate: e.target.value }))} className="input-base" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400">Puntaje máx.</label>
                              <input type="number" value={editAssignmentForm.maxScore} onChange={e => setEditAssignmentForm(f => ({ ...f, maxScore: Number(e.target.value) }))} className="input-base" min={1} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400">Peso</label>
                              <input type="number" value={editAssignmentForm.weight} onChange={e => setEditAssignmentForm(f => ({ ...f, weight: Number(e.target.value) }))} className="input-base" min={0.1} step={0.1} />
                            </div>
                          </div>
                          <button onClick={() => updateAssignment.mutate()} disabled={updateAssignment.isPending || !editAssignmentForm.title.trim()}
                            className="btn-primary px-3 py-1.5 text-xs">
                            {updateAssignment.isPending ? <Spinner size="sm" /> : 'Guardar cambios'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Forum Thread View (teacher reads posts) ──────────────────────────────────

function ForumThreadView({ thread, courseId, token, onBack }: {
  thread: ForumThread; courseId: string; token: string; onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState('');
  const [postError, setPostError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState('');

  const updatePost = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      api.patch(`/posts/${postId}`, { content }, token),
    onSuccess: () => { setEditingPostId(null); refresh(); },
    onError: () => setPostError('Error al editar el post.'),
  });

  const { data, isLoading } = useQuery<ForumThreadWithPosts>({
    queryKey: ['teacher', 'course', courseId, 'thread', thread.id],
    queryFn: () => api.get(`/courses/${courseId}/threads/${thread.id}`, token),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'thread', thread.id] });

  const submitPost = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/threads/${thread.id}/posts`, { content: newPost }, token),
    onSuccess: () => { setNewPost(''); setPostError(null); refresh(); },
    onError: (err) => setPostError(err instanceof ApiError ? err.message : 'Error al publicar.'),
  });

  const submitReply = useMutation({
    mutationFn: (parentId: string) =>
      api.post(`/courses/${courseId}/threads/${thread.id}/posts`, { content: replyText, parentId }, token),
    onSuccess: () => { setReplyText(''); setReplyingTo(null); setReplyError(null); refresh(); },
    onError: (err) => setReplyError(err instanceof ApiError ? err.message : 'Error al responder.'),
  });

  const allPosts = data?.posts.filter(p => !p.deletedAt) ?? [];
  const topLevel = allPosts.filter(p => !p.parentId);
  const repliesMap = new Map<string, ForumPost[]>();
  allPosts.forEach(p => {
    if (p.parentId) {
      const arr = repliesMap.get(p.parentId) ?? [];
      arr.push(p);
      repliesMap.set(p.parentId, arr);
    }
  });

  function renderPost(p: ForumPost, indent = false) {
    const isReplying = replyingTo === p.id;
    return (
      <div key={p.id} className={`card p-3 space-y-2 ${indent ? 'ml-6' : ''}`}>
        {editingPostId === p.id ? (
          <div className="space-y-2">
            <textarea
              value={editPostContent}
              onChange={e => setEditPostContent(e.target.value)}
              rows={3}
              className="input-base resize-none text-sm w-full"
            />
            <div className="flex gap-2">
              <button onClick={() => updatePost.mutate({ postId: p.id, content: editPostContent })}
                disabled={updatePost.isPending || !editPostContent.trim()}
                className="btn-primary px-3 py-1 text-xs">
                {updatePost.isPending ? <Spinner size="sm" /> : 'Guardar'}
              </button>
              <button onClick={() => setEditingPostId(null)} className="btn-secondary px-3 py-1 text-xs">Cancelar</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{p.content}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {p.authorName && <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{p.authorName}</span>}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(p.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
          {!thread.isLocked && (
            <button
              onClick={() => { setReplyingTo(isReplying ? null : p.id); setReplyText(''); setReplyError(null); }}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
            >
              {isReplying ? 'Cancelar' : 'Responder'}
            </button>
          )}
          <button
            onClick={() => { setEditingPostId(p.id); setEditPostContent(p.content ?? ''); }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            ✏️ Editar
          </button>
        </div>
        {isReplying && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={2}
              maxLength={10000}
              className="input-base resize-none text-sm"
              placeholder="Escribí tu respuesta..."
            />
            {replyError && <p className="text-xs text-red-600 dark:text-red-400">{replyError}</p>}
            <button
              onClick={() => submitReply.mutate(p.id)}
              disabled={submitReply.isPending || replyText.trim().length < 1}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              {submitReply.isPending ? <Spinner size="sm" /> : 'Publicar respuesta'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← Volver</button>
        <div className="flex items-center gap-2 min-w-0">
          {thread.isPinned && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded flex-shrink-0">Fijado</span>}
          {thread.isLocked && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded flex-shrink-0">Cerrado</span>}
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{thread.title}</h3>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" className="text-primary-500" /></div>
      ) : topLevel.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Sin respuestas todavía.</p>
      ) : (
        <div className="space-y-3">
          {topLevel.map(p => (
            <div key={p.id}>
              {renderPost(p)}
              {(repliesMap.get(p.id) ?? []).map(r => (
                <div key={r.id} className="mt-2">{renderPost(r, true)}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!thread.isLocked && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Dejar comentario en el hilo</p>
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            rows={3}
            maxLength={10000}
            className="input-base resize-none text-sm"
            placeholder="Escribí tu comentario..."
          />
          {postError && <p className="text-xs text-red-600">{postError}</p>}
          <button
            onClick={() => submitPost.mutate()}
            disabled={submitPost.isPending || newPost.trim().length < 1}
            className="btn-primary px-4 py-2 text-sm"
          >
            {submitPost.isPending ? <Spinner size="sm" /> : 'Publicar'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Assignment Submissions (teacher grades) ──────────────────────────────────

function GradeForm({ submission, courseId, assignmentId, token, onDone }: {
  submission: SubmissionWithStudentInfo;
  courseId: string;
  assignmentId: string;
  token: string;
  onDone: () => void;
}) {
  const [score, setScore] = useState(submission.grade?.score?.toString() ?? '');
  const [feedback, setFeedback] = useState(submission.grade?.feedback ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body = { score: Number(score), feedback: feedback.trim() || undefined };
      if (submission.grade) {
        return api.patch(`/courses/${courseId}/assignments/${assignmentId}/submissions/${submission.id}/grade`, body, token);
      }
      return api.post(`/courses/${courseId}/assignments/${assignmentId}/submissions/${submission.id}/grade`, body, token);
    },
    onSuccess: () => onDone(),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al calificar.'),
  });

  return (
    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Nota</label>
          <input
            type="number" value={score} min={0} max={submission.grade?.maxScore ?? 100}
            onChange={e => setScore(e.target.value)}
            className="input-base w-24 text-sm"
            placeholder="0"
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">/ {submission.grade?.maxScore ?? '—'} pts</p>
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Retroalimentación (opcional)</label>
        <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
          rows={2} maxLength={5000} className="input-base resize-none text-sm"
          placeholder="Comentarios para el alumno..." />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button onClick={() => save.mutate()} disabled={save.isPending || !score.trim()}
        className="btn-primary px-3 py-1.5 text-xs">
        {save.isPending ? <Spinner size="sm" /> : submission.grade ? 'Actualizar nota' : 'Calificar'}
      </button>
    </div>
  );
}

function AssignmentSubmissions({ assignment, courseId, token, onBack }: {
  assignment: Assignment; courseId: string; token: string; onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [gradingId, setGradingId] = useState<string | null>(null);

  const { data: submissions = [], isLoading } = useQuery<SubmissionWithStudentInfo[]>({
    queryKey: ['teacher', 'course', courseId, 'assignment', assignment.id, 'submissions'],
    queryFn: () => api.get(`/courses/${courseId}/assignments/${assignment.id}/submissions`, token),
  });

  const invalidate = () => queryClient.invalidateQueries({
    queryKey: ['teacher', 'course', courseId, 'assignment', assignment.id, 'submissions'],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← Volver</button>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{assignment.title}</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">{assignment.maxScore} pts · {submissions.length} entrega{submissions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" className="text-primary-500" /></div>
      ) : submissions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No hay entregas todavía.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <div key={sub.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {sub.studentFirstName || sub.studentLastName
                      ? `${sub.studentFirstName} ${sub.studentLastName}`.trim()
                      : '(sin nombre)'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{sub.studentEmail}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  {sub.grade ? (
                    <span className="text-sm font-semibold text-primary-600">
                      {sub.grade.score} / {sub.grade.maxScore} pts
                    </span>
                  ) : (
                    <span className="text-xs text-orange-500 font-medium">Sin calificar</span>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(sub.submittedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    {sub.isLate && <span className="ml-1 text-orange-400">(tardío)</span>}
                  </p>
                </div>
              </div>

              {sub.textContent && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {sub.textContent}
                </div>
              )}
              {sub.fileAssetId && (
                <button onClick={() => downloadFile(sub.fileAssetId!, token)}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium">
                  📎 Descargar archivo entregado
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGradingId(gradingId === sub.id ? null : sub.id)}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                >
                  {gradingId === sub.id ? 'Cancelar' : sub.grade ? 'Editar nota' : 'Calificar'}
                </button>
                {sub.grade?.feedback && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">"{sub.grade.feedback}"</p>
                )}
              </div>

              {gradingId === sub.id && (
                <GradeForm
                  submission={sub}
                  courseId={courseId}
                  assignmentId={assignment.id}
                  token={token}
                  onDone={() => { setGradingId(null); invalidate(); }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Student Detail Panel ─────────────────────────────────────────────────────

function StudentDetailPanel({ studentId, courseId, token, onBack }: {
  studentId: string; courseId: string; token: string; onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [gradingId, setGradingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<StudentCourseDetail>({
    queryKey: ['teacher', 'course', courseId, 'student', studentId],
    queryFn: () => api.get(`/courses/${courseId}/students/${studentId}`, token),
  });

  const invalidate = () => queryClient.invalidateQueries({
    queryKey: ['teacher', 'course', courseId, 'student', studentId],
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>;
  if (!data) return null;

  const { student, enrollment, progress, assignments } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← Volver</button>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {student.firstName || student.lastName ? `${student.firstName} ${student.lastName}`.trim() : '(sin nombre)'}
        </h3>
      </div>

      {/* Profile + progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Datos del alumno</p>
          <p className="text-sm text-gray-800 dark:text-gray-100">{student.email}</p>
          {student.bio && <p className="text-xs text-gray-400 dark:text-gray-500">{student.bio}</p>}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Inscripto: {new Date(enrollment.enrolledAt).toLocaleDateString('es-AR')} ·{' '}
            <Badge variant={enrollStatusVariant[enrollment.status as EnrollmentStatus]}>
              {enrollStatusLabel[enrollment.status as EnrollmentStatus]}
            </Badge>
          </p>
        </div>
        <div className="card p-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Progreso del curso</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${progress.percentage}%` }} />
            </div>
            <span className="text-sm font-semibold text-primary-600">{progress.percentage}%</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">{progress.completedLessons} / {progress.totalLessons} lecciones</p>
        </div>
      </div>

      {/* Assignments */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tareas del curso</p>
        {assignments.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin tareas asignadas.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => (
              <div key={a.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{a.title}</p>
                    {a.dueDate && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">Vence: {new Date(a.dueDate).toLocaleDateString('es-AR')}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {a.grade ? (
                      <span className="text-sm font-semibold text-primary-600">
                        {a.grade.score} / {a.grade.maxScore} pts
                      </span>
                    ) : a.submission ? (
                      <span className="text-xs text-orange-500 font-medium">Entregado · Sin nota</span>
                    ) : (
                      <span className="text-xs text-gray-400">No entregado</span>
                    )}
                  </div>
                </div>

                {a.submission?.textContent && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {a.submission.textContent}
                  </div>
                )}
                {a.submission?.fileAssetId && (
                  <button onClick={() => downloadFile(a.submission!.fileAssetId!, token)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium">
                    📎 Descargar archivo entregado
                  </button>
                )}

                {a.submission && (
                  <button
                    onClick={() => setGradingId(gradingId === a.id ? null : a.id)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                  >
                    {gradingId === a.id ? 'Cancelar' : a.grade ? 'Editar nota' : 'Calificar'}
                  </button>
                )}

                {gradingId === a.id && a.submission && (
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <InlineGradeForm
                      submissionId={a.submission.id}
                      assignmentId={a.id}
                      courseId={courseId}
                      maxScore={a.maxScore}
                      existingGrade={a.grade}
                      token={token}
                      onDone={() => { setGradingId(null); invalidate(); }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InlineGradeForm({ submissionId, assignmentId, courseId, maxScore, existingGrade, token, onDone }: {
  submissionId: string;
  assignmentId: string;
  courseId: string;
  maxScore: number;
  existingGrade: { id: string; score: number; maxScore: number; feedback: string | null } | null;
  token: string;
  onDone: () => void;
}) {
  const [score, setScore] = useState(existingGrade?.score?.toString() ?? '');
  const [feedback, setFeedback] = useState(existingGrade?.feedback ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body = { score: Number(score), feedback: feedback.trim() || undefined };
      if (existingGrade) {
        return api.patch(`/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/grade`, body, token);
      }
      return api.post(`/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/grade`, body, token);
    },
    onSuccess: () => onDone(),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al calificar.'),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input type="number" value={score} min={0} max={maxScore}
          onChange={e => setScore(e.target.value)}
          className="input-base w-20 text-sm" placeholder="0" />
        <span className="text-xs text-gray-400 dark:text-gray-500">/ {maxScore} pts</span>
      </div>
      <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
        rows={2} className="input-base resize-none text-sm" placeholder="Retroalimentación (opcional)" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button onClick={() => save.mutate()} disabled={save.isPending || !score.trim()}
        className="btn-primary px-3 py-1.5 text-xs">
        {save.isPending ? <Spinner size="sm" /> : existingGrade ? 'Actualizar' : 'Calificar'}
      </button>
    </div>
  );
}

// ─── Forums Section ───────────────────────────────────────────────────────────

function ForumsSection({ courseId, token }: { courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);

  const { data: threads = [], isLoading } = useQuery<ForumThread[]>({
    queryKey: ['teacher', 'course', courseId, 'threads'],
    queryFn: () => api.get(`/courses/${courseId}/threads`, token),
    enabled: !!courseId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'threads'] });

  const create = useMutation({
    mutationFn: () => api.post<ForumThread>(`/courses/${courseId}/threads`, { title }, token),
    onSuccess: () => { setShowForm(false); setTitle(''); invalidate(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al crear el hilo.'),
  });

  const removeThread = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${courseId}/threads/${id}`, token),
    onSuccess: invalidate,
  });

  const pinThread = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      api.patch(`/courses/${courseId}/threads/${id}/pin`, { isPinned }, token),
    onSuccess: invalidate,
  });

  const lockThread = useMutation({
    mutationFn: ({ id, isLocked }: { id: string; isLocked: boolean }) =>
      api.patch(`/courses/${courseId}/threads/${id}/lock`, { isLocked }, token),
    onSuccess: invalidate,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  if (selectedThread) {
    return <ForumThreadView thread={selectedThread} courseId={courseId} token={token} onBack={() => setSelectedThread(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{threads.length} hilo{threads.length !== 1 ? 's' : ''}</h2>
        <button onClick={() => { setShowForm(f => !f); setError(null); }} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium">
          {showForm ? 'Cancelar' : '+ Nuevo hilo'}
        </button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nuevo hilo de foro</p>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="input-base" placeholder="Título del hilo (mín. 3 caracteres)" maxLength={255} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button onClick={() => { setError(null); create.mutate(); }} disabled={create.isPending || title.trim().length < 3}
            className="btn-primary px-4 py-2 text-sm">
            {create.isPending ? <Spinner size="sm" /> : 'Crear hilo'}
          </button>
        </div>
      )}

      {threads.length === 0 && !showForm ? (
        <div className="card p-8 text-center text-gray-400">
          <p>No hay hilos en el foro todavía.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary-600 hover:text-primary-800 font-medium">
            Crear el primer hilo
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Título</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Respuestas</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Fecha</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {threads.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {t.isPinned && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded">Fijado</span>}
                      {t.isLocked && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">Cerrado</span>}
                      <button
                        onClick={() => setSelectedThread(t)}
                        className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline text-left"
                      >
                        {t.title}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{t.postCount}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(t.createdAt).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => pinThread.mutate({ id: t.id, isPinned: !t.isPinned })}
                        disabled={pinThread.isPending}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${t.isPinned ? 'border-yellow-300 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        {t.isPinned ? 'Desfijar' : 'Fijar'}
                      </button>
                      <button onClick={() => lockThread.mutate({ id: t.id, isLocked: !t.isLocked })}
                        disabled={lockThread.isPending}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${t.isLocked ? 'border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30' : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        {t.isLocked ? 'Abrir' : 'Cerrar'}
                      </button>
                      <button onClick={() => removeThread.mutate(t.id)} disabled={removeThread.isPending}
                        className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Evaluations Section ──────────────────────────────────────────────────────

interface EvaluationItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  totalPoints: number;
  isPublished: boolean;
}

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface EvaluationQuestion {
  id: string;
  text: string;
  type: 'TEXT' | 'MCQ' | 'TRUE_FALSE';
  points: number;
  order: number;
  options: QuestionOption[];
}

interface EvaluationDetail extends EvaluationItem {
  questions: EvaluationQuestion[];
}

interface AttemptItem {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
}

// ─── Editable Question ────────────────────────────────────────────────────────

function EditableQuestion({ q, courseId, evaluationId, token, onDelete, deletePending, onRefresh }: {
  q: { id: string; text: string; type: string; points: number; options: { id: string; text: string; isCorrect: boolean }[] };
  courseId: string; evaluationId: string; token: string;
  onDelete: () => void; deletePending: boolean; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    text: q.text, type: q.type, points: q.points,
    options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
  });
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      await api.delete(`/courses/${courseId}/evaluations/${evaluationId}/questions/${q.id}`, token);
      const body: Record<string, unknown> = { text: form.text.trim(), type: form.type, points: form.points };
      if (form.type !== 'TEXT') body.options = form.options;
      return api.post(`/courses/${courseId}/evaluations/${evaluationId}/questions`, body, token);
    },
    onSuccess: () => { setEditing(false); setErr(null); onRefresh(); },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Error al guardar.'),
  });

  if (editing) {
    return (
      <div className="card p-4 space-y-3 border-primary-200 dark:border-primary-800">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Editar pregunta</p>
        <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          className="input-base resize-none text-sm" rows={2} placeholder="Texto de la pregunta" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Tipo</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-base">
              <option value="MCQ">Opción múltiple</option>
              <option value="TRUE_FALSE">Verdadero / Falso</option>
              <option value="TEXT">Respuesta abierta</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Puntos</label>
            <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))} className="input-base" min={1} />
          </div>
        </div>
        {form.type !== 'TEXT' && (
          <div className="space-y-1">
            {form.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={o.isCorrect} onChange={e => setForm(f => ({ ...f, options: f.options.map((x, xi) => xi === i ? { ...x, isCorrect: e.target.checked } : x) }))} />
                <input value={o.text} onChange={e => setForm(f => ({ ...f, options: f.options.map((x, xi) => xi === i ? { ...x, text: e.target.value } : x) }))}
                  className="input-base flex-1 text-sm" placeholder={`Opción ${i + 1}`} />
                <button type="button" onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, xi) => xi !== i) }))} className="text-xs text-red-400 hover:text-red-600">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setForm(f => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }))}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline">+ Agregar opción</button>
          </div>
        )}
        {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
        <div className="flex gap-2">
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.text.trim()} className="btn-primary px-3 py-1.5 text-xs">
            {save.isPending ? <Spinner size="sm" /> : 'Guardar'}
          </button>
          <button onClick={() => { setEditing(false); setForm({ text: q.text, type: q.type, points: q.points, options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })) }); }} className="btn-secondary px-3 py-1.5 text-xs">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{q.type}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{q.points} pts</span>
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-100">{q.text}</p>
          {q.options.length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {q.options.map(o => (
                <li key={o.id} className={`text-xs flex items-center gap-1 ${o.isCorrect ? 'text-green-700 dark:text-green-300 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                  {o.isCorrect ? '✓' : '○'} {o.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setEditing(true)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">✏️ Editar</button>
          <button onClick={onDelete} disabled={deletePending} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function EvaluationDetailView({
  evaluation, courseId, token, onBack,
}: {
  evaluation: EvaluationDetail; courseId: string; token: string; onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: evaluation.title,
    description: evaluation.description ?? '',
    dueDate: evaluation.dueDate ?? '',
    totalPoints: evaluation.totalPoints,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [qForm, setQForm] = useState({
    text: '', type: 'TEXT' as 'TEXT' | 'MCQ' | 'TRUE_FALSE', points: 10,
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
  });
  const [qError, setQError] = useState<string | null>(null);

  const invalidateEval = () => queryClient.invalidateQueries({
    queryKey: ['teacher', 'course', courseId, 'evaluation', evaluation.id],
  });
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'evaluations'] });

  const updateEval = useMutation({
    mutationFn: () => api.patch(`/courses/${courseId}/evaluations/${evaluation.id}`, {
      title: editForm.title,
      description: editForm.description.trim() || undefined,
      dueDate: editForm.dueDate || undefined,
      totalPoints: editForm.totalPoints,
    }, token),
    onSuccess: () => { setEditing(false); setEditError(null); invalidateEval(); invalidateList(); },
    onError: (err) => setEditError(err instanceof ApiError ? err.message : 'Error al guardar.'),
  });

  const togglePublish = useMutation({
    mutationFn: (isPublished: boolean) =>
      api.patch(`/courses/${courseId}/evaluations/${evaluation.id}`, { isPublished }, token),
    onSuccess: () => { invalidateEval(); invalidateList(); },
  });

  const { data: evaluationData } = useQuery<EvaluationDetail>({
    queryKey: ['teacher', 'course', courseId, 'evaluation', evaluation.id],
    queryFn: () => api.get(`/courses/${courseId}/evaluations/${evaluation.id}`, token),
    initialData: evaluation,
  });

  const { data: attempts = [] } = useQuery<AttemptItem[]>({
    queryKey: ['teacher', 'course', courseId, 'evaluation', evaluation.id, 'attempts'],
    queryFn: () => api.get(`/courses/${courseId}/evaluations/${evaluation.id}/attempts`, token),
    enabled: showAttempts,
  });

  const addQuestion = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        text: qForm.text, type: qForm.type, points: qForm.points,
      };
      if (qForm.type !== 'TEXT') body.options = qForm.options;
      return api.post(`/courses/${courseId}/evaluations/${evaluation.id}/questions`, body, token);
    },
    onSuccess: () => {
      setShowAddQuestion(false);
      setQForm({ text: '', type: 'TEXT', points: 10, options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] });
      setQError(null);
      invalidateEval();
    },
    onError: (err) => setQError(err instanceof ApiError ? err.message : 'Error al agregar la pregunta.'),
  });

  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) =>
      api.delete(`/courses/${courseId}/evaluations/${evaluation.id}/questions/${questionId}`, token),
    onSuccess: invalidateEval,
  });

  const gradeAttempt = useMutation({
    mutationFn: ({ attemptId, score, feedback }: { attemptId: string; score: number; feedback: string }) =>
      api.patch(`/courses/${courseId}/evaluations/${evaluation.id}/attempts/${attemptId}/grade`, { score, feedback: feedback || undefined }, token),
    onSuccess: () => {
      setGradingId(null);
      queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'evaluation', evaluation.id, 'attempts'] });
    },
  });

  const questions = evaluationData?.questions ?? [];

  const isPublished = evaluationData?.isPublished ?? false;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← Volver</button>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{evaluationData?.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${isPublished ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            {isPublished ? 'Publicado' : 'Borrador'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => togglePublish.mutate(!isPublished)}
            disabled={togglePublish.isPending}
            className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${isPublished ? 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800' : 'border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
          >
            {isPublished ? 'Despublicar' : 'Publicar'}
          </button>
          <button
            onClick={() => { setEditing(e => !e); setEditError(null); }}
            className="text-xs px-3 py-1.5 rounded border border-primary-200 text-primary-600 hover:bg-primary-50 font-medium"
          >
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>
      </div>

      {editing && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Editar evaluación</p>
          <input
            value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
            className="input-base" placeholder="Título" maxLength={255}
          />
          <textarea
            value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
            className="input-base resize-none" rows={2} placeholder="Descripción (opcional)" maxLength={5000}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha límite</label>
              <input type="datetime-local" value={editForm.dueDate} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Puntaje total</label>
              <input type="number" min={1} value={editForm.totalPoints} onChange={e => setEditForm(f => ({ ...f, totalPoints: Number(e.target.value) }))} className="input-base" />
            </div>
          </div>
          {editError && <p className="text-xs text-red-600">{editError}</p>}
          <button
            onClick={() => { setEditError(null); updateEval.mutate(); }}
            disabled={updateEval.isPending || editForm.title.trim().length < 3}
            className="btn-primary px-4 py-2 text-sm"
          >
            {updateEval.isPending ? <Spinner size="sm" /> : 'Guardar cambios'}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowAttempts(s => !s)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium border border-primary-200 dark:border-primary-800 rounded px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/30"
        >
          {showAttempts ? 'Ocultar entregas' : 'Ver entregas'}
        </button>
        <button
          onClick={() => setShowAddQuestion(s => !s)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
        >
          {showAddQuestion ? 'Cancelar' : '+ Agregar pregunta'}
        </button>
      </div>

      {showAttempts && (
        <div className="card overflow-hidden">
          <p className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
            Entregas ({attempts.length})
          </p>
          {attempts.length === 0 ? (
            <p className="px-4 py-6 text-gray-400 text-sm text-center">Sin entregas todavía.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {attempts.map(a => (
                <div key={a.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {a.studentFirstName || a.studentLastName
                          ? `${a.studentFirstName} ${a.studentLastName}`.trim()
                          : '(sin nombre)'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{a.studentEmail}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {a.score !== null ? (
                        <span className="text-sm font-semibold text-primary-600">
                          {a.score} / {evaluationData?.totalPoints} pts
                        </span>
                      ) : (
                        <span className="text-xs text-orange-500 font-medium">Sin calificar</span>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(a.submittedAt).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setGradingId(gradingId === a.id ? null : a.id)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                  >
                    {gradingId === a.id ? 'Cancelar' : a.score !== null ? 'Editar nota' : 'Calificar'}
                  </button>
                  {gradingId === a.id && (
                    <AttemptGradeForm
                      attempt={a}
                      totalPoints={evaluationData?.totalPoints ?? 100}
                      onSave={(score, feedback) => gradeAttempt.mutate({ attemptId: a.id, score, feedback })}
                      isPending={gradeAttempt.isPending}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddQuestion && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nueva pregunta</p>
          <textarea
            value={qForm.text}
            onChange={e => setQForm(f => ({ ...f, text: e.target.value }))}
            className="input-base resize-none"
            rows={3}
            placeholder="Enunciado de la pregunta"
            maxLength={2000}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
              <select
                value={qForm.type}
                onChange={e => setQForm(f => ({ ...f, type: e.target.value as 'TEXT' | 'MCQ' | 'TRUE_FALSE' }))}
                className="input-base"
              >
                <option value="TEXT">Texto libre</option>
                <option value="MCQ">Opción múltiple</option>
                <option value="TRUE_FALSE">Verdadero/Falso</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Puntos</label>
              <input
                type="number" min={1} value={qForm.points}
                onChange={e => setQForm(f => ({ ...f, points: Number(e.target.value) }))}
                className="input-base"
              />
            </div>
          </div>
          {qForm.type !== 'TEXT' && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Opciones</p>
              {qForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={e => setQForm(f => ({
                      ...f,
                      options: f.options.map((o, idx) => idx === i ? { ...o, isCorrect: e.target.checked } : o),
                    }))}
                    title="Es correcta"
                  />
                  <input
                    value={opt.text}
                    onChange={e => setQForm(f => ({
                      ...f,
                      options: f.options.map((o, idx) => idx === i ? { ...o, text: e.target.value } : o),
                    }))}
                    className="input-base flex-1 text-sm"
                    placeholder={`Opción ${i + 1}`}
                    maxLength={500}
                  />
                  {qForm.options.length > 2 && (
                    <button
                      onClick={() => setQForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {qForm.type === 'MCQ' && (
                <button
                  onClick={() => setQForm(f => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }))}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  + Agregar opción
                </button>
              )}
            </div>
          )}
          {qError && <p className="text-xs text-red-600">{qError}</p>}
          <button
            onClick={() => { setQError(null); addQuestion.mutate(); }}
            disabled={addQuestion.isPending || !qForm.text.trim()}
            className="btn-primary px-4 py-2 text-sm"
          >
            {addQuestion.isPending ? <Spinner size="sm" /> : 'Agregar pregunta'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{questions.length} pregunta{questions.length !== 1 ? 's' : ''}</p>
        {questions.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">No hay preguntas todavía.</p>
        )}
        {questions.map(q => (
          <EditableQuestion
            key={q.id}
            q={q}
            courseId={courseId}
            evaluationId={evaluation.id}
            token={token}
            onDelete={() => deleteQuestion.mutate(q.id)}
            deletePending={deleteQuestion.isPending}
            onRefresh={invalidateEval}
          />
        ))}
      </div>
    </div>
  );
}

function AttemptGradeForm({
  attempt, totalPoints, onSave, isPending,
}: {
  attempt: AttemptItem; totalPoints: number; onSave: (score: number, feedback: string) => void; isPending: boolean;
}) {
  const [score, setScore] = useState(attempt.score?.toString() ?? '');
  const [feedback, setFeedback] = useState(attempt.feedback ?? '');

  return (
    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <input
          type="number" min={0} max={totalPoints} value={score}
          onChange={e => setScore(e.target.value)}
          className="input-base w-20 text-sm" placeholder="0"
        />
        <span className="text-xs text-gray-400 dark:text-gray-500">/ {totalPoints} pts</span>
      </div>
      <textarea
        value={feedback} onChange={e => setFeedback(e.target.value)}
        rows={2} className="input-base resize-none text-sm"
        placeholder="Retroalimentación (opcional)"
      />
      <button
        onClick={() => onSave(Number(score), feedback)}
        disabled={isPending || !score.trim()}
        className="btn-primary px-3 py-1.5 text-xs"
      >
        {isPending ? <Spinner size="sm" /> : 'Guardar nota'}
      </button>
    </div>
  );
}

function EvaluationsSection({ courseId, token }: { courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedEval, setSelectedEval] = useState<EvaluationDetail | null>(null);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', totalPoints: 100 });
  const [error, setError] = useState<string | null>(null);

  const { data: evaluations = [], isLoading } = useQuery<EvaluationItem[]>({
    queryKey: ['teacher', 'course', courseId, 'evaluations'],
    queryFn: () => api.get(`/courses/${courseId}/evaluations`, token),
    enabled: !!courseId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'evaluations'] });

  const create = useMutation({
    mutationFn: () => api.post<EvaluationItem>(`/courses/${courseId}/evaluations`, {
      title: form.title,
      description: form.description.trim() || undefined,
      dueDate: form.dueDate || undefined,
      totalPoints: form.totalPoints,
    }, token),
    onSuccess: () => {
      setShowForm(false);
      setForm({ title: '', description: '', dueDate: '', totalPoints: 100 });
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al crear la evaluación.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${courseId}/evaluations/${id}`, token),
    onSuccess: invalidate,
  });

  const togglePublishFromList = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api.patch(`/courses/${courseId}/evaluations/${id}`, { isPublished }, token),
    onSuccess: invalidate,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  if (selectedEval) {
    return (
      <EvaluationDetailView
        evaluation={selectedEval}
        courseId={courseId}
        token={token}
        onBack={() => setSelectedEval(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{evaluations.length} evaluación{evaluations.length !== 1 ? 'es' : ''}</h2>
        <button onClick={() => { setShowForm(f => !f); setError(null); }} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium">
          {showForm ? 'Cancelar' : '+ Nueva evaluación'}
        </button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nueva evaluación</p>
          <input
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input-base" placeholder="Título (mín. 3 caracteres)" maxLength={255}
          />
          <textarea
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="input-base resize-none" rows={2} placeholder="Descripción (opcional)" maxLength={5000}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha límite</label>
              <input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Puntaje total</label>
              <input type="number" min={1} value={form.totalPoints} onChange={e => setForm(f => ({ ...f, totalPoints: Number(e.target.value) }))} className="input-base" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={() => { setError(null); create.mutate(); }}
            disabled={create.isPending || form.title.trim().length < 3}
            className="btn-primary px-4 py-2 text-sm"
          >
            {create.isPending ? <Spinner size="sm" /> : 'Crear evaluación'}
          </button>
        </div>
      )}

      {evaluations.length === 0 && !showForm ? (
        <div className="card p-8 text-center text-gray-400">
          <p>No hay evaluaciones todavía.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary-600 hover:text-primary-800 font-medium">
            Crear la primera evaluación
          </button>
        </div>
      ) : evaluations.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Título</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Vencimiento</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Puntaje</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {evaluations.map(ev => (
                <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => api.get<EvaluationDetail>(`/courses/${courseId}/evaluations/${ev.id}`, token).then(setSelectedEval)}
                      className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline text-left"
                    >
                      {ev.title}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublishFromList.mutate({ id: ev.id, isPublished: !ev.isPublished })}
                      disabled={togglePublishFromList.isPending}
                      className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${ev.isPublished ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                      {ev.isPublished ? 'Publicado' : 'Borrador'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {ev.dueDate ? new Date(ev.dueDate).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">{ev.totalPoints} pts</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove.mutate(ev.id)}
                      disabled={remove.isPending}
                      className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ─── Attendance Section ───────────────────────────────────────────────────────

interface AttendanceSessionItem {
  id: string;
  courseId: string;
  date: string;
  notes: string | null;
  createdAt: string;
}

interface AttendanceRecordItem {
  id: string;
  sessionId: string;
  studentId: string;
  status: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
}

interface AttendanceSessionDetail extends AttendanceSessionItem {
  records: AttendanceRecordItem[];
}

const attendanceStatusLabel: Record<string, string> = {
  PRESENT: 'Presente', ABSENT: 'Ausente', LATE: 'Tardanza', EXCUSED: 'Justificado',
};

function AttendanceSessionDetailView({
  session, courseId, token, onBack,
}: {
  session: AttendanceSessionDetail; courseId: string; token: string; onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: sessionData } = useQuery<AttendanceSessionDetail>({
    queryKey: ['teacher', 'course', courseId, 'attendance', session.id],
    queryFn: () => api.get(`/courses/${courseId}/attendance/${session.id}`, token),
    initialData: session,
  });

  const { data: enrollments = [] } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ['teacher', 'course', courseId, 'enrollments'],
    queryFn: () => api.get(`/courses/${courseId}/enrollments`, token),
  });

  const upsert = useMutation({
    mutationFn: ({ studentId, status }: { studentId: string; status: string }) =>
      api.patch(`/courses/${courseId}/attendance/${session.id}/records`, { studentId, status }, token),
    onSuccess: () => {
      setSaving(null);
      queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'attendance', session.id] });
    },
  });

  const records = sessionData?.records ?? [];
  const recordByStudentId = new Map(records.map(r => [r.studentId, r]));
  const activeStudents = enrollments.filter(e => e.status === 'ACTIVE').map(e => e.student);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← Volver</button>
        <div>
          <h3 className="font-semibold text-gray-900">
            Asistencia — {new Date(session.date).toLocaleDateString('es-AR')}
          </h3>
          {session.notes && <p className="text-xs text-gray-400">{session.notes}</p>}
        </div>
      </div>

      {activeStudents.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No hay alumnos inscritos activos en este curso.</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Alumno</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {activeStudents.map(student => {
                const record = recordByStudentId.get(student.id);
                return (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {student.firstName || student.lastName
                          ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()
                          : '(sin nombre)'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{student.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={record?.status ?? ''}
                          onChange={e => {
                            if (!e.target.value) return;
                            setSaving(student.id);
                            upsert.mutate({ studentId: student.id, status: e.target.value });
                          }}
                          className="input-base text-xs py-1"
                          disabled={saving === student.id}
                        >
                          <option value="">-- Sin registrar --</option>
                          <option value="PRESENT">Presente</option>
                          <option value="ABSENT">Ausente</option>
                          <option value="LATE">Tardanza</option>
                          <option value="EXCUSED">Justificado</option>
                        </select>
                        {saving === student.id && <Spinner size="sm" className="text-primary-500" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AttendanceSection({ courseId, token }: { courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSessionDetail | null>(null);
  const [form, setForm] = useState({ date: '', notes: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery<AttendanceSessionItem[]>({
    queryKey: ['teacher', 'course', courseId, 'attendance'],
    queryFn: () => api.get(`/courses/${courseId}/attendance`, token),
    enabled: !!courseId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', courseId, 'attendance'] });

  const create = useMutation({
    mutationFn: () => api.post<AttendanceSessionItem>(`/courses/${courseId}/attendance`, {
      date: form.date,
      notes: form.notes.trim() || undefined,
    }, token),
    onSuccess: () => {
      setShowForm(false);
      setForm({ date: '', notes: '' });
      invalidate();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al crear la sesión.'),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  if (selectedSession) {
    return (
      <AttendanceSessionDetailView
        session={selectedSession}
        courseId={courseId}
        token={token}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{sessions.length} sesión{sessions.length !== 1 ? 'es' : ''}</h2>
        <button onClick={() => { setShowForm(f => !f); setError(null); }} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium">
          {showForm ? 'Cancelar' : '+ Nueva sesión'}
        </button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nueva sesión de asistencia</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fecha</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-base" />
          </div>
          <input
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="input-base" placeholder="Notas (opcional)" maxLength={500}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={() => { setError(null); create.mutate(); }}
            disabled={create.isPending || !form.date}
            className="btn-primary px-4 py-2 text-sm"
          >
            {create.isPending ? <Spinner size="sm" /> : 'Crear sesión'}
          </button>
        </div>
      )}

      {sessions.length === 0 && !showForm ? (
        <div className="card p-8 text-center text-gray-400">
          <p>No hay sesiones de asistencia todavía.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary-600 hover:text-primary-800 font-medium">
            Crear la primera sesión
          </button>
        </div>
      ) : sessions.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Notas</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {new Date(s.date).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{s.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        api.get<AttendanceSessionDetail>(`/courses/${courseId}/attendance/${s.id}`, token).then(setSelectedSession)
                      }
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 border border-primary-200 dark:border-primary-800 rounded px-2 py-1 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                    >
                      Ver registros
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ─── Announcements Section ────────────────────────────────────────────────────

function AnnouncementsSection({ courseId, token }: { courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: announcements = [], isLoading } = useQuery<CourseAnnouncement[]>({
    queryKey: ['announcements', courseId],
    queryFn: () => api.get(`/courses/${courseId}/announcements`),
  });

  const create = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/announcements`, { title: title.trim(), content: content.trim() }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', courseId] });
      setTitle(''); setContent(''); setFormError(null);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Error al publicar el aviso.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${courseId}/announcements/${id}`, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements', courseId] }),
  });

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Nuevo aviso</h3>
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="input-base" placeholder="Título del aviso" maxLength={200} />
        <textarea value={content} onChange={e => setContent(e.target.value)}
          className="input-base resize-none" rows={4} placeholder="Escribí el contenido del aviso..." />
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <button onClick={() => { if (title.trim() && content.trim()) create.mutate(); }}
          disabled={create.isPending || !title.trim() || !content.trim()}
          className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
          {create.isPending ? <><Spinner size="sm" /> Publicando...</> : 'Publicar aviso'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner size="lg" className="text-primary-500" /></div>
      ) : announcements.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">No hay avisos publicados todavía.</div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{a.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(a.createdAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <div className="mt-2 prose prose-sm prose-gray dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: a.content }} />
                </div>
                <button onClick={() => remove.mutate(a.id)} disabled={remove.isPending}
                  className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Progress Section ─────────────────────────────────────────────────────────

function ProgressSection({ courseId, token }: { courseId: string; token: string }) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { data: students = [], isLoading } = useQuery<StudentProgress[]>({
    queryKey: ['teacher', 'course', courseId, 'students-progress'],
    queryFn: () => api.get(`/courses/${courseId}/students-progress`, token),
    enabled: !!courseId,
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  if (selectedStudentId) {
    return <StudentDetailPanel studentId={selectedStudentId} courseId={courseId} token={token} onBack={() => setSelectedStudentId(null)} />;
  }

  if (students.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <p>No hay alumnos inscritos activos todavía.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Alumno</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estado</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Progreso</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota general</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {students.map(s => (
            <tr key={s.enrollmentId} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => setSelectedStudentId(s.studentId)}>
              <td className="px-4 py-3">
                <p className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                  {s.firstName || s.lastName ? `${s.firstName} ${s.lastName}`.trim() : '(sin nombre)'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{s.email}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant={enrollStatusVariant[s.enrollmentStatus]}>{enrollStatusLabel[s.enrollmentStatus]}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${s.progressPercentage}%` }} />
                  </div>
                  <span className="text-xs text-gray-600 font-mono">{s.progressPercentage}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{s.completedLessons}/{s.totalLessons} lecciones</p>
              </td>
              <td className="px-4 py-3 text-right">
                {s.overallGrade !== null ? (
                  <span className={`font-semibold ${s.overallGrade >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                    {s.overallGrade}%
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Sin calificar</span>
                )}
                <div className="flex flex-col items-end gap-0.5 mt-0.5">
                  {s.grades.length > 0 && (
                    <p className="text-xs text-gray-400">{s.grades.filter(g => g.score !== null).length}/{s.grades.length} tareas</p>
                  )}
                  {s.evaluationGrades.length > 0 && (
                    <p className="text-xs text-gray-400">{s.evaluationGrades.filter(g => g.score !== null).length}/{s.evaluationGrades.length} evaluaciones</p>
                  )}
                  {s.totalXp > 0 && (
                    <p className="text-xs text-amber-500 font-medium">{s.totalXp} XP</p>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Teacher Surveys Section ──────────────────────────────────────────────────

function TeacherSurveysSection({ courseId, token }: { courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [questions, setQuestions] = useState([{ text: '', type: 'TEXT' as 'TEXT' | 'MULTIPLE_CHOICE' | 'LIKERT' | 'YES_NO', options: ['', ''] }]);
  const [error, setError] = useState<string | null>(null);
  const [viewResults, setViewResults] = useState<string | null>(null);

  const { data: surveys = [], isLoading } = useQuery<{ id: string; title: string; isOpen: boolean; isAnonymous: boolean }[]>({
    queryKey: ['teacher', 'surveys', courseId],
    queryFn: () => api.get(`/courses/${courseId}/surveys`, token),
  });

  const { data: results = [] } = useQuery<{ questionId: string; text: string; type: string; options: string[] | null; totalResponses: number; textAnswers: string[]; optionCounts: number[] }[]>({
    queryKey: ['survey-results', viewResults],
    queryFn: () => api.get(`/courses/${courseId}/surveys/${viewResults}/results`, token),
    enabled: !!viewResults,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'surveys', courseId] });

  const create = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/surveys`, {
      title, description: description.trim() || undefined, isAnonymous,
      questions: questions.map(q => ({ text: q.text, type: q.type, options: q.type !== 'TEXT' ? q.options.filter(Boolean) : undefined })),
    }, token),
    onSuccess: () => { setShowForm(false); setTitle(''); setDescription(''); setQuestions([{ text: '', type: 'TEXT', options: ['', ''] }]); invalidate(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al crear la encuesta.'),
  });

  const closeSurvey = useMutation({
    mutationFn: (id: string) => api.patch(`/courses/${courseId}/surveys/${id}/close`, undefined, token),
    onSuccess: invalidate,
  });

  const updateQ = (i: number, field: string, val: string) =>
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: val } : q));

  const updateOption = (qi: number, oi: number, val: string) =>
    setQuestions(qs => qs.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, oidx) => oidx === oi ? val : o) } : q));

  if (viewResults) {
    return (
      <div className="space-y-4 max-w-2xl">
        <button onClick={() => setViewResults(null)} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">← Volver</button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resultados de encuesta</h3>
        {results.map(q => (
          <div key={q.questionId} className="card p-4 space-y-2">
            <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{q.text}</p>
            <p className="text-xs text-gray-400">{q.totalResponses} respuesta{q.totalResponses !== 1 ? 's' : ''}</p>
            {q.options && q.optionCounts.map((count, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-48 truncate text-gray-600 dark:text-gray-300">{q.options![i]}</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: q.totalResponses > 0 ? `${(count / q.totalResponses) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
              </div>
            ))}
            {q.textAnswers.length > 0 && (
              <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mt-1">
                {q.textAnswers.slice(0, 10).map((a, i) => <li key={i} className="border-l-2 border-gray-200 dark:border-gray-600 pl-2">{a}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{surveys.length} encuesta{surveys.length !== 1 ? 's' : ''}</h2>
        <button onClick={() => { setShowForm(f => !f); setError(null); }} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 font-medium">
          {showForm ? 'Cancelar' : '+ Nueva encuesta'}
        </button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nueva encuesta</p>
          <input value={title} onChange={e => setTitle(e.target.value)} className="input-base" placeholder="Título de la encuesta" maxLength={255} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-base resize-none" rows={2} placeholder="Descripción (opcional)" />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
            Encuesta anónima
          </label>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Preguntas</p>
            {questions.map((q, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-gray-700">
                <input value={q.text} onChange={e => updateQ(i, 'text', e.target.value)} className="input-base" placeholder={`Pregunta ${i + 1}`} />
                <select value={q.type} onChange={e => updateQ(i, 'type', e.target.value)} className="input-base text-sm">
                  <option value="TEXT">Respuesta libre</option>
                  <option value="MULTIPLE_CHOICE">Opción múltiple</option>
                  <option value="LIKERT">Escala Likert (1-5)</option>
                  <option value="YES_NO">Sí / No</option>
                </select>
                {q.type === 'MULTIPLE_CHOICE' && (
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => (
                      <input key={oi} value={opt} onChange={e => updateOption(i, oi, e.target.value)}
                        className="input-base text-sm" placeholder={`Opción ${oi + 1}`} />
                    ))}
                    <button onClick={() => setQuestions(qs => qs.map((q2, idx) => idx === i ? { ...q2, options: [...q2.options, ''] } : q2))}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline">+ Agregar opción</button>
                  </div>
                )}
                {questions.length > 1 && (
                  <button onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-500 hover:text-red-700">Eliminar pregunta</button>
                )}
              </div>
            ))}
            <button onClick={() => setQuestions(qs => [...qs, { text: '', type: 'TEXT', options: ['', ''] }])}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline">+ Agregar pregunta</button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => create.mutate()} disabled={create.isPending || !title.trim() || questions.some(q => !q.text.trim())}
              className="btn-primary px-4 py-2 text-sm">
              {create.isPending ? <Spinner size="sm" /> : 'Crear encuesta'}
            </button>
          </div>
        </div>
      )}

      {surveys.length === 0 && !showForm ? (
        <div className="card p-8 text-center text-gray-400">No hay encuestas todavía.</div>
      ) : (
        <div className="space-y-2">
          {surveys.map(s => (
            <div key={s.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{s.title}</p>
                <span className={`text-xs ${s.isOpen ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  {s.isOpen ? 'Abierta' : 'Cerrada'} · {s.isAnonymous ? 'Anónima' : 'Identificada'}
                </span>
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => setViewResults(s.id)}
                  className="text-xs text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded px-2 py-1 hover:bg-primary-50 dark:hover:bg-primary-900/30">
                  Ver resultados
                </button>
                {s.isOpen && (
                  <button onClick={() => closeSurvey.mutate(s.id)}
                    className="text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Teacher Preview (vista como alumno) ─────────────────────────────────────

function TeacherPreviewTab({ course, token }: { course: Course; token: string }) {
  return (
    <EnrolledCourseView
      course={course}
      token={token}
      enrollmentStatus="ACTIVE"
      isPreview={true}
    />
  );
}

export default function TeacherCoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const { token, isLoading: sessionLoading, isAuthenticated } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'content' | 'enrollments' | 'assignments' | 'evaluations' | 'attendance' | 'forums' | 'progress' | 'announcements' | 'surveys' | 'preview'>('content');
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) router.push('/login?from=/teacher');
  }, [sessionLoading, isAuthenticated, router]);

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ['teacher', 'course', slug],
    queryFn: () => api.get(`/courses/${slug}`, token ?? undefined),
    enabled: !!token && !!slug,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
    enabled: showEdit,
  });

  const invalidateCourse = () => queryClient.invalidateQueries({ queryKey: ['teacher', 'course', slug] });

  const publishMutation = useMutation({
    mutationFn: () => api.patch(`/courses/${course!.id}/publish`, undefined, token ?? undefined),
    onSuccess: invalidateCourse,
  });
  const unpublishMutation = useMutation({
    mutationFn: () => api.patch(`/courses/${course!.id}/unpublish`, undefined, token ?? undefined),
    onSuccess: invalidateCourse,
  });
  const archiveMutation = useMutation({
    mutationFn: () => api.patch(`/courses/${course!.id}/archive`, undefined, token ?? undefined),
    onSuccess: invalidateCourse,
  });

  if (sessionLoading || courseLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;
  }

  if (!course) {
    return <div className="py-20 text-center text-red-600">Curso no encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/teacher" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← Panel docente</Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{course.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={statusVariant[course.status] ?? 'default'}>{statusLabel[course.status]}</Badge>
            {course.category && <span className="text-xs text-gray-400 dark:text-gray-500">{course.category.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {course.status === 'DRAFT' && (
            <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="btn-primary px-4 py-2 text-sm">
              {publishMutation.isPending ? <Spinner size="sm" /> : 'Publicar'}
            </button>
          )}
          {course.status === 'PUBLISHED' && (
            <>
              <button onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending} className="btn-secondary px-4 py-2 text-sm">
                {unpublishMutation.isPending ? <Spinner size="sm" /> : 'Despublicar'}
              </button>
              <button onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending} className="btn-danger px-4 py-2 text-sm">
                {archiveMutation.isPending ? <Spinner size="sm" /> : 'Archivar'}
              </button>
            </>
          )}
          <button onClick={() => setShowEdit(f => !f)} className="btn-secondary px-4 py-2 text-sm">
            {showEdit ? 'Cancelar' : 'Editar'}
          </button>
        </div>
      </div>

      {showEdit && (
        <EditCourseForm course={course} categories={categories} token={token!} onClose={() => setShowEdit(false)} />
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 overflow-x-auto">
          {([
            ['content', 'Contenido'],
            ['announcements', 'Avisos'],
            ['enrollments', 'Inscripciones'],
            ['assignments', 'Tareas'],
            ['evaluations', 'Evaluaciones'],
            ['attendance', 'Asistencias'],
            ['forums', 'Foros'],
            ['progress', 'Progreso alumnos'],
            ['surveys', 'Encuestas'],
            ['preview', '👁️ Vista de alumno'],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'content' && course.id && (
        <ContentSection courseId={course.id} token={token!} />
      )}
      {activeTab === 'announcements' && course.id && (
        <AnnouncementsSection courseId={course.id} token={token!} />
      )}
      {activeTab === 'enrollments' && course.id && (
        <EnrollmentsSection courseId={course.id} token={token!} />
      )}
      {activeTab === 'assignments' && course.id && (
        <AssignmentsSection courseId={course.id} token={token!} />
      )}
      {activeTab === 'evaluations' && course.id && (
        <EvaluationsSection courseId={course.id} token={token!} />
      )}
      {activeTab === 'attendance' && course.id && (
        <AttendanceSection courseId={course.id} token={token!} />
      )}
      {activeTab === 'forums' && course.id && (
        <ForumsSection courseId={course.id} token={token!} />
      )}
      {activeTab === 'progress' && course.id && (
        <ProgressSection courseId={course.id} token={token!} />
      )}
      {activeTab === 'surveys' && course.id && (
        <TeacherSurveysSection courseId={course.id} token={token!} />
      )}
      {activeTab === 'preview' && (
        <TeacherPreviewTab course={course} token={token!} />
      )}
    </div>
  );
}
