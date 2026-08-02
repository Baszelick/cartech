# CarTech AI Task Tracker

> Рабочий трекер ближайших задач. Источник фактического состояния: `docs/PROJECT_AUDIT.md`.

Последнее обновление: 2026-08-01

---

## Правила работы

### Перед началом задачи

1. Изучить связанные файлы и актуальную Prisma Schema.
2. Проверить решения в `docs/DECISIONS.md` и зафиксированные конфликты.
3. Определить проверяемый результат и затрагиваемую доменную область.
4. Не расширять задачу дополнительным рефакторингом.

### Статусы

- `[x]` — выполнено, компиляция и тесты проходят, контракт подтверждён.
- `[-]` — реализация существует, но результат ещё не подтверждён.
- `[ ]` — не выполнено.

### Формат отчёта

```md
Completed:
- ...

Changed:
- ...

Tests:
- ...

Notes:
- ...

Blockers:
- ...
```

---

## Current Focus

**Frontend foundation подтверждена; следующий шаг — typed integration с Backend MVP API.**

Angular/Nx workflow, domain-oriented структура Auth/Shell и UI lint подтверждены.

---

## Phase 0 — Domain Alignment

**Статус:** `[-]` Основная модель согласована; остались локальные business-policy вопросы.

Цель: устранить противоречия между Prisma Schema, backend-кодом и архитектурными решениями до продолжения разработки.

- [x] Приёмка определена как транзакционная бизнес-операция без отдельной `Arrival` entity.
- [x] `brand`, `model`, `color` определены как snapshot-поля Car.
- [x] Роли хранятся как набор `UserRoleAssignment`; scalar `user.role` исключён из целевой модели.
- [x] Зафиксированы `ACTIVE`, `ISSUED`, `ARCHIVED` и допустимые lifecycle-переходы.
- [x] Pso создаётся при приёмке со статусом `PENDING`; `deadlineOn = arrivedOn + 3` календарных дня.
- [x] Battery scheduling подтверждён: 30-дневные периоды от `arrivedOn`, окно за 3 дня, одна проверка закрывает один период.
- [x] ADR и business rules синхронизированы с целевой моделью.

### Отчёт Phase 0

Completed:

- Разобраны Arrival, Car identity, User roles, lifecycle, PSO/Issue и BatteryCheck.
- Подтверждена текущая Prisma Schema как основа целевой модели.

Changed:

- `docs/DECISIONS.md`
- `docs/BUSINESS_RULES.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Не запускались: задача изменяет только документацию.

Notes:

- ADR-003, ADR-004 и ADR-005 заменены новыми решениями.

Blockers:

- Подтверждённых blockers в Phase 0 нет.

---

## Phase 1 — Backend Recovery

**Статус:** `[-]` Foundation-модули стабилизированы; отдельные workflows и инфраструктурные проверки остаются.

Порядок обязателен: следующий шаг начинается после подтверждения предыдущего.

### 1. Prisma foundation

**Статус:** `[x]` Clean baseline и полный database workflow подтверждены на чистой тестовой Neon PostgreSQL.

Подтвердить целевую Schema после Phase 0, выбрать единый Prisma Client import path, определить migration path от legacy database, актуализировать seed и проверить schema/migration drift на тестовой PostgreSQL базе.

Completed:

- Все backend TypeScript imports переведены с `@prisma/client` на `apps/backend/generated/prisma`.
- Seed приведён к Company, Location, Site, User, UserRoleAssignment и UserLocationAccess.
- Prisma Schema validation и Client generation подтверждены.
- Выбран clean baseline для новых dev/test databases; legacy migrations исключаются из будущей активной цепочки.
- Создан `migration_init` из текущей Schema.
- Legacy SQL перенесён в `prisma/legacy-migrations`.
- Выполнены clean reset, deploy и двойной идемпотентный seed.
- Через публичный Arrival API подтверждено создание Car, Pso и `CAR_ARRIVED`.

Changed:

- Prisma imports, `PrismaService` usage и seed.
- `docs/DECISIONS.md` и `docs/DATABASE.md`.
- `prisma.config.ts` и `.env.example` для direct migration connection.
- `prisma/migrations/migration_init` и архив legacy migrations.

Tests:

- Backend TypeScript build-check запущен; Auth/seed errors отсутствуют, build блокируют Arrivals/Cars/Dashboard.
- `prisma validate` — passed.
- `prisma generate` — passed.
- `prisma migrate deploy` через direct connection — passed, pending migrations отсутствуют.
- Baseline regeneration hash — matched.
- SQL inspection — 8 enum, 19 tables, legacy objects отсутствуют.
- Seed standalone TypeScript check — passed.
- Seed выполнен дважды; обязательная инфраструктура создана без дубликатов.
- `npx nx build backend` — passed.
- `npx nx test backend --runInBand` — 25 suites, 152 tests passed.
- Nx serve и `/api/docs` — HTTP 200.

Notes:

- Generated Prisma Client остаётся единственным источником Prisma types/runtime.
- Legacy migration history не могла развернуть целевую Schema с нуля.
- Новая active history начинается только с `migration_init`.

Blockers:

- Внутри clean database foundation блокеров нет.
- Перенос legacy-данных остаётся отдельной задачей и не входит в clean-baseline workflow.

### 2. Auth migration

**Статус:** `[-]` Auth и role guard foundation реализованы; guards ещё не подключены к будущим административным endpoints.

Мигрировать login, public user contract, JWT payload, refresh flow и guards на подтверждённую модель ролей, company и location scope. Проверить active user и фактические HTTP-коды.

Completed:

- Login использует compound `(companyId, username)`.
- Public user и JWT используют `companyId` и массив `roles`.
- Login/refresh отклоняют неактивного пользователя.
- Refresh rotation, logout, `me` и JWT strategy приведены к новому payload.
- Отсутствующий refresh cookie возвращает HTTP 401.
- Permission matrix MVP зафиксирована.
- Добавлены декларативный `@Roles(...)` и общий `RolesGuard`.

Changed:

- Auth service, controller, DTO, JWT interfaces/service/strategy, role guard и tests.

Tests:

- `roles.guard.spec.ts`: 7/7 tests passed.
- Полный backend Jest: 16 suites, 67 tests passed.
- Backend TypeScript check и Nx build проходят.

Notes:

- Role guard не подключён к существующим business endpoints.
- Login API теперь требует `companyId`; frontend contract потребуется обновить на frontend-этапе.

Blockers:

- Внутри role guard foundation блокеров нет.
### 3. Arrivals migration

**Статус:** `[x]` Миграция завершена и проверена.

Legacy ArrivalsModule заменён подтверждённой операцией приёмки без отдельной Arrival entity, numeric IDs и отсутствующих Prisma relations.

Completed:

- Оставлен один command endpoint `POST /operations/arrivals`.
- Операция атомарно создаёт Cars со статусом `ACTIVE`, отдельные Pso и события `CAR_ARRIVED`.
- Company, active user, Site company и user location scope проверяются внутри transaction.
- VIN проверяется внутри Company; дубликаты возвращают Conflict.
- Добавлены отдельные request/response DTO и полный Swagger contract.
- Каждая Pso создаётся как `PENDING` с дедлайном через три календарных дня от общего `arrivedOn`.
- Удалены legacy Arrival/Brand/CarModel/Color relations и battery scheduling.

Changed:

- Arrivals controller, service, DTO и unit tests.

Tests:

- Arrivals и PSO focused tests: 3 suites, 17 tests passed.
- Полный backend Jest: 19 suites, 86 tests passed.
- Backend TypeScript check: Arrivals errors отсутствуют; Cars/Dashboard всё ещё блокируют общий build.

Notes:

- `shortVin` передаётся явно, нормализуется и валидируется как `[A-Z0-9]{6}`.
- Отдельная Arrival entity не создаётся.
- Arrival response DTO не изменён; Pso читается через существующий PSO API.

Blockers:

- Внутри Arrivals Module блокеров нет.
- Внутри Arrivals/PSO creation блокеров нет.
### 4. Cars migration

**Статус:** `[x]` Foundation, PSO, выдача и Battery workflow реализованы и проверены.

- [x] `GET /cars`: UUID, company/location scope, response DTO и tests подтверждены.
- [x] `GET /cars/:id`: UUID, scope, response DTO и tests подтверждены.
- [x] `POST /cars/:id/battery-check`: scope, 3-дневное окно, последовательное закрытие периодов, serializable transaction, DTO и tests подтверждены.
- [x] Удалены legacy-реализации `GET /cars/tasks`, `POST /cars/:id/pso` и `POST /cars/:id/issue`; PSO и issue затем реализованы заново по актуальным контрактам.
- [x] Query и battery operations разделены; границы PSO и issue зафиксированы без реализации.
- [x] Мигрировать PSO workflow: получение состояния и завершение существующей Pso, UUID, JWT, company/location scope, event, DTO, Swagger и tests.
- [x] `GET /cars/tasks` возвращает PSO и вычисляемые Battery-задачи `UPCOMING`/`URGENT`/`OVERDUE`.
- [x] Мигрировать Vehicle Issue workflow: UUID, JWT, company/location scope, PSO/block/lifecycle rules, transaction, event, DTO, Swagger и tests.
- [x] Удалены обращения CarsModule к отсутствующим fields, relations, enum values и numeric car IDs.

Completed:

- Cars foundation приведён к текущему Prisma Client.
- Совместимые операции изолированы в `CarQueryService` и `BatteryOperationsService`.
- PSO operations изолированы в `PsoOperationsService`.
- Выдача изолирована в `VehicleIssueOperationsService`.

Changed:

- `apps/backend/src/cars`

Tests:

- Vehicle Issue focused tests: 2 suites, 14 tests passed.
- Полный backend Jest: 13 suites, 52 tests passed.
- Backend TypeScript check и Nx build проходят.

Notes:

- Legacy battery helper и статусы `WARNING`/`CRITICAL` удалены; Cars и Dashboard используют общий `BatteryScheduleService`.
- Завершение Pso создаёт `PSO_COMPLETED` в одной транзакции и не меняет lifecycle автомобиля.
- Выдача атомарно создаёт `VehicleIssue` и `CAR_ISSUED`, переводя автомобиль из `ACTIVE` в `ISSUED`.
- Pso создаётся в arrival transaction; `deadlineOn` детерминированно рассчитывается от `arrivedOn`.

Blockers:

- Battery scheduling реализован без отдельной Prisma-сущности планирования.

### 4a. Location and Site administration

**Статус:** `[x]` Read API и полный административный CRUD реализованы и проверены.

- [x] `GET /locations` возвращает только назначенные пользователю локации компании из JWT.
- [x] `GET /locations/:id/sites` проверяет company/location scope и скрывает существование недоступной локации.
- [x] Добавлены явные `LocationResponseDto` и `SiteResponseDto`, стабильная сортировка и Swagger.
- [x] Пустые списки доступов и площадок поддерживаются.
- [x] `POST /locations`: JWT company scope, роли `SYSTEM_OWNER`/`OPERATIONS_MANAGER`, trim/validation, DTO, Swagger и обработка уникального code.
- [x] Активные и неактивные Location/Site можно редактировать; Site можно создавать внутри неактивной Location.
- [x] Реализованы `PATCH /locations/:id` и `PATCH /locations/:id/deactivate`.
- [x] Реализованы POST/PATCH/deactivate endpoints Site.
- [x] Деактивация использует `isActive=false`; автомобили на текущих площадках блокируют операцию с `409`.
- [x] Company isolation, declarative roles, DTO, Swagger и focused tests подтверждены.

Completed:

- Создан отдельный `LocationsModule` с тонким controller и scope-логикой в service.
- Prisma entities не используются как внешний API-контракт.

Changed:

- `apps/backend/src/locations`
- `apps/backend/src/app.module.ts`
- `apps/backend/src/swagger.contract.spec.ts`

Tests:

- Locations focused tests: 3 suites, 9 tests passed.
- Полный backend Jest: 15 suites, 60 tests passed.
- Backend TypeScript check и Nx build проходят.

Notes:

- `companyId` и `userId` не принимаются из query/body и передаются только из JWT.
- TODO: реализовать CRUD для Location и Site отдельной задачей.
- Управление UserLocationAccess реализовано в UsersModule.

Blockers:

- Внутри read API блокеров нет.

### 4b. UserLocationAccess management

**Статус:** `[x]` Read/replace API реализован и проверен.

- [x] Утверждено: `SYSTEM_OWNER` и `OPERATIONS_MANAGER` могут просматривать пользователей и управлять `UserLocationAccess`.
- [x] Утверждено: `SYSTEM_OWNER` может менять собственные доступы, `OPERATIONS_MANAGER` — не может.
- [x] Реализован декларативный role guard foundation вне controller/service.
- [x] Реализовать `GET /users` и `GET /users/:id` для `SYSTEM_OWNER` и `OPERATIONS_MANAGER`.
- [x] Реализованы scoped `GET /users/:id/location-access` и транзакционный `PUT /users/:id/location-access`.
- [x] Реализовать CRUD Location/Site.
- [x] Реализованы `GET /users/:id/roles` и транзакционный `PUT /users/:id/roles`.
- [x] Подтверждены ограничения `SYSTEM_OWNER`/`OPERATIONS_MANAGER`, защита последнего владельца и self-update.
- [x] Пустой набор и дубликаты отклоняются; замена ролей удаляет все `AuthSession`.
- [x] Добавлены DTO, Swagger 400/401/403/404/409 и focused tests.

Completed:

- Permission matrix зафиксирована в ADR и business rules.
- JWT roles проверяются общим `RolesGuard`.
- Users read API возвращает только безопасные поля пользователей текущей Company и массив ролей.
- Location access read/replace использует company scope, полную замену и стабильный response DTO.

Changed:

- `apps/backend/src/auth/roles.decorator.ts`
- `apps/backend/src/auth/roles.guard.ts`
- `apps/backend/src/auth/roles.guard.spec.ts`
- `apps/backend/src/users`
- `apps/backend/src/app.module.ts`
- `apps/backend/src/swagger.contract.spec.ts`
- `apps/backend/src/users/user-location-access.service.ts`
- `apps/backend/src/users/dto/update-user-location-access.dto.ts`
- `apps/backend/src/users/dto/user-location-access-response.dto.ts`
- `docs/DECISIONS.md`
- `docs/BUSINESS_RULES.md`

Tests:

- UserLocationAccess/Swagger focused tests: 3 suites, 14 tests passed.
- Полный backend Jest: 19 suites, 85 tests passed.
- Nx backend build: passed.

Notes:

- Существующие endpoints не получили новых role restrictions.
- UsersController использует `JwtAuthGuard` перед `RolesGuard` и class-level role metadata.
- Дубликаты `locationIds` отклоняются; пустой массив разрешён.
- `OPERATIONS_MANAGER` не может менять собственные доступы, `SYSTEM_OWNER` может.
- Prisma Schema достаточна для workflow и не требует изменения.

Blockers:

- Внутри Users administration блокеров нет.

### 5. Dashboard migration

**Статус:** `[x]` Foundation завершён и проверен.

Dashboard использует подтверждённые Car lifecycle, Pso, VehicleEvent и общий Battery scheduling contract.

Completed:

- `carsOnStock` считает доступные `ACTIVE` Cars.
- `needPso` считает доступные `ACTIVE` Cars с `Pso.status=PENDING`.
- `issuedToday` считается по `CAR_ISSUED` events.
- Добавлены JWT guard, company/location scope и response DTO.

Changed:

- `apps/backend/src/dashboard`

Tests:

- Dashboard: 2 suites, 3 tests passed.
- Backend TypeScript build-check проходит.
- Полный backend Jest: 10 suites, 34 tests passed.

Notes:

- [x] Battery metrics `Upcoming`, `Urgent`, `Overdue` вычисляются общим `BatteryScheduleService`.

Blockers:

- Для battery dashboard metrics необходимо определить scheduling, due date и overdue policy.
### 6. Tests stabilization

**Статус:** `[-]` Базовый backend test set и Nx target стабильны; coverage/security work остаётся.

Согласовать Jest с Prisma 7 generated client, восстановить компиляцию всех suites, обновить legacy mocks и добиться зелёного `nx test backend`. Добавить отсутствующие security, Dashboard и contract tests.

Completed:

- Текущие backend suites и TypeScript build-check проходят.

Changed:

- Prisma Jest mapping и legacy mocks были актуализированы в foundation tasks.

Tests:

- Backend Jest: 10 suites, 34 tests passed.
- Backend TypeScript build-check passed.

Notes:

- `nx test backend --runInBand` подтверждён: 11 suites, 35 tests.

Blockers:

- Остаются недостающие security/contract tests.
### 7. Swagger completion

**Статус:** `[x]` Текущий Backend API полностью задокументирован и проверен.

После стабилизации API добавить request/response/error DTO, examples, bearer requirements и корректные schemas для Auth, Arrivals, Cars и Dashboard. Проверить каждый опубликованный endpoint.

Completed:

- Auth содержит request/response/error DTO, cookie/bearer security и examples.
- Arrivals, Cars и Dashboard содержат typed request/response/error contracts.
- Все опубликованные операции имеют summary, description и responses.

Changed:

- Backend controllers, Swagger DTO и `main.ts`.
- Добавлен Swagger contract test.

Tests:

- `/api/docs` возвращает HTTP 200 в contract test.
- Проверены 10 paths, request bodies, security schemes и schema references.
- Backend Jest: 11 suites, 35 tests passed.
- Backend TypeScript build-check passed.

Notes:

- OpenAPI содержит bearer и refresh-cookie security schemes.
- Бизнес-логика, endpoints и Prisma Schema не изменялись.

Blockers:

- Нет.
---

## Phase 2 — Frontend Integration

**Статус:** `[-]` Foundation подтверждена; domain integration ещё не выполнена.

- [x] Auth перенесён в `libs/auth/data-access` и `libs/auth/feature-login`; внешние импорты используют public API.
- [x] Shell перенесён целиком в `libs/shell/feature-layout`.
- [x] Восстановлен подтверждённый shell-specific `LayoutService` на Angular Signals и `matchMedia('(max-width: 768px)')`.
- [x] UI kit сохранён в `libs/frontend/ui` и классифицирован tags `scope:shared`, `type:ui`.
- [x] Добавлены Nx tags, aliases и module-boundary constraints; граф строится без циклов и deep imports.
- [x] Корневое окружение обновлено до Angular `20.3.x`, TypeScript `5.8.3` и совместимого CDK `20.2.14` без peer bypass.
- [x] Nx build/serve/test targets frontend подтверждены.
- [x] Auth client, interceptor, guards, Login feature и Shell компилируются через public API.
- [x] Безопасные локальные lint errors UI kit устранены без изменения публичного API и поведения.
- [ ] Создать typed data-access для Dashboard.
- [ ] Создать typed data-access для Cars и Car Details.
- [ ] Создать typed data-access для Arrival после подтверждения контракта.
- [ ] Создать typed data-access для Tasks после подтверждения Battery Tasks.

---

## Current Blockers

Подтверждённых блокеров frontend foundation нет.

---

## Completed History

### 2026-08-01 — Create PSO During Arrival

Completed:

- Приёмка создаёт отдельную Pso для каждого автомобиля в существующей transaction.
- Начальный статус — `PENDING`, дедлайн — `arrivedOn + 3` календарных дня.
- `completedOn`/`completedById` остаются пустыми, Car остаётся `ACTIVE`.

Changed:

- `apps/backend/src/arrivals`
- `docs/DECISIONS.md`
- `docs/BUSINESS_RULES.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Arrivals/PSO focused tests: 3 suites, 17 tests passed.
- `npx nx test backend --runInBand`: 19 suites, 86 tests passed.
- `npx nx build backend`: passed.

Notes:

- Arrival response DTO не изменялся.
- Дедлайн рассчитывается UTC-календарной операцией от единого batch `arrivedOn`.

Blockers:

- Нет.

---

### 2026-08-01 — Implement User Location Access Management

Completed:

- Добавлены `GET /users/:id/location-access` и `PUT /users/:id/location-access`.
- Реализованы company isolation, self-update policy и полная транзакционная замена доступов.
- Добавлены request/response DTO, Swagger и focused tests.

Changed:

- `apps/backend/src/users`
- `apps/backend/src/swagger.contract.spec.ts`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- UserLocationAccess/Swagger focused tests: 3 suites, 14 tests passed.
- `npx nx test backend --runInBand`: 19 suites, 85 tests passed.
- `npx nx build backend`: passed.

Notes:

- Дубликаты `locationIds` отклоняются как `400`.
- Пустой массив полностью удаляет назначения.
- Роли пользователя не изменяются.

Blockers:

- Нет.

---

### 2026-08-01 — Implement Users Read API

Completed:

- Добавлены `GET /users` и `GET /users/:id`.
- Доступ ограничен ролями `SYSTEM_OWNER` и `OPERATIONS_MANAGER`.
- Реализованы company isolation, безопасные DTO и преобразование `UserRoleAssignment` в массив enum.

Changed:

- `apps/backend/src/users`
- `apps/backend/src/app.module.ts`
- `apps/backend/src/swagger.contract.spec.ts`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Users/Swagger focused tests: 3 suites, 9 tests passed.
- `npx nx test backend --runInBand`: 18 suites, 75 tests passed.
- `npx nx build backend`: passed.

Notes:

- `passwordHash`, sessions и служебные поля не выбираются из Prisma.
- Location access не включён в details contract и остаётся отдельным API.

Blockers:

- Нет.

---

### 2026-08-01 — Define Role Permission Matrix and Implement Role Guard Foundation

Completed:

- Зафиксирована минимальная permission matrix для четырёх MVP-ролей.
- Добавлены декларативный `@Roles(...)` и `RolesGuard`.
- Guard читает роли из authenticated JWT context и возвращает Forbidden при отсутствии совпадения.

Changed:

- `apps/backend/src/auth`
- `docs/DECISIONS.md`
- `docs/BUSINESS_RULES.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- RolesGuard: 7/7 tests passed.
- `npx nx test backend --runInBand`: 16 suites, 67 tests passed.
- `npx nx build backend`: passed.

Notes:

- Существующие endpoints не изменялись и не получили role metadata.
- Отдельная permission entity не создавалась.

Blockers:

- Нет.

---

### 2026-08-01 — Implement Location and Site Read API

Completed:

- Добавлены `GET /locations` и `GET /locations/:id/sites`.
- Реализованы company isolation и доступ через `UserLocationAccess`.
- Добавлены DTO, Swagger и focused service/controller tests.

Changed:

- `apps/backend/src/locations`
- `apps/backend/src/app.module.ts`
- `apps/backend/src/swagger.contract.spec.ts`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Locations/Swagger focused tests: 3 suites, 9 tests passed.
- `npx nx test backend --runInBand`: 15 suites, 60 tests passed.
- `npx nx build backend`: passed.

Notes:

- Неактивные записи не скрываются: правило фильтрации по `isActive` для read API не утверждено.

Blockers:

- Внутри read API блокеров нет.

---

### 2026-08-01 — Implement Vehicle Issue Workflow

Completed:

- Добавлен `POST /cars/:id/issue`.
- Выдача проверяет company/location scope, `ACTIVE`, отсутствие блокировки и завершённую PSO.
- В одной транзакции выполняются переход в `ISSUED`, создание `VehicleIssue` и события `CAR_ISSUED`.
- Добавлены response DTO, Swagger contract и focused tests.

Changed:

- `apps/backend/src/cars`
- `apps/backend/src/swagger.contract.spec.ts`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Vehicle Issue focused tests: 2 suites, 14 tests passed.
- `npx nx test backend --runInBand`: 13 suites, 52 tests passed.
- `npx nx build backend`: passed.

Notes:

- Request body не требуется: дата и исполнитель определяются backend.
- Опциональный `appointmentId` не заполняется текущим MVP endpoint.

Blockers:

- Внутри workflow выдачи блокеров нет.

---

### 2026-07-31 — Implement PSO Workflow

Completed:

- Добавлены `GET /cars/:id/pso` и `POST /cars/:id/pso/complete`.
- Завершение существующей Pso проверяет company/location scope, защищено от повторного выполнения и создаёт `PSO_COMPLETED`.
- Добавлены явный response DTO, полный Swagger contract и focused tests.

Changed:

- `apps/backend/src/cars`
- `apps/backend/src/swagger.contract.spec.ts`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- PSO focused tests: 2 suites, 11 tests passed.
- `npx nx test backend --runInBand`: 12 suites, 43 tests passed.
- `npx nx build backend`: passed.

Notes:

- Request body не требуется: исполнитель и серверная дата определяются backend.
- `Car.lifecycleStatus` не изменяется.

Blockers:

- На момент выполнения задачи правила создания Pso и `deadlineOn` ещё не были определены; позднее закрыто задачей Create PSO During Arrival.

---

### 2026-07-31 — Restore Backend Build and Serve Targets

Completed:

- Добавлены Nx targets `backend:build` и `backend:serve`.
- Build создаёт `dist/apps/backend/main.js`.
- Serve запускает Nest в watch mode и использует `apps/backend/src/main.ts`.
- Swagger через Nx serve подтверждён по HTTP 200.

Changed:

- `apps/backend/project.json`
- `apps/backend/tsconfig.build.json`
- `apps/backend/webpack.config.js`
- `apps/backend/src/app.module.ts`
- `package.json`
- `package-lock.json`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- `npx nx show project backend` — build/serve/test targets видны.
- `npx nx build backend` — passed.
- `npx nx serve backend` — `/api/docs` HTTP 200.
- `npx nx test backend --runInBand` — 11 suites, 35 tests passed.
- После проверки serve-процесс остановлен, порт 3000 свободен.

Notes:

- Root scripts: `npm run build:backend`, `npm run serve:backend`.
- Общий `dev` не добавлен: frontend не имеет serve target.

Blockers:

- `@nx/webpack:webpack` работает в Nx 23.1, но помечен deprecated к Nx 24; при обновлении Nx потребуется переход на inferred `@nx/webpack/plugin`.

---

### 2026-07-29 — Task 3.1 Swagger Contract Completion

Completed:

- Swagger дополнен для Auth, Arrivals, Cars, Dashboard и system endpoint.
- Добавлены typed errors, examples и security schemes.

Changed:

- Backend controllers и DTO
- `apps/backend/src/main.ts`
- `apps/backend/src/swagger.contract.spec.ts`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Swagger UI route: HTTP 200.
- Backend Jest: 11 suites, 35 tests passed.
- Backend TypeScript build-check passed.

Notes:

- Contract test проверяет отсутствие unresolved schema references.

Blockers:

- Нет.

---

### 2026-07-29 — Task 2.2 Dashboard Module Foundation Cleanup

Completed:

- Dashboard переведён на Car lifecycle, Pso и VehicleEvent.
- Добавлены auth scope, response DTO и focused tests.

Changed:

- `apps/backend/src/dashboard`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Dashboard: 2 suites, 3 tests passed.
- Backend TypeScript build-check passed.
- Full backend Jest: 10 suites, 34 tests passed.

Notes:

- Неподтверждённые battery urgency metrics удалены без замены новой аналитикой.

Blockers:

- Battery dashboard metrics ждут Battery Tasks policy.

---

### 2026-07-29 — Task 2.1 Cars Module Foundation Cleanup

Completed:

- Удалён невозможный legacy workflow код Cars.
- Query и battery fact operations разделены; PSO/issue boundaries подготовлены.

Changed:

- `apps/backend/src/cars`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Cars: 3 suites, 9 tests passed.
- TypeScript: Cars clean; Dashboard errors remain.

Notes:

- Новые endpoints и workflows не добавлялись.

Blockers:

- Открытые PSO, Battery Tasks и issue policy/implementation tasks.

---

### 2026-07-29 — Task 1.1 Arrivals Module Migration

Completed:

- Arrivals преобразован из legacy CRUD entity в transaction operation.
- Реализованы Car creation, `ACTIVE` lifecycle, `CAR_ARRIVED`, company/location scope и DTO contracts.

Changed:

- `apps/backend/src/arrivals`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Arrivals service/controller: 10 passed.
- Full TypeScript check: Arrivals clean; Cars/Dashboard errors remain.

Notes:

- Cars, Dashboard, Frontend и Prisma Schema не изменялись.

Blockers:

- Нет внутренних Arrivals blockers.

---

### 2026-07-29 — Task 0.4 Create Clean Database Baseline

Completed:

- Legacy migrations исключены из active history и сохранены в архиве.
- Создан `migration_init` для текущей Schema.
- Проверены состав SQL и детерминированность генерации.

Changed:

- `apps/backend/prisma/migrations`
- `apps/backend/prisma/legacy-migrations`
- `docs/DECISIONS.md`
- `docs/DATABASE.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Prisma validate — passed.
- Prisma generate — passed.
- Baseline hash regeneration — matched.
- Seed standalone TypeScript check — passed.
- Database apply/seed — не запускались без disposable PostgreSQL.

Notes:

- Schema и backend business logic не изменялись.
- Существующая удалённая база не изменялась.

Blockers:

- Нет `DIRECT_URL`/disposable PostgreSQL для end-to-end database workflow.
- Backend start блокируется legacy modules и отсутствующими Nx targets.

---

### 2026-07-29 — Task 0.3 Database Foundation Alignment

Completed:

- Проверены Schema, migration history, Prisma config, generated client, seed и PrismaService.
- Подтверждены Schema validation и Client generation.
- Выбрана стратегия clean migration history для новых databases.

Changed:

- `docs/DECISIONS.md`
- `docs/DATABASE.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Prisma validate — passed.
- Prisma generate — passed.
- Prisma migrate status — blocked by pooler Schema Engine error; direct URL отсутствует.

Notes:

- Legacy migrations сохранены без изменений.
- Новая migration автоматически не создавалась.

Blockers:

- Clean baseline, direct migration connection и решение по legacy database data.

---

### 2026-07-29 — Task 0.2 Backend Foundation Alignment

Completed:

- Backend переведён на единый generated Prisma Client import path.
- Seed и Auth foundation согласованы с целевой Company/UserRoleAssignment моделью.
- JWT содержит `companyId` и массив ролей.

Changed:

- Prisma imports и seed.
- Auth service/controller/DTO/JWT contracts/tests.
- Jest mapping для generated Prisma Client.

Tests:

- Auth unit tests: 10 passed.
- Backend build-check: failed на legacy Arrivals, Cars и Dashboard; Auth/seed compile errors отсутствуют.

Notes:

- PSO, Battery Tasks и frontend не изменялись.

Blockers:

- Migration path; Arrivals/Cars/Dashboard migration; полный зелёный backend build.

---

### 2026-07-29 — Task 0.1 Domain Model Alignment

Completed:

- Целевая доменная модель согласована с текущей Prisma Schema.
- Конфликтующие ADR заменены актуальными решениями.
- Создан единый документ подтверждённых business rules и открытых вопросов.

Changed:

- `docs/DECISIONS.md`
- `docs/BUSINESS_RULES.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Не запускались: код и Prisma Schema не изменялись.

Notes:

- Backend Recovery может начинаться с Prisma foundation.

Blockers:

- Локальные policy-вопросы перечислены в Phase 0 и Current Blockers.

---

### 2026-07-29 — Project Audit

Completed:

- Проведён полный аудит структуры, backend, frontend, Prisma, тестов и документации.
- Создан `docs/PROJECT_AUDIT.md`.
- Task tracker приведён к фактическому состоянию проекта.

Changed:

- `docs/PROJECT_AUDIT.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Backend compile check — failed из-за несовместимости legacy-кода с текущим Prisma Client.
- `nx test backend` — 6 suites failed, 1 suite passed.
- `nx build frontend` — target `frontend:build` не найден.

Notes:

- Новые backend endpoints не следует разрабатывать до Domain Alignment.

Blockers:

- См. раздел Current Blockers.

---

### 2026-08-01 — Battery Scheduling and Battery Tasks

Completed:

- Зафиксирован 30-дневный календарный график от `Car.arrivedOn`, независимый от фактических дат проверок.
- Реализован общий `BatteryScheduleService`, последовательное закрытие периодов и окно выполнения за 3 дня.
- Реализован `GET /cars/tasks` для PSO и Battery-задач.
- Dashboard дополнен метриками `Upcoming`, `Urgent`, `Overdue`.
- Swagger contract и focused tests обновлены.

Changed:

- `apps/backend/src/battery`
- Battery-часть `apps/backend/src/cars`
- Battery-метрики `apps/backend/src/dashboard`
- `docs/DECISIONS.md`
- `docs/BUSINESS_RULES.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- `npx nx test backend --runInBand`: 21 suite, 102 tests passed.
- `npx nx build backend`: passed.
- Swagger contract test: passed, `/cars/tasks` включён в опубликованный API.

Notes:

- Prisma Schema не изменялась; отдельная сущность планирования не требуется.
- В день срока задача считается `URGENT`; `OVERDUE` начинается со следующего календарного дня.

Blockers:

- Внутри Battery workflow блокеров нет.

---

### 2026-08-01 — Location and Site CRUD (подтверждённая часть)

Completed:

- Реализован `POST /locations` для `SYSTEM_OWNER` и `OPERATIONS_MANAGER`.
- Company берётся только из JWT; request DTO принимает только `code` и `name`.
- Добавлены trim/validation, Swagger, unique conflict mapping и focused tests.

Changed:

- `apps/backend/src/locations`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- `npx nx test backend --runInBand`: 22 suites, 110 tests passed.
- `npx nx build backend`: passed.
- Swagger contract test: passed.

Notes:

- Prisma Schema не изменялась.
- PATCH и Site write API не реализованы без требуемого бизнес-решения.

Blockers:

- Требуется определить работу с неактивными Location/Site и lifecycle связанных сущностей.

---

### 2026-08-01 — Complete Location/Site Administration

Completed:

- Реализованы update и soft-deactivate для Location.
- Реализованы create, update и soft-deactivate для Site.
- Подтверждены редактирование неактивных сущностей и создание Site в неактивной Location.
- Деактивация транзакционно блокируется при наличии текущих автомобилей.

Changed:

- `apps/backend/src/locations`
- `apps/backend/src/swagger.contract.spec.ts`
- `docs/BUSINESS_RULES.md`
- `docs/DECISIONS.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- `npx nx test backend --runInBand`: 23 suites, 135 tests passed.
- `npx nx build backend`: passed.
- Swagger contract test: passed.

Notes:

- Используется только `isActive=false`; физическое удаление отсутствует.
- Prisma Schema не изменялась.

Blockers:

- Внутри Location/Site administration блокеров нет.

---

### 2026-08-01 — Role Assignment API

Completed:

- Реализованы `GET /users/:id/roles` и полная замена ролей через PUT.
- Зафиксированы ограничения менеджера, self-update владельца и защита последнего `SYSTEM_OWNER`.
- Замена ролей и удаление всех refresh-сессий выполняются одной transaction.
- Access token TTL сокращён до 7 минут.

Changed:

- `apps/backend/src/users`
- `apps/backend/src/auth/auth.service.spec.ts`
- `apps/backend/src/swagger.contract.spec.ts`
- `apps/backend/.env`
- `apps/backend/.env.example`
- `docs/BUSINESS_RULES.md`
- `docs/DECISIONS.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- `npx nx test backend --runInBand`: 25 suites, 152 tests passed.
- `npx nx build backend`: passed.
- Swagger contract и refresh current roles/isActive tests: passed.

Notes:

- `UserLocationAccess` не изменяется.
- Access JWT не отзывается досрочно и может жить не более 7 минут.
- Prisma Schema не изменялась.

Blockers:

- Внутри Role Assignment API блокеров нет.

---

### 2026-08-01 — Final Backend Smoke Test on Clean Database

Completed:

- Тестовая Neon schema полностью очищена по явному разрешению владельца.
- `migration_init` применён с нуля; повторный deploy подтвердил отсутствие pending migrations.
- Seed выполнен дважды и создал минимальную административную инфраструктуру без дубликатов.
- Backend запущен через Nx; Swagger и основной API flow проверены по HTTP.
- Автомобиль создан через `POST /operations/arrivals`, а не напрямую через seed.
- Подтверждены `Car ACTIVE`, связанный `Pso PENDING` и одно событие `CAR_ARRIVED`.

Changed:

- `apps/backend/prisma.config.ts`
- `package.json`
- `package-lock.json`
- `docs/DATABASE.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- `prisma validate` и `prisma generate` — passed.
- clean reset, `prisma migrate deploy` и двойной `prisma db seed` — passed.
- `npx nx build backend` — passed.
- `npx nx test backend --runInBand` — 25 suites, 152 tests passed.
- `/api/docs` — HTTP 200.
- Login, `/auth/me`, Location/Site read, Arrival, Car read и Pso read — passed.

Notes:

- Seed-команда переведена с несовместимого с Prisma 7 ESM client `ts-node` на `tsx`.
- Prisma Schema и backend business logic не изменялись.
- Временный serve-процесс остановлен; smoke-helper и логи удалены.
- Секреты и seed-пароль в документацию не добавлялись.

Blockers:

- Для clean backend deployment блокеров нет.
- Открытых вопросов по Car VIN contract нет.

---

### 2026-08-01 — Finalize Car VIN Contract

Completed:

- `shortVin` утверждён как обязательный шестисимвольный рабочий идентификатор с trim/uppercase.
- Полный VIN сделан nullable и валидируется по `^[A-HJ-NPR-Z0-9]{6,17}$`.
- Arrival поддерживает отсутствие VIN и возвращает company-scoped `hasShortVinDuplicate`.
- `GET /cars`, `GET /cars/:id` и новый `PATCH /cars/:id` используют актуальный identity contract.
- Duplicate shortVin разрешён; конфликт заполненного VIN внутри Company возвращает `409`.
- Legacy-invalid VIN smoke-автомобиля очищен через публичный PATCH.

Changed:

- Prisma Car model и добавочная migration.
- Arrivals/Cars DTO, services, controller, Swagger и focused tests.
- `docs/DECISIONS.md`
- `docs/BUSINESS_RULES.md`
- `docs/DATABASE.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Prisma validate/generate — passed.
- Migration deploy без reset — passed.
- `npx nx test backend --runInBand` — 27 suites, 179 tests passed.
- `npx nx build backend` — passed.
- Live Swagger, Arrival without VIN, list/details, uppercase PATCH и nullable VIN clear — passed.

Notes:

- В БД сохранены два smoke Car; оба имеют валидный shortVin, некорректных заполненных VIN нет.
- Query list использует одну company-scoped aggregation вместо N+1.
- Frontend, Auth и остальные workflows не изменялись.

Blockers:

- Нет.

---

### 2026-08-01 — Prepare Domain-Oriented Nx Libraries for Frontend

Completed:

- Auth и Shell распределены по подтверждённым domain-oriented Nx libraries.
- `apps/frontend` подключает библиотеки через public aliases.
- Восстановлен минимальный `LayoutService` с подтверждёнными Signals и responsive contract.
- UI kit сохранён без физических и поведенческих изменений.
- Nx tags, dependency constraints и frontend targets добавлены.
- Создан `docs/ARCHITECTURE.md`.

Changed:

- `apps/frontend`
- `libs/auth`
- `libs/shell/feature-layout`
- `libs/frontend/ui/project.json`
- `tsconfig.base.json`
- `eslint.config.mjs`
- `docs/ARCHITECTURE.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- `npx nx show projects` — passed.
- `npx nx graph` — passed; циклы и deep imports не обнаружены.
- `npx nx lint frontend` — passed.
- `auth-feature-login:lint` и `shell-feature-layout:lint` — passed.
- `npx nx build frontend` — blocked: Angular version не определяется из установленного root environment.
- `npx nx test frontend --watch=false` — blocked: отсутствует `@angular-devkit/build-angular`.
- `npx nx serve frontend` — HTTP smoke не стартовал: отсутствует `@angular-devkit/architect`; listener на порту 4200 не остался.

Notes:

- Пустой и неиспользуемый `ArrivalInterface` удалён после подтверждения отсутствия импортов.
- AuthService не разделялся.
- Desktop grid и UI kit не изменялись.

Blockers:

- Требуется согласованный install/workspace workflow для Angular 19 dependencies.
- Существующие UI kit lint errors требуют отдельной задачи.

---

### 2026-08-02 — Restore Frontend Dependencies and Verify Nx Targets

Completed:

- Angular framework обновлён с 19.2 до `20.3.27`; CLI/build tooling — до `20.3.32`.
- TypeScript обновлён до `5.8.3`; Nx сохранён на синхронной версии `23.1.0`.
- Зависимости установлены обычным `npm install` без `force` и `legacy-peer-deps`.
- Устаревшие отдельные frontend manifest/lock удалены; dependency source консолидирован в корне.
- Обязательные Angular migrations выполнены и не потребовали изменений приложения.
- Frontend aliases подключены через наследование `tsconfig.base.json`.
- UI kit lint исправлен локально без изменения ControlValueAccessor contracts.
- Frontend build, tests, serve и HTTP smoke подтверждены.
- Backend regression и Prisma/seed checks подтверждены.

Changed:

- `package.json`
- `package-lock.json`
- удалены legacy `apps/frontend/package.json` и `apps/frontend/package-lock.json`
- `apps/frontend/tsconfig.json`
- `apps/frontend/src/app/app.component.spec.ts`
- локальные lint-правки в Auth interceptor и UI ControlValueAccessor-компонентах
- `docs/ARCHITECTURE.md`
- `docs/AI_TASKS.md`
- `docs/ROADMAP.md`

Tests:

- Frontend production build — passed.
- Frontend Karma/ChromeHeadless — 7/7 passed.
- Frontend, Auth, Shell и UI lint — passed.
- Nx graph — passed; циклов и deep imports нет.
- Frontend `/login` — HTTP 200; порт 4200 освобождён.
- Backend Jest — 27 suites, 179 tests passed.
- Backend build, Prisma validate и TypeScript check seed — passed.

Notes:

- `--runInBand` не поддерживается Karma schema; однократный test run выполнен через `--watch=false --browsers=ChromeHeadless`.
- CDK 20 не имеет ветки 20.3; установлена последняя совместимая `20.2.14`.
- Optional поведенческие Angular migrations не запускались: проект уже использует block syntax, а `Router.getCurrentNavigation()` отсутствует.
- npm audit сообщает 22 существующие dependency findings; автоматический audit fix не выполнялся.

Blockers:

- Нет.

---

## Правило обновления документа

После выполнения каждой задачи агент обязан:

1. Обновить статус задачи.
2. Добавить короткий отчёт.
3. Зафиксировать новые блокеры.
4. Не создавать отдельные отчётные документы без необходимости.
