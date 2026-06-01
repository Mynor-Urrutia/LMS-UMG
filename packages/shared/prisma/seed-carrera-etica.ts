/**
 * seed-carrera-etica.ts — Carrera de Ética Empresarial (4 cursos)
 * Ejecutar desde packages/shared/ con:
 *   $env:DATABASE_URL="mysql://lms_user:LmsPass2024@127.0.0.1:3306/lms_db"
 *   $env:SHADOW_DATABASE_URL="mysql://root:Myn0r0406.@127.0.0.1:3306/lms_shadow"
 *   npx ts-node --project tsconfig.json prisma/seed-carrera-etica.ts
 */

import {
  AssignmentType,
  BadgeCriteria,
  Difficulty,
  EnrollmentType,
  LessonType,
  PrismaClient,
  QuestionType,
  Role,
  SurveyQuestionType,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const HASH = (pw: string) => bcrypt.hash(pw, 10);

function slug(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Free-use images (picsum.photos generates consistent seeds) ─────────────────
const IMG = {
  ethics:       'https://picsum.photos/seed/ethics/800/300',
  handshake:    'https://picsum.photos/seed/handshake/800/300',
  teamwork:     'https://picsum.photos/seed/teamwork/800/300',
  leadership:   'https://picsum.photos/seed/leadership/800/300',
  compliance:   'https://picsum.photos/seed/compliance/800/300',
  corruption:   'https://picsum.photos/seed/corruption/800/300',
  decision:     'https://picsum.photos/seed/decision/800/300',
  culture:      'https://picsum.photos/seed/culture/800/300',
  transparency: 'https://picsum.photos/seed/transparency/800/300',
  integrity:    'https://picsum.photos/seed/integrity/800/300',
};

function imgTag(src: string, alt: string) {
  return `<img src="${src}" alt="${alt}" style="width:100%;border-radius:10px;margin:1rem 0;object-fit:cover;" />`;
}

// ── Course definitions ────────────────────────────────────────────────────────

interface LessonDef {
  title: string;
  type: LessonType;
  content?: string;
  videoUrl?: string;
  embedUrl?: string;
  isPublished: boolean;
}

interface AssignmentDef {
  title: string;
  description: string;
  type: AssignmentType;
  maxScore: number;
  weight: number;
  linkedLessonIndex: number;  // 0-based index in module lessons
  quizQuestions?: { text: string; options: { text: string; isCorrect: boolean }[] }[];
  dilemma?: {
    scenario: string;
    choices: { text: string; consequence: string; ethicalScore: number }[];
  };
}

interface ModuleDef {
  title: string;
  lessons: LessonDef[];
  assignment?: AssignmentDef;
}

interface CourseDef {
  title: string;
  description: string;
  difficulty: Difficulty;
  modules: ModuleDef[];
  evaluationTitle: string;
  evaluationQuestions: { text: string; type: string; options?: { text: string; isCorrect: boolean }[] }[];
  surveyTitle: string;
}

const COURSES: CourseDef[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // CURSO 1: Fundamentos de Ética Empresarial
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: 'Fundamentos de Ética Empresarial',
    description: 'Primer curso de la carrera. Introduce los conceptos esenciales de la ética aplicada al contexto empresarial: valores, principios, marcos normativos y responsabilidad corporativa.',
    difficulty: Difficulty.BEGINNER,
    modules: [
      {
        title: 'Módulo 1: ¿Qué es la Ética?',
        lessons: [
          {
            title: 'Introducción: ética en el mundo empresarial',
            type: LessonType.TEXT,
            isPublished: true,
            content: `${imgTag(IMG.ethics, 'Ética empresarial')}
<h2>¿Qué es la ética y por qué importa en los negocios?</h2>
<p>La ética empresarial es el conjunto de principios y valores que guían las decisiones y comportamientos de las personas dentro de una organización. No se trata solo de cumplir la ley: va más allá, buscando hacer lo correcto incluso cuando nadie nos observa.</p>
<h3>¿Por qué importa?</h3>
<ul>
  <li><strong>Confianza:</strong> Las organizaciones éticas generan confianza en clientes, inversores y empleados.</li>
  <li><strong>Sostenibilidad:</strong> Los escándalos éticos destruyen reputaciones construidas en décadas.</li>
  <li><strong>Bienestar:</strong> Un ambiente de trabajo ético mejora la motivación y reduce la rotación de personal.</li>
  <li><strong>Legalidad:</strong> La ética previene comportamientos que pueden derivar en sanciones legales.</li>
</ul>
<blockquote><p>"La ética es saber la diferencia entre lo que tenés el derecho de hacer y lo que es lo correcto hacer." — Potter Stewart</p></blockquote>`,
          },
          {
            title: 'Infografía: Los 7 principios de la ética empresarial',
            type: LessonType.INFOGRAPHIC,
            isPublished: true,
            content: `${imgTag(IMG.handshake, 'Principios éticos')}
<h2>Los 7 Principios Fundamentales</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:1rem;">
  <div style="background:#eff6ff;padding:1rem;border-radius:8px;border-left:4px solid #3b82f6">
    <strong>1. Honestidad</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Decir la verdad en todas las circunstancias, incluso cuando es incómodo.</p>
  </div>
  <div style="background:#f0fdf4;padding:1rem;border-radius:8px;border-left:4px solid #22c55e">
    <strong>2. Integridad</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Actuar de acuerdo con los propios valores, sin importar quién observa.</p>
  </div>
  <div style="background:#fefce8;padding:1rem;border-radius:8px;border-left:4px solid #eab308">
    <strong>3. Responsabilidad</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Hacerse cargo de las propias decisiones y sus consecuencias.</p>
  </div>
  <div style="background:#fdf4ff;padding:1rem;border-radius:8px;border-left:4px solid #a855f7">
    <strong>4. Justicia</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Tratar a todas las personas con equidad y sin discriminación.</p>
  </div>
  <div style="background:#fff1f2;padding:1rem;border-radius:8px;border-left:4px solid #ef4444">
    <strong>5. Respeto</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Valorar la dignidad de cada persona, sin excepción.</p>
  </div>
  <div style="background:#ecfdf5;padding:1rem;border-radius:8px;border-left:4px solid #10b981">
    <strong>6. Transparencia</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Actuar de manera abierta y comunicar sin ocultar información relevante.</p>
  </div>
</div>
<div style="background:#f8fafc;padding:1rem;border-radius:8px;border-left:4px solid #64748b;margin-top:0.75rem">
  <strong>7. Empatía</strong>
  <p style="font-size:0.875rem;margin:0.25rem 0 0">Comprender el impacto de nuestras decisiones en los demás.</p>
</div>`,
          },
          {
            title: 'Video: La ética en acción — casos reales',
            type: LessonType.VIDEO,
            isPublished: true,
            videoUrl: 'https://www.youtube.com/watch?v=8SOQduoLgRw',
          },
        ],
        assignment: {
          title: 'Quiz: Conceptos fundamentales de ética',
          description: 'Evaluá tu comprensión de los conceptos básicos del módulo.',
          type: AssignmentType.QUIZ,
          maxScore: 100,
          weight: 1,
          linkedLessonIndex: 0,
          quizQuestions: [
            {
              text: '¿Cuál de los siguientes NO es un principio de la ética empresarial?',
              options: [
                { text: 'Honestidad', isCorrect: false },
                { text: 'Maximización de utilidades a cualquier costo', isCorrect: true },
                { text: 'Justicia', isCorrect: false },
                { text: 'Responsabilidad', isCorrect: false },
              ],
            },
            {
              text: 'La ética empresarial se limita a cumplir con las leyes vigentes.',
              options: [
                { text: 'Verdadero', isCorrect: false },
                { text: 'Falso', isCorrect: true },
              ],
            },
            {
              text: '¿Por qué la transparencia es un principio ético fundamental?',
              options: [
                { text: 'Porque la ley lo exige siempre', isCorrect: false },
                { text: 'Porque actuar de manera abierta construye confianza y permite tomar decisiones informadas', isCorrect: true },
                { text: 'Porque aumenta las ventas directamente', isCorrect: false },
                { text: 'Porque reduce los costos operativos', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Módulo 2: Marco Legal y Responsabilidad Corporativa',
        lessons: [
          {
            title: 'Legislación, regulación y ética corporativa',
            type: LessonType.TEXT,
            isPublished: true,
            content: `${imgTag(IMG.compliance, 'Cumplimiento legal')}
<h2>El marco legal y la ética van de la mano</h2>
<p>Las empresas operan dentro de un marco legal que establece el mínimo obligatorio de comportamiento. Sin embargo, la ética va más allá: se trata de hacer lo correcto aunque la ley no lo exija explícitamente.</p>
<h3>Principales marcos normativos</h3>
<ul>
  <li><strong>Código de trabajo:</strong> Protección de los derechos de los empleados.</li>
  <li><strong>Ley de lavado de dinero:</strong> Prevención del financiamiento ilícito.</li>
  <li><strong>Ley de anticorrupción:</strong> Prohíbe el soborno a funcionarios públicos y privados.</li>
  <li><strong>RGPD / Leyes de privacidad:</strong> Protección de datos personales de clientes.</li>
  <li><strong>Normas ISO 26000:</strong> Guía voluntaria de responsabilidad social empresarial.</li>
</ul>
<h3>¿Qué es la Responsabilidad Social Empresarial (RSE)?</h3>
<p>La RSE es el compromiso voluntario de las empresas con el desarrollo sostenible, considerando el impacto social, ambiental y económico de sus operaciones.</p>
<div style="background:#f0fdf4;padding:1rem;border-radius:8px;border-left:4px solid #22c55e;margin-top:1rem">
  <p><strong>Triple Bottom Line:</strong> Las empresas responsables miden su éxito en tres dimensiones: <strong>Personas</strong> (impacto social), <strong>Planeta</strong> (impacto ambiental) y <strong>Ganancias</strong> (impacto económico).</p>
</div>`,
          },
          {
            title: 'Caso de Estudio: El colapso de Enron',
            type: LessonType.CASE_STUDY,
            isPublished: true,
            content: `${imgTag(IMG.transparency, 'Transparencia corporativa')}
<h2>Caso Enron: Cuando la ética colapsa</h2>
<p><strong>Contexto:</strong> Enron Corporation fue una de las empresas energéticas más grandes de Estados Unidos. En 2001, colapsó en uno de los mayores escándalos contables de la historia, llevando a la quiebra a miles de empleados y accionistas.</p>
<h3>¿Qué ocurrió?</h3>
<ul>
  <li>Los ejecutivos <strong>manipularon estados financieros</strong> para ocultar pérdidas enormes.</li>
  <li>Crearon <strong>entidades especiales</strong> para mover deuda fuera de los libros contables.</li>
  <li>La firma auditora <strong>Arthur Andersen</strong> fue cómplice al validar información falsa.</li>
  <li>Los empleados que intentaron alertar fueron <strong>silenciados o despedidos</strong>.</li>
</ul>
<h3>Consecuencias</h3>
<ul>
  <li>Más de 20.000 empleados perdieron su trabajo y sus ahorros de retiro.</li>
  <li>Los ejecutivos principales fueron sentenciados a penas de hasta 24 años de prisión.</li>
  <li>Se aprobó la <strong>Ley Sarbanes-Oxley</strong>, que reforzó los controles contables en EE.UU.</li>
</ul>
<h3>Preguntas de análisis</h3>
<ol>
  <li>¿Qué principios éticos fueron violados en el caso Enron?</li>
  <li>¿Qué rol jugó la cultura organizacional en facilitar el fraude?</li>
  <li>¿Cómo hubiera podido prevenirse si existiera un canal de denuncia efectivo?</li>
  <li>¿Qué habrías hecho vos si eras un empleado que descubrió las irregularidades?</li>
</ol>
<p>Respondé el dilema ético asociado a esta lección para reflexionar sobre la toma de decisiones en situaciones similares.</p>`,
          },
          {
            title: 'Herramienta interactiva: Ética y cumplimiento',
            type: LessonType.EMBED,
            isPublished: true,
            embedUrl: 'https://kahoot.it',
          },
        ],
        assignment: {
          title: 'Dilema Ético: La denuncia en Enron',
          description: 'Basándote en el caso Enron, decidí qué harías en la situación de un empleado que descubrió el fraude.',
          type: AssignmentType.DILEMMA,
          maxScore: 100,
          weight: 2,
          linkedLessonIndex: 1,
          dilemma: {
            scenario: 'Sos analista financiero de Enron. Al revisar los registros, descubrís que tu supervisor directo está moviendo millones de dólares en pérdidas hacia entidades externas para que no aparezcan en los estados financieros oficiales. Tu supervisor es un ejecutivo de alto nivel y tiene acceso directo al CEO. Si denunciás, podrías perder tu trabajo. Si no lo hacés, sos cómplice de un fraude que puede afectar a miles de personas.',
            choices: [
              {
                text: 'Ignorás lo que viste. No es tu problema y no querés perder tu trabajo.',
                consequence: 'La inacción ante el fraude te convierte en cómplice. Cuando el escándalo estalló (como ocurrió en el caso real), los empleados que sabían y callaron también enfrentaron consecuencias legales y reputacionales. La omisión no te protege.',
                ethicalScore: 5,
              },
              {
                text: 'Documentás la evidencia y la reportás al área de Cumplimiento o al Canal de Denuncias anónimo.',
                consequence: '¡Decisión correcta! Usar los canales institucionales protege tanto a la empresa como a vos. En el caso Enron, Sherron Watkins hizo exactamente esto (escribió una carta al CEO) y fue reconocida como "persona del año" por Time Magazine. La denuncia formal es el camino ético.',
                ethicalScore: 100,
              },
              {
                text: 'Le contás a un colega de confianza para ver qué piensa, sin hacer nada por ahora.',
                consequence: 'Compartir información confidencial con personas no autorizadas puede agravar la situación y comprometer a terceros. Además, retrasar la acción da tiempo para que el fraude se profundice. Actuar a través de los canales correctos y rápidamente es siempre mejor.',
                ethicalScore: 20,
              },
              {
                text: 'Llevás la información directamente a los medios de comunicación.',
                consequence: 'Si bien la exposición pública puede detener el fraude, hacerlo sin agotar los canales internos y legales puede tener implicaciones legales para vos (confidencialidad). Lo correcto es primero reportar internamente o a los reguladores. Los medios son un último recurso.',
                ethicalScore: 35,
              },
            ],
          },
        },
      },
      {
        title: 'Módulo 3: Evaluación del Curso 1',
        lessons: [
          {
            title: 'Instrucciones para la evaluación final',
            type: LessonType.TEXT,
            isPublished: true,
            content: `<h2>Evaluación Final — Fundamentos de Ética Empresarial</h2>
<p>Completaste los módulos de contenido. Ahora es momento de evaluar tu comprensión.</p>
<h3>Condiciones</h3>
<ul>
  <li>⏱️ 1 solo intento disponible</li>
  <li>📊 Nota mínima de aprobación: <strong>70/100</strong></li>
  <li>📜 Al aprobar, recibirás tu certificado digital del curso</li>
</ul>
<p>Dirigite a la pestaña <strong>Evaluaciones</strong> para comenzar.</p>`,
          },
        ],
      },
    ],
    evaluationTitle: 'Evaluación Final: Fundamentos de Ética Empresarial',
    evaluationQuestions: [
      { text: '¿Cuál es la principal diferencia entre ética y legalidad?', type: 'MCQ', options: [
        { text: 'Son exactamente lo mismo', isCorrect: false },
        { text: 'La ética va más allá de lo legal: implica hacer lo correcto aunque no sea obligatorio por ley', isCorrect: true },
        { text: 'La legalidad es más importante que la ética', isCorrect: false },
        { text: 'La ética no aplica en el contexto empresarial', isCorrect: false },
      ]},
      { text: 'El principio de integridad significa:', type: 'MCQ', options: [
        { text: 'Cumplir la ley para evitar multas', isCorrect: false },
        { text: 'Actuar de acuerdo con los propios valores incluso sin supervisión', isCorrect: true },
        { text: 'Maximizar las ganancias de la empresa', isCorrect: false },
        { text: 'Respetar solo a los superiores jerárquicos', isCorrect: false },
      ]},
      { text: 'La Responsabilidad Social Empresarial (RSE) es:', type: 'MCQ', options: [
        { text: 'Obligatoria por ley en todos los países', isCorrect: false },
        { text: 'El compromiso voluntario de las empresas con el impacto social, ambiental y económico', isCorrect: true },
        { text: 'Solo relevante para empresas grandes', isCorrect: false },
        { text: 'Lo mismo que filantropía', isCorrect: false },
      ]},
      { text: '¿Cuál fue una de las principales causas del colapso de Enron?', type: 'MCQ', options: [
        { text: 'Exceso de transparencia con los reguladores', isCorrect: false },
        { text: 'Manipulación de estados financieros y falta de controles éticos', isCorrect: true },
        { text: 'Expansión excesiva a mercados extranjeros', isCorrect: false },
        { text: 'Problemas tecnológicos en sus sistemas', isCorrect: false },
      ]},
      { text: 'Una empresa ética solo necesita preocuparse por sus accionistas.', type: 'TRUE_FALSE', options: [
        { text: 'Verdadero', isCorrect: false },
        { text: 'Falso', isCorrect: true },
      ]},
    ],
    surveyTitle: 'Encuesta: Fundamentos de Ética',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CURSO 2: Integridad y Prevención de la Corrupción
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: 'Integridad y Prevención de la Corrupción',
    description: 'Segundo curso de la carrera. Profundiza en las formas que adopta la corrupción en el entorno empresarial y desarrolla herramientas prácticas para identificarla, prevenirla y reportarla.',
    difficulty: Difficulty.INTERMEDIATE,
    modules: [
      {
        title: 'Módulo 1: Anatomía de la Corrupción',
        lessons: [
          {
            title: '¿Qué es la corrupción y cómo se manifiesta?',
            type: LessonType.TEXT,
            isPublished: true,
            content: `${imgTag(IMG.corruption, 'Corrupción empresarial')}
<h2>Corrupción: formas y consecuencias</h2>
<p>La corrupción es el abuso de una posición de confianza para obtener un beneficio indebido. Puede ocurrir en cualquier nivel de la organización y afectar tanto a empresas privadas como a instituciones públicas.</p>
<h3>Tipos de corrupción empresarial</h3>
<ul>
  <li><strong>Soborno:</strong> Ofrecer o recibir dinero u otros beneficios para influir en una decisión.</li>
  <li><strong>Fraude:</strong> Engañar deliberadamente para obtener beneficios económicos.</li>
  <li><strong>Nepotismo:</strong> Favorecer a familiares o amigos en decisiones de contratación o negocio.</li>
  <li><strong>Colusión:</strong> Acuerdo secreto entre competidores para fijar precios o repartirse mercados.</li>
  <li><strong>Malversación:</strong> Usar fondos de la empresa para fines personales.</li>
  <li><strong>Extorsión:</strong> Amenazar o presionar para obtener beneficios.</li>
</ul>
<h3>Impacto de la corrupción</h3>
<div style="background:#fff1f2;padding:1rem;border-radius:8px;border-left:4px solid #ef4444;margin-top:1rem">
  <p>Según el Banco Mundial, la corrupción cuesta a la economía global más de <strong>$2.6 billones de dólares anuales</strong> (equivalente al 5% del PIB mundial). En las empresas, un escándalo de corrupción puede reducir el valor de mercado en hasta un 30%.</p>
</div>`,
          },
          {
            title: 'Infografía: Señales de alerta (Red Flags)',
            type: LessonType.INFOGRAPHIC,
            isPublished: true,
            content: `${imgTag(IMG.integrity, 'Señales de alerta')}
<h2>Red Flags: Señales de Alerta en el Entorno Laboral</h2>
<p>Aprender a identificar señales de alerta es clave para prevenir la corrupción antes de que escale.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:1rem;">
  <div style="background:#fff1f2;padding:1rem;border-radius:8px;border-left:4px solid #ef4444">
    <strong>🚩 Pagos inusuales</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Pagos en efectivo sin documentación, comisiones excesivamente altas o pagos a terceros sin justificación clara.</p>
  </div>
  <div style="background:#fff1f2;padding:1rem;border-radius:8px;border-left:4px solid #ef4444">
    <strong>🚩 Contratos sin licitación</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Proveedores seleccionados sin proceso competitivo, especialmente si tienen vínculos personales con decisores.</p>
  </div>
  <div style="background:#fff1f2;padding:1rem;border-radius:8px;border-left:4px solid #ef4444">
    <strong>🚩 Gastos de representación excesivos</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Regalos, viajes o entretenimiento desproporcionados hacia o desde clientes y proveedores.</p>
  </div>
  <div style="background:#fff1f2;padding:1rem;border-radius:8px;border-left:4px solid #ef4444">
    <strong>🚩 Presión para saltar controles</strong>
    <p style="font-size:0.875rem;margin:0.25rem 0 0">Solicitudes de "hacer una excepción" a los procesos de aprobación o auditoría interna.</p>
  </div>
</div>
<div style="background:#eff6ff;padding:1rem;border-radius:8px;border-left:4px solid #3b82f6;margin-top:0.75rem">
  <strong>✅ Si detectás una red flag:</strong> Documentá la situación con fecha, lugar y testigos. Reportala al área de Cumplimiento o usá el canal de denuncia anónimo. No actúes solo.
</div>`,
          },
          {
            title: 'Actividad: Identificación de situaciones corruptas',
            type: LessonType.EMBED,
            isPublished: true,
            embedUrl: 'https://www.mentimeter.com/app/presentation/demo',
          },
        ],
        assignment: {
          title: 'Quiz: Identificando actos de corrupción',
          description: 'Evaluá tu capacidad de identificar diferentes formas de corrupción.',
          type: AssignmentType.QUIZ,
          maxScore: 100,
          weight: 1,
          linkedLessonIndex: 0,
          quizQuestions: [
            {
              text: 'Un gerente de compras acepta un viaje internacional pagado por un proveedor con quien está negociando. ¿Qué tipo de corrupción representa esto?',
              options: [
                { text: 'Malversación', isCorrect: false },
                { text: 'Soborno / Conflicto de intereses', isCorrect: true },
                { text: 'Colusión', isCorrect: false },
                { text: 'Nepotismo', isCorrect: false },
              ],
            },
            {
              text: 'La corrupción solo afecta al sector público.',
              options: [
                { text: 'Verdadero', isCorrect: false },
                { text: 'Falso', isCorrect: true },
              ],
            },
            {
              text: '¿Cuál es la consecuencia directa de no reportar una sospecha de corrupción?',
              options: [
                { text: 'Ninguna, si no estás directamente involucrado', isCorrect: false },
                { text: 'Podrías ser considerado cómplice y enfrentar consecuencias legales', isCorrect: true },
                { text: 'Solo consecuencias para tu supervisor', isCorrect: false },
                { text: 'La empresa lo resolverá sola eventualmente', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Módulo 2: Herramientas Anti-Corrupción',
        lessons: [
          {
            title: 'Programas de cumplimiento y controles internos',
            type: LessonType.TEXT,
            isPublished: true,
            content: `${imgTag(IMG.teamwork, 'Controles internos')}
<h2>Los pilares de un programa anti-corrupción efectivo</h2>
<p>Una empresa que toma en serio la prevención de la corrupción implementa un sistema integrado de controles, políticas y mecanismos de denuncia.</p>
<h3>1. Código de Ética y Conducta</h3>
<p>Documento fundamental que establece los valores, principios y comportamientos esperados de todos los colaboradores. Debe ser claro, accesible y actualizado periódicamente.</p>
<h3>2. Canal de Denuncias Anónimas (Whistleblowing)</h3>
<p>Sistema seguro y confidencial donde cualquier persona puede reportar irregularidades sin temor a represalias. Puede ser:</p>
<ul>
  <li>Línea telefónica dedicada</li>
  <li>Plataforma web anónima</li>
  <li>Email seguro a Cumplimiento</li>
</ul>
<h3>3. Due Diligence de Terceros</h3>
<p>Antes de contratar proveedores, consultores o socios comerciales, se debe verificar su reputación, historial legal y posibles vínculos con funcionarios públicos o personas políticamente expuestas (PEP).</p>
<h3>4. Separación de funciones</h3>
<p>Ninguna persona debe tener el control completo de una transacción. Quien aprueba un gasto no debe ser quien lo ejecuta ni quien lo registra.</p>
<div style="background:#f0fdf4;padding:1rem;border-radius:8px;border-left:4px solid #22c55e;margin-top:1rem">
  <strong>Dato clave:</strong> Las empresas con programas de cumplimiento robustos detectan el fraude interno en promedio 50% más rápido que las que no los tienen. (Fuente: ACFE)
</div>`,
          },
          {
            title: 'Caso de Estudio: El escándalo Odebrecht en Latinoamérica',
            type: LessonType.CASE_STUDY,
            isPublished: true,
            content: `${imgTag(IMG.decision, 'Toma de decisiones')}
<h2>Caso Odebrecht: La corrupción sistémica</h2>
<p><strong>Contexto:</strong> Odebrecht era la constructora más grande de América Latina. En 2016, admitió haber pagado más de <strong>$788 millones de dólares en sobornos</strong> a funcionarios de 12 países latinoamericanos durante más de una década.</p>
<h3>El mecanismo del fraude</h3>
<ul>
  <li>Odebrecht creó un <strong>departamento de sobornos</strong> llamado División de Operaciones Estructuradas.</li>
  <li>Los sobornos se canalizaban a través de <strong>cuentas offshore</strong> en paraísos fiscales.</li>
  <li>Los ejecutivos pagaban para ganar licitaciones de obras públicas a precios inflados.</li>
  <li>El sistema fue tan eficiente que lo llamaron internamente "el banco de los sobornos".</li>
</ul>
<h3>Impacto</h3>
<ul>
  <li>Más de 80 ejecutivos de Odebrecht se declararon culpables en EE.UU.</li>
  <li>Presidentes, ministros y funcionarios de 12 países fueron investigados o encarcelados.</li>
  <li>La empresa perdió miles de contratos y tuvo que reestructurarse.</li>
</ul>
<h3>Lecciones para tu organización</h3>
<ol>
  <li>¿Tenemos controles suficientes sobre cómo se seleccionan y pagan a consultores y terceros?</li>
  <li>¿Existe en nuestra empresa una "cultura del sí" que premia el éxito a cualquier costo?</li>
  <li>¿Nuestro canal de denuncias es realmente accesible y confidencial?</li>
</ol>`,
          },
          {
            title: 'App: Simulador de dilemas anti-corrupción',
            type: LessonType.EMBED,
            isPublished: true,
            embedUrl: 'https://kahoot.it',
          },
        ],
        assignment: {
          title: 'Dilema Ético: El intermediario sospechoso',
          description: 'Tu empresa necesita ganar un contrato clave. Un intermediario te ofrece garantizarlo a cambio de una comisión "especial". ¿Qué hacés?',
          type: AssignmentType.DILEMMA,
          maxScore: 100,
          weight: 2,
          linkedLessonIndex: 1,
          dilemma: {
            scenario: 'Sos director comercial de una empresa que participa en una licitación pública de $5 millones. Un consultor externo con "contactos" en el gobierno te dice que puede garantizar que ganen la licitación a cambio de una comisión del 8% del contrato ($400.000) pagada a una empresa offshore. "Es la forma en que funciona esto", te explica. Si no aceptan, probablemente pierdan el contrato y habrá despidos en tu equipo.',
            choices: [
              {
                text: 'Aceptás la propuesta. El negocio es demasiado importante y el mercado "funciona así".',
                consequence: 'Pagar la comisión encubierta es un soborno, independientemente de cómo se disfrace. Viola múltiples leyes (Ley FCPA, Ley Anti-Soborno) y expone a los ejecutivos y a la empresa a multas millonarias, prisión y pérdida de contratos. "Todos lo hacen" no es una defensa legal ni ética válida.',
                ethicalScore: 2,
              },
              {
                text: 'Rechazás la propuesta y lo reportás al área legal y de Cumplimiento de tu empresa.',
                consequence: '¡Decisión correcta! Rechazar el soborno y reportarlo protege a la empresa de riesgos legales enormes. Perder una licitación es recuperable; una condena penal por corrupción no lo es. Tu decisión también protege a tus colegas a largo plazo.',
                ethicalScore: 100,
              },
              {
                text: 'Le pedís al consultor que lo "legalice" a través de una factura por "servicios de consultoría".',
                consequence: 'Crear documentación falsa para encubrir un soborno es un delito adicional (falsedad documental / lavado de activos). La forma en que se registra el pago no cambia su naturaleza ilegal. Esta "solución" agrava el problema.',
                ethicalScore: 5,
              },
              {
                text: 'Le preguntás a tu superior jerárquico qué hacer, sin tomar ninguna decisión por tu cuenta.',
                consequence: 'Escalar la decisión a un superior puede ser válido, pero solo si el superior tiene los estándares éticos correctos. Si el superior aprueba el soborno, sigues siendo responsable. Lo ideal es escalar Y simultáneamente notificar al área de Cumplimiento.',
                ethicalScore: 55,
              },
            ],
          },
        },
      },
      {
        title: 'Módulo 3: Evaluación del Curso 2',
        lessons: [
          {
            title: 'Instrucciones para la evaluación final',
            type: LessonType.TEXT,
            isPublished: true,
            content: `<h2>Evaluación Final — Integridad y Prevención de la Corrupción</h2>
<p>Completaste los módulos de este curso. Ahora evaluá tu comprensión.</p>
<ul>
  <li>1 solo intento · Nota mínima: <strong>70/100</strong></li>
  <li>Dirigite a la pestaña <strong>Evaluaciones</strong> para comenzar.</li>
</ul>`,
          },
        ],
      },
    ],
    evaluationTitle: 'Evaluación Final: Integridad y Prevención de la Corrupción',
    evaluationQuestions: [
      { text: '¿Cuál de los siguientes es un ejemplo de soborno?', type: 'MCQ', options: [
        { text: 'Pagar el precio justo de mercado por un servicio', isCorrect: false },
        { text: 'Ofrecer dinero a un funcionario para ganar una licitación', isCorrect: true },
        { text: 'Negociar un descuento comercial legítimo', isCorrect: false },
        { text: 'Contratar a alguien con las calificaciones adecuadas', isCorrect: false },
      ]},
      { text: 'El canal de denuncias anónimas existe principalmente para:', type: 'MCQ', options: [
        { text: 'Reportar quejas laborales sin importancia', isCorrect: false },
        { text: 'Permitir que cualquier persona reporte irregularidades sin temor a represalias', isCorrect: true },
        { text: 'Solo para uso de los auditores internos', isCorrect: false },
        { text: 'Reemplazar a los supervisores en la toma de decisiones', isCorrect: false },
      ]},
      { text: 'La separación de funciones en los controles internos significa que:', type: 'MCQ', options: [
        { text: 'Diferentes departamentos no deben comunicarse', isCorrect: false },
        { text: 'Quien aprueba un gasto no debe ser quien lo ejecuta ni lo registra', isCorrect: true },
        { text: 'Solo los contadores pueden manejar dinero', isCorrect: false },
        { text: 'Cada área trabaja de manera completamente independiente', isCorrect: false },
      ]},
      { text: '"Todos lo hacen" es una justificación válida para participar en un acto de corrupción.', type: 'TRUE_FALSE', options: [
        { text: 'Verdadero', isCorrect: false },
        { text: 'Falso', isCorrect: true },
      ]},
      { text: '¿Qué es el "Due Diligence de terceros"?', type: 'MCQ', options: [
        { text: 'Una auditoría financiera anual obligatoria', isCorrect: false },
        { text: 'La verificación de la reputación e historial legal de proveedores y socios antes de contratarlos', isCorrect: true },
        { text: 'El proceso de capacitación de nuevos empleados', isCorrect: false },
        { text: 'La revisión de los contratos después de su firma', isCorrect: false },
      ]},
    ],
    surveyTitle: 'Encuesta: Integridad y Corrupción',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CURSO 3: Dilemas Éticos y Toma de Decisiones
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: 'Dilemas Éticos y Toma de Decisiones',
    description: 'Tercer curso de la carrera. Desarrolla habilidades prácticas para identificar, analizar y resolver dilemas éticos complejos aplicando marcos de decisión estructurados.',
    difficulty: Difficulty.INTERMEDIATE,
    modules: [
      {
        title: 'Módulo 1: Marcos de Decisión Ética',
        lessons: [
          {
            title: 'Modelos para tomar decisiones éticas',
            type: LessonType.TEXT,
            isPublished: true,
            content: `${imgTag(IMG.decision, 'Toma de decisiones')}
<h2>¿Cómo decidir ante un dilema ético?</h2>
<p>Un dilema ético ocurre cuando dos o más valores importantes entran en conflicto y no hay una respuesta "perfecta". Los marcos de decisión te ayudan a analizar la situación de manera estructurada.</p>
<h3>Framework de las 4 preguntas</h3>
<div style="background:#eff6ff;padding:1.25rem;border-radius:8px;margin:1rem 0;">
  <ol style="margin:0;padding-left:1.25rem;">
    <li style="margin-bottom:0.5rem"><strong>¿Es legal?</strong> — ¿Viola alguna ley, regulación o política interna?</li>
    <li style="margin-bottom:0.5rem"><strong>¿Es equilibrado?</strong> — ¿Es justo para todas las partes involucradas?</li>
    <li style="margin-bottom:0.5rem"><strong>¿Cómo me haría sentir?</strong> — ¿Me sentiría cómodo si mi familia lo supiera?</li>
    <li><strong>¿Qué diría el periódico?</strong> — ¿Cómo se vería en las noticias mañana?</li>
  </ol>
</div>
<h3>El test del "buen ciudadano"</h3>
<p>Preguntate: ¿Esta decisión es la que tomaría un ciudadano honesto, responsable y razonable? Si la respuesta es no, hay un problema ético que resolver.</p>
<h3>El principio de reversibilidad</h3>
<p>Antes de actuar, preguntate: ¿Me gustaría que los demás me trataran de la misma manera? (La Regla de Oro aplicada a los negocios.)</p>`,
          },
          {
            title: 'Caso de Estudio: Privacidad vs. seguridad en el trabajo',
            type: LessonType.CASE_STUDY,
            isPublished: true,
            content: `${imgTag(IMG.culture, 'Cultura organizacional')}
<h2>Dilema: El monitoreo de empleados</h2>
<p><strong>Situación:</strong> Una empresa de servicios financieros implementó software de monitoreo en los equipos de sus empleados que registra todas las actividades: sitios web visitados, tiempo de inactividad, capturas de pantalla cada 5 minutos y análisis de productividad en tiempo real. Los empleados no fueron informados detalladamente sobre el alcance del monitoreo.</p>
<h3>Los valores en conflicto</h3>
<table style="width:100%;border-collapse:collapse;font-size:0.875rem;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:0.5rem;text-align:left;border:1px solid #e5e7eb;">Argumento PRO monitoreo</th>
      <th style="padding:0.5rem;text-align:left;border:1px solid #e5e7eb;">Argumento CONTRA monitoreo</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:0.5rem;border:1px solid #e5e7eb;">Protección de datos de clientes</td>
      <td style="padding:0.5rem;border:1px solid #e5e7eb;">Violación a la privacidad del empleado</td>
    </tr>
    <tr style="background:#f9fafb;">
      <td style="padding:0.5rem;border:1px solid #e5e7eb;">Detección de filtraciones de información</td>
      <td style="padding:0.5rem;border:1px solid #e5e7eb;">Deterioro de la confianza y clima laboral</td>
    </tr>
    <tr>
      <td style="padding:0.5rem;border:1px solid #e5e7eb;">Cumplimiento regulatorio (sector financiero)</td>
      <td style="padding:0.5rem;border:1px solid #e5e7eb;">Posible violación de leyes laborales</td>
    </tr>
  </tbody>
</table>
<h3>Preguntas de análisis</h3>
<ol>
  <li>¿La empresa tiene derecho a monitorear los dispositivos de trabajo?</li>
  <li>¿Qué obligaciones éticas tiene la empresa de informar a sus empleados?</li>
  <li>¿Hasta qué punto el monitoreo es una invasión inaceptable de la privacidad?</li>
  <li>¿Cómo balancearías seguridad de la información vs. confianza en el equipo?</li>
</ol>`,
          },
          {
            title: 'Brainstorming: Dilemas éticos en tu área',
            type: LessonType.TEXT,
            isPublished: true,
            content: `<h2>Actividad: Brainstorming Colaborativo</h2>
<p>Participá en el <strong>Foro del curso</strong> en el hilo <em>"Dilemas éticos en mi área de trabajo"</em>.</p>
<h3>Consigna</h3>
<p>Compartí un dilema ético real o hipotético que podría ocurrir en tu área. Analizalo usando el <strong>Framework de las 4 preguntas</strong> del módulo anterior.</p>
<h3>Estructura sugerida</h3>
<ol>
  <li><strong>Describí el dilema</strong> (sin datos que identifiquen personas)</li>
  <li><strong>¿Los valores entran en conflicto?</strong> (¿cuáles?)</li>
  <li><strong>Aplicá las 4 preguntas</strong></li>
  <li><strong>¿Cuál sería tu decisión?</strong></li>
</ol>
<p>Respondé al menos un aporte de un compañero con tus reflexiones.</p>`,
          },
        ],
        assignment: {
          title: 'Dilema Ético: El monitoreo y la privacidad',
          description: 'Analizá el dilema de la empresa financiera y decidí qué harías como responsable de RRHH.',
          type: AssignmentType.DILEMMA,
          maxScore: 100,
          weight: 2,
          linkedLessonIndex: 1,
          dilemma: {
            scenario: 'Sos responsable de RRHH de una empresa financiera. El área de IT te presenta un sistema de monitoreo total de empleados (capturas, navegación, tiempo de inactividad) que ya está instalado y activo. Cuando preguntás, te confirman que los empleados no fueron informados del alcance real del monitoreo. El CEO insiste en mantenerlo por "razones de seguridad". Legalmente, la empresa está en una zona gris según la legislación local.',
            choices: [
              {
                text: 'Mantenés el sistema como está. Si el CEO lo aprobó, es responsabilidad de él.',
                consequence: 'Delegar la responsabilidad ética a un superior no te exime de ella. Como responsable de RRHH tenés la obligación de proteger los derechos de los empleados. Además, si la situación se hace pública, podrías enfrentar consecuencias legales y reputacionales personales.',
                ethicalScore: 10,
              },
              {
                text: 'Pedís al área legal que revise la situación, informás a los empleados sobre el monitoreo y limitás su alcance a lo estrictamente necesario.',
                consequence: '¡Decisión equilibrada y correcta! Informar a los empleados respeta su autonomía, reduce el riesgo legal y mantiene la confianza. Limitar el monitoreo a lo necesario (no capturas de pantalla cada 5 minutos) equilibra seguridad y privacidad. Esta es la respuesta que un buen profesional de RRHH daría.',
                ethicalScore: 100,
              },
              {
                text: 'Desactivás el sistema sin consultar con el CEO ni con nadie.',
                consequence: 'Actuar unilateralmente sin seguir los procesos institucionales puede crear más problemas. Es importante comunicar, documentar y alinear con dirección y legal antes de tomar acciones que afectan a toda la organización.',
                ethicalScore: 30,
              },
              {
                text: 'Le decís a un empleado de confianza sobre el sistema para "tantear la reacción del equipo".',
                consequence: 'Filtrar información de manera selectiva y no oficial puede generar pánico, rumores e inconsistencia. Además, podrías comprometer la confidencialidad que se esperaba de vos en este proceso. La comunicación debe ser formal y transparente, no informal.',
                ethicalScore: 15,
              },
            ],
          },
        },
      },
      {
        title: 'Módulo 2: Evaluación del Curso 3',
        lessons: [
          {
            title: 'Instrucciones para la evaluación final',
            type: LessonType.TEXT,
            isPublished: true,
            content: `<h2>Evaluación Final — Dilemas Éticos y Toma de Decisiones</h2>
<p>Completaste los contenidos del curso. Evaluá tu comprensión en la pestaña <strong>Evaluaciones</strong>.</p>
<ul>
  <li>1 solo intento · Nota mínima: <strong>70/100</strong></li>
</ul>`,
          },
        ],
      },
    ],
    evaluationTitle: 'Evaluación Final: Dilemas Éticos y Toma de Decisiones',
    evaluationQuestions: [
      { text: '¿Cuál es el primer paso del Framework de las 4 preguntas?', type: 'MCQ', options: [
        { text: '¿Cómo me haría sentir?', isCorrect: false },
        { text: '¿Es legal?', isCorrect: true },
        { text: '¿Es equilibrado?', isCorrect: false },
        { text: '¿Qué diría el periódico?', isCorrect: false },
      ]},
      { text: 'Un dilema ético ocurre cuando:', type: 'MCQ', options: [
        { text: 'Hay una respuesta claramente correcta que todo el mundo conoce', isCorrect: false },
        { text: 'Dos o más valores importantes entran en conflicto sin una solución perfecta', isCorrect: true },
        { text: 'La ley prohíbe una determinada acción', isCorrect: false },
        { text: 'No tenemos suficiente información para actuar', isCorrect: false },
      ]},
      { text: 'Aplicar el "test del buen ciudadano" significa:', type: 'MCQ', options: [
        { text: 'Verificar si la acción cumple todos los requisitos legales', isCorrect: false },
        { text: 'Preguntarse si la decisión es la que tomaría una persona honesta y razonable', isCorrect: true },
        { text: 'Consultar con el jefe antes de actuar', isCorrect: false },
        { text: 'Esperar a que otros tomen la decisión primero', isCorrect: false },
      ]},
      { text: 'En el análisis de un dilema ético, el bienestar de los empleados nunca puede considerarse más importante que la seguridad de los datos de la empresa.', type: 'TRUE_FALSE', options: [
        { text: 'Verdadero', isCorrect: false },
        { text: 'Falso', isCorrect: true },
      ]},
      { text: 'El principio de reversibilidad en ética empresarial consiste en:', type: 'MCQ', options: [
        { text: 'Poder deshacer cualquier decisión tomada', isCorrect: false },
        { text: 'Preguntarse si aceptarías que otros te trataran de la misma manera', isCorrect: true },
        { text: 'Revisar las decisiones pasadas periódicamente', isCorrect: false },
        { text: 'Aplicar la misma ética en todos los países donde opera la empresa', isCorrect: false },
      ]},
    ],
    surveyTitle: 'Encuesta: Dilemas y Decisiones',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CURSO 4: Liderazgo Ético y Cultura Organizacional
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: 'Liderazgo Ético y Cultura Organizacional',
    description: 'Cuarto y último curso de la carrera. Aborda el rol del líder como promotor de una cultura ética, las herramientas para construirla y los desafíos de mantenerla en organizaciones complejas.',
    difficulty: Difficulty.ADVANCED,
    modules: [
      {
        title: 'Módulo 1: El Líder como Guardián Ético',
        lessons: [
          {
            title: 'Liderazgo ético: más que dar el ejemplo',
            type: LessonType.TEXT,
            isPublished: true,
            content: `${imgTag(IMG.leadership, 'Liderazgo ético')}
<h2>¿Qué es el liderazgo ético?</h2>
<p>Un líder ético no solo actúa con integridad personalmente, sino que crea las condiciones para que su equipo también lo haga. La cultura ética de una organización se construye desde arriba: los comportamientos de los líderes son el modelo más poderoso.</p>
<h3>Los 5 comportamientos del líder ético</h3>
<ol>
  <li><strong>Predicar con el ejemplo:</strong> No pedir a los demás lo que uno mismo no haría.</li>
  <li><strong>Comunicar expectativas claras:</strong> Hacer explícito qué comportamientos son aceptables e inaceptables.</li>
  <li><strong>Crear espacios seguros:</strong> Los empleados deben poder hacer preguntas y reportar problemas sin miedo.</li>
  <li><strong>Reconocer comportamientos éticos:</strong> Celebrar cuando alguien toma la decisión difícil pero correcta.</li>
  <li><strong>Aplicar consecuencias consistentes:</strong> Tolerar una excepción ética destruye la cultura completa.</li>
</ol>
<div style="background:#fefce8;padding:1rem;border-radius:8px;border-left:4px solid #eab308;margin-top:1rem">
  <strong>Investigación Harvard Business Review:</strong> Los empleados son 3 veces más propensos a actuar de manera ética cuando perciben que sus líderes directos lo hacen también.
</div>`,
          },
          {
            title: 'Infografía: Construyendo una cultura ética',
            type: LessonType.INFOGRAPHIC,
            isPublished: true,
            content: `${imgTag(IMG.culture, 'Cultura organizacional')}
<h2>Los 6 Pilares de una Cultura Ética Organizacional</h2>
<div style="display:grid;grid-template-columns:1fr;gap:0.75rem;margin-top:1rem;">
  <div style="display:flex;gap:1rem;align-items:flex-start;background:#eff6ff;padding:1rem;border-radius:8px;">
    <span style="font-size:1.5rem;flex-shrink:0;">🎯</span>
    <div>
      <strong>1. Propósito claro</strong>
      <p style="font-size:0.875rem;margin:0.25rem 0 0">La organización tiene una misión y valores definidos que guían las decisiones, no solo palabras en el sitio web.</p>
    </div>
  </div>
  <div style="display:flex;gap:1rem;align-items:flex-start;background:#f0fdf4;padding:1rem;border-radius:8px;">
    <span style="font-size:1.5rem;flex-shrink:0;">📣</span>
    <div>
      <strong>2. Comunicación abierta</strong>
      <p style="font-size:0.875rem;margin:0.25rem 0 0">Existe flujo de información honesta en todos los sentidos: hacia arriba, abajo y entre áreas.</p>
    </div>
  </div>
  <div style="display:flex;gap:1rem;align-items:flex-start;background:#fefce8;padding:1rem;border-radius:8px;">
    <span style="font-size:1.5rem;flex-shrink:0;">⚖️</span>
    <div>
      <strong>3. Justicia percibida</strong>
      <p style="font-size:0.875rem;margin:0.25rem 0 0">Las normas aplican por igual a todos, sin importar el nivel jerárquico.</p>
    </div>
  </div>
  <div style="display:flex;gap:1rem;align-items:flex-start;background:#fdf4ff;padding:1rem;border-radius:8px;">
    <span style="font-size:1.5rem;flex-shrink:0;">🛡️</span>
    <div>
      <strong>4. Protección del denunciante</strong>
      <p style="font-size:0.875rem;margin:0.25rem 0 0">Quien reporta irregularidades está protegido contra represalias, formal y culturalmente.</p>
    </div>
  </div>
  <div style="display:flex;gap:1rem;align-items:flex-start;background:#fff1f2;padding:1rem;border-radius:8px;">
    <span style="font-size:1.5rem;flex-shrink:0;">📚</span>
    <div>
      <strong>5. Capacitación continua</strong>
      <p style="font-size:0.875rem;margin:0.25rem 0 0">La ética no se enseña una sola vez. Se refuerza con formación periódica, casos de estudio y conversaciones abiertas.</p>
    </div>
  </div>
  <div style="display:flex;gap:1rem;align-items:flex-start;background:#ecfdf5;padding:1rem;border-radius:8px;">
    <span style="font-size:1.5rem;flex-shrink:0;">🔄</span>
    <div>
      <strong>6. Mejora continua</strong>
      <p style="font-size:0.875rem;margin:0.25rem 0 0">El programa ético se evalúa periódicamente con encuestas, auditorías y análisis de incidentes.</p>
    </div>
  </div>
</div>`,
          },
          {
            title: 'Video: Líderes que transformaron culturas organizacionales',
            type: LessonType.VIDEO,
            isPublished: true,
            videoUrl: 'https://www.youtube.com/watch?v=qp0HIF3SfI4',
          },
        ],
        assignment: {
          title: 'Quiz: Liderazgo ético y cultura organizacional',
          description: 'Evaluá tu comprensión sobre el rol del líder en la construcción de una cultura ética.',
          type: AssignmentType.QUIZ,
          maxScore: 100,
          weight: 1,
          linkedLessonIndex: 0,
          quizQuestions: [
            {
              text: 'Según la investigación de Harvard Business Review, ¿cuánto más probable es que los empleados actúen éticamente si ven que su líder lo hace?',
              options: [
                { text: '2 veces más probable', isCorrect: false },
                { text: '3 veces más probable', isCorrect: true },
                { text: '5 veces más probable', isCorrect: false },
                { text: 'La misma probabilidad', isCorrect: false },
              ],
            },
            {
              text: '¿Cuál de los siguientes comportamientos de un líder ético es el más crítico para la cultura organizacional?',
              options: [
                { text: 'Escribir un código de ética detallado', isCorrect: false },
                { text: 'Aplicar consecuencias consistentes sin excepciones de nivel jerárquico', isCorrect: true },
                { text: 'Organizar capacitaciones anuales obligatorias', isCorrect: false },
                { text: 'Publicar los valores de la empresa en la web corporativa', isCorrect: false },
              ],
            },
            {
              text: 'La "justicia percibida" en una organización significa que:',
              options: [
                { text: 'Los empleados creen que las normas aplican igual para todos sin importar el cargo', isCorrect: true },
                { text: 'La empresa tiene un departamento legal sólido', isCorrect: false },
                { text: 'Todos reciben el mismo salario', isCorrect: false },
                { text: 'Existe un sistema de quejas formal', isCorrect: false },
              ],
            },
          ],
        },
      },
      {
        title: 'Módulo 2: Evaluación Final de la Carrera',
        lessons: [
          {
            title: 'Cierre de la Carrera en Ética Empresarial',
            type: LessonType.TEXT,
            isPublished: true,
            content: `${imgTag(IMG.handshake, 'Celebración de logros')}
<h2>¡Felicitaciones! Completaste la Carrera en Ética Empresarial</h2>
<p>Has recorrido un camino completo de formación ética que te da las herramientas para actuar con integridad en cualquier situación profesional.</p>
<h3>Lo que aprendiste</h3>
<ul>
  <li>✅ Los <strong>fundamentos de la ética</strong> y por qué son esenciales en los negocios</li>
  <li>✅ Cómo <strong>identificar y prevenir la corrupción</strong> en todas sus formas</li>
  <li>✅ Herramientas para <strong>analizar y resolver dilemas éticos</strong> complejos</li>
  <li>✅ El rol del <strong>liderazgo ético</strong> en la construcción de culturas organizacionales sanas</li>
</ul>
<h3>Tu compromiso ético</h3>
<p>La ética no es un destino, es un camino. Cada decisión que tomás en tu trabajo, por pequeña que parezca, contribuye a construir o destruir la cultura de tu organización.</p>
<blockquote><p>"El carácter es lo que sos cuando nadie te está mirando." — John Wooden</p></blockquote>
<p>Completá la evaluación final y recibirás tu <strong>Certificado de la Carrera en Ética Empresarial</strong>.</p>`,
          },
        ],
      },
    ],
    evaluationTitle: 'Evaluación Final: Liderazgo Ético y Cultura Organizacional',
    evaluationQuestions: [
      { text: 'Un líder ético debe:', type: 'MCQ', options: [
        { text: 'Solo dar el ejemplo personal sin involucrarse en las decisiones del equipo', isCorrect: false },
        { text: 'Crear condiciones para que todo el equipo actúe éticamente, no solo él mismo', isCorrect: true },
        { text: 'Aplicar tolerancia cero ante cualquier error, sin importar el contexto', isCorrect: false },
        { text: 'Mantener toda comunicación formal y documentada siempre', isCorrect: false },
      ]},
      { text: '¿Cuál de los 6 pilares de una cultura ética permite que el programa mejore con el tiempo?', type: 'MCQ', options: [
        { text: 'Propósito claro', isCorrect: false },
        { text: 'Comunicación abierta', isCorrect: false },
        { text: 'Mejora continua', isCorrect: true },
        { text: 'Justicia percibida', isCorrect: false },
      ]},
      { text: 'Tolerar una excepción ética para un ejecutivo de alto nivel mientras se sanciona a un empleado base:', type: 'MCQ', options: [
        { text: 'Es comprensible dada la importancia del ejecutivo para la empresa', isCorrect: false },
        { text: 'Destruye la credibilidad de la cultura ética y el programa de cumplimiento', isCorrect: true },
        { text: 'Es una decisión que debe tomar solo el CEO', isCorrect: false },
        { text: 'Solo importa si se hace público', isCorrect: false },
      ]},
      { text: 'La capacitación ética anual es suficiente para mantener una cultura organizacional ética.', type: 'TRUE_FALSE', options: [
        { text: 'Verdadero', isCorrect: false },
        { text: 'Falso', isCorrect: true },
      ]},
      { text: '¿Cuál es la señal más confiable de que una organización tiene una cultura ética genuina?', type: 'MCQ', options: [
        { text: 'Tiene un código de ética publicado en su sitio web', isCorrect: false },
        { text: 'Sus líderes actúan de acuerdo con los valores declarados, especialmente bajo presión', isCorrect: true },
        { text: 'Nunca ha tenido escándalos públicos', isCorrect: false },
        { text: 'Realiza capacitaciones obligatorias para todos los empleados', isCorrect: false },
      ]},
    ],
    surveyTitle: 'Encuesta de cierre de carrera',
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de Carrera en Ética Empresarial...\n');

  // Categoría
  const category = await prisma.courseCategory.upsert({
    where: { slug: 'etica-empresarial' },
    update: {},
    create: { name: 'Ética Empresarial', slug: 'etica-empresarial' },
  });

  // Docente
  const teacherEmail = 'docente.etica@empresa.local';
  let teacher = await prisma.user.findUnique({ where: { email: teacherEmail } });
  if (!teacher) {
    teacher = await prisma.user.create({
      data: {
        email: teacherEmail,
        passwordHash: await HASH('Demo1234!'),
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        profile: { create: { firstName: 'Roberto', lastName: 'Valenzuela' } },
      },
    });
  }
  console.log(`✓ Docente: ${teacherEmail} / Demo1234!`);

  for (let ci = 0; ci < COURSES.length; ci++) {
    const def = COURSES[ci];
    const courseSlug = slug(def.title);
    console.log(`\n📚 Procesando: ${def.title}`);

    // Badges del curso
    const completeBadge = await prisma.badge.upsert({
      where: { id: `badge-etica-c${ci + 1}` },
      update: {},
      create: {
        id: `badge-etica-c${ci + 1}`,
        name: `Completó Curso ${ci + 1}: ${def.title}`,
        description: `Finalizaste "${def.title}" con éxito.`,
        criteriaType: BadgeCriteria.COURSE_COMPLETE,
        courseId: null,
      },
    });

    // Curso
    let course = await prisma.course.findUnique({ where: { slug: courseSlug } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          teacherId: teacher.id,
          categoryId: category.id,
          title: def.title,
          slug: courseSlug,
          description: def.description,
          difficulty: def.difficulty,
          status: 'PUBLISHED',
          enrollmentType: EnrollmentType.OPEN,
        },
      });
    }
    console.log(`  ✓ Curso: ${course.title}`);

    // Módulos, lecciones y assignments
    let prevModuleId: string | null = null;

    for (let mi = 0; mi < def.modules.length; mi++) {
      const modDef = def.modules[mi];
      const mod: { id: string; order: number } = await prisma.courseModule.upsert({
        where: { courseId_order: { courseId: course.id, order: mi + 1 } },
        update: { prerequisiteModuleId: prevModuleId },
        create: {
          courseId: course.id,
          title: modDef.title,
          order: mi + 1,
          prerequisiteModuleId: prevModuleId,
        },
      });

      // Lecciones
      const createdLessonIds: string[] = [];
      for (let li = 0; li < modDef.lessons.length; li++) {
        const lDef = modDef.lessons[li];
        const existing = await prisma.lesson.findUnique({
          where: { moduleId_order: { moduleId: mod.id, order: li + 1 } },
        });
        let lesson = existing;
        if (!lesson) {
          lesson = await prisma.lesson.create({
            data: {
              moduleId: mod.id,
              order: li + 1,
              title: lDef.title,
              type: lDef.type,
              content: lDef.content ?? null,
              videoUrl: lDef.videoUrl ?? null,
              embedUrl: lDef.embedUrl ?? null,
              isPublished: lDef.isPublished,
            },
          });
        }
        createdLessonIds.push(lesson.id);
      }

      // Assignment vinculado al módulo
      if (modDef.assignment) {
        const aDef = modDef.assignment;
        const linkedLessonId = createdLessonIds[aDef.linkedLessonIndex] ?? createdLessonIds[0];

        let assignment = await prisma.assignment.findFirst({
          where: { courseId: course.id, title: aDef.title },
        });
        if (!assignment) {
          assignment = await prisma.assignment.create({
            data: {
              courseId: course.id,
              lessonId: linkedLessonId,
              title: aDef.title,
              description: aDef.description,
              type: aDef.type,
              maxScore: aDef.maxScore,
              weight: aDef.weight,
            },
          });

          if (aDef.type === AssignmentType.QUIZ && aDef.quizQuestions) {
            for (let qi = 0; qi < aDef.quizQuestions.length; qi++) {
              const q = aDef.quizQuestions[qi];
              const question = await prisma.quizQuestion.create({
                data: {
                  assignmentId: assignment.id,
                  question: q.text,
                  options: q.options.map(o => o.text),
                  correctOption: q.options.findIndex(o => o.isCorrect),
                  order: qi + 1,
                },
              });
              void question;
            }
          }

          if (aDef.type === AssignmentType.DILEMMA && aDef.dilemma) {
            await prisma.dilemmaScenario.create({
              data: {
                assignmentId: assignment.id,
                scenario: aDef.dilemma.scenario,
                choices: {
                  create: aDef.dilemma.choices.map((c, idx) => ({
                    text: c.text,
                    consequence: c.consequence,
                    ethicalScore: c.ethicalScore,
                    order: idx + 1,
                  })),
                },
              },
            });
          }
        }
      }

      prevModuleId = mod.id;
      console.log(`    ✓ Módulo ${mi + 1}: ${modDef.title} (${modDef.lessons.length} lecciones)`);
    }

    // Evaluación final
    let evaluation = await prisma.evaluation.findFirst({
      where: { courseId: course.id, title: def.evaluationTitle },
    });
    if (!evaluation) {
      evaluation = await prisma.evaluation.create({
        data: {
          courseId: course.id,
          title: def.evaluationTitle,
          description: `Evaluación final del curso "${def.title}". Nota mínima de aprobación: 70 puntos.`,
          totalPoints: 100,
          isPublished: true,
          questions: {
            create: def.evaluationQuestions.map((q, idx) => ({
              text: q.text,
              type: q.type as QuestionType,
              points: Math.floor(100 / def.evaluationQuestions.length),
              order: idx + 1,
              options: q.options
                ? { create: q.options.map((o, oi) => ({ text: o.text, isCorrect: o.isCorrect, order: oi + 1 })) }
                : undefined,
            })),
          },
        },
      });
    }

    // Encuesta
    let survey = await prisma.survey.findFirst({
      where: { courseId: course.id, title: def.surveyTitle },
    });
    if (!survey) {
      await prisma.survey.create({
        data: {
          courseId: course.id,
          title: def.surveyTitle,
          description: `Encuesta de satisfacción del curso "${def.title}".`,
          isAnonymous: true,
          isOpen: true,
          questions: {
            create: [
              { text: '¿El contenido del curso fue relevante para tu trabajo?', type: SurveyQuestionType.LIKERT, order: 1 },
              { text: '¿Recomendarías este curso a un colega?', type: SurveyQuestionType.YES_NO, options: ['Sí', 'No'], order: 2 },
              { text: '¿Qué aspecto te resultó más valioso?', type: SurveyQuestionType.MULTIPLE_CHOICE, options: ['Casos de estudio', 'Dilemas éticos', 'Infografías', 'Videos', 'Apps interactivas'], order: 3 },
              { text: '¿Qué mejorarías del curso?', type: SurveyQuestionType.TEXT, order: 4 },
            ],
          },
        },
      });
    }

    console.log(`  ✓ Evaluación y encuesta creadas`);
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log('✅ CARRERA EN ÉTICA EMPRESARIAL — SEED COMPLETADO');
  console.log('════════════════════════════════════════════');
  console.log('\n📧 Docente: docente.etica@empresa.local / Demo1234!');
  console.log('\n📚 Cursos creados:');
  COURSES.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.title} (${c.difficulty})`);
    c.modules.forEach((m, mi) => {
      console.log(`     Módulo ${mi + 1}: ${m.title}`);
      console.log(`       ${m.lessons.length} lecciones${m.assignment ? ' · 1 assignment vinculado' : ''}`);
    });
  });
  console.log('\n🆕 Tipos de lección incluidos:');
  console.log('   ✓ TEXT con imágenes (picsum.photos)');
  console.log('   ✓ INFOGRAPHIC con grillas visuales + imágenes');
  console.log('   ✓ CASE_STUDY con análisis estructurado');
  console.log('   ✓ VIDEO (YouTube)');
  console.log('   ✓ EMBED (Kahoot, Mentimeter)');
  console.log('\n🔗 Assignments vinculados a lecciones específicas (lessonId)');
  console.log('   → En el viewer de lección aparece botón "Ir a la actividad →"');
  console.log('\n📄 PDF disponible por módulo:');
  console.log('   → Botón 📄 en el sidebar de cada módulo (pestaña Contenido)');
  console.log('════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Seed falló:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
