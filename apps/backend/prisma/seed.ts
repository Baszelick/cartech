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
  console.log('🌱 Начинаем создавать стартовые данные...');

  const company = await prisma.company.upsert({
    where: { code: 'FORSAGE' },
    update: {
      name: 'Форсаж',
      isActive: true,
    },
    create: {
      code: 'FORSAGE',
      name: 'Форсаж',
      isActive: true,
    },
  });

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

  const hashedPassword = await bcrypt.hash('178Region', 10);
  const owner = await prisma.user.upsert({
    where: {
      companyId_username: {
        companyId: company.id,
        username: 'ivan',
      },
    },
    update: {
      passwordHash: hashedPassword,
      firstName: 'Иван',
      lastName: 'Талисов',
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      companyId: company.id,
      username: 'ivan',
      passwordHash: hashedPassword,
      firstName: 'Иван',
      lastName: 'Талисов',
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.userRoleAssignment.deleteMany({
    where: {
      userId: owner.id,
      role: { not: UserRole.SYSTEM_OWNER },
    },
  });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_role: {
        userId: owner.id,
        role: UserRole.SYSTEM_OWNER,
      },
    },
    update: {},
    create: {
      userId: owner.id,
      role: UserRole.SYSTEM_OWNER,
    },
  });

  await prisma.userLocationAccess.upsert({
    where: {
      userId_locationId: {
        userId: owner.id,
        locationId: location.id,
      },
    },
    update: {},
    create: {
      userId: owner.id,
      locationId: location.id,
    },
  });

  await removeSafeLegacyDemoCompany();

  console.log('👤 Стартовый владелец ivan создан.');
  console.log('✅ Стартовые данные готовы.');
}

async function removeSafeLegacyDemoCompany(): Promise<void> {
  const demo = await prisma.company.findFirst({
    where: { name: 'CarTech Demo' },
    select: { id: true },
  });
  if (!demo) {
    return;
  }

  const users = await prisma.user.findMany({
    where: { companyId: demo.id },
    select: { id: true, username: true },
  });
  const userIds = users.map(({ id }) => id);
  const locationIds = (
    await prisma.location.findMany({
      where: { companyId: demo.id },
      select: { id: true },
    })
  ).map(({ id }) => id);

  const [
    cars,
    vehicleEvents,
    feedPosts,
    auditLogs,
    userBusinessReferences,
  ] = await Promise.all([
    prisma.car.count({ where: { companyId: demo.id } }),
    prisma.vehicleEvent.count({ where: { companyId: demo.id } }),
    prisma.feedPost.count({ where: { companyId: demo.id } }),
    prisma.auditLog.count({ where: { companyId: demo.id } }),
    Promise.all([
      prisma.feedComment.count({ where: { authorId: { in: userIds } } }),
      prisma.feedPostReaction.count({ where: { userId: { in: userIds } } }),
      prisma.feedCommentReaction.count({ where: { userId: { in: userIds } } }),
      prisma.batteryCheck.count({ where: { checkedById: { in: userIds } } }),
      prisma.vehicleMovement.count({ where: { movedById: { in: userIds } } }),
      prisma.deliveryAppointment.count({
        where: { createdById: { in: userIds } },
      }),
      prisma.vehicleIssue.count({ where: { issuedById: { in: userIds } } }),
    ]),
  ]);

  const onlyDemoAdmin =
    users.length === 1 && users[0]?.username.toLowerCase() === 'admin';
  const hasBusinessData =
    cars > 0 ||
    vehicleEvents > 0 ||
    feedPosts > 0 ||
    auditLogs > 0 ||
    userBusinessReferences.some((count) => count > 0);

  if (!onlyDemoAdmin || hasBusinessData) {
    console.warn(
      '⚠️ CarTech Demo сохранена: обнаружены дополнительные пользователи или связанные бизнес-данные.',
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await tx.userLocationAccess.deleteMany({
      where: { userId: { in: userIds } },
    });
    await tx.userRoleAssignment.deleteMany({
      where: { userId: { in: userIds } },
    });
    await tx.site.deleteMany({ where: { locationId: { in: locationIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
    await tx.location.deleteMany({ where: { id: { in: locationIds } } });
    await tx.company.delete({ where: { id: demo.id } });
  });

  console.log('🧹 Безопасная demo-компания CarTech Demo удалена.');
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
