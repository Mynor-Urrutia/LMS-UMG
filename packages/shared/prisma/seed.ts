import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      'SEED_ADMIN_PASSWORD environment variable is required. Set it before running the seed.'
    );
  }

  // Admin user
  const adminEmail = 'admin@lms.local';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'LMS',
          },
        },
      },
    });
    console.log(`Created admin user: ${admin.email}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  // Default categories
  const categories = [
    { name: 'Programación', slug: 'programacion' },
    { name: 'Diseño', slug: 'diseno' },
    { name: 'Negocios', slug: 'negocios' },
    { name: 'Ciencias', slug: 'ciencias' },
    { name: 'Matemáticas', slug: 'matematicas' },
    { name: 'Idiomas', slug: 'idiomas' },
  ];

  for (const cat of categories) {
    await prisma.courseCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`Upserted ${categories.length} categories`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
