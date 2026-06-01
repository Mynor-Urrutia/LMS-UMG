/**
 * seed-demo.ts — Datos de prueba para el curso "Código de Conducta"
 * Crea: 1 docente, 15 estudiantes, el curso completo con todos los tipos de contenido,
 * encuestas, dilemas éticos, apps embebidas, XP, badges, calificaciones y progreso variado.
 *
 * Correr con:
 *   $env:DATABASE_URL="mysql://lms_user:LmsPass2024@127.0.0.1:3306/lms_db"
 *   npx ts-node --project tsconfig.json prisma/seed-demo.ts
 */

import {
  AssignmentType,
  BadgeCriteria,
  Difficulty,
  EnrollmentStatus,
  EnrollmentType,
  LessonType,
  PrismaClient,
  Role,
  SurveyQuestionType,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const HASH = (pw: string) => bcrypt.hash(pw, 10);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slug(title: string) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de demo...\n');

  // ── Categoría ────────────────────────────────────────────────────────────────
  const category = await prisma.courseCategory.upsert({
    where: { slug: 'cumplimiento-empresarial' },
    update: {},
    create: { name: 'Cumplimiento Empresarial', slug: 'cumplimiento-empresarial' },
  });
  console.log('✓ Categoría creada');

  // ── Badge de Nivel Up ────────────────────────────────────────────────────────
  const levelBadge = await prisma.badge.upsert({
    where: { id: 'badge-level-up-system' },
    update: {},
    create: {
      id: 'badge-level-up-system',
      name: 'Subiste de Nivel',
      description: 'Alcanzaste un nuevo nivel en la plataforma.',
      criteriaType: BadgeCriteria.LEVEL_UP,
      courseId: null,
    },
  });

  const guardianBadge = await prisma.badge.upsert({
    where: { id: 'badge-guardian-codigo' },
    update: {},
    create: {
      id: 'badge-guardian-codigo',
      name: 'Guardián del Código',
      description: 'Completaste el curso de Código de Conducta con éxito.',
      criteriaType: BadgeCriteria.COURSE_COMPLETE,
      courseId: null,
    },
  });
  console.log('✓ Badges creados');

  // ── Docente ──────────────────────────────────────────────────────────────────
  const teacherEmail = 'docente.conducta@empresa.local';
  let teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) {
    teacher = await prisma.user.create({
      data: {
        email: teacherEmail,
        passwordHash: await HASH('Demo1234!'),
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        profile: { create: { firstName: 'María', lastName: 'González' } },
      },
    });
  }
  console.log(`✓ Docente: ${teacherEmail} / Demo1234!`);

  // ── Curso ────────────────────────────────────────────────────────────────────
  const courseSlug = slug('Codigo de Conducta Empresarial');
  let course = await prisma.course.findUnique({ where: { slug: courseSlug } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        teacherId: teacher.id,
        categoryId: category.id,
        title: 'Código de Conducta Empresarial',
        slug: courseSlug,
        description: 'Aprende los valores y principios que guían nuestra organización. Curso obligatorio para todos los colaboradores. Incluye dilemas éticos reales, casos de estudio y evaluaciones prácticas.',
        difficulty: Difficulty.BEGINNER,
        status: 'PUBLISHED',
        enrollmentType: EnrollmentType.OPEN,
      },
    });
  }
  console.log(`✓ Curso creado: ${course.title}`);

  // ── Badge específico del curso ────────────────────────────────────────────────
  const courseBadge = await prisma.badge.upsert({
    where: { id: `badge-course-${course.id}` },
    update: {},
    create: {
      id: `badge-course-${course.id}`,
      name: 'Embajador del Código',
      description: 'Completaste el curso y estás comprometido con nuestros valores.',
      criteriaType: BadgeCriteria.COURSE_COMPLETE,
      courseId: course.id,
    },
  });

  // ── Módulos y lecciones ───────────────────────────────────────────────────────

  // Módulo 1 — sin prerequisito
  const mod1 = await prisma.courseModule.upsert({
    where: { courseId_order: { courseId: course.id, order: 1 } },
    update: {},
    create: {
      courseId: course.id,
      title: 'Módulo 1: ¿Qué es el Código de Conducta?',
      order: 1,
      prerequisiteModuleId: null,
    },
  });

  const lessons1 = [
    {
      title: 'Bienvenida e introducción',
      type: LessonType.TEXT,
      content: `<h2>Bienvenido/a al curso</h2>
<p>El <strong>Código de Conducta</strong> es el conjunto de principios y valores que guían el comportamiento de todos los colaboradores de nuestra organización.</p>
<p>En este curso vas a aprender:</p>
<ul>
  <li>Qué esperamos de cada persona en la empresa</li>
  <li>Cómo identificar y resolver dilemas éticos</li>
  <li>Cuáles son los canales para reportar irregularidades</li>
  <li>Cómo aplicar los principios en situaciones del día a día</li>
</ul>
<blockquote>
  <p>"La ética no es un lujo, es la base de todo negocio sostenible." — Dirección General</p>
</blockquote>`,
      isPublished: true,
    },
    {
      title: 'Infografía: Nuestros 5 Valores Fundamentales',
      type: LessonType.TEXT,
      content: `<h2>Nuestros Valores</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
  <div style="background:#eff6ff;padding:1rem;border-radius:8px;border-left:4px solid #3b82f6">
    <h3>🤝 Integridad</h3>
    <p>Actuamos con honestidad y transparencia en todo momento, incluso cuando nadie nos observa.</p>
  </div>
  <div style="background:#f0fdf4;padding:1rem;border-radius:8px;border-left:4px solid #22c55e">
    <h3>💡 Innovación Responsable</h3>
    <p>Buscamos nuevas ideas siempre dentro de los límites éticos y legales.</p>
  </div>
  <div style="background:#fefce8;padding:1rem;border-radius:8px;border-left:4px solid #eab308">
    <h3>🌍 Responsabilidad Social</h3>
    <p>Nuestras decisiones consideran el impacto en la comunidad y el medio ambiente.</p>
  </div>
  <div style="background:#fdf4ff;padding:1rem;border-radius:8px;border-left:4px solid #a855f7">
    <h3>🔒 Confidencialidad</h3>
    <p>Protegemos la información de clientes, colaboradores y la organización.</p>
  </div>
</div>
<div style="background:#fff1f2;padding:1rem;border-radius:8px;border-left:4px solid #ef4444;margin-top:1rem">
  <h3>⚖️ Justicia</h3>
  <p>Tratamos a todas las personas con equidad y sin discriminación.</p>
</div>`,
      isPublished: true,
    },
    {
      title: 'Video: Mensaje de la Dirección',
      type: LessonType.VIDEO,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      isPublished: true,
    },
    {
      title: 'App interactiva: ¿Qué sabés del Código?',
      type: LessonType.EMBED,
      embedUrl: 'https://www.mentimeter.com/app/presentation/demo',
      isPublished: true,
    },
  ];

  for (let i = 0; i < lessons1.length; i++) {
    const l = lessons1[i];
    await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: mod1.id, order: i + 1 } },
      update: {},
      create: { moduleId: mod1.id, order: i + 1, ...l } as any,
    });
  }

  // Módulo 2 — prerequisito: mod1
  const mod2 = await prisma.courseModule.upsert({
    where: { courseId_order: { courseId: course.id, order: 2 } },
    update: { prerequisiteModuleId: mod1.id },
    create: {
      courseId: course.id,
      title: 'Módulo 2: Principios y Aplicación',
      order: 2,
      prerequisiteModuleId: mod1.id,
    },
  });

  const lessons2 = [
    {
      title: 'Conflicto de intereses: ¿qué hacer?',
      type: LessonType.TEXT,
      content: `<h2>¿Qué es un conflicto de intereses?</h2>
<p>Un conflicto de intereses ocurre cuando un interés personal puede afectar (o parecer que afecta) la objetividad de nuestras decisiones profesionales.</p>
<h3>Ejemplos comunes</h3>
<ul>
  <li>Recibir regalos de proveedores antes de una licitación</li>
  <li>Supervisar a un familiar directo</li>
  <li>Tener inversiones en una empresa competidora</li>
  <li>Usar recursos de la empresa para proyectos personales</li>
</ul>
<h3>¿Qué debés hacer?</h3>
<ol>
  <li><strong>Declará</strong> la situación a tu supervisor inmediato</li>
  <li><strong>Abstente</strong> de participar en decisiones relacionadas</li>
  <li><strong>Documentá</strong> la situación por escrito</li>
</ol>`,
      isPublished: true,
    },
    {
      title: 'Brainstorming: Situaciones del día a día',
      type: LessonType.TEXT,
      content: `<h2>Actividad de Reflexión Grupal</h2>
<p>Participá en el foro del curso con el hilo <strong>"Brainstorming: Situaciones éticas cotidianas"</strong>.</p>
<p>Compartí una situación (real o hipotética) donde alguien en tu área podría enfrentar un dilema ético. No incluyas nombres ni datos que permitan identificar personas.</p>
<h3>Guía para tu aporte</h3>
<ul>
  <li>¿Cuál es la situación?</li>
  <li>¿Qué opciones tiene la persona?</li>
  <li>¿Cuál sería la decisión alineada con el Código de Conducta?</li>
</ul>`,
      isPublished: true,
    },
    {
      title: 'Herramienta: Análisis de alternativas',
      type: LessonType.EMBED,
      embedUrl: 'https://kahoot.it',
      isPublished: true,
    },
  ];

  for (let i = 0; i < lessons2.length; i++) {
    const l = lessons2[i];
    await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: mod2.id, order: i + 1 } },
      update: {},
      create: { moduleId: mod2.id, order: i + 1, ...l } as any,
    });
  }

  // Módulo 3 — prerequisito: mod2
  const mod3 = await prisma.courseModule.upsert({
    where: { courseId_order: { courseId: course.id, order: 3 } },
    update: { prerequisiteModuleId: mod2.id },
    create: {
      courseId: course.id,
      title: 'Módulo 3: Casos de Estudio y Dilemas',
      order: 3,
      prerequisiteModuleId: mod2.id,
    },
  });

  const lessons3 = [
    {
      title: 'Caso 1: El informe alterado',
      type: LessonType.TEXT,
      content: `<h2>Caso de Estudio: El informe alterado</h2>
<p><strong>Situación:</strong> Lucía trabaja en el área financiera. Su jefe le pide que ajuste unas cifras en un informe de ventas para que el resultado trimestral "se vea mejor" ante los inversores. Le asegura que "todos lo hacen" y que nadie se va a enterar.</p>
<h3>Preguntas para reflexionar</h3>
<ol>
  <li>¿Qué principios del Código de Conducta están en juego?</li>
  <li>¿Qué consecuencias legales y reputacionales podría tener?</li>
  <li>¿Qué opciones tiene Lucía?</li>
  <li>¿Cuál sería la decisión correcta? ¿Por qué?</li>
</ol>
<p>Después de reflexionar, respondé el <strong>Dilema ético</strong> asociado a esta lección.</p>`,
      isPublished: true,
    },
    {
      title: 'Caso 2: El regalo del proveedor',
      type: LessonType.TEXT,
      content: `<h2>Caso de Estudio: El regalo del proveedor</h2>
<p><strong>Situación:</strong> Marcos es responsable de compras. Un proveedor con quien está negociando un contrato importante le regala dos entradas para el partido de fútbol más esperado del año. "Es solo un gesto de buena voluntad", le dice.</p>
<h3>El dilema</h3>
<p>Marcos sabe que la empresa tiene una política sobre regalos, pero las entradas cuestan mucho dinero y realmente quiere ir al partido.</p>
<h3>Preguntas</h3>
<ol>
  <li>¿Puede aceptar las entradas? ¿Bajo qué condiciones?</li>
  <li>¿Cómo afecta este regalo su objetividad en la negociación?</li>
  <li>¿Qué dice nuestro Código de Conducta sobre regalos?</li>
</ol>`,
      isPublished: true,
    },
  ];

  for (let i = 0; i < lessons3.length; i++) {
    const l = lessons3[i];
    await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: mod3.id, order: i + 1 } },
      update: {},
      create: { moduleId: mod3.id, order: i + 1, ...l } as any,
    });
  }

  // Módulo 4 — prerequisito: mod3
  const mod4 = await prisma.courseModule.upsert({
    where: { courseId_order: { courseId: course.id, order: 4 } },
    update: { prerequisiteModuleId: mod3.id },
    create: {
      courseId: course.id,
      title: 'Módulo 4: Evaluación Final',
      order: 4,
      prerequisiteModuleId: mod3.id,
    },
  });

  await prisma.lesson.upsert({
    where: { moduleId_order: { moduleId: mod4.id, order: 1 } },
    update: {},
    create: {
      moduleId: mod4.id,
      order: 1,
      title: 'Instrucciones para la evaluación final',
      type: LessonType.TEXT,
      isPublished: true,
      content: `<h2>Evaluación Final — Código de Conducta</h2>
<p>Esta evaluación consta de <strong>10 preguntas</strong> sobre los temas vistos en el curso.</p>
<ul>
  <li>Tenés <strong>1 solo intento</strong></li>
  <li>La nota mínima de aprobación es <strong>70/100</strong></li>
  <li>Al aprobar, recibirás tu <strong>certificado digital</strong> y el badge <strong>Guardián del Código</strong></li>
</ul>
<p>¡Éxitos!</p>`,
    },
  });

  console.log('✓ Módulos y lecciones creados');

  // ── Assignments / Dilemas éticos ──────────────────────────────────────────────

  // Dilema 1
  let dilemma1 = await prisma.assignment.findFirst({ where: { courseId: course.id, title: 'Dilema Ético #1: El informe falsificado' } });
  if (!dilemma1) {
    dilemma1 = await prisma.assignment.create({
      data: {
        courseId: course.id,
        title: 'Dilema Ético #1: El informe falsificado',
        description: 'Analizá la situación del Caso 1 y elegí la opción que mejor refleja los valores de la empresa.',
        type: AssignmentType.DILEMMA,
        maxScore: 100,
        weight: 2,
      },
    });
    await prisma.dilemmaScenario.create({
      data: {
        assignmentId: dilemma1.id,
        scenario: 'Tu jefe te pide que modifiques unas cifras en el informe trimestral para que los resultados "se vean mejor" ante los inversores. Te asegura que nadie se va a enterar y que es algo que "todos hacen". Tenés que entregar el informe mañana a primera hora.',
        choices: {
          create: [
            {
              text: 'Modifico las cifras como pide mi jefe. Confío en que sabe lo que hace y no quiero tener problemas.',
              consequence: 'Esta decisión viola el principio de Integridad del Código de Conducta. Alterar datos financieros puede constituir fraude contable, con consecuencias legales para vos y la empresa. Además, una vez que se inicia este comportamiento es muy difícil detenerlo.',
              ethicalScore: 5,
              order: 1,
            },
            {
              text: 'Me niego y le explico a mi jefe que no puedo hacerlo porque viola las normas de la empresa. Le propongo buscar otra forma de presentar los datos con honestidad.',
              consequence: '¡Excelente decisión! Actuaste con integridad y transparencia, dos valores fundamentales de nuestro Código. Aunque puede ser difícil enfrentarse al jefe, protegiste a la empresa y a vos mismo/a de consecuencias graves. Este es el comportamiento que esperamos.',
              ethicalScore: 100,
              order: 2,
            },
            {
              text: 'Modifico las cifras pero guardo una copia del informe original, por si acaso.',
              consequence: 'Si bien guardar evidencia muestra cierta conciencia del problema, el acto de modificar las cifras sigue siendo una falta ética y potencialmente ilegal. La solución correcta es no hacerlo, no solo cubrirse.',
              ethicalScore: 20,
              order: 3,
            },
            {
              text: 'Reporto la situación al área de Cumplimiento o al canal de denuncias anónimas de la empresa.',
              consequence: 'Muy buena decisión. Reportar irregularidades a través de los canales correctos es exactamente lo que el Código de Conducta establece. Protegés la empresa, actuás con integridad y usás los mecanismos diseñados para estas situaciones.',
              ethicalScore: 95,
              order: 4,
            },
          ],
        },
      },
    });
  }

  // Dilema 2
  let dilemma2 = await prisma.assignment.findFirst({ where: { courseId: course.id, title: 'Dilema Ético #2: El regalo del proveedor' } });
  if (!dilemma2) {
    dilemma2 = await prisma.assignment.create({
      data: {
        courseId: course.id,
        title: 'Dilema Ético #2: El regalo del proveedor',
        description: 'Decidí cómo actúa Marcos ante el regalo de su proveedor.',
        type: AssignmentType.DILEMMA,
        maxScore: 100,
        weight: 2,
      },
    });
    await prisma.dilemmaScenario.create({
      data: {
        assignmentId: dilemma2.id,
        scenario: 'Sos Marcos, responsable de compras, y estás negociando un contrato de $500.000 con un proveedor. El proveedor te regala dos entradas para la final del campeonato de fútbol (valor: $800 c/u). "Es solo un gesto de aprecio personal, no tiene nada que ver con el contrato", te dice.',
        choices: {
          create: [
            {
              text: 'Acepto las entradas. Son un regalo personal y el contrato es un tema completamente separado.',
              consequence: 'Incluso si tus intenciones son buenas, aceptar regalos de proveedores activos crea un conflicto de intereses real o percibido. Nuestra política prohíbe aceptar regalos de valor significativo de proveedores con quienes tenés relación comercial activa.',
              ethicalScore: 10,
              order: 1,
            },
            {
              text: 'Rechazo las entradas cortésmente y explico que la política de la empresa no me permite aceptarlas.',
              consequence: '¡Decisión impecable! Rechazar el regalo protege tu objetividad y la reputación de la empresa. El proveedor profesional entenderá y respetará tu posición. Esta es exactamente la respuesta que el Código de Conducta espera.',
              ethicalScore: 100,
              order: 2,
            },
            {
              text: 'Acepto las entradas pero lo declaro en el registro de regalos de la empresa.',
              consequence: 'Declarar el regalo es mejor que ocultarlo, pero nuestra política establece un límite de valor para regalos aceptables. Entradas de alto valor de un proveedor activo siguen siendo inapropiadas incluso si se declaran. Lo correcto es rechazarlas.',
              ethicalScore: 40,
              order: 3,
            },
            {
              text: 'Acepto las entradas y se las paso a un compañero para evitar yo ir al partido.',
              consequence: 'Aunque no vas al partido, aceptar y redistribuir el regalo sigue siendo problemático. El conflicto de intereses existe por el hecho de recibirlo, independientemente de quién lo use. Además, implicás a un compañero en la situación.',
              ethicalScore: 15,
              order: 4,
            },
          ],
        },
      },
    });
  }

  // Assignment de reflexión escrita
  let reflectionAssignment = await prisma.assignment.findFirst({ where: { courseId: course.id, title: 'Reflexión personal: Mi compromiso con el Código' } });
  if (!reflectionAssignment) {
    reflectionAssignment = await prisma.assignment.create({
      data: {
        courseId: course.id,
        title: 'Reflexión personal: Mi compromiso con el Código',
        description: 'Escribí una reflexión de 300 a 500 palabras sobre cómo aplicarás los principios del Código de Conducta en tu trabajo diario. Identificá al menos 2 situaciones concretas de tu área donde estos principios son relevantes.',
        type: AssignmentType.TEXT,
        maxScore: 100,
        weight: 3,
      },
    });
  }

  console.log('✓ Assignments y dilemas creados');

  // ── Evaluación final ──────────────────────────────────────────────────────────

  let evaluation = await prisma.evaluation.findFirst({ where: { courseId: course.id, title: 'Evaluación Final: Código de Conducta' } });
  if (!evaluation) {
    evaluation = await prisma.evaluation.create({
      data: {
        courseId: course.id,
        title: 'Evaluación Final: Código de Conducta',
        description: 'Evaluación de 10 preguntas sobre los contenidos del curso. Nota mínima de aprobación: 70 puntos.',
        totalPoints: 100,
        isPublished: true,
        questions: {
          create: [
            { text: '¿Cuál es el principal objetivo del Código de Conducta?', type: 'MCQ', points: 10, order: 1, options: { create: [
              { text: 'Aumentar las ventas de la empresa', isCorrect: false, order: 1 },
              { text: 'Establecer los principios éticos que guían el comportamiento de todos los colaboradores', isCorrect: true, order: 2 },
              { text: 'Describir el organigrama de la empresa', isCorrect: false, order: 3 },
              { text: 'Regular los horarios de trabajo', isCorrect: false, order: 4 },
            ]}},
            { text: '¿Cuál de las siguientes situaciones constituye un conflicto de intereses?', type: 'MCQ', points: 10, order: 2, options: { create: [
              { text: 'Trabajar horas extra cuando el proyecto lo requiere', isCorrect: false, order: 1 },
              { text: 'Supervisar a un familiar directo en la misma área', isCorrect: true, order: 2 },
              { text: 'Asistir a una capacitación pagada por la empresa', isCorrect: false, order: 3 },
              { text: 'Usar el email corporativo para temas de trabajo', isCorrect: false, order: 4 },
            ]}},
            { text: '¿Qué debés hacer si detectás una posible irregularidad o comportamiento contrario al Código?', type: 'MCQ', points: 10, order: 3, options: { create: [
              { text: 'Ignorarlo, no es tu problema', isCorrect: false, order: 1 },
              { text: 'Comentarlo solo con tus compañeros de confianza', isCorrect: false, order: 2 },
              { text: 'Reportarlo a través de los canales de denuncia establecidos por la empresa', isCorrect: true, order: 3 },
              { text: 'Esperar a ver si se repite antes de actuar', isCorrect: false, order: 4 },
            ]}},
            { text: 'Un colaborador puede aceptar regalos de proveedores sin restricciones siempre que sean de uso personal.', type: 'TRUE_FALSE', points: 10, order: 4, options: { create: [
              { text: 'Verdadero', isCorrect: false, order: 1 },
              { text: 'Falso', isCorrect: true, order: 2 },
            ]}},
            { text: '¿Cuál de los siguientes es un valor fundamental según nuestro Código de Conducta?', type: 'MCQ', points: 10, order: 5, options: { create: [
              { text: 'Maximización de ganancias a cualquier costo', isCorrect: false, order: 1 },
              { text: 'Integridad y transparencia en todas las actuaciones', isCorrect: true, order: 2 },
              { text: 'Competencia desleal para ganar mercado', isCorrect: false, order: 3 },
              { text: 'Confidencialidad solo con clientes VIP', isCorrect: false, order: 4 },
            ]}},
            { text: 'La confidencialidad aplica solo a la información de clientes externos.', type: 'TRUE_FALSE', points: 10, order: 6, options: { create: [
              { text: 'Verdadero', isCorrect: false, order: 1 },
              { text: 'Falso', isCorrect: true, order: 2 },
            ]}},
            { text: '¿Qué tipo de trato debe recibir todos los colaboradores según el principio de Justicia?', type: 'MCQ', points: 10, order: 7, options: { create: [
              { text: 'Preferencial si tienen más antigüedad', isCorrect: false, order: 1 },
              { text: 'Equitativo y sin discriminación de ningún tipo', isCorrect: true, order: 2 },
              { text: 'Diferenciado según su cargo jerárquico', isCorrect: false, order: 3 },
              { text: 'Variable según los resultados del trimestre', isCorrect: false, order: 4 },
            ]}},
            { text: '¿Cuál es la acción correcta si tu jefe te pide hacer algo que va en contra del Código de Conducta?', type: 'MCQ', points: 10, order: 8, options: { create: [
              { text: 'Hacerlo porque el jefe siempre tiene razón', isCorrect: false, order: 1 },
              { text: 'Hacerlo pero guardando evidencia por si acaso', isCorrect: false, order: 2 },
              { text: 'Negarme, comunicarlo al área de Cumplimiento y documentar la situación', isCorrect: true, order: 3 },
              { text: 'Hacerlo esta vez y luego buscar otro trabajo', isCorrect: false, order: 4 },
            ]}},
            { text: 'Puedo usar recursos de la empresa (computadora, internet, impresora) para proyectos personales en horario laboral.', type: 'TRUE_FALSE', points: 10, order: 9, options: { create: [
              { text: 'Verdadero', isCorrect: false, order: 1 },
              { text: 'Falso', isCorrect: true, order: 2 },
            ]}},
            { text: 'El Código de Conducta aplica:', type: 'MCQ', points: 10, order: 10, options: { create: [
              { text: 'Solo durante el horario de trabajo en la oficina', isCorrect: false, order: 1 },
              { text: 'Solo en los primeros 6 meses de empleo', isCorrect: false, order: 2 },
              { text: 'En todo momento y contexto relacionado con la empresa, incluyendo trabajo remoto y viajes', isCorrect: true, order: 3 },
              { text: 'Solo a los mandos directivos', isCorrect: false, order: 4 },
            ]}},
          ],
        },
      },
    });
  }
  console.log('✓ Evaluación final creada');

  // ── Encuestas ─────────────────────────────────────────────────────────────────

  let surveyPre = await prisma.survey.findFirst({ where: { courseId: course.id, title: 'Encuesta de diagnóstico inicial' } });
  if (!surveyPre) {
    surveyPre = await prisma.survey.create({
      data: {
        courseId: course.id,
        title: 'Encuesta de diagnóstico inicial',
        description: 'Antes de comenzar, contanos cuánto sabés sobre ética empresarial.',
        isAnonymous: true,
        isOpen: true,
        questions: {
          create: [
            { text: '¿Conocías la existencia de un Código de Conducta en la empresa?', type: SurveyQuestionType.YES_NO, options: ['Sí', 'No'], order: 1 },
            { text: '¿Alguna vez te encontraste en una situación ética difícil en el trabajo?', type: SurveyQuestionType.YES_NO, options: ['Sí', 'No'], order: 2 },
            { text: '¿Qué tan cómodo/a te sentís reportando irregularidades?', type: SurveyQuestionType.LIKERT, order: 3 },
            { text: '¿Cuál es el tema de ética que más te genera dudas en tu trabajo diario?', type: SurveyQuestionType.MULTIPLE_CHOICE, options: ['Conflicto de intereses', 'Uso de recursos de la empresa', 'Confidencialidad de información', 'Regalos y beneficios', 'Relaciones con proveedores'], order: 4 },
            { text: 'Comentarios adicionales o preguntas que quieras que el curso responda:', type: SurveyQuestionType.TEXT, order: 5 },
          ],
        },
      },
    });
  }

  let surveyCierre = await prisma.survey.findFirst({ where: { courseId: course.id, title: 'Encuesta de cierre y satisfacción' } });
  if (!surveyCierre) {
    surveyCierre = await prisma.survey.create({
      data: {
        courseId: course.id,
        title: 'Encuesta de cierre y satisfacción',
        description: 'Tu opinión nos ayuda a mejorar. La encuesta es anónima y toma menos de 3 minutos.',
        isAnonymous: true,
        isOpen: true,
        questions: {
          create: [
            { text: '¿Qué tan relevante fue el contenido del curso para tu trabajo?', type: SurveyQuestionType.LIKERT, order: 1 },
            { text: '¿Los dilemas éticos presentados reflejan situaciones reales de la empresa?', type: SurveyQuestionType.LIKERT, order: 2 },
            { text: '¿Recomendarías este curso a un colega?', type: SurveyQuestionType.YES_NO, options: ['Sí', 'No'], order: 3 },
            { text: '¿Qué aspecto del curso te resultó más útil?', type: SurveyQuestionType.MULTIPLE_CHOICE, options: ['Los dilemas éticos', 'Los casos de estudio', 'La evaluación final', 'Las infografías', 'Las apps interactivas'], order: 4 },
            { text: '¿Qué mejorarías del curso?', type: SurveyQuestionType.TEXT, order: 5 },
          ],
        },
      },
    });
  }
  console.log('✓ Encuestas creadas');

  // ── Estudiantes ───────────────────────────────────────────────────────────────

  const studentData = [
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

  const students: { id: string; email: string }[] = [];

  for (const s of studentData) {
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
    students.push({ id: user.id, email: s.email });
  }
  console.log(`✓ ${students.length} estudiantes creados (contraseña: Demo1234!)`);

  // ── Inscripciones y progreso variado ─────────────────────────────────────────

  const allPublishedLessons = await prisma.lesson.findMany({
    where: { module: { courseId: course.id }, isPublished: true },
    select: { id: true, moduleId: true },
    orderBy: { order: 'asc' },
  });

  const lessonsInMod1 = allPublishedLessons.filter(l =>
    [mod1.id].includes(l.moduleId)
  );
  const lessonsInMod2 = allPublishedLessons.filter(l => l.moduleId === mod2.id);
  const lessonsInMod3 = allPublishedLessons.filter(l => l.moduleId === mod3.id);
  const lessonsInMod4 = allPublishedLessons.filter(l => l.moduleId === mod4.id);

  const progressScenarios = [
    // Completaron todo el curso
    { lessonsToComplete: allPublishedLessons, xp: 350, enrollmentStatus: EnrollmentStatus.COMPLETED },
    { lessonsToComplete: allPublishedLessons, xp: 320, enrollmentStatus: EnrollmentStatus.COMPLETED },
    { lessonsToComplete: allPublishedLessons, xp: 280, enrollmentStatus: EnrollmentStatus.COMPLETED },
    // Van por el módulo 3
    { lessonsToComplete: [...lessonsInMod1, ...lessonsInMod2, ...lessonsInMod3], xp: 180, enrollmentStatus: EnrollmentStatus.ACTIVE },
    { lessonsToComplete: [...lessonsInMod1, ...lessonsInMod2, ...lessonsInMod3.slice(0, 1)], xp: 140, enrollmentStatus: EnrollmentStatus.ACTIVE },
    // Van por el módulo 2
    { lessonsToComplete: [...lessonsInMod1, ...lessonsInMod2], xp: 120, enrollmentStatus: EnrollmentStatus.ACTIVE },
    { lessonsToComplete: [...lessonsInMod1, ...lessonsInMod2.slice(0, 2)], xp: 90, enrollmentStatus: EnrollmentStatus.ACTIVE },
    { lessonsToComplete: [...lessonsInMod1, ...lessonsInMod2.slice(0, 1)], xp: 60, enrollmentStatus: EnrollmentStatus.ACTIVE },
    // Van por el módulo 1
    { lessonsToComplete: lessonsInMod1, xp: 40, enrollmentStatus: EnrollmentStatus.ACTIVE },
    { lessonsToComplete: lessonsInMod1.slice(0, 3), xp: 20, enrollmentStatus: EnrollmentStatus.ACTIVE },
    { lessonsToComplete: lessonsInMod1.slice(0, 2), xp: 20, enrollmentStatus: EnrollmentStatus.ACTIVE },
    { lessonsToComplete: lessonsInMod1.slice(0, 1), xp: 20, enrollmentStatus: EnrollmentStatus.ACTIVE },
    // Recién inscriptos
    { lessonsToComplete: [], xp: 20, enrollmentStatus: EnrollmentStatus.ACTIVE },
    { lessonsToComplete: [], xp: 20, enrollmentStatus: EnrollmentStatus.ACTIVE },
    { lessonsToComplete: [], xp: 20, enrollmentStatus: EnrollmentStatus.ACTIVE },
  ];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const scenario = progressScenarios[i] ?? progressScenarios[progressScenarios.length - 1];

    // Inscripción
    const enrollment = await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      update: { status: scenario.enrollmentStatus },
      create: {
        studentId: student.id,
        courseId: course.id,
        status: scenario.enrollmentStatus,
      },
    });

    // Progreso de lecciones
    for (const lesson of scenario.lessonsToComplete) {
      await prisma.lessonProgress.upsert({
        where: { studentId_lessonId: { studentId: student.id, lessonId: lesson.id } },
        update: {},
        create: { studentId: student.id, lessonId: lesson.id },
      });
    }

    // XP
    await prisma.userXp.upsert({
      where: { userId: student.id },
      update: { totalXp: { increment: scenario.xp } },
      create: { userId: student.id, totalXp: scenario.xp },
    });
    await prisma.xpTransaction.create({
      data: { userId: student.id, amount: scenario.xp, reason: 'Progreso en Código de Conducta (demo)' },
    });

    // Badge de inscripción
    const firstEnrollBadge = await prisma.badge.findFirst({ where: { criteriaType: BadgeCriteria.FIRST_ENROLLMENT, courseId: null } });
    if (firstEnrollBadge) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: student.id, badgeId: firstEnrollBadge.id } },
        update: {},
        create: { userId: student.id, badgeId: firstEnrollBadge.id },
      });
    }

    // Badge de completar si corresponde
    if (scenario.enrollmentStatus === EnrollmentStatus.COMPLETED) {
      await prisma.certificate.upsert({
        where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
        update: {},
        create: {
          studentId: student.id,
          courseId: course.id,
          certificateNumber: `COND-2024-${String(i + 1).padStart(4, '0')}`,
        },
      });

      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: student.id, badgeId: guardianBadge.id } },
        update: {},
        create: { userId: student.id, badgeId: guardianBadge.id },
      });

      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: student.id, badgeId: courseBadge.id } },
        update: {},
        create: { userId: student.id, badgeId: courseBadge.id },
      });
    }

    // Submissions y calificaciones para estudiantes avanzados
    if (scenario.lessonsToComplete.length >= allPublishedLessons.length - lessonsInMod4.length) {
      // Dilema 1
      const sub1 = await prisma.submission.upsert({
        where: { studentId_assignmentId: { studentId: student.id, assignmentId: dilemma1.id } },
        update: {},
        create: { studentId: student.id, assignmentId: dilemma1.id, choiceId: null, isLate: false },
      });
      const grade1 = await prisma.grade.findUnique({ where: { submissionId: sub1.id } });
      if (!grade1) {
        await prisma.grade.create({
          data: {
            submissionId: sub1.id,
            teacherId: teacher.id,
            score: pick([95, 100, 85, 70, 90]),
            maxScore: 100,
            feedback: pick([
              'Excelente análisis ético. Identificaste correctamente las consecuencias.',
              'Muy buena reflexión. El Código de Conducta te apoya en esta decisión.',
              'Buena respuesta. Recordá que los canales de denuncia son anónimos.',
              'Correcto. La integridad es no negociable en nuestra empresa.',
            ]),
          },
        });
      }

      // Reflexión escrita
      const sub2 = await prisma.submission.upsert({
        where: { studentId_assignmentId: { studentId: student.id, assignmentId: reflectionAssignment.id } },
        update: {},
        create: {
          studentId: student.id,
          assignmentId: reflectionAssignment.id,
          textContent: `En mi rol de ${pick(['analista', 'coordinador/a', 'especialista', 'responsable'])} enfrento situaciones éticas frecuentemente. Por ejemplo, cuando recibo información confidencial de clientes debo asegurarme de no compartirla ni usarla fuera del contexto laboral. Otra situación relevante es cuando evalúo propuestas de proveedores: debo basarme únicamente en criterios técnicos y económicos, sin dejar que relaciones personales influyan en mi decisión. El Código de Conducta me brinda un marco claro para actuar con integridad y transparencia en estas situaciones.`,
          isLate: false,
        },
      });
      const grade2 = await prisma.grade.findUnique({ where: { submissionId: sub2.id } });
      if (!grade2) {
        await prisma.grade.create({
          data: {
            submissionId: sub2.id,
            teacherId: teacher.id,
            score: pick([88, 92, 95, 78, 85, 100]),
            maxScore: 100,
            feedback: 'Reflexión completa y bien fundamentada. Excelente aplicación de los conceptos del curso.',
          },
        });
      }
    }

    // Respuestas a la encuesta de diagnóstico (todos)
    const alreadyAnswered = await prisma.surveyResponse.findFirst({
      where: { surveyId: surveyPre.id, userId: student.id },
    });
    if (!alreadyAnswered) {
      const questions = await prisma.surveyQuestion.findMany({ where: { surveyId: surveyPre.id }, orderBy: { order: 'asc' } });
      await prisma.surveyResponse.create({
        data: {
          surveyId: surveyPre.id,
          userId: null, // anónima
          answers: {
            create: questions.map(q => {
              if (q.type === 'YES_NO') return { questionId: q.id, selected: [pick([0, 1])] };
              if (q.type === 'LIKERT') return { questionId: q.id, selected: [pick([0, 1, 2, 3, 4])] };
              if (q.type === 'MULTIPLE_CHOICE') return { questionId: q.id, selected: [pick([0, 1, 2, 3, 4])] };
              return { questionId: q.id, textAnswer: pick([
                'Me genera dudas el manejo de información confidencial con clientes.',
                'No estoy seguro de cuándo tengo que declarar un conflicto de intereses.',
                '¿Cómo se manejan los regalos en fiestas navideñas?',
                'Quiero entender mejor los canales de denuncia anónima.',
                'Me interesa saber más sobre propiedad intelectual.',
              ]) };
            }),
          },
        },
      });
    }

    // Reseña del curso (estudiantes que completaron)
    if (scenario.enrollmentStatus === EnrollmentStatus.COMPLETED) {
      await prisma.courseReview.upsert({
        where: { courseId_studentId: { courseId: course.id, studentId: student.id } },
        update: {},
        create: {
          courseId: course.id,
          studentId: student.id,
          rating: pick([4, 5, 5, 5, 4]),
          comment: pick([
            'Excelente curso. Los dilemas éticos me hicieron reflexionar mucho sobre mi trabajo diario.',
            'Muy útil y práctico. Los casos de estudio son muy representativos de situaciones reales.',
            'El mejor curso de inducción que hice. Claro, concreto y con ejemplos relevantes.',
            'Me gustó que sea interactivo y no solo teórico. Recomendado para todos.',
            'Los dilemas éticos son la mejor parte. Te hacen pensar en situaciones que nunca esperarías.',
          ]),
        },
      });
    }
  }

  console.log('✓ Inscripciones, progreso, XP, badges y calificaciones creados');

  // ── Hilo de brainstorming en el foro ─────────────────────────────────────────
  let thread = await prisma.forumThread.findFirst({ where: { courseId: course.id, title: 'Brainstorming: Situaciones éticas en nuestro trabajo' } });
  if (!thread) {
    thread = await prisma.forumThread.create({
      data: {
        courseId: course.id,
        authorId: teacher.id,
        title: 'Brainstorming: Situaciones éticas en nuestro trabajo',
        isPinned: true,
        posts: {
          create: [
            {
              authorId: teacher.id,
              content: '¡Bienvenidos al espacio de brainstorming! Compartan situaciones (reales o hipotéticas) donde alguien de su área podría enfrentar un dilema ético. No incluyan nombres ni datos identificables. ¿Cómo aplicarían el Código de Conducta en esos casos?',
            },
            {
              authorId: students[0].id,
              content: 'En el área de proveedores es muy común que los vendors inviten a almuerzos o eventos. Siempre me pregunté si está bien aceptar. Después de este curso entiendo que hay un límite de valor y que hay que declararlo.',
            },
            {
              authorId: students[1].id,
              content: 'Una situación que veo seguido: recibimos información de clientes que sería útil para otros departamentos, pero no tenemos permiso explícito para compartirla. ¿Qué pesa más, la utilidad para la empresa o la confidencialidad?',
            },
            {
              authorId: students[2].id,
              content: 'En mi área trabajamos con datos personales de clientes. A veces un colega me pide acceso a información que no le corresponde para "agilizar" un trámite. ¿Cómo lo manejo sin generar conflicto?',
            },
            {
              authorId: students[3].id,
              content: 'Dilema que me pasó: mi supervisor me pidió presentar resultados de una forma que no era del todo precisa para "simplificar" la presentación a directivos. ¿Se considera esto manipulación de información?',
            },
            {
              authorId: students[4].id,
              content: 'Me parece importante hablar del uso de herramientas de IA en el trabajo. ¿Podemos usar ChatGPT con datos de clientes? ¿Cuál es la política al respecto?',
            },
          ],
        },
      },
    });
  }
  console.log('✓ Foro de brainstorming creado');

  // ── Anuncio del docente ───────────────────────────────────────────────────────
  const announcement = await prisma.courseAnnouncement.findFirst({ where: { courseId: course.id } });
  if (!announcement) {
    await prisma.courseAnnouncement.create({
      data: {
        courseId: course.id,
        authorId: teacher.id,
        title: 'Bienvenida al curso — Información importante',
        content: `<p>¡Hola a todos/as!</p>
<p>Les damos la bienvenida al curso <strong>Código de Conducta Empresarial</strong>. Este curso es <strong>obligatorio</strong> y forma parte del proceso de inducción y actualización anual de compliance.</p>
<h3>Información clave</h3>
<ul>
  <li>⏱️ Duración estimada: <strong>3-4 horas</strong></li>
  <li>📋 Módulos: <strong>4 módulos secuenciales</strong></li>
  <li>⚖️ Dilemas éticos: <strong>2 actividades interactivas</strong></li>
  <li>📝 Evaluación final: <strong>10 preguntas</strong></li>
  <li>🏆 Nota mínima de aprobación: <strong>70/100</strong></li>
  <li>📜 Certificado digital al aprobar</li>
</ul>
<p>Cualquier duda, usen el foro del curso. ¡Mucho éxito!</p>`,
      },
    });
  }
  console.log('✓ Anuncio creado');

  // ── Resumen ───────────────────────────────────────────────────────────────────

  console.log('\n════════════════════════════════════════════');
  console.log('✅ SEED DE DEMO COMPLETADO');
  console.log('════════════════════════════════════════════');
  console.log('\n📧 Credenciales de acceso (contraseña: Demo1234!)');
  console.log(`\n👨‍🏫 Docente: docente.conducta@empresa.local`);
  console.log('\n🎓 Estudiantes:');
  for (const s of studentData) {
    console.log(`   ${s.email}`);
  }
  console.log(`\n📚 Curso: "${course.title}"`);
  console.log('   URL: /courses/' + courseSlug);
  console.log('\n📊 Distribución de progreso:');
  console.log('   3 estudiantes — Curso completado (certificado + badge)');
  console.log('   5 estudiantes — En progreso (módulos 2-3)');
  console.log('   4 estudiantes — Inicio (módulo 1)');
  console.log('   3 estudiantes — Recién inscriptos');
  console.log('\n🆕 Features visibles:');
  console.log('   ✓ Lección EMBED (Módulo 1 - "App interactiva")');
  console.log('   ✓ Módulos con prerequisitos (🔒 bloqueados)');
  console.log('   ✓ 2 Dilemas Éticos con escenarios y consecuencias');
  console.log('   ✓ 2 Encuestas (pre y post curso)');
  console.log('   ✓ Niveles de XP en dashboard y leaderboard');
  console.log('   ✓ Badges personalizados del curso');
  console.log('   ✓ Certificados para estudiantes que completaron');
  console.log('   ✓ Foro de brainstorming con posts reales');
  console.log('════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Seed falló:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
