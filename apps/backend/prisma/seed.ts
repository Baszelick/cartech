import { PrismaClient, UserRole } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString =
  process.env['DIRECT_URL'] || process.env['DATABASE_URL'];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Начинаем забивать тестовые данные (seeding)...');

  let company = await prisma.company.findFirst({
    where: { name: 'CarTech Demo' },
  });

  if (!company) {
    company = await prisma.company.create({
      data: { name: 'CarTech Demo' },
    });
  }

  const location = await prisma.location.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'SPB',
      },
    },
    update: {
      name: 'Санкт-Петербург',
      isActive: true,
    },
    create: {
      companyId: company.id,
      code: 'SPB',
      name: 'Санкт-Петербург',
    },
  });

  await prisma.site.upsert({
    where: {
      locationId_name: {
        locationId: location.id,
        name: 'Площадка Парнас',
      },
    },
    update: { isActive: true },
    create: {
      locationId: location.id,
      name: 'Площадка Парнас',
    },
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: {
      companyId_username: {
        companyId: company.id,
        username: 'admin',
      },
    },
    update: {
      passwordHash: hashedPassword,
      firstName: 'Админ',
      lastName: 'Админов',
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      companyId: company.id,
      username: 'admin',
      passwordHash: hashedPassword,
      firstName: 'Админ',
      lastName: 'Админов',
      mustChangePassword: false,
    },
  });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_role: {
        userId: admin.id,
        role: UserRole.SYSTEM_OWNER,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      role: UserRole.SYSTEM_OWNER,
    },
  });

  await prisma.userLocationAccess.upsert({
    where: {
      userId_locationId: {
        userId: admin.id,
        locationId: location.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      locationId: location.id,
    },
  });

  console.log(`👤 Seed-пользователь admin создан для companyId=${company.id}.`);

  console.log('✅ База успешно заполнена тестовыми данными!');
}

main()
  .catch((e: unknown) => {
    console.error('❌ Ошибка при заполнении базы:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
