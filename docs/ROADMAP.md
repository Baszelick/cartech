# CarTech Roadmap

> Актуализировано по результатам `docs/PROJECT_AUDIT.md`.
>
> Последнее обновление: 2026-07-29

---

## Цель проекта

CarTech — внутренняя система управления автомобильной площадкой дилерского центра.

MVP должен поддерживать:

- приёмку и хранение автомобилей;
- работу с локациями и площадками;
- предпродажную подготовку;
- контроль аккумуляторов;
- выдачу автомобилей;
- просмотр текущих задач.

Текущий приоритет:

1. Согласовать доменную модель.
2. Восстановить backend и migration path.
3. Стабилизировать тесты и Swagger.
4. Подключить frontend к подтверждённому API.

---

## Статусы

- `[x]` — код реализован, компиляция и тесты проходят, контракт подтверждён.
- `[-]` — реализация существует полностью или частично, но проверка не пройдена.
- `[ ]` — не выполнено.

Наличие кода само по себе не является основанием для `[x]`.

---

## Текущее состояние

| Область | Статус | Фактическое состояние |
|---|---:|---|
| Domain model | `[-]` | Структурная модель подтверждена; открыты отдельные policy-вопросы. |
| Prisma migrations | `[-]` | `migration_init` создан; применение на disposable PostgreSQL не проверено. |
| Backend | `[ ]` | Не компилируется против текущего Prisma Client. |
| Backend tests | `[ ]` | 6 из 7 suites падают. |
| Swagger | `[-]` | Подключён, но contracts неполны и часть endpoints неработоспособна. |
| Frontend | `[-]` | Auth/UI foundation существует; domain screens не подключены к API. |

---

## Current Blockers

1. `migration_init` не проверен через migrate → seed на disposable PostgreSQL.
2. Не определены PSO deadline, Battery Tasks scheduling, role permission matrix и правило `shortVin`.

---

## Этап 0 — Domain Alignment

**Статус:** `[-]` Структурные решения приняты.

До продолжения backend-разработки необходимо определить:

- [x] Приёмка — операция без отдельной `Arrival` entity.
- [x] Brand/Model/Color — snapshot-поля `Car`.
- [x] Роли — набор `UserRoleAssignment`.
- [x] Lifecycle — `ACTIVE`, `ISSUED`, `ARCHIVED`; PSO отделён от lifecycle.
- [-] PSO workflow определён структурно; deadline policy требует решения.
- [-] `BatteryCheck` определён как факт проверки; scheduling требует решения.
- [x] Конфликтующие ADR заменены актуальными решениями.

Результат этапа: текущая Prisma Schema подтверждена как структурная основа migration target. Открытые policy-вопросы не блокируют Prisma/Auth foundation, но блокируют соответствующие PSO, Battery Tasks и role-guard workflows.

---

## Этап 1 — Backend Recovery

### 1.1 Prisma foundation

**Статус:** `[-]`

- [x] Prisma Schema проходит validation.
- [x] Prisma Client воспроизводимо генерируется в `apps/backend/generated/prisma`.
- [x] Подтвердить Schema как структурную основу после Domain Alignment.
- [x] Использовать только `apps/backend/generated/prisma` во всех backend TypeScript imports.
- [x] Проанализировать migration history и выбрать стратегию clean baseline.
- [x] Перенести legacy SQL из active history в `prisma/legacy-migrations`.
- [x] Создать `migration_init` из текущей Schema.
- [x] Проверить baseline: 8 enum, 19 tables, legacy objects отсутствуют.
- [x] Подтвердить детерминированность baseline повторной генерацией.
- [x] Актуализировать seed для Company, Location, Site, User и access relations.
- [x] Подтвердить standalone TypeScript check seed.
- [-] `prisma.config.ts` и `.env.example` поддерживают `DIRECT_URL`; значение окружения не настроено.
- [ ] Проверить migration status и drift через direct connection.
- [ ] Развернуть disposable database: migrate → seed.
- [ ] Добавить/проверить backend build и serve targets.

### 1.2 Authentication

**Статус:** `[-]` Foundation мигрирована; полная backend build заблокирована другими модулями.

Существующая foundation не считается завершённой.

- [x] Login использует `(companyId, username)`.
- [x] Access token, refresh rotation, HttpOnly cookie, logout и `/auth/me` приведены к новой user model.
- [x] Role contract использует массив `UserRoleAssignment`.
- [x] JWT содержит `companyId` и массив ролей; location access остаётся relation, а не snapshot токена.
- [-] JWT guard/strategy приведены к новому payload; permission checks отложены до permission matrix.
- [x] Login и refresh проверяют active user.
- [x] Отсутствующий refresh cookie возвращает HTTP 401.
- [ ] Добавить подтверждённые response DTO и Swagger schemas.
- [x] Auth service tests: 10/10 passed.

Причины незавершённости: response DTO/Swagger не завершены, permission matrix не определена, полный backend build блокируют другие modules.

### 1.3 Arrivals

**Статус:** `[x]`

Arrivals реализован как бизнес-операция, а не отдельная сущность.

- [x] Зафиксировано: отдельной `Arrival` entity в целевой модели нет.
- [x] Реализован `POST /operations/arrivals`.
- [x] Удалены legacy `Arrival`, `CarModel`, `Color`, `Site.brands` contracts.
- [x] Используются UUID и string snapshot fields Car.
- [x] Реализованы active user, company, Site и location scope checks.
- [x] Cars и `CAR_ARRIVED` events создаются одной transaction.
- [x] Добавлены request/response DTO и Swagger errors.
- [x] Service/controller tests: 10/10 passed.
- [x] Backend TypeScript check не содержит Arrivals errors.

Полный backend build после миграции Arrivals оставался красным из-за Cars и Dashboard; Cars foundation стабилизирован в следующем разделе.

### 1.4 Cars

**Статус:** `[-]` Foundation стабилизирован; workflows мигрированы не полностью.

CarsModule не содержит обращений к отсутствующим Prisma fields и компилируется. Query и battery fact operations разделены; неподтверждённые legacy PSO, tasks и issue endpoints удалены.

#### GET /cars

**Статус:** `[x]`

- [x] UUID, актуальные scalar fields, company/location scope и response DTO реализованы.
- [x] Contract подтверждён service/controller tests.

#### GET /cars/:id

**Статус:** `[x]`

- [x] UUID, актуальные scalar fields, company/location scope и response DTO реализованы.
- [x] Contract подтверждён service/controller tests.

#### POST /cars/:id/battery-check

**Статус:** `[x]`

- [x] UUID, authenticated user, scope check, `BatteryCheck` create и DTO реализованы.
- [x] Contract подтверждён service/controller tests.
- [x] Endpoint фиксирует только выполненную проверку и не реализует Battery Tasks scheduling.

#### GET /cars/tasks

**Статус:** `[ ]`

- [ ] Определить Battery Tasks contract.
- [x] Legacy endpoint удалён до определения нового контракта.
- [ ] Добавить auth, company/location scope, response DTO, tests и Swagger.

#### POST /cars/:id/pso

**Статус:** `[ ]`

- [ ] Определить PSO workflow.
- [ ] Перейти на UUID и актуальную relation `Pso`.
- [ ] Добавить auth, scope, DTO, tests и Swagger.

#### POST /cars/:id/issue

**Статус:** `[ ]`

- [ ] Определить правила выдачи.
- [ ] Перейти на UUID и актуальные lifecycle/VehicleIssue contracts.
- [ ] Добавить auth, scope, DTO, tests и Swagger.

#### Legacy cleanup

- [x] Standalone `POST /cars` отсутствует.
- [x] Из CarsModule удалены обращения к `status`, `psoCompletedAt`, `nextBatteryCheckAt`, `issuedAt`.
- [x] Из CarsModule удалены legacy relations `model`, `color`, `site`.
- [x] Из CarsModule удалены enum values `ARRIVED`, `PSO`, `READY`.
- [x] Удалены numeric car ID dependencies.
- [x] Удалён неиспользуемый legacy `CreateCarDto`.
- [-] Legacy battery status helper временно сохранён только для существующего импорта Dashboard.

### 1.5 Dashboard

**Статус:** `[x]` Foundation завершён.

- [x] Queries используют `Car.lifecycleStatus`, `Pso.status` и `VehicleEvent`.
- [x] Добавлены JWT authentication и company/location scope.
- [x] Добавлен явный `DashboardResponseDto`.
- [x] Service/controller tests: 2 suites, 3 tests passed.
- [x] Backend TypeScript build-check проходит.
- [x] Полный backend Jest: 10 suites, 34 tests passed.
- [x] Legacy Car fields, enum aliases и Cars battery helper dependencies удалены.
- [-] Battery warning/critical/overdue metrics исключены до определения scheduling и overdue policy.

### 1.6 Tests stabilization

**Статус:** `[-]` Базовый набор стабилен; coverage/security work остаётся.

- [x] Jest согласован с generated Prisma client.
- [x] Compile errors и legacy mocks текущих suites устранены.
- [ ] Добавить недостающие Dashboard/Auth controller/security tests.
- [x] Backend Jest: 10 suites, 34 tests passed.
- [x] Подтвердить backend TypeScript compile.

### 1.7 Swagger completion

**Статус:** `[x]`

- [x] Swagger UI подключён и проверен по `/api/docs`.
- [x] Auth request/response/error DTO, refresh-cookie contract и examples.
- [x] Arrivals request/response/error DTO и examples.
- [x] Cars request/response/error DTO, lifecycle enum description и examples.
- [x] Dashboard response DTO, bearer requirement и examples.
- [x] Bearer requirements подтверждены для protected endpoints.
- [x] Неработающие и legacy schemas отсутствуют в публичном contract.
- [x] Contract test подтверждает 10 paths и отсутствие unresolved schema references.
- [x] Финальная проверка: Swagger UI HTTP 200, backend Jest 35/35, TypeScript passed.

---

## Этап 2 — Frontend

**Статус:** `[-]` Foundation существует, domain integration не выполнена.

### Foundation

- [-] Angular 19 standalone application, lazy routes и layout существуют.
- [-] UI library существует; полная проверка build/tests не выполнена.
- [-] Login UI, auth service, interceptor и guards существуют, но role contract устарел.
- [ ] Восстановить Nx `frontend:build` и test targets.

### Domain integration

- [ ] Dashboard API integration.
- [ ] Cars list, search, filters и sorting.
- [ ] Car details и history.
- [ ] Arrival screen после подтверждения Arrival contract.
- [ ] Tasks screen после подтверждения Battery Tasks contract.

---

## Этап 3 — MVP Verification

MVP считается готовым только после успешной компиляции, тестов и подтверждения contracts.

### Backend

- [ ] Auth
- [ ] Arrivals
- [ ] Cars read API
- [ ] PSO
- [ ] BatteryCheck
- [ ] Battery Tasks
- [ ] Issue
- [ ] Dashboard
- [ ] Migrations и seed
- [ ] Swagger

### Frontend

- [ ] Login
- [ ] Dashboard
- [ ] Cars list
- [ ] Car details
- [ ] Arrival
- [ ] Tasks

---

## После MVP

Не входит в текущий recovery scope.

### Администрирование

- [ ] Компании
- [ ] Локации
- [ ] Пользователи
- [ ] Роли

### История и коммуникации

- [ ] Vehicle timeline
- [ ] Vehicle Events
- [ ] Audit Log
- [ ] Feed, comments и reactions

### Дополнительно

- [ ] Импорт и экспорт
- [ ] Уведомления
- [ ] Отчёты и аналитика
