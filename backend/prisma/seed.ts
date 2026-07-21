import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString =
  process.env['DIRECT_URL'] || process.env['DATABASE_URL'];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Начинаем забивать тестовые данные (seeding)...');

  await prisma.location.upsert({
    where: { name: 'Санкт-Петербург' },
    update: {},
    create: {
      name: 'Санкт-Петербург',
      sites: {
        create: [{ name: 'Площадка Парнас' }, { name: 'Площадка Купчино' }],
      },
    },
  });

  await prisma.brand.upsert({
    where: { name: 'Geely' },
    update: {},
    create: {
      name: 'Geely',
      models: {
        create: [{ name: 'Monjaro' }, { name: 'Coolray' }, { name: 'Tugella' }],
      },
    },
  });

  await prisma.brand.upsert({
    where: { name: 'Haval' },
    update: {},
    create: {
      name: 'Haval',
      models: {
        create: [{ name: 'Jolion' }, { name: 'F7x' }, { name: 'Dargo' }],
      },
    },
  });

  const colors = ['Белый', 'Черный', 'Серый металлик', 'Синий', 'Красный'];
  for (const colorName of colors) {
    await prisma.color.upsert({
      where: { name: colorName },
      update: {},
      create: { name: colorName },
    });
  }

  const siteParnas = await prisma.site.findFirst({
    where: { name: 'Площадка Парнас' },
  });

  const monjaroModel = await prisma.carModel.findFirst({
    where: { name: 'Monjaro' },
  });

  const blackColor = await prisma.color.findFirst({
    where: { name: 'Черный' },
  });

  if (siteParnas && monjaroModel && blackColor) {
    const arrival = await prisma.arrival.create({
      data: {
        truckNumber: 'Автовоз №42',
        arrivalDate: new Date(),
        comment: 'Первая тестовая партия машин',
      },
    });

    await prisma.car.create({
      data: {
        vin: 'LV234567890123456',
        modelId: monjaroModel.id,
        colorId: blackColor.id,
        siteId: siteParnas.id,
        arrivalId: arrival.id,
        checks: {
          create: {
            voltage: 12.6,
            comment: 'Заводская проверка при приеме',
          },
        },
      },
    });
  }

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
