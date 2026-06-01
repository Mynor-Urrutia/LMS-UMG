# LMS — Learning Management System

Plataforma de gestión del aprendizaje desarrollada como proyecto universitario para la UMG. Construida como monorepo con NestJS, Next.js 14 y MySQL, siguiendo Arquitectura Hexagonal / Screaming Architecture.

---

## Tabla de Contenidos

- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Características](#características)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Instalación y configuración](#instalación-y-configuración)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos](#base-de-datos)
- [Seed de datos](#seed-de-datos)
- [Ejecución en desarrollo](#ejecución-en-desarrollo)
- [Docker](#docker)
- [Módulos del API](#módulos-del-api)
- [Roles de usuario](#roles-de-usuario)
- [Metodologías de aprendizaje implementadas](#metodologías-de-aprendizaje-implementadas)

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| **Backend** | NestJS 10, TypeScript, Prisma ORM |
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **Base de datos** | MySQL 8 |
| **Autenticación** | JWT (access + refresh tokens), HttpOnly cookies |
| **Monorepo** | pnpm workspaces |
| **Generación PDF** | PDFKit |
| **Email** | Nodemailer (SMTP opcional) |
| **Contenedores** | Docker + Docker Compose |
| **Servidor HTTP** | Nginx (producción) |

---

## Arquitectura

El backend sigue **Arquitectura Hexagonal (Ports & Adapters)** organizada con **Screaming Architecture**: cada módulo de negocio es independiente y tiene su propia estructura `domain / application / infrastructure`.

```
apps/api/src/
└── <módulo>/
    ├── domain/
    │   ├── entities/          # Entidades de dominio
    │   └── ports/             # Interfaces de repositorio
    ├── application/
    │   ├── use-cases/         # Casos de uso
    │   ├── dtos/              # Data Transfer Objects
    │   ├── listeners/         # Event listeners
    │   └── services/          # Servicios de aplicación
    └── infrastructure/
        ├── adapters/          # Implementaciones Prisma
        └── http/              # Controladores NestJS
```

El frontend usa el **App Router** de Next.js 14 con React Server Components donde aplica, React Query para state management del servidor y Tailwind CSS con un sistema de diseño propio.

---

## Características

### Gestión de Cursos
- Creación y publicación de cursos con categorías y niveles de dificultad
- Módulos secuenciales con **prerrequisitos** (rutas de aprendizaje bloqueadas)
- 6 tipos de lección: `TEXT`, `VIDEO`, `FILE`, `EMBED`, `INFOGRAPHIC`, `CASE_STUDY`
- Reordenamiento por drag & drop de módulos y lecciones
- **PDF descargable por módulo** (generado con PDFKit)
- Vista previa del curso en perspectiva del alumno para el docente

### Aprendizaje Gamificado
- Sistema de **XP** con transacciones y historial
- **Niveles** calculados automáticamente desde el XP acumulado
- **Insignias** (badges) automáticas: curso completado, quiz perfecto, primera inscripción, subida de nivel
- **Leaderboard** con ranking de estudiantes
- Dashboard personalizado por rol

### Evaluación y Actividades
- **Quiz** con preguntas de opción múltiple y verdadero/falso
- **Dilemas Éticos**: escenario + opciones con puntaje ético y consecuencias reveladas al responder
- **Tareas de texto** con calificación manual y retroalimentación
- **Evaluaciones** formales con intentos, auto-calificación y calificación manual
- **Encuestas** anónimas o identificadas (pre y post curso)
- **Foros** de discusión con hilos, respuestas anidadas, pin y bloqueo

### Gestión Académica
- Inscripciones con flujos OPEN / INVITE / APPROVAL
- Registro de progreso por lección
- Calificaciones con exportación CSV
- **Certificados digitales** en PDF (generados automáticamente al completar)
- Control de asistencia por sesiones
- Calendario de eventos por curso
- Anuncios del docente

### Seguridad
- XSS sanitization en contenido enriquecido (`sanitize-html`)
- Validación de magic bytes en uploads (no solo extensión)
- Audit log de operaciones sensibles
- Rate limiting inteligente: solo aplica a métodos de escritura (POST/PATCH/DELETE), GET requests no cuentan
- Auth throttle independiente: máximo 5 intentos de login por minuto

### Roles y Permisos
- Roles base: `ADMIN`, `TEACHER`, `STUDENT`
- Roles personalizados con permisos granulares configurables
- Estructura académica: grados, secciones, departamentos

---

## Estructura del Proyecto

```
lms/
├── apps/
│   ├── api/                   # Backend NestJS
│   │   └── src/
│   │       ├── academic-structure/
│   │       ├── assignments/
│   │       ├── attendance/
│   │       ├── auth/
│   │       ├── calendar/
│   │       ├── categories/
│   │       ├── certificates/
│   │       ├── common/        # Guards, filters, interceptors, decorators
│   │       ├── course-announcements/
│   │       ├── course-modules/
│   │       ├── course-reviews/
│   │       ├── courses/
│   │       ├── custom-roles/
│   │       ├── dashboard/
│   │       ├── email/
│   │       ├── enrollments/
│   │       ├── evaluations/
│   │       ├── files/
│   │       ├── forums/
│   │       ├── gamification/
│   │       ├── grading/
│   │       ├── lessons/
│   │       ├── notifications/
│   │       ├── submissions/
│   │       ├── surveys/
│   │       └── users/
│   └── web/                   # Frontend Next.js 14
│       └── src/
│           ├── app/
│           │   ├── (app)/     # Rutas protegidas
│           │   └── (auth)/    # Login / Register
│           ├── components/
│           ├── hooks/
│           ├── lib/
│           ├── providers/
│           └── types/
├── packages/
│   └── shared/                # Prisma schema, migrations, seeds, tipos compartidos
│       └── prisma/
│           ├── schema.prisma
│           ├── seed.ts
│           ├── seed-demo.ts
│           ├── seed-carrera-etica.ts
│           └── seed-enroll-carrera.ts
├── nginx/                     # Configuración Nginx para producción
├── docker-compose.yml
├── docker-compose.prod.yml
└── env.example
```

---

## Requisitos Previos

- **Node.js** 18+
- **pnpm** 8+
- **MySQL** 8+ (local o Docker)
- **Git**

```bash
# Instalar pnpm globalmente
npm install -g pnpm
```

---

## Instalación y Configuración

```bash
# 1. Clonar el repositorio
git clone https://github.com/Mynor-Urrutia/LMS-UMG.git
cd LMS-UMG

# 2. Instalar dependencias
pnpm install

# 3. Copiar variables de entorno
cp env.example .env
# Editar .env con tus valores reales

# 4. Generar el cliente Prisma
cd packages/shared
pnpm prisma generate
cd ../..
```

---

## Variables de Entorno

Copiar `env.example` a `.env` en la raíz del proyecto y completar los valores:

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | URL de conexión MySQL | ✅ |
| `JWT_ACCESS_SECRET` | Secret JWT access token (mín. 32 chars) | ✅ |
| `JWT_REFRESH_SECRET` | Secret JWT refresh token (mín. 32 chars) | ✅ |
| `JWT_ACCESS_EXPIRES_IN` | Duración del access token (ej. `15m`) | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refresh token (ej. `7d`) | ✅ |
| `COOKIE_SECRET` | Secret para firmar cookies (mín. 16 chars) | ✅ |
| `FRONTEND_URL` | URL del frontend (CORS) | ✅ |
| `PORT` | Puerto del API (default: `3001`) | — |
| `NODE_ENV` | `development` / `production` | — |
| `THROTTLE_TTL_SECONDS` | Ventana del rate limiter en segundos | — |
| `THROTTLE_LIMIT` | Máx. requests de escritura por ventana | — |
| `SMTP_HOST` | Host SMTP para emails (opcional) | — |
| `SMTP_PORT` | Puerto SMTP | — |
| `SMTP_USER` | Usuario SMTP | — |
| `SMTP_PASS` | Contraseña SMTP | — |
| `SMTP_FROM` | Dirección remitente | — |
| `MYSQL_ROOT_PASSWORD` | Password root MySQL (Docker) | — |
| `MYSQL_PASSWORD` | Password del usuario app MySQL (Docker) | — |
| `NEXT_PUBLIC_API_URL` | URL pública del API (builds Docker) | — |
| `SHADOW_DATABASE_URL` | Shadow DB para migraciones Prisma (solo dev) | — |

---

## Base de Datos

```bash
# Desde packages/shared/

# Aplicar migraciones
$env:DATABASE_URL="mysql://usuario:password@localhost:3306/lms_db"
npx prisma migrate dev

# O solo sincronizar schema sin historial de migraciones
npx prisma db push

# Ver la base de datos en el browser
npx prisma studio
```

### Modelos principales

`User` · `Course` · `CourseModule` · `Lesson` · `Enrollment` · `LessonProgress` · `Assignment` · `QuizQuestion` · `DilemmaScenario` · `DilemmaChoice` · `Submission` · `Grade` · `Evaluation` · `EvaluationQuestion` · `Badge` · `UserXp` · `Certificate` · `Survey` · `ForumThread` · `ForumPost` · `Notification` · `AuditLog` · `CalendarEvent` · `AttendanceSession`

---

## Seed de Datos

Hay tres scripts de seed disponibles. Todos se ejecutan desde `packages/shared/`:

```bash
# Configurar la variable de entorno primero
$env:DATABASE_URL="mysql://lms_user:password@localhost:3306/lms_db"

# 1. Seed base: roles, permisos y admin
npx ts-node --project tsconfig.json prisma/seed.ts

# 2. Carrera de Ética Empresarial (4 cursos completos con contenido)
npx ts-node --project tsconfig.json prisma/seed-carrera-etica.ts

# 3. Limpiar cursos de demo + inscribir 15 estudiantes con progreso variado
npx ts-node --project tsconfig.json prisma/seed-enroll-carrera.ts

# 4. Curso demo "Código de Conducta" con estudiantes y datos completos (opcional)
npx ts-node --project tsconfig.json prisma/seed-demo.ts
```

### Credenciales de acceso (después del seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Docente (Carrera Ética) | `docente.etica@empresa.local` | `Demo1234!` |
| Docente (Conducta) | `docente.conducta@empresa.local` | `Demo1234!` |
| Estudiantes (15) | `carlos.rodriguez@empresa.local` ... | `Demo1234!` |

---

## Ejecución en Desarrollo

### Windows (PowerShell)
```powershell
# Desde la raíz del proyecto
.\dev.ps1
```

### Manual
```bash
# Terminal 1 — API (puerto 3001)
pnpm --filter api dev

# Terminal 2 — Frontend (puerto 3000)
pnpm --filter web dev
```

Acceder en: `http://localhost:3000`
API disponible en: `http://localhost:3001/api/v1`
Swagger UI: `http://localhost:3001/api/docs`

---

## Docker

### Desarrollo con Docker Compose
```bash
# Levantar MySQL + servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### Producción
```bash
# Construir y levantar todo el stack
docker-compose -f docker-compose.prod.yml up -d --build
```

El stack de producción incluye: `mysql` + `api` + `web` + `nginx`.

---

## Módulos del API

| Módulo | Ruta base | Descripción |
|--------|-----------|-------------|
| Auth | `/api/v1/auth` | Login, registro, refresh token |
| Users | `/api/v1/users` | Perfil, roles, estado |
| Categories | `/api/v1/categories` | Categorías de cursos |
| Courses | `/api/v1/courses` | CRUD de cursos |
| Course Modules | `/api/v1/courses/:id/modules` | Módulos y prerequisitos |
| Lessons | `/api/v1/courses/:id/modules/:id/lessons` | Lecciones por tipo |
| Enrollments | `/api/v1/enrollments` | Inscripciones |
| Assignments | `/api/v1/courses/:id/assignments` | Tareas (QUIZ, TEXT, FILE, DILEMMA) |
| Submissions | `/api/v1/courses/:id/assignments/:id/submissions` | Entregas |
| Grading | `/api/v1/courses/:id/assignments/:id/grades` | Calificaciones + export CSV |
| Evaluations | `/api/v1/courses/:id/evaluations` | Evaluaciones formales |
| Gamification | `/api/v1/badges`, `/api/v1/users/me/xp` | Badges, XP, leaderboard |
| Certificates | `/api/v1/courses/:id/certificate` | Certificados PDF |
| Forums | `/api/v1/courses/:id/threads` | Foros de discusión |
| Surveys | `/api/v1/courses/:id/surveys` | Encuestas |
| Notifications | `/api/v1/notifications` | Notificaciones en tiempo real |
| Dashboard | `/api/v1/dashboard` | Dashboard por rol |
| Files | `/api/v1/files` | Upload y descarga de archivos |
| Calendar | `/api/v1/courses/:id/events` | Calendario de eventos |
| Attendance | `/api/v1/courses/:id/attendance` | Control de asistencia |
| Announcements | `/api/v1/courses/:id/announcements` | Avisos del docente |
| Reviews | `/api/v1/courses/:id/reviews` | Reseñas de cursos |
| Academic Structure | `/api/v1/academic` | Grados, secciones, departamentos |
| Custom Roles | `/api/v1/roles` | Roles personalizados con permisos |
| Audit Log | `/api/v1/audit-log` | Registro de auditoría |

---

## Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| `ADMIN` | Acceso total: gestión de usuarios, cursos, configuración |
| `TEACHER` | Crea y gestiona sus propios cursos, califica, gestiona contenido |
| `STUDENT` | Se inscribe en cursos, consume contenido, realiza actividades |

Los roles personalizados permiten combinar permisos granulares:
`users:manage`, `courses:create`, `courses:edit`, `courses:publish`, `content:manage`, `enrollments:manage`, `grades:manage`, `reports:view`, etc.

---

## Metodologías de Aprendizaje Implementadas

| Metodología | Implementación |
|-------------|---------------|
| **Gamificación** | XP, niveles, badges, leaderboard |
| **Rutas de aprendizaje** | Módulos con prerrequisitos, módulos bloqueados |
| **Evaluaciones** | Quizzes, evaluaciones formales, calificación automática y manual |
| **Infografías** | Tipo de lección `INFOGRAPHIC` (imagen/PDF con badge visual) |
| **Dilemas éticos** | Tipo de assignment `DILEMMA` con escenario, opciones y puntaje ético |
| **Análisis de alternativas** | Opciones del dilema con consecuencias reveladas al responder |
| **Encuestas** | Módulo `Survey` completo (diagnóstico y cierre, anónimas o no) |
| **Brainstorming** | Foros de discusión con hilos colaborativos |
| **Apps embebidas** | Tipo de lección `EMBED` (Kahoot, Mentimeter, H5P, etc.) |
| **Casos de estudio** | Tipo de lección `CASE_STUDY` con análisis estructurado |
| **Certificados** | PDF generado automáticamente al completar el curso |
| **Insignias** | Badges automáticos por logros (COURSE_COMPLETE, PERFECT_QUIZ, LEVEL_UP, etc.) |
| **Calificaciones** | Registro completo + exportación CSV |
| **Resultados de tareas** | Historial de submissions con feedback del docente |

---

## Licencia

Proyecto académico — Universidad Mariano Gálvez de Guatemala (UMG).
