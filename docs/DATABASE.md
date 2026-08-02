# CarTech Database Workflow

> Текущее состояние и целевой Prisma workflow. Архитектурная стратегия зафиксирована в ADR-015.

Последнее обновление: 2026-08-01

---

## Текущее состояние

- `apps/backend/prisma/schema.prisma` — утверждённая целевая Schema.
- `apps/backend/generated/prisma` — единственный Prisma Client backend.
- Schema проходит `prisma validate`.
- Client успешно генерируется из корня workspace.
- Seed соответствует текущим Company, Location, Site, User, UserRoleAssignment и UserLocationAccess.
- Active migration history содержит clean baseline и добавочную VIN migration.
- Четыре legacy migrations перенесены в `prisma/legacy-migrations` и не применяются Prisma Migrate.
- Clean baseline развёрнут с нуля на разрешённой тестовой Neon PostgreSQL через direct connection.
- `migrate deploy`, двойной seed, backend build/serve и основной Arrival smoke-flow подтверждены.
- Migration `20260801160000_finalize_car_vin_contract` делает `Car.vin` nullable без reset и потери существующих Car.

## Legacy history

Legacy history создаёт PascalCase tables, numeric IDs, `Arrival`, Brand/Model/Color справочники и scalar role. Текущая Schema использует mapped plural tables, UUID, Company scope, role assignments и другую Car model.

Legacy SQL сохранён только для анализа возможного переноса существующих данных. Каталог `legacy-migrations` не является active Prisma migration path.

## Выбранная стратегия

Для новых dev/test environments создана чистая initial migration из текущей Schema.

Активная история:

- `prisma/migrations/migration_lock.toml`;
- `prisma/migrations/migration_init/migration.sql`;
- `prisma/migrations/20260801160000_finalize_car_vin_contract/migration.sql`.

Baseline создан командой `prisma migrate diff --from-empty --to-schema` без подключения к базе. Он содержит 8 enum и 19 tables текущей Schema. Повторная генерация дала идентичный SHA-256.

Ограничения:

- `migrate deploy`, `migrate reset` и seed не запускаются на общей или неизвестной базе;
- baseline предназначен для пустой базы;
- существующая legacy database не изменяется этим baseline.

Если потребуется сохранить legacy-данные, сначала создаётся backup и отдельный data-migration plan.

## Целевой workflow

Для пустой PostgreSQL базы:

```text
npm install
    ↓
prisma generate
    ↓
prisma migrate deploy
    ↓
prisma db seed
    ↓
build / start backend
```

Команды из корня workspace:

```bash
npm install
npx prisma generate --config apps/backend/prisma.config.ts
npx prisma migrate deploy --config apps/backend/prisma.config.ts
npx prisma db seed --config apps/backend/prisma.config.ts
```

Для локальной разработки новой migration:

```bash
npx prisma migrate dev --name <migration_name> --config apps/backend/prisma.config.ts
```

`migrate dev` выполняется только на disposable development database с direct connection.

Workflow подтверждён из корня workspace на чистой тестовой PostgreSQL. Seed запускается через `tsx`, поскольку generated Prisma Client использует ESM.

## Environment

Обязательные переменные:

- `DATABASE_URL` — runtime connection приложения;
- `DIRECT_URL` — direct PostgreSQL connection для migration/status/drift операций.

`prisma.config.ts` предпочитает `DIRECT_URL` и использует `DATABASE_URL` только как fallback. Pooler URL допустим для runtime, но не должен быть единственным migration connection.

## Seed contract

Seed идемпотентно создаёт:

- Company `CarTech Demo`;
- Location с code `SPB`;
- Site `Площадка Парнас`;
- активного пользователя `admin`;
- роль `SYSTEM_OWNER`;
- доступ пользователя к Location.

Seed намеренно не создаёт Car, Pso или VehicleEvent. Smoke-автомобиль создаётся только через `POST /operations/arrivals`, чтобы проверить реальную транзакцию приёмки.

Пароль seed-пользователя предназначен только для локальной disposable среды и не должен использоваться в production.

## Проверки

Подтверждено:

- `prisma validate` — успешно;
- `prisma generate` — успешно;
- generated output после повторной генерации не изменился;
- `migration_init` детерминированно генерируется из текущей Schema;
- baseline содержит все 19 tables и 8 enum, legacy objects отсутствуют;
- active migration path содержит только `migration_init`;
- seed отдельно проходит TypeScript type-check против generated Prisma Client;
- clean reset и применение `migration_init` — успешно;
- повторный `migrate deploy` — pending migrations отсутствуют;
- seed выполнен дважды; повторный запуск идемпотентен;
- seed создаёт Company, активного admin, `SYSTEM_OWNER`, активные Location/Site и `UserLocationAccess`;
- backend build — успешно;
- backend Jest — 25 suites, 152 tests;
- Nx serve и Swagger `/api/docs` — HTTP 200;
- login, `/auth/me`, Location/Site read и `POST /operations/arrivals` — успешно;
- Arrival создал `Car.lifecycleStatus = ACTIVE`, `Pso.status = PENDING` и одно событие `CAR_ARRIVED`.

Не подтверждено:

- автоматизированное сохранение или преобразование данных legacy database — оно не входит в clean-baseline workflow.
