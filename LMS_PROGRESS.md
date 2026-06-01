# LMS — Build Progress

Stack: NestJS + Next.js 14 · Prisma + MySQL · Hexagonal (Screaming) Architecture · pnpm workspaces  
Delivery: cada bloque pasa Judgment Day (dual-judge blind review) antes de continuar.

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Completado — JD APPROVED |
| 🔄 | En progreso |
| ⬜ | Pendiente |

---

## Fase 1 — Fundación API

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 1.1 | Monorepo setup (pnpm workspaces, apps/api, apps/web, packages/shared) | ✅ | NestJS + Next.js 14 scaffolded |
| 1.2 | Prisma schema & migration (todos los modelos del sistema) | ✅ | MySQL, schema completo en packages/shared |
| 1.3 | Common infrastructure (guards, filters, interceptors, decorators) | ✅ | JwtAuthGuard, RolesGuard, PrismaExceptionFilter, LoggingInterceptor, AuditInterceptor |
| 1.4 | Auth module (registro, login, logout, refresh token) | ✅ | JWT access token (15m) + httpOnly cookie refresh (7d), dummyHash anti-timing |
| 1.5 | User management (perfil, roles, status) | ✅ | atomicChangeRole con $transaction Serializable, upsertProfile transaccional |
| 1.6 | Course categories (CRUD + slug inmutable) | ✅ | ParseCuidPipe, ParseSlugPipe, P2002/P2003 con mensajes específicos |

---

## Fase 2 — Módulo de Cursos

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 2.1 | Courses module (CRUD + ciclo de vida: DRAFT → PUBLISHED → ARCHIVED) | ✅ | P2002 MySQL fix, slug truncation a 100 chars, teacher DRAFT leak corregido |
| 2.2 | Course modules & lessons (estructura de contenido, orden, tipos TEXT/VIDEO/FILE) | ✅ | Reorder con 2x $executeRaw CASE WHEN, maxOrder+create en $transaction, publish validation por tipo |
| 2.3 | File upload (FileAsset, almacenamiento local, validación extensión, ACL) | ✅ | FileUploadInterceptor injectable, delete DB→disk, Content-Type desde extension map |
| 2.4 | Enrollment module (solicitar, aprobar, rechazar, tipos OPEN/INVITATION/APPROVAL) | ✅ | OPEN→ACTIVE, APPROVAL→PENDING, INVITATION→403; LessonProgress con upsert idempotente, progress clamped |

---

## Fase 3 — Evaluaciones

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 3.1 | Assignments module (tareas TEXT/FILE/QUIZ, fecha límite, peso) | ✅ | Quiz questions, reorder, dueDate, peso, JD 5 rondas |
| 3.2 | Submissions module (entrega de tareas, flag de tardía) | ✅ | ACTIVE enrollment required, isLate calculado en create+update, ownership check QUIZ, JD 2 rondas |
| 3.3 | Grading module (calificación, feedback, score/maxScore) | ✅ | maxScore snapshot, teacherId audit trail, duplicate check al app layer, JD 3 rondas |

---

## Fase 4 — Gamificación y Notificaciones

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 4.1 | Badges & XP (criterios, transacciones de XP, asignación de badges) | ✅ | BadgeCriteria enum, $transaction array upsert+insert, ParseCuidPipe en query params, @Max(10_000) en AwardXpDto |
| 4.2 | Notifications module (tipos, marcar leídas, in-app) | ✅ | read-all antes de :id para evitar colisión, ownership en todos los use-cases, exports CreateNotificationUseCase |

---

## Fase 5 — Comunidad y Analytics

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 5.1 | Forums module (hilos, posts, soft-delete, pin/lock) | ✅ | Tombstone soft-delete, pin/lock idempotente con DTO explícito, enrollment check en create/update/delete post |
| 5.2 | Dashboard & lesson progress (progreso del alumno, estadísticas del teacher) | ✅ | Batched flat queries + Maps para student progress, groupBy para teacher enrollments |
| 5.3 | Calendar events (eventos por curso, agenda) | ✅ | Overlap range filter, STUDENT scoped por enrolledCourseIds, @Roles en PATCH, actor pasado a todos los GETs |

---

## Fase 6 — Frontend (Next.js 14)

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 6.1 | Setup + Auth UI (login, registro, logout, refresh automático) | ✅ | Middleware de auth, session cookie, login/register forms con Zod |
| 6.2 | Course catalog (listado público, filtros, búsqueda) | ✅ | SSR con Server Components, CourseCard con badges |
| 6.3 | Course detail & enrollment (vista de curso, flujo de inscripción) | ✅ | SSR + EnrollButton client, SSR enrollment check |
| 6.4 | Student dashboard (mis cursos, progreso, badges, XP) | ✅ | React Query, barra de progreso, XP + badge count |
| 6.5 | Teacher dashboard (gestión de cursos, alumnos, calificaciones) | ✅ | Tabla de cursos con stats, pendingGradeCount |
| 6.6 | Admin panel (usuarios, categorías, badges manuales, audit log) | ✅ | Tabla de usuarios, change role/status inline |

---

## Fase 7 — Seguridad & Cobertura de Endpoints

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 7.1 | XSS prevention — `sanitize-html` activado en foros, lecciones, anuncios, cursos | ✅ | `sanitizeRichText` para HTML (foros/lecciones/anuncios), `sanitizePlainText` para texto plano (descripciones de cursos). `sanitize.util.ts` en common/utils |
| 7.2 | Magic-bytes file validation | ✅ | `extensionMatchesMagicBytes()` en `upload-file.use-case.ts` — verifica firma real del archivo contra extensión declarada. `magic-bytes.util.ts` en common/utils |
| 7.3 | Audit Log read endpoint | ✅ | `GET /audit-logs` — Admin only, paginado, filtrable por actorId/entityType/action. `AuditLogModule` nuevo |
| 7.4 | Notifications UI (frontend) | ✅ | `NotificationBell` en navbar — dropdown con lista, mark-read, mark-all-read, polling 30s |
| 7.5 | Gamification UI (frontend) | ✅ | Badge showcase en student dashboard + `GamificationTab` en admin (CRUD badges, award badge, award XP) |
| 7.6 | Academic Structure admin UI | ✅ | Ya existía en admin panel — tab "Estructura académica" con CRUD de grades/sections/departments |
| 7.7 | Student Evaluation UI | ✅ | Ya existía completo — EvaluationsTab + TakeEvaluation + EvaluationResult en course-detail-client.tsx |
| 7.8 | Email notification service | ✅ | `EmailModule` hexagonal — `NodemailerEmailAdapter` (no-op si SMTP_HOST ausente), `@OnEvent('notification.created')` listener, `EventEmitter2` en `CreateNotificationUseCase` |
| 7.9 | Course Reviews & Ratings | ✅ | `CourseReviewsModule` — POST/GET/DELETE, enrollment ACTIVE check, `@@unique([courseId,studentId])`, `avgRating` con `_avg` de Prisma, GET público |
| 7.10 | Course Completion Certificates | ✅ | `CertificatesModule` — `Certificate` model (@@unique studentId+courseId, certificateNumber @unique), `course.completed` event emitido desde `CompleteLessonUseCase` cuando progress=100 + enrollment→COMPLETED, `CourseCompletedListener` emite certificado, `GET /courses/:courseId/certificate` genera PDF pdfkit on-demand |

---

## Fase 8 — Features Adicionales

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 8.1 | Assignment due-date reminders (cron diario) | ✅ | `DueDateReminderService` en `AssignmentsModule` — `@Cron('0 8 * * *')`, busca assignments con `dueDate = mañana`, crea `ASSIGNMENT_DUE_SOON` notification por cada student ACTIVE (email vía evento) |
| 8.2 | Bulk grade export (CSV) | ✅ | `GET /courses/:courseId/grades/export` — Teacher/Admin only, `GradeExportService` con PrismaService directo, CSV con columnas: studentId/name/email/assignment/type/score/maxScore/percentage/submittedAt/gradedAt |
| 8.3 | Audit Log UI (admin) | ✅ | Tab "Auditoría" en admin panel — tabla paginada con filtro por entityType, muestra fecha/actor/entidad/acción/ID |
| 8.4 | Grade export UI (teacher) | ✅ | Botón "Exportar CSV" por curso en teacher dashboard — descarga blob directo con `fetch` + `URL.createObjectURL` |
| 8.5 | Certificate download UI | ✅ | Botón "🎓 Certificado" en `EnrolledCourseView` cuando progress=100 o status=COMPLETED — download PDF via blob |
| 8.6 | Reviews UI (course detail) | ✅ | Tab "Reseñas" en enrolled view + sección en public view — StarRating interactivo, create/delete form, avgRating display |
| 8.7 | Enrollment COMPLETED fix | ✅ | `CourseDetailClient` ahora acepta status ACTIVE **y** COMPLETED para mostrar `EnrolledCourseView` — pasa `enrollmentStatus` como prop |
| 8.8 | Lesson drag-and-drop reorder (B5) | ✅ | `ModuleCard` con HTML5 drag-and-drop nativo — `localLessons` state + `useRef` para dragItem, `onDrop` llama `PATCH .../lessons/reorder`, revert en error, handle ⠿ visual |
| 8.9 | Module drag-and-drop reorder | ✅ | `ContentSection` con mismo patrón — `localModules` state, `PATCH /courses/:id/modules/reorder` on drop |
| 8.10 | Student detail modal (teacher) | ✅ | `StudentProgressModal` en `EnrollmentsSection` — overlay con progreso, lecciones, XP y calificaciones; botón "Ver progreso" en alumnos ACTIVE/COMPLETED |
| 8.11 | Leaderboard endpoint + UI | ✅ | `GET /leaderboard?limit=10` en `GamificationModule` — `LeaderboardController` con PrismaService directo; widget en student dashboard con highlight de posición propia |
| 8.12 | Infraestructura completa | ✅ | `env.example` corregido (nombres reales de vars), `next.config.mjs` con `output: standalone`, web Dockerfile con build arg `NEXT_PUBLIC_API_URL`, `docker-compose.prod.yml` con servicio `migrate` (Compose v3.9 `service_completed_successfully`), `docker-compose.yml` dev con `NEXT_PUBLIC_API_URL`, `dev.ps1` con paso de migración automático, migración Prisma `20260530000000_add_reviews_certificates` |

---

## Decisiones de arquitectura tomadas

| Decisión | Detalle |
|----------|---------|
| File delete order | DB primero, luego disco — stale disk file es problema de ops, ghost DB record es corrupción |
| maxOrder + create | Dentro de $transaction para prevenir race conditions en @@unique([moduleId, order]) |
| Reorder SQL | 2x $executeRaw CASE WHEN negativo→positivo para evitar N round-trips y violar constraint único |
| Content-Type al descargar | Derivado de EXTENSION_MIME map, nunca del mimeType en DB (previene spoofing) |
| FileUploadInterceptor | NestInterceptor inyectable — Multer diskStorage no puede usar `this` en class decorator |
| Slugs inmutables | Generados en creación vía `slugify()`, nunca actualizados (URL stability) |
| passwordHash excluido a nivel DB | `select` explícito en todas las queries, nunca en entidades de dominio |
| `Prisma.XGetPayload<{ select: typeof X_SELECT }>` | Tipos derivados del select, nunca declaraciones manuales |
| `$transaction(Serializable)` para last-admin guard | TOCTOU race prevenido con aislamiento Serializable |
| P2002/P2003/P2025 capturados en adapters | Mensajes de dominio específicos, no strings genéricos del filter global |
| ParseCuidPipe / ParseSlugPipe | Validación de path params en controllers, 400 para formato inválido |
| `mode: 'insensitive'` NO usar | Solo PostgreSQL/MongoDB — MySQL usa collation `utf8mb4_unicode_ci` |
| Refresh token en httpOnly cookie | Access token en body (15m), refresh en cookie (7d), `useSecureCookies` en non-dev |
| `atomicChangeRole` | count + update en una sola transacción Serializable |
| `upsertProfile` transaccional | upsert + findUnique en un solo $transaction, sin second read window |
| `parseInt` NaN + negativo guard | `Number.isNaN(n) \|\| n < 1 ? undefined : n` — valores cero/negativos silenciosos rechazados |
| `@IsOptional` vs `@ValidateIf` | `@IsOptional()` ya skipea todo para `null` Y `undefined` — `@ValidateIf((o) => o.field !== null)` es dead code redundante |
| Gamification exports | `AwardBadgeUseCase` + `AwardXpUseCase` exportados para futuras integraciones |
| `MarkAllReadUseCase` ownership | Recibe `userId, actorId` — ForbiddenException si difieren, consistente con mark-read y delete |
| Forum soft-delete tombstone | `toPostEntity` nullea `authorId` + `content` en reads; `findThreadWithPosts` excluye posts con `deletedAt: null` para consistencia con count |
| Pin/lock idempotente | Use cases aceptan `isPinned`/`isLocked: boolean` explícito (no toggle `!current`) — previene TOCTOU en requests concurrentes |
| Calendar range overlap | Filtro correcto: `startsAt <= to AND (endsAt >= from OR endsAt IS NULL)` — implementado en Prisma AND array con ternarios independientes |
| Calendar STUDENT scoping | Sin courseId → `enrolledCourseIds OR courseId IS NULL`; con courseId → verifica enrollment primero |
| Dashboard student batched | Enrollments (lightweight) + 2 flat queries (lessons, progress) + Maps O(1) — nunca nested Prisma que carga módulos→lecciones→progress |
| Auth session cookie | `lms_session` = btoa(JSON) — no httpOnly para que middleware (edge) y JS puedan leer; SameSite=Strict como CSRF protection |
| Middleware refresh | Lee `refresh_token` httpOnly cookie y llama POST /auth/refresh directamente desde Edge; reescribe `lms_session` en la response |
| dev.ps1 | Script de arranque: crea `.env` y `apps/web/.env.local` automáticamente, usa Windows Terminal (wt) si disponible, si no abre ventanas pwsh separadas |
| `sanitizeRichText` en use-case layer | Sanitización HTML aplicada en use cases (no en controllers ni entidades) — coherente con el patrón de validación existente; `sanitize-html` ya estaba en deps |
| Magic bytes en `UploadFileUseCase` | Validación post-multer (archivo ya en disco) — lee 12 bytes y verifica firma contra extensión; rechaza si no coincide y elimina el tmp file |
| `AuditLogModule` read-only | Módulo sin hexagonal completo: `PrismaService` directo en controller — aceptable para admin-only read queries sin lógica de dominio |
| Email no-op graceful | `NodemailerEmailAdapter` devuelve void si `SMTP_HOST` no está configurado — el LMS arranca sin SMTP en dev sin errores |
| Email via EventEmitter | `notification.created` emitido desde `CreateNotificationUseCase` — el listener de email es agnóstico al emisor; no modifica los use-cases de grade/enrollment/etc. |
| CourseReview avgRating | Computado en query time con Prisma `_avg` en la misma `$transaction` que `findMany` + `count` — sin denormalización |
| CourseReview GET público | `@Public()` en list endpoint — ratings son información pública del catálogo |
| CourseReview delete ownership | Ownership check en use-case (no en adapter) — consistent con patrón de la codebase |
| Certificate trigger | `CompleteLessonUseCase` emite `course.completed` cuando progress=100 + transiciona enrollment a COMPLETED en el mismo request — listener emite el certificado async sin bloquear |
| Certificate PDF on-demand | `pdfkit` (CJS compatible, sin ESM issues) — genera PDF desde el registro en DB, no almacena bytes. `Content-Disposition: attachment` para descarga directa |
| Certificate number retry | Loop de 5 intentos con `generateCertNumber()` ante colisión P2002 — la probabilidad de colisión es astronómicamente baja con el espacio de 8 caracteres |
| Due-date reminder cron | PrismaService directo en `DueDateReminderService` — no hay lógica de dominio en la query, es solo un scan de fecha. Notifications via `CreateNotificationUseCase` (email sigue en cascada via evento) |
| Grade export sin paquete | CSV generado manualmente con `escapeCsv()` — sin `fast-csv`: una dependencia extra para escapado simple no vale la complejidad |
| Grade export flat rows | Una fila por submission (no pivot por assignment) — más simple de consumir en Excel/Sheets, evita columnas dinámicas |
| `darkMode: 'class'` en Tailwind | Clase `dark` en `<html>` — controlado por ThemeProvider; utility classes en `globals.css` dan cobertura automática masiva |
| Anti-FOUC inline script | Script en `<head>` (antes de React) lee `localStorage.theme` + `prefers-color-scheme` y aplica clase `dark` sincrónicamente — elimina parpadeo blanco en recarga |
| ThemeProvider en providers.tsx | Capa más externa (envuelve `QueryClientProvider`) — `useTheme()` disponible en cualquier Client Component sin prop drilling |
| Hamburger mobile en navbar | Estado `mobileMenuOpen` + drawer inside `<nav>` (no portal) — `sm:hidden` para ocultar en desktop; el drawer incluye todos los links + user actions + logout |
| ThemeToggle inline en navbar | Sol (dark→light) y luna (light→dark) — SVGs inline sin dependencias externas; `resolvedTheme` para distinguir entre 'system' y el tema actual efectivo |
| `prefers-color-scheme` listener | Solo activo cuando `theme === 'system'` — se limpia en cleanup del useEffect para evitar memory leaks |

---

## Fase 9 — Dark/Light Mode + Mobile Responsive

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 9.1 | Infraestructura tema (`darkMode: 'class'`, ThemeProvider, anti-FOUC, providers) | ✅ | `tailwind.config.ts`, `theme-provider.tsx` (nuevo), `layout.tsx` (script FOUC), `providers.tsx` |
| 9.2 | Utility classes dark (`globals.css`) | ✅ | `.card`, `.input-base`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `body` — cobertura automática masiva |
| 9.3 | Componentes UI primitivos | ✅ | `badge.tsx` (5 variantes), `modal.tsx`, `notification-bell.tsx` |
| 9.4 | Navbar: ThemeToggle + hamburger mobile | ✅ | `ThemeToggle` (sol/luna inline), `mobileMenuOpen` state, drawer con todos los links, eliminado "Salir" hardcodeado |
| 9.5 | Layouts | ✅ | `(auth)/layout.tsx` dark bg + textos; `(app)/layout.tsx` padding mobile-first `px-4 py-6 sm:px-6 sm:py-8` |
| 9.6 | Componentes de cursos | ✅ | `course-card.tsx`, `enroll-button.tsx` |
| 9.7 | Páginas principales | ✅ | `login-form.tsx`, `courses/page.tsx`, `dashboard/page.tsx`, `teacher/page.tsx` (+ grid-cols-1 sm:grid-cols-3 stats, overflow-x-auto tabla) |
| 9.8 | Páginas grandes — admin, teacher course, course detail | ✅ | ~550 dark: variants aplicadas en los 3 archivos — admin/page.tsx, teacher/courses/[slug]/page.tsx, course-detail-client.tsx |

---

## Pendiente / Próximas fases

| # | Tarea | Prioridad |
|---|-------|-----------|
| — | Verificación visual dark mode (todos los estados, ambos temas) | Alta |
| — | `pnpm db:generate && pnpm db:seed` (FIRST_ENROLLMENT badge enum + 5 system badges) | Alta — requiere parar el API server primero |
| — | Tests e2e auth flows (A3 del audit de seguridad) | Media |
| — | WebSocket real-time notifications | Baja |
| — | 2FA (TOTP) | Baja |

