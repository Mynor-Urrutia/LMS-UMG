import { BadgeCriteria, PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'users:manage',       name: 'Gestionar usuarios',     group: 'Usuarios',       description: 'Crear, editar, cambiar rol y estado de usuarios' },
  { key: 'roles:manage',       name: 'Gestionar roles',        group: 'Usuarios',       description: 'Crear, editar y eliminar roles personalizados' },
  { key: 'courses:create',     name: 'Crear cursos',           group: 'Cursos',         description: 'Crear nuevos cursos' },
  { key: 'courses:edit',       name: 'Editar cursos',          group: 'Cursos',         description: 'Editar detalles de cursos propios' },
  { key: 'courses:publish',    name: 'Publicar cursos',        group: 'Cursos',         description: 'Publicar y despublicar cursos' },
  { key: 'courses:delete',     name: 'Eliminar cursos',        group: 'Cursos',         description: 'Archivar y eliminar cursos' },
  { key: 'courses:assign',     name: 'Asignar cursos',         group: 'Cursos',         description: 'Asignar cursos a docentes' },
  { key: 'content:manage',     name: 'Gestionar contenido',    group: 'Contenido',      description: 'Crear y editar módulos y lecciones' },
  { key: 'enrollments:manage', name: 'Gestionar inscripciones',group: 'Inscripciones',  description: 'Aprobar y rechazar inscripciones' },
  { key: 'categories:manage',  name: 'Gestionar categorías',   group: 'Configuración',  description: 'Crear, editar y eliminar categorías' },
  { key: 'grades:manage',      name: 'Calificar',              group: 'Calificaciones', description: 'Calificar entregas y tareas' },
  { key: 'reports:view',       name: 'Ver reportes',           group: 'Reportes',       description: 'Ver estadísticas y reportes del sistema' },
];

const SYSTEM_ROLES: {
  name: string;
  description: string;
  baseRole: Role;
  color: string;
  icon: string;
  permissions: string[];
}[] = [
  {
    name: 'Administrador',
    description: 'Acceso completo al sistema',
    baseRole: Role.ADMIN,
    color: '#ef4444',
    icon: '🛡️',
    permissions: PERMISSIONS.map(p => p.key),
  },
  {
    name: 'Docente',
    description: 'Crea y gestiona cursos y contenido',
    baseRole: Role.TEACHER,
    color: '#3b82f6',
    icon: '👨‍🏫',
    permissions: ['courses:create', 'courses:edit', 'courses:publish', 'courses:delete', 'content:manage', 'enrollments:manage', 'grades:manage'],
  },
  {
    name: 'Estudiante',
    description: 'Accede a cursos e inscripciones',
    baseRole: Role.STUDENT,
    color: '#22c55e',
    icon: '🎓',
    permissions: [],
  },
];

async function main(): Promise<void> {
  console.log('Seeding database...');

  // ── Permissions ──────────────────────────────────────────────────────────────
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, description: perm.description, group: perm.group },
      create: perm,
    });
  }
  console.log(`Upserted ${PERMISSIONS.length} permissions`);

  // ── System roles ─────────────────────────────────────────────────────────────
  for (const roleDef of SYSTEM_ROLES) {
    const { permissions, ...roleData } = roleDef;

    const role = await prisma.customRole.upsert({
      where: { name: roleDef.name },
      update: { description: roleData.description, color: roleData.color, icon: roleData.icon },
      create: { ...roleData, isSystem: true },
    });

    // Sync permissions: delete all and re-insert to avoid drift
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    if (permissions.length > 0) {
      const permRecords = await prisma.permission.findMany({
        where: { key: { in: permissions } },
        select: { id: true },
      });
      await prisma.rolePermission.createMany({
        data: permRecords.map(p => ({ roleId: role.id, permissionId: p.id })),
      });
    }

    console.log(`Upserted system role: ${roleDef.name}`);
  }

  // ── Admin user ───────────────────────────────────────────────────────────────
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminRole = await prisma.customRole.findUnique({ where: { name: 'Administrador' } });
  const adminEmail = 'admin@lms.local';

  if (!adminPassword) {
    // Assign system role to any existing admin users that don't have one yet
    if (adminRole) {
      await prisma.user.updateMany({
        where: { role: Role.ADMIN, customRoleId: null },
        data: { customRoleId: adminRole.id },
      });
    }
    console.log('SEED_ADMIN_PASSWORD not set — skipping admin user creation. Assigned Administrador role to existing admins.');
  } else {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          customRoleId: adminRole?.id ?? null,
          profile: { create: { firstName: 'Admin', lastName: 'LMS' } },
        },
      });
      console.log(`Created admin user: ${admin.email}`);
    } else {
      if (adminRole && !existing.customRoleId) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { customRoleId: adminRole.id },
        });
      }
      console.log(`Admin already exists: ${adminEmail}`);
    }
  }

  // ── Default categories ───────────────────────────────────────────────────────
  const categories = [
    { name: 'Programación',  slug: 'programacion' },
    { name: 'Diseño',        slug: 'diseno' },
    { name: 'Negocios',      slug: 'negocios' },
    { name: 'Ciencias',      slug: 'ciencias' },
    { name: 'Matemáticas',   slug: 'matematicas' },
    { name: 'Idiomas',       slug: 'idiomas' },
  ];

  for (const cat of categories) {
    await prisma.courseCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`Upserted ${categories.length} categories`);

  // ── System badges ────────────────────────────────────────────────────────────
  const systemBadges: { name: string; description: string; criteriaType: BadgeCriteria }[] = [
    {
      name: 'Primer Paso',
      description: 'Te inscribiste en tu primer curso. ¡El viaje comienza!',
      criteriaType: BadgeCriteria.FIRST_ENROLLMENT,
    },
    {
      name: 'Graduado',
      description: 'Completaste un curso. ¡Excelente dedicación!',
      criteriaType: BadgeCriteria.COURSE_COMPLETE,
    },
    {
      name: 'Mente Brillante',
      description: 'Obtuviste puntaje perfecto en una evaluación.',
      criteriaType: BadgeCriteria.PERFECT_QUIZ,
    },
    {
      name: 'Racha Imparable',
      description: 'Mantuviste una racha de aprendizaje constante.',
      criteriaType: BadgeCriteria.STREAK,
    },
    {
      name: 'Reconocimiento Especial',
      description: 'Otorgado manualmente por logros destacados.',
      criteriaType: BadgeCriteria.MANUAL,
    },
  ];

  for (const badge of systemBadges) {
    const existing = await prisma.badge.findFirst({ where: { name: badge.name, courseId: null } });
    if (existing) {
      await prisma.badge.update({ where: { id: existing.id }, data: { description: badge.description, criteriaType: badge.criteriaType } });
    } else {
      await prisma.badge.create({ data: { ...badge, courseId: null } });
    }
  }
  console.log(`Upserted ${systemBadges.length} system badges`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
