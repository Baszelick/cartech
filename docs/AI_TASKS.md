# CarTech AI Task Tracker

> Рабочий трекер ближайших задач. Источник фактического состояния: `docs/PROJECT_AUDIT.md`.

Последнее обновление: 2026-07-29

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

**Следующий шаг — согласование оставшихся Cars workflows.**

Backend compile, текущий Jest-набор и Swagger contract проходят. Следующие задачи требуют решений по PSO, Battery Tasks и issue workflow, а также проверки database baseline на disposable PostgreSQL.

---

## Phase 0 — Domain Alignment

**Статус:** `[-]` Основная модель согласована; остались локальные business-policy вопросы.

Цель: устранить противоречия между Prisma Schema, backend-кодом и архитектурными решениями до продолжения разработки.

- [x] Приёмка определена как транзакционная бизнес-операция без отдельной `Arrival` entity.
- [x] `brand`, `model`, `color` определены как snapshot-поля Car.
- [x] Роли хранятся как набор `UserRoleAssignment`; scalar `user.role` исключён из целевой модели.
- [x] Зафиксированы `ACTIVE`, `ISSUED`, `ARCHIVED` и допустимые lifecycle-переходы.
- [-] Структура PSO и влияние на выдачу определены; момент создания и правило `deadlineOn` открыты.
- [-] Назначение `BatteryCheck` определено; периодичность, overdue и модель планирования открыты.
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

- Не определены PSO deadline policy, Battery Tasks policy, role permission matrix и правило `shortVin`.

---

## Phase 1 — Backend Recovery

**Статус:** `[-]` Foundation-модули стабилизированы; отдельные workflows и инфраструктурные проверки остаются.

Порядок обязателен: следующий шаг начинается после подтверждения предыдущего.

### 1. Prisma foundation

**Статус:** `[-]` Clean baseline создан; применение на disposable PostgreSQL не подтверждено.

Подтвердить целевую Schema после Phase 0, выбрать единый Prisma Client import path, определить migration path от legacy database, актуализировать seed и проверить schema/migration drift на тестовой PostgreSQL базе.

Completed:

- Все backend TypeScript imports переведены с `@prisma/client` на `apps/backend/generated/prisma`.
- Seed приведён к Company, Location, Site, User, UserRoleAssignment и UserLocationAccess.
- Prisma Schema validation и Client generation подтверждены.
- Выбран clean baseline для новых dev/test databases; legacy migrations исключаются из будущей активной цепочки.
- Создан `migration_init` из текущей Schema.
- Legacy SQL перенесён в `prisma/legacy-migrations`.

Changed:

- Prisma imports, `PrismaService` usage и seed.
- `docs/DECISIONS.md` и `docs/DATABASE.md`.
- `prisma.config.ts` и `.env.example` для direct migration connection.
- `prisma/migrations/migration_init` и архив legacy migrations.

Tests:

- Backend TypeScript build-check запущен; Auth/seed errors отсутствуют, build блокируют Arrivals/Cars/Dashboard.
- `prisma validate` — passed.
- `prisma generate` — passed.
- `prisma migrate status` — не подтверждён: Schema Engine error через pooler, `DIRECT_URL` отсутствует.
- Baseline regeneration hash — matched.
- SQL inspection — 8 enum, 19 tables, legacy objects отсутствуют.
- Seed standalone TypeScript check — passed.

Notes:

- Generated Prisma Client остаётся единственным источником Prisma types/runtime.
- Legacy migration history не могла развернуть целевую Schema с нуля.
- Новая active history начинается только с `migration_init`.

Blockers:

- Нужна disposable PostgreSQL/direct connection для проверки migrate → seed.
- Решение о переносе данных существующей legacy DB остаётся отдельным.

### 2. Auth migration

**Статус:** `[-]` Foundation мигрирована и unit-tested; полная backend build заблокирована другими модулями.

Мигрировать login, public user contract, JWT payload, refresh flow и guards на подтверждённую модель ролей, company и location scope. Проверить active user и фактические HTTP-коды.

Completed:

- Login использует compound `(companyId, username)`.
- Public user и JWT используют `companyId` и массив `roles`.
- Login/refresh отклоняют неактивного пользователя.
- Refresh rotation, logout, `me` и JWT strategy приведены к новому payload.
- Отсутствующий refresh cookie возвращает HTTP 401.

Changed:

- Auth service, controller, DTO, JWT interfaces/service/strategy и tests.

Tests:

- `auth.service.spec.ts`: 10/10 tests passed.
- Full backend build-check: failed только на Arrivals/Cars/Dashboard legacy errors.

Notes:

- Permission matrix намеренно не реализована.
- Login API теперь требует `companyId`; frontend contract потребуется обновить на frontend-этапе.

Blockers:

- Полный backend build требует миграции Arrivals, Cars и Dashboard.
### 3. Arrivals migration

**Статус:** `[x]` Миграция завершена и проверена.

Legacy ArrivalsModule заменён подтверждённой операцией приёмки без отдельной Arrival entity, numeric IDs и отсутствующих Prisma relations.

Completed:

- Оставлен один command endpoint `POST /operations/arrivals`.
- Операция атомарно создаёт Cars со статусом `ACTIVE` и события `CAR_ARRIVED`.
- Company, active user, Site company и user location scope проверяются внутри transaction.
- VIN проверяется внутри Company; дубликаты возвращают Conflict.
- Добавлены отдельные request/response DTO и полный Swagger contract.
- Удалены legacy Arrival/Brand/CarModel/Color relations и battery scheduling.

Changed:

- Arrivals controller, service, DTO и unit tests.

Tests:

- Arrivals service/controller: 10/10 passed.
- Backend TypeScript check: Arrivals errors отсутствуют; Cars/Dashboard всё ещё блокируют общий build.

Notes:

- `shortVin` передаётся явно, поскольку правило вычисления ещё не утверждено.
- Отдельная Arrival entity не создаётся.

Blockers:

- Внутри Arrivals Module блокеров нет.
- Полный backend build блокируют Cars и Dashboard.
### 4. Cars migration

**Статус:** `[-]` Foundation очищен; отдельные workflows ещё не мигрированы.

- [x] `GET /cars`: UUID, company/location scope, response DTO и tests подтверждены.
- [x] `GET /cars/:id`: UUID, scope, response DTO и tests подтверждены.
- [x] `POST /cars/:id/battery-check`: запись факта `BatteryCheck`, user scope, DTO и tests подтверждены.
- [x] Удалены неподтверждённые legacy endpoints `GET /cars/tasks`, `POST /cars/:id/pso` и `POST /cars/:id/issue`.
- [x] Query и battery operations разделены; границы PSO и issue зафиксированы без реализации.
- [ ] Мигрировать PSO workflow.
- [ ] Определить и реализовать Battery Tasks.
- [ ] Мигрировать issue workflow.
- [x] Удалены обращения CarsModule к отсутствующим fields, relations, enum values и numeric car IDs.

Completed:

- Cars foundation приведён к текущему Prisma Client.
- Совместимые операции изолированы в `CarQueryService` и `BatteryOperationsService`.

Changed:

- `apps/backend/src/cars`

Tests:

- Cars unit tests: 3 suites, 9 tests passed.
- Backend TypeScript check: ошибок Cars нет; остаются только ошибки Dashboard.

Notes:

- Legacy battery helper временно остаётся в каталоге Cars, поскольку его импортирует Dashboard; сам CarsModule от него больше не зависит.

Blockers:

- PSO deadline policy, Battery Tasks scheduling и issue workflow требуют отдельных задач.
### 5. Dashboard migration

**Статус:** `[x]` Foundation завершён и проверен.

Dashboard использует только подтверждённые Car lifecycle, Pso и VehicleEvent contracts. Battery urgency исключена до определения Battery Tasks policy.

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

- Battery warning/critical/overdue удалены из контракта: текущая Schema хранит только факты `BatteryCheck`.

Blockers:

- Для battery dashboard metrics необходимо определить scheduling, due date и overdue policy.
### 6. Tests stabilization

**Статус:** `[-]` Базовый backend test set стабилен; coverage/security work остаётся.

Согласовать Jest с Prisma 7 generated client, восстановить компиляцию всех suites, обновить legacy mocks и добиться зелёного `nx test backend`. Добавить отсутствующие security, Dashboard и contract tests.

Completed:

- Текущие backend suites и TypeScript build-check проходят.

Changed:

- Prisma Jest mapping и legacy mocks были актуализированы в foundation tasks.

Tests:

- Backend Jest: 10 suites, 34 tests passed.
- Backend TypeScript build-check passed.

Notes:

- `nx test backend` отдельно не подтверждён; проверен прямой Jest target.

Blockers:

- Остаются недостающие security/contract tests и проверка Nx target.
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

**Статус:** `[ ]` Не начинать до стабильного backend API.

- [-] Auth client, interceptor, guards и login UI существуют, но role contract зависит от Phase 0/1.
- [ ] Восстановить и проверить Nx build/test targets frontend.
- [ ] Создать typed data-access для Dashboard.
- [ ] Создать typed data-access для Cars и Car Details.
- [ ] Создать typed data-access для Arrival после подтверждения контракта.
- [ ] Создать typed data-access для Tasks после подтверждения Battery Tasks.

---

## Current Blockers

1. Clean baseline не проверен применением на disposable PostgreSQL.
2. Не определены PSO deadline policy и Battery Tasks scheduling, включая dashboard battery metrics.
3. Не определены role permission matrix и правило формирования `shortVin`.
4. `DIRECT_URL` отсутствует; migration status и drift PostgreSQL не подтверждены.

---

## Completed History

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

## Правило обновления документа

После выполнения каждой задачи агент обязан:

1. Обновить статус задачи.
2. Добавить короткий отчёт.
3. Зафиксировать новые блокеры.
4. Не создавать отдельные отчётные документы без необходимости.
