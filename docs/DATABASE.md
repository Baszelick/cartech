# CarTech Database Workflow

> Текущее состояние и целевой Prisma workflow. Архитектурная стратегия зафиксирована в ADR-015.

Последнее обновление: 2026-07-29

---

## Текущее состояние

- `apps/backend/prisma/schema.prisma` — утверждённая целевая Schema.
- `apps/backend/generated/prisma` — единственный Prisma Client backend.
- Schema проходит `prisma validate`.
- Client успешно генерируется из корня workspace.
- Seed соответствует текущим Company, Location, Site, User, UserRoleAssignment и UserLocationAccess.
- Active migration history содержит один clean baseline: `prisma/migrations/migration_init`.
- Четыре legacy migrations перенесены в `prisma/legacy-migrations` и не применяются Prisma Migrate.
- Фактический drift подключённой БД не подтверждён: pooler connection возвращает Schema Engine error, `DIRECT_URL` не настроен.

## Legacy history

Legacy history создаёт PascalCase tables, numeric IDs, `Arrival`, Brand/Model/Color справочники и scalar role. Текущая Schema использует mapped plural tables, UUID, Company scope, role assignments и другую Car model.

Legacy SQL сохранён только для анализа возможного переноса существующих данных. Каталог `legacy-migrations` не является active Prisma migration path.

## Выбранная стратегия

Для новых dev/test environments создана чистая initial migration из текущей Schema.

Активная история:

- `prisma/migrations/migration_lock.toml`;
- `prisma/migrations/migration_init/migration.sql`.

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

Database-часть workflow подготовлена. Полный backend start пока не подтверждён: в Nx backend project отсутствуют build/serve targets, а legacy modules блокируют TypeScript build.

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

Seed намеренно не создаёт Car, PSO или Battery Tasks: их contracts ещё не полностью реализованы в backend workflow.

Пароль seed-пользователя предназначен только для локальной disposable среды и не должен использоваться в production.

## Проверки

Подтверждено:

- `prisma validate` — успешно;
- `prisma generate` — успешно;
- generated output после повторной генерации не изменился;
- `migration_init` детерминированно генерируется из текущей Schema;
- baseline содержит все 19 tables и 8 enum, legacy objects отсутствуют;
- active migration path содержит только `migration_init`;
- seed отдельно проходит TypeScript type-check против generated Prisma Client.

Не подтверждено:

- применение `migration_init` через `prisma migrate deploy` на disposable PostgreSQL;
- `prisma migrate status` через direct connection;
- drift реальной PostgreSQL базы;
- успешный seed на новой базе;
- полный backend start.

Причина: disposable PostgreSQL и `DIRECT_URL` в текущем окружении отсутствуют. Существующая удалённая база намеренно не изменялась.
