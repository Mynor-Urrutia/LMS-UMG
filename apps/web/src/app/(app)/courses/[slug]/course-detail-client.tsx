'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { EnrollButton } from '@/components/courses/enroll-button';
import { difficultyLabel } from '@/lib/utils';
import type {
  Course, CourseModule, Lesson, Assignment, AssignmentType,
  Submission, ForumThread, ForumThreadWithPosts, ForumPost,
  EnrollmentStatus, Evaluation, EvaluationWithQuestions, AttemptResult,
  MyAttendanceEntry, CourseAnnouncement, ReviewsResult, CourseReview,
} from '@/types/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001') + '/api/v1';

async function downloadBlob(url: string, filename: string, token: string) {
  const res = await fetch(url, { credentials: 'include', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const assignmentTypeLabel: Record<AssignmentType, string> = {
  TEXT: 'Texto', FILE: 'Archivo', QUIZ: 'Quiz', DILEMMA: 'Dilema Ético',
};

function lessonIcon(type: string) {
  return { TEXT: '📄', VIDEO: '▶', FILE: '📎', EMBED: '🔗', INFOGRAPHIC: '🖼️', CASE_STUDY: '📋' }[type] ?? '•';
}

// ─── File Content Viewer ──────────────────────────────────────────────────────

const DOCX_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const XLSX_MIMES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const PPTX_MIMES = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

function blobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function OfficeDownloadCard({ blob, filename, mimeType }: { blob: Blob; filename: string; mimeType: string }) {
  const icon = PPTX_MIMES.has(mimeType) ? '📊' : XLSX_MIMES.has(mimeType) ? '📈' : DOCX_MIMES.has(mimeType) ? '📝' : '📎';
  const label = PPTX_MIMES.has(mimeType) ? 'Presentación · Vista previa no disponible en el navegador'
    : DOCX_MIMES.has(mimeType) ? 'Documento Word' : XLSX_MIMES.has(mimeType) ? 'Hoja de cálculo Excel' : 'Archivo';
  return (
    <div className="flex items-center gap-4 p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
      <span className="text-4xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{filename}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
      </div>
      <button onClick={() => blobDownload(blob, filename)}
        className="flex-shrink-0 text-sm px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">
        Descargar
      </button>
    </div>
  );
}

function DocxViewer({ blob, filename, onFallback }: { blob: Blob; filename: string; onFallback: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    import('docx-preview').then(({ renderAsync }) =>
      renderAsync(blob, containerRef.current!, undefined, { className: 'docx', inWrapper: true, breakPages: true })
    ).catch(onFallback);
  }, [blob, onFallback]);
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-auto bg-white dark:bg-gray-900" style={{ maxHeight: '70vh' }}>
      <div ref={containerRef} />
    </div>
  );
}

function XlsxViewer({ blob, filename, onFallback }: { blob: Blob; filename: string; onFallback: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    blob.arrayBuffer().then(buf =>
      import('xlsx').then(({ read, utils }) => {
        const wb = read(buf);
        const ws = wb.Sheets[wb.SheetNames[0]];
        setHtml(utils.sheet_to_html(ws));
      })
    ).catch(onFallback);
  }, [blob, onFallback]);
  if (!html) return <div className="flex justify-center py-8"><Spinner size="lg" className="text-primary-500" /></div>;
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-auto bg-white dark:bg-gray-900" style={{ maxHeight: '70vh' }}>
      <div className="p-4 text-sm [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 dark:[&_td]:border-gray-700 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-200 dark:[&_th]:border-gray-700 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-800"
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function BlobUrlViewer({ blob, mimeType, filename }: { blob: Blob; mimeType: string; filename: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (!url) return null;
  if (mimeType.startsWith('image/')) return (
    <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <img src={url} alt={filename} className="max-w-full h-auto mx-auto block" />
    </div>
  );
  if (mimeType === 'application/pdf') return (
    <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700" style={{ height: '70vh' }}>
      <iframe src={url} className="w-full h-full" title={filename} />
    </div>
  );
  if (mimeType.startsWith('video/')) return (
    <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-black">
      <video src={url} controls className="w-full max-h-[70vh]" />
    </div>
  );
  return null;
}

function FileContentViewer({ fileId, filename: fallbackName, token }: {
  fileId: string; filename: string; token: string;
}) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; blob: Blob; mimeType: string; filename: string }
    | { status: 'error'; message: string }
  >({ status: 'loading' });
  const [renderFallback, setRenderFallback] = useState(false);

  useEffect(() => {
    setState({ status: 'loading' });
    setRenderFallback(false);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/files/${fileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setState({ status: 'error', message: 'No se pudo cargar el archivo.' }); return; }
        const mimeType = res.headers.get('Content-Type') ?? 'application/octet-stream';
        const disposition = res.headers.get('Content-Disposition') ?? '';
        const nameMatch = disposition.match(/filename\*=UTF-8''(.+)/);
        const filename = nameMatch ? decodeURIComponent(nameMatch[1]) : fallbackName;
        const blob = await res.blob();
        setState({ status: 'ready', blob, mimeType, filename });
      } catch {
        setState({ status: 'error', message: 'Error al cargar el archivo.' });
      }
    })();
  }, [fileId, token]);

  if (state.status === 'loading') return <div className="flex justify-center py-8"><Spinner size="lg" className="text-primary-500" /></div>;
  if (state.status === 'error') return <p className="text-red-500 dark:text-red-400 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">{state.message}</p>;

  const { blob, mimeType, filename } = state;

  if (mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('video/')) {
    return <BlobUrlViewer blob={blob} mimeType={mimeType} filename={filename} />;
  }

  if (DOCX_MIMES.has(mimeType) && !renderFallback) {
    return <DocxViewer blob={blob} filename={filename} onFallback={() => setRenderFallback(true)} />;
  }

  if (XLSX_MIMES.has(mimeType) && !renderFallback) {
    return <XlsxViewer blob={blob} filename={filename} onFallback={() => setRenderFallback(true)} />;
  }

  return <OfficeDownloadCard blob={blob} filename={filename} mimeType={mimeType} />;
}

// ─── Lesson Viewer ────────────────────────────────────────────────────────────

function LessonViewer({
  lesson, module: mod, courseId, token, onGoToAssignments, isPreview,
}: { lesson: Lesson; module: CourseModule; courseId: string; token: string; onGoToAssignments?: () => void; isPreview?: boolean }) {
  const queryClient = useQueryClient();
  const completedRef = useRef(new Set<string>());

  const { data: allAssignments = [] } = useQuery<Assignment[]>({
    queryKey: ['course', courseId, 'assignments'],
    queryFn: () => api.get(`/courses/${courseId}/assignments`, token),
  });
  const linkedAssignments = allAssignments.filter(a => a.lessonId === lesson.id);

  const { data: fullLesson } = useQuery<Lesson>({
    queryKey: ['course', courseId, 'lesson', lesson.id],
    queryFn: () => api.get(`/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}`, token),
  });

  const complete = useMutation({
    mutationFn: () =>
      api.post(`/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}/complete`, undefined, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', courseId, 'progress'] }),
  });

  useEffect(() => {
    if (isPreview) return;
    if (lesson.type === 'EMBED') return;
    if (completedRef.current.has(lesson.id)) return;
    completedRef.current.add(lesson.id);
    complete.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, isPreview]);

  const display = fullLesson ?? lesson;
  const isCompleted = complete.isSuccess;
  const canComplete = !complete.isPending && !isCompleted;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{mod.title}</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{display.title}</h2>
        </div>
        {isPreview ? (
          <div className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
            👁️ Vista previa
          </div>
        ) : isCompleted ? (
          <div className="flex-shrink-0 text-sm px-4 py-2 rounded-lg border bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
            ✓ Completada
          </div>
        ) : (
          <button
            onClick={() => complete.mutate()}
            disabled={!canComplete}
            className="flex-shrink-0 text-sm px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {complete.isPending ? <Spinner size="sm" /> : 'Marcar como completada'}
          </button>
        )}
      </div>

      {!fullLesson && <div className="flex justify-center py-4"><Spinner size="sm" className="text-primary-400" /></div>}

      {display.type === 'TEXT' && display.content && (
        <div
          className="prose prose-gray dark:prose-invert max-w-none leading-relaxed bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5"
          dangerouslySetInnerHTML={{ __html: display.content }}
        />
      )}
      {display.type === 'VIDEO' && display.videoUrl && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={display.videoUrl.includes('watch?v=')
              ? display.videoUrl.replace('watch?v=', 'embed/')
              : display.videoUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={display.title}
          />
        </div>
      )}
      {display.type === 'FILE' && display.fileAssetId && (
        <FileContentViewer fileId={display.fileAssetId} filename={display.title} token={token} />
      )}
      {display.type === 'EMBED' && display.embedUrl && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" style={{ minHeight: '500px' }}>
            <iframe
              src={display.embedUrl}
              className="w-full"
              style={{ height: '600px', border: 0 }}
              title={display.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              allowFullScreen
            />
          </div>
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium">¿La app no carga o ya terminaste la actividad?</p>
              <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400">
                Podés marcar esta lección como completada usando el botón de arriba. No es necesario que la app funcione para avanzar al siguiente módulo.
              </p>
            </div>
          </div>
        </div>
      )}
      {display.type === 'INFOGRAPHIC' && display.fileAssetId && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg w-fit">
            <span className="text-purple-600 dark:text-purple-400 text-sm">🖼️</span>
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Infografía</span>
          </div>
          <FileContentViewer fileId={display.fileAssetId} filename={display.title} token={token} />
        </div>
      )}
      {display.type === 'CASE_STUDY' && display.content && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg w-fit">
            <span className="text-amber-600 dark:text-amber-400 text-sm">📋</span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Caso de Estudio</span>
          </div>
          <div
            className="prose prose-gray dark:prose-invert max-w-none leading-relaxed bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5"
            dangerouslySetInnerHTML={{ __html: display.content }}
          />
        </div>
      )}
      {display.type === 'TEXT' && !display.content && fullLesson && (
        <p className="text-gray-400 italic text-sm">Esta lección no tiene contenido todavía.</p>
      )}

      {linkedAssignments.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              📝 Actividades de esta lección
            </h3>
            {onGoToAssignments && (
              <button
                onClick={onGoToAssignments}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Ver todas las tareas →
              </button>
            )}
          </div>
          <div className="space-y-3">
            {linkedAssignments.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">
                    {a.type === 'QUIZ' ? '🧠' : a.type === 'DILEMMA' ? '⚖️' : a.type === 'FILE' ? '📎' : '✍️'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary-700 dark:text-primary-300 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{a.maxScore} pts · {assignmentTypeLabel[a.type]}</p>
                  </div>
                </div>
                {onGoToAssignments && (
                  <button
                    onClick={onGoToAssignments}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
                  >
                    Ir a la actividad →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Content Tab ──────────────────────────────────────────────────────────────

function ContentTab({ courseId, token, onGoToAssignments, isPreview }: { courseId: string; token: string; onGoToAssignments?: () => void; isPreview?: boolean }) {
  const [selected, setSelected] = useState<{ lesson: Lesson; module: CourseModule } | null>(null);

  const { data: modules = [], isLoading } = useQuery<CourseModule[]>({
    queryKey: ['course', courseId, 'modules'],
    queryFn: () => api.get(`/courses/${courseId}/modules`, token),
  });

  useEffect(() => {
    if (modules.length > 0 && !selected) {
      for (const mod of modules) {
        const first = mod.lessons.find(l => l.isPublished);
        if (first) { setSelected({ lesson: first, module: mod }); break; }
      }
    }
  }, [modules, selected]);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>;

  const published = modules.flatMap(m => m.lessons.filter(l => l.isPublished));
  if (published.length === 0) {
    return <p className="text-gray-400 dark:text-gray-500 text-center py-12">El contenido del curso todavía no está disponible.</p>;
  }

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 space-y-4">
        {modules.map(mod => {
          const vis = mod.lessons.filter(l => l.isPublished);
          if (!vis.length) return null;
          const isLocked = (mod as any).isLocked === true;
          return (
            <div key={mod.id}>
              <div className="flex items-center justify-between px-2 mb-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  {isLocked && <span title="Completá el módulo anterior para desbloquear">🔒</span>}
                  {mod.title}
                </p>
                {!isLocked && (
                  <a
                    href={`${API_BASE}/courses/${courseId}/modules/${mod.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Descargar módulo en PDF"
                    className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-xs"
                    onClick={e => {
                      e.preventDefault();
                      fetch(`${API_BASE}/courses/${courseId}/modules/${mod.id}/pdf`, {
                        headers: { Authorization: `Bearer ${token}` },
                        credentials: 'include',
                      }).then(r => r.blob()).then(blob => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `modulo-${mod.order}.pdf`;
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
                      });
                    }}
                  >
                    📄
                  </a>
                )}
              </div>
              {isLocked ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 px-2 italic">Módulo bloqueado — completá el anterior primero.</p>
              ) : (
                <div className="space-y-0.5">
                  {vis.map(lesson => {
                    const active = selected?.lesson.id === lesson.id;
                    return (
                      <button key={lesson.id}
                        onClick={() => setSelected({ lesson, module: mod })}
                        className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-primary-100 text-primary-800 font-medium dark:bg-primary-900/40 dark:text-primary-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                        <span className="mr-2">{lessonIcon(lesson.type)}</span>
                        {lesson.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      {/* Viewer */}
      <div className="flex-1 min-w-0">
        {selected
          ? <LessonViewer lesson={selected.lesson} module={selected.module} courseId={courseId} token={token} onGoToAssignments={onGoToAssignments} isPreview={isPreview} />
          : <p className="text-gray-400 dark:text-gray-500 italic text-sm">Seleccioná una lección para comenzar.</p>
        }
      </div>
    </div>
  );
}

// ─── Assignment Card ──────────────────────────────────────────────────────────

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

function AssignmentCard({ assignment, courseId, token }: {
  assignment: Assignment; courseId: string; token: string;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: submissions = [], isLoading: loadingSubs } = useQuery<Submission[]>({
    queryKey: ['course', courseId, 'assignment', assignment.id, 'submissions'],
    queryFn: () => api.get(`/courses/${courseId}/assignments/${assignment.id}/submissions`, token),
    enabled: expanded,
  });

  const mySubmission = submissions[0] ?? null;

  const submit = useMutation({
    mutationFn: (body: { textContent?: string; fileAssetId?: string }) =>
      api.post<Submission>(`/courses/${courseId}/assignments/${assignment.id}/submissions`, body, token),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['course', courseId, 'assignment', assignment.id, 'submissions'] });
    },
  });

  async function handleFileSubmit(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const asset = await api.upload<{ id: string }>('/files', formData, token);
      await submit.mutateAsync({ fileAssetId: asset.id });
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Error al subir el archivo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const isQuiz = assignment.type === 'QUIZ';
  const isFile = assignment.type === 'FILE';

  return (
    <div className="card overflow-hidden">
      <button className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                {assignmentTypeLabel[assignment.type]}
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{assignment.title}</span>
            </div>
            {assignment.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{assignment.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{assignment.maxScore} pts</p>
            {assignment.dueDate && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Vence: {new Date(assignment.dueDate).toLocaleDateString('es-AR')}
              </p>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 space-y-3">
          {loadingSubs ? (
            <div className="flex justify-center py-4"><Spinner size="sm" className="text-primary-500" /></div>
          ) : mySubmission ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-medium">✓ Entregado</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(mySubmission.submittedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  {mySubmission.isLate && <span className="ml-1 text-orange-500">(con retraso)</span>}
                </span>
              </div>
              {mySubmission.textContent && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {mySubmission.textContent}
                </div>
              )}
              {mySubmission.fileAssetId && (
                <button
                  onClick={() => downloadFile(mySubmission.fileAssetId!, token)}
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                >
                  📎 Descargar archivo entregado
                </button>
              )}
            </div>
          ) : isQuiz ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Los quizzes se completarán directamente en las lecciones.</p>
          ) : isFile ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subir archivo</label>
              <p className="text-xs text-gray-400 dark:text-gray-500">Formatos permitidos: JPG, PNG, PDF, MP4 · Máximo 50 MB</p>
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSubmit(file);
                }}
                className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-300 cursor-pointer"
                disabled={uploading}
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Spinner size="sm" className="text-primary-500" /> Subiendo archivo...
                </div>
              )}
              {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tu respuesta</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={4}
                maxLength={50000}
                placeholder="Escribí tu respuesta aquí..."
                className="input-base resize-none"
              />
              {submit.isError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {submit.error instanceof ApiError ? submit.error.message : 'Error al enviar.'}
                </p>
              )}
              <button
                onClick={() => submit.mutate({ textContent: text })}
                disabled={submit.isPending || !text.trim()}
                className="btn-primary px-4 py-2 text-sm"
              >
                {submit.isPending ? <Spinner size="sm" /> : 'Entregar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────

function AssignmentsTab({ courseId, token }: { courseId: string; token: string }) {
  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['course', courseId, 'assignments'],
    queryFn: () => api.get(`/courses/${courseId}/assignments`, token),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>;
  if (assignments.length === 0) {
    return <p className="text-gray-400 dark:text-gray-500 text-center py-12">No hay tareas asignadas todavía.</p>;
  }

  return (
    <div className="space-y-3">
      {assignments.map(a => (
        <AssignmentCard key={a.id} assignment={a} courseId={courseId} token={token} />
      ))}
    </div>
  );
}

// ─── Thread Detail ────────────────────────────────────────────────────────────

function PostItem({ post, isLocked, courseId, threadId, token, onPosted }: {
  post: ForumPost;
  isLocked: boolean;
  courseId: string;
  threadId: string;
  token: string;
  onPosted: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const replyMut = useMutation({
    mutationFn: () =>
      api.post<ForumPost>(`/courses/${courseId}/threads/${threadId}/posts`, { content: text, parentId: post.id }, token),
    onSuccess: () => {
      setText('');
      setReplyOpen(false);
      setError(null);
      onPosted();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al responder.'),
  });

  return (
    <div className="card p-4 space-y-2">
      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{post.content}</p>
      <div className="flex items-center gap-3 flex-wrap">
        {post.authorName && (
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{post.authorName}</span>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(post.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
        {!isLocked && (
          <button
            onClick={() => setReplyOpen(o => !o)}
            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
          >
            {replyOpen ? 'Cancelar' : 'Responder'}
          </button>
        )}
      </div>
      {replyOpen && (
        <div className="pt-2 space-y-2 border-t border-gray-100 dark:border-gray-700">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            maxLength={10000}
            placeholder="Escribí tu respuesta..."
            className="input-base resize-none text-sm"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            onClick={() => replyMut.mutate()}
            disabled={replyMut.isPending || !text.trim()}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            {replyMut.isPending ? <Spinner size="sm" /> : 'Publicar respuesta'}
          </button>
        </div>
      )}
    </div>
  );
}

function ThreadDetail({ thread, courseId, token, onBack }: {
  thread: ForumThread; courseId: string; token: string; onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ForumThreadWithPosts>({
    queryKey: ['course', courseId, 'thread', thread.id],
    queryFn: () => api.get(`/courses/${courseId}/threads/${thread.id}`, token),
  });

  const postToThread = useMutation({
    mutationFn: () =>
      api.post<ForumPost>(`/courses/${courseId}/threads/${thread.id}/posts`, { content: reply }, token),
    onSuccess: () => {
      setReply('');
      setReplyError(null);
      queryClient.invalidateQueries({ queryKey: ['course', courseId, 'thread', thread.id] });
      queryClient.invalidateQueries({ queryKey: ['course', courseId, 'threads'] });
    },
    onError: (err) => setReplyError(err instanceof ApiError ? err.message : 'Error al responder.'),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['course', courseId, 'thread', thread.id] });
    queryClient.invalidateQueries({ queryKey: ['course', courseId, 'threads'] });
  }

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
      ) : (
        <div className="space-y-3">
          {topLevel.length === 0 && (
            <p className="text-gray-400 text-sm italic text-center py-6">Sin respuestas todavía.</p>
          )}
          {topLevel.map(p => (
            <div key={p.id}>
              <PostItem
                post={p}
                isLocked={thread.isLocked}
                courseId={courseId}
                threadId={thread.id}
                token={token}
                onPosted={refresh}
              />
              {(repliesMap.get(p.id) ?? []).map(reply => (
                <div key={reply.id} className="ml-6 mt-2">
                  <PostItem
                    post={reply}
                    isLocked={thread.isLocked}
                    courseId={courseId}
                    threadId={thread.id}
                    token={token}
                    onPosted={refresh}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!thread.isLocked && (
        <div className="card p-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Responder al hilo</label>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            maxLength={10000}
            placeholder="Escribí tu respuesta..."
            className="input-base resize-none"
          />
          {replyError && <p className="text-xs text-red-600 dark:text-red-400">{replyError}</p>}
          <button
            onClick={() => postToThread.mutate()}
            disabled={postToThread.isPending || !reply.trim()}
            className="btn-primary px-4 py-2 text-sm"
          >
            {postToThread.isPending ? <Spinner size="sm" /> : 'Publicar'}
          </button>
        </div>
      )}
      {thread.isLocked && (
        <p className="text-sm text-gray-400 italic text-center">Este hilo está cerrado y no acepta nuevas respuestas.</p>
      )}
    </div>
  );
}

// ─── Forum Tab ────────────────────────────────────────────────────────────────

function ForumTab({ courseId, token }: { courseId: string; token: string }) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const canCreateThread = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const [openThread, setOpenThread] = useState<ForumThread | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: threads = [], isLoading } = useQuery<ForumThread[]>({
    queryKey: ['course', courseId, 'threads'],
    queryFn: () => api.get(`/courses/${courseId}/threads`, token),
  });

  const createThread = useMutation({
    mutationFn: () => api.post<ForumThread>(`/courses/${courseId}/threads`, { title: newTitle }, token),
    onSuccess: () => {
      setShowForm(false);
      setNewTitle('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['course', courseId, 'threads'] });
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Error al crear el hilo.'),
  });

  if (openThread) {
    return (
      <ThreadDetail
        thread={openThread}
        courseId={courseId}
        token={token}
        onBack={() => setOpenThread(null)}
      />
    );
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Foro del curso</h3>
        {canCreateThread && (
          <button onClick={() => { setShowForm(f => !f); setFormError(null); }}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium">
            {showForm ? 'Cancelar' : '+ Nuevo hilo'}
          </button>
        )}
      </div>

      {canCreateThread && showForm && (
        <div className="card p-4 space-y-3">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
            className="input-base" placeholder="Título del hilo (mín. 3 caracteres)" maxLength={255} />
          {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
          <button onClick={() => createThread.mutate()}
            disabled={createThread.isPending || newTitle.trim().length < 3}
            className="btn-primary px-4 py-2 text-sm">
            {createThread.isPending ? <Spinner size="sm" /> : 'Publicar hilo'}
          </button>
        </div>
      )}

      {threads.length === 0 && !showForm ? (
        <p className="text-gray-400 dark:text-gray-500 text-center py-12">
          {canCreateThread ? 'No hay hilos todavía. Creá el primero.' : 'El profesor todavía no abrió ningún hilo de discusión.'}
        </p>
      ) : (
        <div className="space-y-2">
          {threads.map(t => (
            <button key={t.id} onClick={() => setOpenThread(t)}
              className="w-full card p-4 text-left hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  {t.isPinned && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded flex-shrink-0">Fijado</span>}
                  {t.isLocked && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded flex-shrink-0">Cerrado</span>}
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{t.title}</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {t.postCount} respuesta{t.postCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {new Date(t.createdAt).toLocaleDateString('es-AR')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Calificaciones Tab ───────────────────────────────────────────────────────

const attendanceStatusLabel: Record<string, string> = {
  PRESENT: 'Presente', ABSENT: 'Ausente', LATE: 'Tardanza', EXCUSED: 'Justificado',
};
const attendanceStatusClass: Record<string, string> = {
  PRESENT: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  ABSENT: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  LATE: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  EXCUSED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
};

interface EvaluationItem {
  id: string;
  title: string;
  totalPoints: number;
  dueDate: string | null;
}

interface AttendanceItem {
  sessionId: string;
  date: string;
  status: string;
}

function GradesTab({ courseId, token }: { courseId: string; token: string }) {
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['course', courseId, 'assignments'],
    queryFn: () => api.get(`/courses/${courseId}/assignments`, token),
  });

  const { data: evaluations = [] } = useQuery<EvaluationItem[]>({
    queryKey: ['course', courseId, 'evaluations'],
    queryFn: () => api.get(`/courses/${courseId}/evaluations`, token),
  });

  const { data: attendance = [] } = useQuery<AttendanceItem[]>({
    queryKey: ['course', courseId, 'my-attendance'],
    queryFn: () => api.get(`/courses/${courseId}/attendance/my-attendance`, token),
  });

  // Fetch submissions for each assignment (one request per assignment, keyed on assignment ids)
  const assignmentIds = assignments.map(a => a.id);
  const { data: allSubmissions = [] } = useQuery<{ assignmentId: string; id: string; grade?: { score: number; maxScore: number; feedback: string | null } | null; submittedAt: string }[]>({
    queryKey: ['course', courseId, 'my-submissions', assignmentIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        assignments.map(a =>
          api.get<{ id: string; grade?: { score: number; maxScore: number; feedback: string | null } | null; submittedAt: string }[]>(
            `/courses/${courseId}/assignments/${a.id}/submissions`, token
          ).then(subs => subs.map(s => ({ ...s, assignmentId: a.id })))
        )
      );
      return results.flat();
    },
    enabled: assignments.length > 0,
  });

  const submissionByAssignment = new Map(
    allSubmissions.map(s => [s.assignmentId, s])
  );

  return (
    <div className="space-y-8">
      {/* Tareas */}
      <section>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Tareas</h3>
        {assignments.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay tareas asignadas.</p>
        ) : (() => {
          let totalEarned = 0;
          let totalMax = 0;
          assignments.forEach(a => {
            const sub = submissionByAssignment.get(a.id);
            if (sub?.grade) { totalEarned += sub.grade.score; totalMax += sub.grade.maxScore; }
            else { totalMax += a.maxScore; }
          });
          const totalPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : null;
          return (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Tarea</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Entregado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Nota</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {assignments.map(a => {
                    const sub = submissionByAssignment.get(a.id);
                    const pct = sub?.grade ? Math.round((sub.grade.score / sub.grade.maxScore) * 100) : null;
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{a.title}</p>
                          {sub?.grade?.feedback && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">"{sub.grade.feedback}"</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{a.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          {sub ? (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                              {new Date(sub.submittedAt).toLocaleDateString('es-AR')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Pendiente</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {sub?.grade ? (
                            <span className="font-semibold text-primary-600 dark:text-primary-400">
                              {sub.grade.score} / {sub.grade.maxScore}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {pct !== null ? (
                            <span className={`text-xs font-semibold ${pct >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {pct}%
                            </span>
                          ) : <span className="text-xs text-gray-400 dark:text-gray-500">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-semibold">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300" colSpan={3}>Total tareas</td>
                    <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-100">{totalEarned} / {totalMax}</td>
                    <td className="px-4 py-3 text-right">
                      {totalPct !== null ? (
                        <span className={totalPct >= 60 ? 'text-green-600' : 'text-red-500'}>{totalPct}%</span>
                      ) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}
      </section>

      {/* Evaluaciones */}
      <section>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Evaluaciones</h3>
        {evaluations.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">No hay evaluaciones asignadas.</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Evaluación</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Vencimiento</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Puntaje máx.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {evaluations.map(ev => (
                  <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{ev.title}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {ev.dueDate ? new Date(ev.dueDate).toLocaleDateString('es-AR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">{ev.totalPoints} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Asistencias */}
      <section>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Asistencias</h3>
        {attendance.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">No hay registros de asistencia todavía.</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {attendance.map(r => (
                  <tr key={r.sessionId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {new Date(r.date).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${attendanceStatusClass[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {attendanceStatusLabel[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Evaluations Tab ──────────────────────────────────────────────────────────

type EvalView =
  | { mode: 'list' }
  | { mode: 'take'; evaluation: EvaluationWithQuestions }
  | { mode: 'result'; result: AttemptResult };

function EvaluationResult({ result, onBack }: { result: AttemptResult; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← Volver</button>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{result.evaluationTitle}</h3>
        {result.hasPendingQuestions && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300">
            Hay preguntas de desarrollo pendientes de calificación. Este no es tu resultado final.
          </div>
        )}
        <div className="flex items-center gap-8">
          {result.percentage !== null && (
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{result.percentage}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Porcentaje</p>
            </div>
          )}
          {result.score !== null ? (
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{result.score} / {result.totalPoints}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Puntaje</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">Pendiente</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Resultado final</p>
            </div>
          )}
        </div>
        {result.feedback && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 italic">"{result.feedback}"</div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-gray-800 dark:text-gray-100">Detalle por pregunta</h4>
        {result.questions.map((q, i) => {
          const isCorrect = !q.isPending && q.earnedPoints === q.points && q.points > 0;
          const borderColor = q.isPending
            ? 'border-yellow-400'
            : isCorrect
            ? 'border-green-400'
            : 'border-red-400';
          return (
            <div key={q.questionId} className={`card p-4 space-y-2 border-l-4 ${borderColor}`}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {i + 1}. {q.questionText}
                </p>
                {q.isPending ? (
                  <span className="flex-shrink-0 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded font-medium">
                    Pendiente de calificación
                  </span>
                ) : (
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded font-medium ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    {q.earnedPoints ?? 0} / {q.points} pts
                  </span>
                )}
              </div>
              {q.type === 'TEXT' && q.textAnswer && (
                <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2 whitespace-pre-wrap">{q.textAnswer}</p>
              )}
              {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && q.selectedIds && (
                <div className="text-xs space-y-1">
                  {q.selectedIds.map(sid => {
                    const correct = q.correctIds?.includes(sid);
                    return (
                      <span key={sid} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${correct ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                        {correct ? '✓' : '✗'} Tu respuesta
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TakeEvaluation({ evaluation, courseId, token, onBack, onDone }: {
  evaluation: EvaluationWithQuestions;
  courseId: string;
  token: string;
  onBack: () => void;
  onDone: (result: AttemptResult) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, { textAnswer?: string; selectedIds?: string[] }>>({});
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const answersPayload = Object.entries(answers).map(([questionId, ans]) => ({
        questionId,
        ...(ans.textAnswer !== undefined && { textAnswer: ans.textAnswer }),
        ...(ans.selectedIds !== undefined && { selectedIds: ans.selectedIds }),
      }));
      await api.post(
        `/courses/${courseId}/evaluations/${evaluation.id}/attempt`,
        { answers: answersPayload },
        token,
      );
      return api.get<AttemptResult>(
        `/courses/${courseId}/evaluations/${evaluation.id}/my-attempt`,
        token,
      );
    },
    onSuccess: onDone,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al enviar la evaluación.'),
  });

  const sorted = [...evaluation.questions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← Volver</button>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{evaluation.title}</h3>
        {evaluation.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{evaluation.description}</p>}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Puntaje total: {evaluation.totalPoints} pts</p>
      </div>

      <div className="space-y-4">
        {sorted.map((q, i) => {
          const ans = answers[q.id] ?? {};
          const sortedOpts = [...q.options].sort((a, b) => a.order - b.order);
          return (
            <div key={q.id} className="card p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {i + 1}. {q.text}
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">{q.points} pts</span>
              </p>
              {q.type === 'TEXT' && (
                <textarea
                  value={ans.textAnswer ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: { textAnswer: e.target.value } }))}
                  rows={4}
                  placeholder="Escribí tu respuesta..."
                  className="input-base resize-none text-sm"
                />
              )}
              {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && (
                <div className="space-y-2">
                  {sortedOpts.map(opt => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.id}
                        checked={ans.selectedIds?.[0] === opt.id}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: { selectedIds: [opt.id] } }))}
                        className="text-primary-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        onClick={() => submit.mutate()}
        disabled={submit.isPending}
        className="btn-primary px-6 py-2 text-sm"
      >
        {submit.isPending ? <Spinner size="sm" /> : 'Enviar evaluación'}
      </button>
    </div>
  );
}

function EvaluationCard({ evaluation, courseId, token, isStarting, onTake, onViewResult }: {
  evaluation: Evaluation;
  courseId: string;
  token: string;
  isStarting: boolean;
  onTake: () => void;
  onViewResult: (result: AttemptResult) => void;
}) {
  const { data: attempt, isLoading: loadingAttempt } = useQuery<AttemptResult | null>({
    queryKey: ['course', courseId, 'evaluation', evaluation.id, 'my-attempt'],
    queryFn: () =>
      api.get<AttemptResult>(`/courses/${courseId}/evaluations/${evaluation.id}/my-attempt`, token)
        .catch(() => null),
  });

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">{evaluation.title}</h4>
          {evaluation.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{evaluation.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span>{evaluation.totalPoints} pts</span>
            {evaluation.dueDate && (
              <span>Vence: {new Date(evaluation.dueDate).toLocaleDateString('es-AR')}</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          {loadingAttempt ? (
            <Spinner size="sm" className="text-primary-500" />
          ) : attempt ? (
            <button
              onClick={() => onViewResult(attempt)}
              className="text-sm px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
            >
              Ver resultado
            </button>
          ) : (
            <button onClick={onTake} disabled={isStarting} className="btn-primary px-4 py-2 text-sm">
              {isStarting ? <Spinner size="sm" /> : 'Tomar evaluación'}
            </button>
          )}
        </div>
      </div>
      {attempt && (
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          {attempt.percentage !== null && (
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{attempt.percentage}%</span>
          )}
          {attempt.score !== null && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{attempt.score} / {attempt.totalPoints} pts</span>
          )}
          {attempt.hasPendingQuestions && (
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">Pendiente de calificación</span>
          )}
        </div>
      )}
    </div>
  );
}

function EvaluationsTab({ courseId, token }: { courseId: string; token: string }) {
  const [view, setView] = useState<EvalView>({ mode: 'list' });
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: evaluations = [], isLoading } = useQuery<Evaluation[]>({
    queryKey: ['course', courseId, 'evaluations'],
    queryFn: () => api.get(`/courses/${courseId}/evaluations`, token),
  });

  async function handleTake(ev: Evaluation) {
    setLoadingId(ev.id);
    try {
      const full = await api.get<EvaluationWithQuestions>(`/courses/${courseId}/evaluations/${ev.id}`, token);
      setView({ mode: 'take', evaluation: full });
    } finally {
      setLoadingId(null);
    }
  }

  if (view.mode === 'take') {
    return (
      <TakeEvaluation
        evaluation={view.evaluation}
        courseId={courseId}
        token={token}
        onBack={() => setView({ mode: 'list' })}
        onDone={(result) => setView({ mode: 'result', result })}
      />
    );
  }

  if (view.mode === 'result') {
    return <EvaluationResult result={view.result} onBack={() => setView({ mode: 'list' })} />;
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>;
  if (evaluations.length === 0) {
    return <p className="text-gray-400 dark:text-gray-500 text-center py-12">No hay evaluaciones disponibles todavía.</p>;
  }

  return (
    <div className="space-y-3">
      {evaluations.map(ev => (
        <EvaluationCard
          key={ev.id}
          evaluation={ev}
          courseId={courseId}
          token={token}
          isStarting={loadingId === ev.id}
          onTake={() => handleTake(ev)}
          onViewResult={(result) => setView({ mode: 'result', result })}
        />
      ))}
    </div>
  );
}

// ─── Public Course View (non-enrolled) ────────────────────────────────────────

function PublicCourseView({ course, slug }: { course: Course; slug: string }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="info">{difficultyLabel(course.difficulty)}</Badge>
            {course.category && <Badge>{course.category.name}</Badge>}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{course.title}</h1>
          {course.description && (
            <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed">{course.description}</p>
          )}
          {course.teacher && (
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              Por {course.teacher.firstName} {course.teacher.lastName}
            </p>
          )}
        </div>
        {course._count && (
          <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{course._count.modules} módulo{course._count.modules !== 1 ? 's' : ''}</span>
          </div>
        )}
        <AnnouncementsPanel courseId={course.id} />
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">Reseñas</h2>
          <ReviewsTab courseId={course.id} canReview={false} />
        </div>
      </div>
      <div>
        <div className="card p-5 space-y-4">
          <p className="text-center text-2xl font-semibold text-green-600">Gratis</p>
          <EnrollButton courseId={course.id} enrollmentType={course.enrollmentType} enrolled={false} />
          <dl className="space-y-2 text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
            {course._count?.modules !== undefined && (
              <div className="flex justify-between">
                <dt>Módulos</dt>
                <dd className="font-medium">{course._count.modules}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Nivel</dt>
              <dd className="font-medium">{difficultyLabel(course.difficulty)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

// ─── Announcements Panel (visible para todos) ─────────────────────────────────

function AnnouncementsPanel({ courseId }: { courseId: string }) {
  const { data: announcements = [], isLoading } = useQuery<CourseAnnouncement[]>({
    queryKey: ['announcements', courseId],
    queryFn: () => api.get(`/courses/${courseId}/announcements`),
    staleTime: 60_000,
  });

  if (isLoading) return null;
  if (announcements.length === 0) return null;

  return (
    <div className="space-y-3">
      {announcements.map(a => (
        <div key={a.id} className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">📢</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{a.title}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {a.authorName && `${a.authorName} · `}
                {new Date(a.createdAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-1.5 prose prose-sm prose-gray dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: a.content }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnnouncementsTab({ courseId }: { courseId: string }) {
  const { data: announcements = [], isLoading } = useQuery<CourseAnnouncement[]>({
    queryKey: ['announcements', courseId],
    queryFn: () => api.get(`/courses/${courseId}/announcements`),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;
  }

  if (announcements.length === 0) {
    return (
      <div className="card p-10 text-center text-gray-400 dark:text-gray-500">
        <p className="text-2xl mb-2">📢</p>
        <p>No hay avisos publicados todavía.</p>
        <p className="text-xs mt-1">El catedrático publicará novedades del curso aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map(a => (
        <div key={a.id} className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5 text-lg">📢</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{a.title}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {a.authorName && `${a.authorName} · `}
                {new Date(a.createdAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-1.5 prose prose-sm prose-gray dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: a.content }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <span className="text-yellow-400">
      {[1,2,3,4,5].map(i => <span key={i}>{i <= value ? '★' : '☆'}</span>)}
    </span>
  );
}

function ReviewsTab({ courseId, token, canReview }: { courseId: string; token?: string; canReview: boolean }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery<ReviewsResult>({
    queryKey: ['reviews', courseId],
    queryFn: async () => {
      const empty: ReviewsResult = { items: [], total: 0, avgRating: null };
      try {
        if (token) return (await api.get(`/courses/${courseId}/reviews?limit=50`, token)) as ReviewsResult;
        const res = await fetch(`${API_BASE}/courses/${courseId}/reviews?limit=50`);
        if (!res.ok) return empty;
        return (await res.json()) as ReviewsResult;
      } catch {
        return empty;
      }
    },
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/reviews`, { rating, comment: comment || undefined }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', courseId] });
      setShowForm(false); setComment(''); setRating(5);
    },
  });

  const remove = useMutation({
    mutationFn: (reviewId: string) => api.delete(`/courses/${courseId}/reviews/${reviewId}`, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', courseId] }),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  const myReview = token ? data?.items.find(r => r.studentId) : undefined;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{data?.avgRating?.toFixed(1) ?? '—'}</div>
        <div>
          {data?.avgRating && <StarRating value={Math.round(data.avgRating)} />}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{data?.total ?? 0} {data?.total === 1 ? 'reseña' : 'reseñas'}</p>
        </div>
        {canReview && !myReview && (
          <button onClick={() => setShowForm(v => !v)} className="ml-auto btn-primary text-sm">
            {showForm ? 'Cancelar' : 'Escribir reseña'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && canReview && (
        <div className="card p-5 space-y-3">
          <div className="flex gap-2">
            {[1,2,3,4,5].map(i => (
              <button key={i} onClick={() => setRating(i)}
                className={`text-2xl ${i <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}>★</button>
            ))}
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
            placeholder="Comentario (opcional)" maxLength={2000}
            className="input-base w-full resize-none" />
          <div className="flex justify-end">
            <button onClick={() => submit.mutate()} disabled={submit.isPending}
              className="btn-primary text-sm disabled:opacity-50">
              {submit.isPending ? 'Enviando…' : 'Publicar reseña'}
            </button>
          </div>
          {submit.isError && <p className="text-sm text-red-600 dark:text-red-400">Error al publicar la reseña.</p>}
        </div>
      )}

      {/* List */}
      {!data?.items?.length ? (
        <p className="text-center text-gray-400 py-8">Este curso todavía no tiene reseñas.</p>
      ) : (
        <div className="space-y-3">
          {data.items.map((r: CourseReview) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {r.student ? `${r.student.firstName} ${r.student.lastName}`.trim() : 'Estudiante'}
                  </p>
                  <StarRating value={r.rating} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(r.createdAt).toLocaleDateString('es-GT')}</span>
                  {token && r.studentId && (
                    <button onClick={() => remove.mutate(r.id)}
                      className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                  )}
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Surveys Tab ─────────────────────────────────────────────────────────────

function SurveysTab({ courseId, token }: { courseId: string; token: string }) {
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { text?: string; selected?: number[] }>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: surveys = [], isLoading } = useQuery<{ id: string; title: string; description: string | null; isOpen: boolean }[]>({
    queryKey: ['surveys', courseId],
    queryFn: () => api.get(`/courses/${courseId}/surveys`, token),
  });

  const { data: surveyDetail } = useQuery<{ survey: { id: string; title: string; isAnonymous: boolean }; questions: { id: string; text: string; type: string; options: string[] | null; order: number }[] }>({
    queryKey: ['survey', selectedSurvey],
    queryFn: () => api.get(`/courses/${courseId}/surveys/${selectedSurvey}`, token),
    enabled: !!selectedSurvey,
  });

  const submit = useMutation({
    mutationFn: () => {
      const answersArray = Object.entries(answers).map(([questionId, ans]) => ({ questionId, ...ans }));
      return api.post(`/courses/${courseId}/surveys/${selectedSurvey}/responses`, { answers: answersArray }, token);
    },
    onSuccess: () => { setSubmitted(selectedSurvey); setSelectedSurvey(null); setAnswers({}); setError(null); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al enviar la respuesta.'),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  if (surveys.length === 0) {
    return <p className="text-gray-400 dark:text-gray-500 text-center py-12">No hay encuestas disponibles en este curso.</p>;
  }

  if (selectedSurvey && surveyDetail) {
    return (
      <div className="space-y-5 max-w-2xl">
        <button onClick={() => { setSelectedSurvey(null); setAnswers({}); setError(null); }}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline">← Volver a encuestas</button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{surveyDetail.survey.title}</h3>
        {surveyDetail.survey.isAnonymous && (
          <p className="text-xs text-gray-400 italic">Esta encuesta es anónima — tus respuestas no se asocian a tu nombre.</p>
        )}
        <div className="space-y-6">
          {surveyDetail.questions.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{i + 1}. {q.text}</p>
              {q.type === 'TEXT' && (
                <textarea rows={3} className="input-base resize-none"
                  value={answers[q.id]?.text ?? ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: { text: e.target.value } }))}
                  placeholder="Tu respuesta..." />
              )}
              {(q.type === 'MULTIPLE_CHOICE' || q.type === 'YES_NO') && q.options && (
                <div className="space-y-1.5">
                  {q.options.map((opt, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={q.id} checked={(answers[q.id]?.selected ?? [])[0] === idx}
                        onChange={() => setAnswers(a => ({ ...a, [q.id]: { selected: [idx] } }))} />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'LIKERT' && (
                <div className="flex gap-3 flex-wrap">
                  {[1, 2, 3, 4, 5].map(n => (
                    <label key={n} className="flex flex-col items-center gap-1 text-xs cursor-pointer">
                      <input type="radio" name={q.id} checked={(answers[q.id]?.selected ?? [])[0] === n - 1}
                        onChange={() => setAnswers(a => ({ ...a, [q.id]: { selected: [n - 1] } }))} />
                      {n}
                    </label>
                  ))}
                  <span className="text-xs text-gray-400 self-end ml-1">← Muy en desacuerdo · Muy de acuerdo →</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button onClick={() => submit.mutate()} disabled={submit.isPending}
          className="btn-primary px-5 py-2 text-sm">
          {submit.isPending ? <Spinner size="sm" /> : 'Enviar respuestas'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submitted && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-800 dark:text-green-300">
          ¡Gracias! Tu respuesta fue registrada.
        </div>
      )}
      {surveys.map(s => (
        <div key={s.id} className="card p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{s.title}</p>
            {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
            {!s.isOpen && <span className="text-xs text-gray-400 italic">Cerrada</span>}
          </div>
          {s.isOpen && s.id !== submitted && (
            <button onClick={() => setSelectedSurvey(s.id)}
              className="btn-primary px-4 py-2 text-sm ml-4 whitespace-nowrap">
              Responder
            </button>
          )}
          {s.id === submitted && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium ml-4">✓ Respondida</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Enrolled Course View ─────────────────────────────────────────────────────

type Tab = 'announcements' | 'content' | 'assignments' | 'evaluations' | 'grades' | 'forum' | 'reviews' | 'surveys';
const tabLabel: Record<Tab, string> = {
  announcements: 'Avisos', content: 'Contenido', assignments: 'Tareas',
  evaluations: 'Evaluaciones', grades: 'Calificaciones', forum: 'Foro', reviews: 'Reseñas',
  surveys: 'Encuestas',
};

export function EnrolledCourseView({ course, token, enrollmentStatus, isPreview }: {
  course: Course; token: string; enrollmentStatus: EnrollmentStatus; isPreview?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('announcements');
  const [certLoading, setCertLoading] = useState(false);

  const { data: progress } = useQuery<{ progress: number; completedLessons: number; totalLessons: number }>({
    queryKey: ['course', course.id, 'progress'],
    queryFn: () => api.get(`/courses/${course.id}/progress`, token),
    enabled: !isPreview,
  });

  const isCompleted = !isPreview && (enrollmentStatus === 'COMPLETED' || progress?.progress === 100);

  async function handleCertDownload() {
    setCertLoading(true);
    try {
      await downloadBlob(`${API_BASE}/courses/${course.id}/certificate`, `certificado-${course.slug}.pdf`, token);
    } finally {
      setCertLoading(false);
    }
  }

  // In preview mode hide grades (teacher has no personal grades in this course)
  const visibleTabs = isPreview
    ? (Object.keys(tabLabel) as Tab[]).filter(t => t !== 'grades')
    : (Object.keys(tabLabel) as Tab[]);

  return (
    <div className="space-y-5">
      {/* Preview banner */}
      {isPreview && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <span className="text-amber-500 text-lg flex-shrink-0">👁️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Vista previa — perspectiva del alumno</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">Navegá por todas las pestañas para ver exactamente lo que ven tus alumnos. El progreso no se registra.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="info">{difficultyLabel(course.difficulty)}</Badge>
            {course.category && <Badge>{course.category.name}</Badge>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{course.title}</h1>
          {course.teacher && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Por {course.teacher.firstName} {course.teacher.lastName}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isCompleted && (
            <button onClick={handleCertDownload} disabled={certLoading}
              className="btn-primary text-xs py-1.5 disabled:opacity-50 whitespace-nowrap">
              {certLoading ? 'Descargando…' : '🎓 Certificado'}
            </button>
          )}
          {!isPreview && progress && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">{progress.completedLessons}/{progress.totalLessons} lecciones</p>
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{progress.progress}%</p>
              </div>
              <div className="relative w-3 h-16 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute bottom-0 w-full bg-primary-500 rounded-full transition-all duration-500"
                  style={{ height: `${progress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 overflow-x-auto">
          {visibleTabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {tabLabel[t]}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'announcements' && <AnnouncementsTab courseId={course.id} />}
      {tab === 'content' && <ContentTab courseId={course.id} token={token} onGoToAssignments={() => setTab('assignments')} isPreview={isPreview} />}
      {tab === 'assignments' && <AssignmentsTab courseId={course.id} token={token} />}
      {tab === 'evaluations' && <EvaluationsTab courseId={course.id} token={token} />}
      {tab === 'grades' && !isPreview && <GradesTab courseId={course.id} token={token} />}
      {tab === 'forum' && <ForumTab courseId={course.id} token={token} />}
      {tab === 'reviews' && <ReviewsTab courseId={course.id} token={token} canReview={!isPreview && (enrollmentStatus === 'ACTIVE' || enrollmentStatus === 'COMPLETED')} />}
      {tab === 'surveys' && <SurveysTab courseId={course.id} token={token} />}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function CourseDetailClient({ slug }: { slug: string }) {
  const { token, user, isLoading: sessionLoading } = useSession();
  const router = useRouter();

  const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!sessionLoading && isTeacherOrAdmin) {
      router.replace(`/teacher/courses/${slug}`);
    }
  }, [sessionLoading, isTeacherOrAdmin, router, slug]);

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ['course', slug],
    queryFn: () => api.get(`/courses/${slug}`, token ?? undefined),
    enabled: !!slug && !isTeacherOrAdmin,
  });

  const isStudent = user?.role === 'STUDENT';

  const { data: enrollments = [] } = useQuery<{ id: string; courseId: string; status: EnrollmentStatus }[]>({
    queryKey: ['enrollments'],
    queryFn: () => api.get('/enrollments', token ?? undefined),
    enabled: !!token && isStudent,
  });

  const enrollment = course
    ? enrollments.find(e => e.courseId === course.id && (e.status === 'ACTIVE' || e.status === 'COMPLETED'))
    : undefined;

  if (sessionLoading || isTeacherOrAdmin || (!isTeacherOrAdmin && courseLoading)) {
    return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;
  }

  if (!course) {
    return <div className="py-20 text-center text-red-600">Curso no encontrado.</div>;
  }

  if (isStudent && enrollment && token) {
    return <EnrolledCourseView course={course} token={token} enrollmentStatus={enrollment.status} />;
  }

  return <PublicCourseView course={course} slug={slug} />;
}
