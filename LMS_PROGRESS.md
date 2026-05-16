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
| 2.2 | Course modules & lessons (estructura de contenido, orden, tipos TEXT/VIDEO/FILE) | ⬜ | Depende de 2.1 |
| 2.3 | File upload (FileAsset, almacenamiento local/S3, validación MIME) | ⬜ | Depende de 2.2 |
| 2.4 | Enrollment module (solicitar, aprobar, rechazar, tipos OPEN/INVITATION/APPROVAL) | ⬜ | Depende de 2.1 |

---

## Fase 3 — Evaluaciones

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 3.1 | Assignments module (tareas TEXT/FILE/QUIZ, fecha límite, peso) | ⬜ | Depende de 2.2 |
| 3.2 | Submissions module (entrega de tareas, flag de tardía) | ⬜ | Depende de 3.1 |
| 3.3 | Grading module (calificación, feedback, score/maxScore) | ⬜ | Depende de 3.2 |

---

## Fase 4 — Gamificación y Notificaciones

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 4.1 | Badges & XP (criterios, transacciones de XP, asignación de badges) | ⬜ | Depende de 3.3 |
| 4.2 | Notifications module (tipos, marcar leídas, in-app) | ⬜ | Paralelo a 4.1 |

---

## Fase 5 — Comunidad y Analytics

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 5.1 | Forums module (hilos, posts, soft-delete, pin/lock) | ⬜ | Depende de 2.1 |
| 5.2 | Dashboard & lesson progress (progreso del alumno, estadísticas del teacher) | ⬜ | Depende de 3.3 |
| 5.3 | Calendar events (eventos por curso, agenda) | ⬜ | Depende de 2.1 |

---

## Fase 6 — Frontend (Next.js 14)

| Bloque | Descripción | Estado | Notas |
|--------|-------------|--------|-------|
| 6.1 | Setup + Auth UI (login, registro, logout, refresh automático) | ⬜ | App Router, server actions |
| 6.2 | Course catalog (listado público, filtros, búsqueda) | ⬜ | Depende de 6.1 y 2.1 |
| 6.3 | Course detail & enrollment (vista de curso, flujo de inscripción) | ⬜ | Depende de 2.4 |
| 6.4 | Student dashboard (mis cursos, progreso, badges, XP) | ⬜ | Depende de 6.3 y 4.1 |
| 6.5 | Teacher dashboard (gestión de cursos, alumnos, calificaciones) | ⬜ | Depende de 3.3 |
| 6.6 | Admin panel (usuarios, categorías, badges manuales, audit log) | ⬜ | Depende de 6.5 |

---

## Decisiones de arquitectura tomadas

| Decisión | Detalle |
|----------|---------|
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
