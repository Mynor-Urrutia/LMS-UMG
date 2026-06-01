/**
 * seed-enroll-carrera.ts
 * 1. Elimina cursos viejos (Código de Conducta + demo)
 * 2. Crea 15 estudiantes
 * 3. Los inscribe en los 4 cursos de la Carrera de Ética con progreso variado
 *
 * Ejecutar desde packages/shared/:
 *   $env:DATABASE_URL="mysql://lms_user:LmsPass2024@127.0.0.1:3306/lms_db"
 *   npx ts-node --project tsconfig.json prisma/seed-enroll-carrera.ts
 */

import { BadgeCriteria, EnrollmentStatus, PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const HASH = (pw: string) => bcrypt.hash(pw, 10);

// ── Cursos a eliminar ─────────────────────────────────────────────────────────

const SLUGS_TO_DELETE = [
  'codigo-de-conducta-empresarial',
  'curso-de-prueba',
  'test-course',
  'demo-course',
];

const TITLES_TO_DELETE = [
  'Código de Conducta Empresarial',
];

// ── Estudiantes ───────────────────────────────────────────────────────────────

const STUDENTS = [
  { firstName: 'Carlos',    lastName: 'Rodríguez',  email: 'carlos.rodriguez@empresa.local' },
  { firstName: 'Ana',       lastName: 'Martínez',   email: 'ana.martinez@empresa.local' },
  { firstName: 'Diego',     lastName: 'López',      email: 'diego.lopez@empresa.local' },
  { firstName: 'Sofía',     lastName: 'García',     email: 'sofia.garcia@empresa.local' },
  { firstName: 'Lucía',     lastName: 'Fernández',  email: 'lucia.fernandez@empresa.local' },
  { firstName: 'Martín',    lastName: 'Torres',     email: 'martin.torres@empresa.local' },
  { firstName: 'Valentina', lastName: 'Sánchez',    email: 'valentina.sanchez@empresa.local' },
  { firstName: 'Nicolás',   lastName: 'Pérez',      email: 'nicolas.perez@empresa.local' },
  { firstName: 'Camila',    lastName: 'Álvarez',    email: 'camila.alvarez@empresa.local' },
  { firstName: 'Sebastián', lastName: 'Díaz',       email: 'sebastian.diaz@empresa.local' },
  { firstName: 'Florencia', lastName: 'Muñoz',      email: 'florencia.munoz@empresa.local' },
  { firstName: 'Agustín',   lastName: 'Romero',     email: 'agustin.romero@empresa.local' },
  { firstName: 'Julieta',   lastName: 'Herrera',    email: 'julieta.herrera@empresa.local' },
  { firstName: 'Pablo',     lastName: 'Morales',    email: 'pablo.morales@empresa.local' },
  { firstName: 'Micaela',   lastName: 'Ruiz',       email: 'micaela.ruiz@empresa.local' },
];

// ── Distribución de progreso ──────────────────────────────────────────────────
// index 0-14 = estudiante, valor = cuántos cursos completa (0 = solo inscripto en C1)

const PROGRESS_MAP: { completedCourses: number; activeInCourse: number; lessonFraction: number }[] = [
  { completedCourses: 4, activeInCourse: 0, lessonFraction: 1 },   // 0 — completó toda la carrera
  { completedCourses: 4, activeInCourse: 0, lessonFraction: 1 },   // 1
  { completedCourses: 3, activeInCourse: 4, lessonFraction: 0.5 }, // 2 — completó 1-3, mitad del 4
  { completedCourses: 3, activeInCourse: 4, lessonFraction: 0.3 }, // 3
  { completedCourses: 2, activeInCourse: 3, lessonFraction: 0.8 }, // 4 — completó 1-2, avanzado en 3
  { completedCourses: 2, activeInCourse: 3, lessonFraction: 0.4 }, // 5
  { completedCourses: 1, activeInCourse: 2, lessonFraction: 0.9 }, // 6 — completó 1, casi termina 2
  { completedCourses: 1, activeInCourse: 2, lessonFraction: 0.5 }, // 7
  { completedCourses: 1, activeInCourse: 2, lessonFraction: 0.2 }, // 8
  { completedCourses: 0, activeInCourse: 1, lessonFraction: 1 },   // 9 — solo curso 1, todas las lecciones
  { completedCourses: 0, activeInCourse: 1, lessonFraction: 0.7 }, // 10
  { completedCourses: 0, activeInCourse: 1, lessonFraction: 0.5 }, // 11
  { completedCourses: 0, activeInCourse: 1, lessonFraction: 0.3 }, // 12
  { completedCourses: 0, activeInCourse: 1, lessonFraction: 0.1 }, // 13 — recién inscripto
  { completedCourses: 0, activeInCourse: 1, lessonFraction: 0 },   // 14
];

const XP_BY_PROGRESS = [800, 750, 620, 580, 450, 390, 310, 240, 180, 160, 130, 100, 70, 40, 20];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🧹 Iniciando limpieza y configuración de inscripciones...\n');

  // 1 ── Eliminar cursos viejos ────────────────────────────────────────────────

  for (const s of SLUGS_TO_DELETE) {
    const c = await prisma.course.findUnique({ where: { slug: s } });
    if (c) {
      await prisma.course.delete({ where: { id: c.id } });
      console.log(`  🗑️  Eliminado: "${c.title}"`);
    }
  }

  for (const title of TITLES_TO_DELETE) {
    const c = await prisma.course.findFirst({ where: { title } });
    if (c) {
      await prisma.course.delete({ where: { id: c.id } });
      console.log(`  🗑️  Eliminado: "${c.title}"`);
    }
  }

  // También eliminamos cualquier otro curso que no sea de la carrera
  const carreraSlugs = [
    'fundamentos-de-etica-empresarial',
    'integridad-y-prevencion-de-la-corrupcion',
    'dilemas-eticos-y-toma-de-decisiones',
    'liderazgo-etico-y-cultura-organizacional',
  ];
  const otrosCursos = await prisma.course.findMany({
    where: { slug: { notIn: carreraSlugs } },
    select: { id: true, title: true },
  });
  for (const c of otrosCursos) {
    await prisma.course.delete({ where: { id: c.id } });
    console.log(`  🗑️  Eliminado (no pertenece a la carrera): "${c.title}"`);
  }

  console.log('\n✓ Limpieza completada\n');

  // 2 ── Verificar que los 4 cursos existen ───────────────────────────────────

  const courses = await prisma.course.findMany({
    where: { slug: { in: carreraSlugs } },
    orderBy: { createdAt: 'asc' },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: 'asc' },
            select: { id: true },
          },
        },
      },
    },
  });

  if (courses.length < 4) {
    console.error(`❌ Solo se encontraron ${courses.length}/4 cursos de la carrera.`);
    console.error('   Ejecutá primero: npx ts-node --project tsconfig.json prisma/seed-carrera-etica.ts');
    process.exit(1);
  }
  console.log(`✓ ${courses.length} cursos de la carrera encontrados:`);
  courses.forEach((c, i) => console.log(`  ${i + 1}. ${c.title}`));

  // 3 ── Badge global ─────────────────────────────────────────────────────────

  const firstEnrollBadge = await prisma.badge.findFirst({
    where: { criteriaType: BadgeCriteria.FIRST_ENROLLMENT, courseId: null },
  });

  // 4 ── Crear/encontrar estudiantes ──────────────────────────────────────────

  const studentIds: string[] = [];

  for (const s of STUDENTS) {
    let user = await prisma.user.findUnique({ where: { email: s.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: s.email,
          passwordHash: await HASH('Demo1234!'),
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          profile: { create: { firstName: s.firstName, lastName: s.lastName } },
        },
      });
    }
    studentIds.push(user.id);
  }
  console.log(`\n✓ ${studentIds.length} estudiantes listos`);

  // 5 ── Inscripción y progreso ───────────────────────────────────────────────

  for (let si = 0; si < studentIds.length; si++) {
    const studentId = studentIds[si];
    const prog = PROGRESS_MAP[si];
    const studentName = `${STUDENTS[si].firstName} ${STUDENTS[si].lastName}`;
    let totalXp = 0;

    // ── Cursos completados ────────────────────────────────────────────────────
    for (let ci = 0; ci < prog.completedCourses; ci++) {
      const course = courses[ci];
      const allLessons = course.modules.flatMap(m => m.lessons);

      await prisma.enrollment.upsert({
        where: { studentId_courseId: { studentId, courseId: course.id } },
        update: { status: EnrollmentStatus.COMPLETED },
        create: { studentId, courseId: course.id, status: EnrollmentStatus.COMPLETED },
      });

      for (const lesson of allLessons) {
        await prisma.lessonProgress.upsert({
          where: { studentId_lessonId: { studentId, lessonId: lesson.id } },
          update: {},
          create: { studentId, lessonId: lesson.id },
        });
      }

      await prisma.certificate.upsert({
        where: { studentId_courseId: { studentId, courseId: course.id } },
        update: {},
        create: {
          studentId,
          courseId: course.id,
          certificateNumber: `ETICA-C${ci + 1}-${String(si + 1).padStart(3, '0')}`,
        },
      });

      const courseBadge = await prisma.badge.findFirst({
        where: { criteriaType: BadgeCriteria.COURSE_COMPLETE, id: `badge-etica-c${ci + 1}` },
      });
      if (courseBadge) {
        await prisma.userBadge.upsert({
          where: { userId_badgeId: { userId: studentId, badgeId: courseBadge.id } },
          update: {},
          create: { userId: studentId, badgeId: courseBadge.id },
        });
      }

      totalXp += 200;
    }

    // ── Curso activo (en progreso) ────────────────────────────────────────────
    if (prog.activeInCourse > 0 && prog.activeInCourse <= courses.length) {
      const course = courses[prog.activeInCourse - 1];
      const allLessons = course.modules.flatMap(m => m.lessons);
      const toComplete = Math.floor(allLessons.length * prog.lessonFraction);

      await prisma.enrollment.upsert({
        where: { studentId_courseId: { studentId, courseId: course.id } },
        update: { status: EnrollmentStatus.ACTIVE },
        create: { studentId, courseId: course.id, status: EnrollmentStatus.ACTIVE },
      });

      for (let li = 0; li < toComplete; li++) {
        await prisma.lessonProgress.upsert({
          where: { studentId_lessonId: { studentId, lessonId: allLessons[li].id } },
          update: {},
          create: { studentId, lessonId: allLessons[li].id },
        });
      }

      totalXp += Math.floor(100 * prog.lessonFraction);
    }

    // ── XP acumulado ──────────────────────────────────────────────────────────
    await prisma.userXp.upsert({
      where: { userId: studentId },
      update: { totalXp },
      create: { userId: studentId, totalXp },
    });

    if (totalXp > 0) {
      const existing = await prisma.xpTransaction.findFirst({
        where: { userId: studentId, reason: 'Progreso en Carrera de Ética (seed)' },
      });
      if (!existing) {
        await prisma.xpTransaction.create({
          data: { userId: studentId, amount: totalXp, reason: 'Progreso en Carrera de Ética (seed)' },
        });
      }
    }

    // ── Badge de primera inscripción ──────────────────────────────────────────
    if (firstEnrollBadge) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: studentId, badgeId: firstEnrollBadge.id } },
        update: {},
        create: { userId: studentId, badgeId: firstEnrollBadge.id },
      });
    }

    // ── Reseña para cursos completados ────────────────────────────────────────
    for (let ci = 0; ci < prog.completedCourses; ci++) {
      const course = courses[ci];
      await prisma.courseReview.upsert({
        where: { courseId_studentId: { courseId: course.id, studentId } },
        update: {},
        create: {
          courseId: course.id,
          studentId,
          rating: pick([4, 5, 5, 5]),
          comment: pick([
            'Excelente contenido, muy aplicable al trabajo diario.',
            'Los casos de estudio son muy representativos de situaciones reales.',
            'Los dilemas éticos me hicieron reflexionar mucho.',
            'Muy bien estructurado y con ejemplos relevantes.',
            'El mejor curso de formación ética que hice.',
          ]),
        },
      });
    }

    const enrolledCount = prog.completedCourses + (prog.activeInCourse > 0 ? 1 : 0);
    console.log(
      `  ✓ ${studentName.padEnd(20)} — completó ${prog.completedCourses}/4 cursos` +
      (prog.activeInCourse > 0 ? `, activo en C${prog.activeInCourse} (${Math.round(prog.lessonFraction * 100)}%)` : '') +
      ` · ${totalXp} XP`,
    );
  }

  // 6 ── Resumen ──────────────────────────────────────────────────────────────

  console.log('\n════════════════════════════════════════════');
  console.log('✅ INSCRIPCIONES COMPLETADAS');
  console.log('════════════════════════════════════════════');
  console.log('\n📚 Cursos activos:');
  courses.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.title}`);
  });
  console.log('\n👥 Estudiantes (contraseña: Demo1234!):');
  STUDENTS.forEach((s, i) => {
    const p = PROGRESS_MAP[i];
    const label = p.completedCourses === 4
      ? '🏆 Carrera completa'
      : p.completedCourses > 0
        ? `✅ ${p.completedCourses} cursos completados`
        : `📖 En progreso`;
    console.log(`   ${s.email.padEnd(38)} ${label}`);
  });
  console.log('\n🆕 Distribución:');
  console.log('   2 estudiantes — Completaron toda la carrera');
  console.log('   2 estudiantes — Completaron 3 cursos');
  console.log('   3 estudiantes — Completaron 1-2 cursos');
  console.log('   5 estudiantes — En progreso (Curso 1)');
  console.log('   3 estudiantes — Recién inscriptos');
  console.log('════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Seed falló:', e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
