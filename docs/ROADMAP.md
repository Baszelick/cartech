# CarTech Roadmap

> Актуализировано по результатам `docs/PROJECT_AUDIT.md`.
>
> Последнее обновление: 2026-08-01

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
| Prisma migrations | `[x]` | Clean baseline и добавочная nullable-VIN migration применены на тестовой Neon PostgreSQL без reset данных. |
| Backend | `[x]` | Nx build и watch serve проходят; artifact создаётся в `dist/apps/backend`. |
| Backend tests | `[x]` | `nx test backend --runInBand`: 25 suites, 152 tests проходят. |
| Swagger | `[x]` | Полный contract проверен; `/api/docs` возвращает HTTP 200 через Nx serve. |
| Frontend | `[-]` | Angular 20.3 foundation, Auth/Shell libraries, build/test/serve и UI lint подтверждены; domain screens ещё не подключены к API. |

---

## Current Blockers

- Подтверждённых backend-блокеров для MVP API нет.
- Подтверждённых блокеров frontend foundation нет.

---

## Этап 0 — Domain Alignment

**Статус:** `[-]` Структурные решения приняты.

До продолжения backend-разработки необходимо определить:

- [x] Приёмка — операция без отдельной `Arrival` entity.
- [x] Brand/Model/Color — snapshot-поля `Car`.
- [x] Роли — набор `UserRoleAssignment`.
- [x] Lifecycle — `ACTIVE`, `ISSUED`, `ARCHIVED`; PSO отделён от lifecycle.
- [x] Pso создаётся при приёмке; `deadlineOn = arrivedOn + 3` календарных дня.
- [x] `BatteryCheck` и календарный scheduling подтверждены; отдельная planning entity не требуется.
- [x] Конфликтующие ADR заменены актуальными решениями.

Результат этапа: текущая Prisma Schema подтверждена как структурная основа migration target. Открытые policy-вопросы не блокируют Prisma/Auth foundation, но блокируют соответствующие PSO, Battery Tasks и role-guard workflows.

---

## Этап 1 — Backend Recovery

### 1.1 Prisma foundation

**Статус:** `[x]`

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
- [x] `prisma.config.ts` и `.env.example` поддерживают runtime `DATABASE_URL` и migration `DIRECT_URL`.
- [x] Проверить migration state через direct connection: после baseline pending migrations отсутствуют.
- [x] Развернуть чистую тестовую database: reset → migrate deploy → двойной seed.
- [x] Подтвердить seed через реальный Arrival smoke-flow: Car, Pso и `CAR_ARRIVED`.
- [x] Добавить и проверить backend build/serve targets и root scripts.

### 1.2 Authentication

**Статус:** `[-]` Auth и role guard foundation реализованы; привязка ролей к административным endpoints остаётся следующими задачами.

Существующая foundation не считается завершённой.

- [x] Login использует `(companyId, username)`.
- [x] Access token, refresh rotation, HttpOnly cookie, logout и `/auth/me` приведены к новой user model.
- [x] Role contract использует массив `UserRoleAssignment`.
- [x] JWT содержит `companyId` и массив ролей; location access остаётся relation, а не snapshot токена.
- [x] JWT guard/strategy используют новый payload с массивом ролей.
- [x] Утверждена минимальная MVP permission matrix.
- [x] Добавлены декларативный `@Roles(...)`, общий `RolesGuard` и 7 unit tests.
- [x] Login и refresh проверяют active user.
- [x] Отсутствующий refresh cookie возвращает HTTP 401.
- [ ] Добавить подтверждённые response DTO и Swagger schemas.
- [x] Auth service tests: 10/10 passed.

Role guard foundation завершён; административные endpoints и назначение metadata реализуются отдельными задачами.

### 1.3 Arrivals

**Статус:** `[x]`

Arrivals реализован как бизнес-операция, а не отдельная сущность.

- [x] Зафиксировано: отдельной `Arrival` entity в целевой модели нет.
- [x] Реализован `POST /operations/arrivals`.
- [x] Удалены legacy `Arrival`, `CarModel`, `Color`, `Site.brands` contracts.
- [x] Используются UUID и string snapshot fields Car.
- [x] Реализованы active user, company, Site и location scope checks.
- [x] Cars, отдельные Pso и `CAR_ARRIVED` events создаются одной transaction.
- [x] Pso получает `PENDING`, общий batch deadline от `arrivedOn + 3`, пустые completion fields.
- [x] Добавлены request/response DTO и Swagger errors.
- [x] Arrivals/PSO focused tests: 3 suites, 17 tests passed.
- [x] Полный backend Jest: 19 suites, 86 tests passed.
- [x] Backend TypeScript check не содержит Arrivals errors.

Полный backend build после миграции Arrivals оставался красным из-за Cars и Dashboard; Cars foundation стабилизирован в следующем разделе.

### 1.4 Cars

**Статус:** `[x]` Foundation, PSO, выдача и Battery workflow реализованы и проверены.

CarsModule не содержит обращений к отсутствующим Prisma fields и компилируется. Query, battery fact, PSO и Vehicle Issue operations разделены; неподтверждённый legacy tasks endpoint удалён.

#### GET /cars

**Статус:** `[x]`

- [x] UUID, актуальные scalar fields, company/location scope и response DTO реализованы.
- [x] Contract подтверждён service/controller tests.
- [x] Nullable VIN, обязательный shortVin и company-scoped `hasShortVinDuplicate` возвращаются без N+1.

#### GET /cars/:id

**Статус:** `[x]`

- [x] UUID, актуальные scalar fields, company/location scope и response DTO реализованы.
- [x] Contract подтверждён service/controller tests.
- [x] Текущий Car исключается из duplicate check; другие Company не учитываются.

#### PATCH /cars/:id

**Статус:** `[x]`

- [x] Редактирует только `shortVin` и nullable `vin` с trim/uppercase и утверждённой validation.
- [x] Полный VIN уникален внутри Company; duplicate shortVin разрешён и отражается warning flag.
- [x] UUID, company/location scope, DTO, Swagger 400/401/404/409 и focused tests подтверждены.

#### POST /cars/:id/battery-check

**Статус:** `[x]`

- [x] UUID, authenticated user, scope check, `BatteryCheck` create и DTO реализованы.
- [x] Contract подтверждён service/controller tests.
- [x] Endpoint закрывает самый старый незакрытый 30-дневный период и допускает выполнение начиная за 3 дня до срока.
- [x] График остаётся привязан к `Car.arrivedOn`; операция выполняется в serializable transaction.

#### GET /cars/tasks

**Статус:** `[x]`

- [x] Battery Tasks contract: текущий незакрытый период, статусы `UPCOMING`, `URGENT`, `OVERDUE`.
- [x] Legacy endpoint удалён до определения нового контракта.
- [x] Добавлены auth, company/location scope, PSO + Battery response DTO, tests и Swagger.

#### PSO: GET /cars/:id/pso и POST /cars/:id/pso/complete

**Статус:** `[x]`

- [x] Получение состояния и завершение существующей Pso используют UUID и актуальную relation `Pso`.
- [x] Завершение использует authenticated user, company/location scope и возвращает NotFound без утечки данных.
- [x] Повторное завершение отклоняется; `completedOn` и `completedById` фиксируются атомарно с событием `PSO_COMPLETED`.
- [x] `Car.lifecycleStatus` не изменяется.
- [x] Response DTO, 400/401/404/409 Swagger responses и focused tests подтверждены.
- [x] Pso создаётся в arrival transaction; deadline рассчитывается детерминированно от `arrivedOn`.

#### POST /cars/:id/issue

**Статус:** `[x]`

- [x] Используются UUID, authenticated user и актуальные `VehicleIssue`/lifecycle contracts.
- [x] Company/location scope возвращает NotFound для отсутствующего или недоступного автомобиля.
- [x] Выдача разрешена только для `ACTIVE`, незаблокированного автомобиля с `Pso.status = COMPLETED`.
- [x] Повторная и конкурентная повторная выдача отклоняются.
- [x] Переход в `ISSUED`, создание `VehicleIssue` и `CAR_ISSUED` выполняются одной транзакцией.
- [x] Response DTO, 400/401/404/409 Swagger responses и focused tests подтверждены.

#### Legacy cleanup

- [x] Standalone `POST /cars` отсутствует.
- [x] Из CarsModule удалены обращения к `status`, `psoCompletedAt`, `nextBatteryCheckAt`, `issuedAt`.
- [x] Из CarsModule удалены legacy relations `model`, `color`, `site`.
- [x] Из CarsModule удалены enum values `ARRIVED`, `PSO`, `READY`.
- [x] Удалены numeric car ID dependencies.
- [x] Удалён неиспользуемый legacy `CreateCarDto`.
- [x] Legacy battery status helper удалён; единый `BatteryScheduleService` используется Cars и Dashboard.

### 1.4a Location and Site API

**Статус:** `[x]` Read и административный write API реализованы и проверены.

- [x] `GET /locations` использует company/user scope только из JWT и `UserLocationAccess`.
- [x] `GET /locations/:id/sites` использует UUID и возвращает NotFound для отсутствующей или недоступной локации.
- [x] Location/Site response DTO, стабильная сортировка, Swagger и focused tests подтверждены.
- [x] Пустой список доступных локаций или площадок является успешным ответом.
- [x] `POST /locations` защищён JWT + RolesGuard, использует company из JWT, typed DTO, trim/validation и confirmed unique constraint.
- [x] Редактирование активных/неактивных сущностей и создание Site в неактивной Location подтверждены.
- [x] Реализованы PATCH и soft-deactivate Location.
- [x] Реализованы POST, PATCH и soft-deactivate Site.
- [x] Деактивация транзакционно запрещается при наличии текущих автомобилей и возвращает `409`.
- [x] Company isolation, RolesGuard, DTO, Swagger и focused tests подтверждены.
- [x] Управление UserLocationAccess реализовано и проверено.

### 1.4b UserLocationAccess management

**Статус:** `[x]` Users read и UserLocationAccess API реализованы и проверены.

- [x] Permission matrix утверждена для `SYSTEM_OWNER`, `OPERATIONS_MANAGER`, `TECHNICIAN` и `VIEWER`.
- [x] `SYSTEM_OWNER` и `OPERATIONS_MANAGER` могут просматривать пользователей и управлять location access.
- [x] Только `SYSTEM_OWNER` может изменять собственные location access.
- [x] Декларативный role guard foundation реализован и проверен.
- [x] Реализованы scoped `GET /users` и `GET /users/:id` с безопасными DTO.
- [x] Users read API защищён `JwtAuthGuard`, `RolesGuard` и metadata для `SYSTEM_OWNER`/`OPERATIONS_MANAGER`.
- [x] Company isolation, stable sorting, Swagger и focused tests подтверждены.
- [x] Реализованы scoped UserLocationAccess read/replace API, DTO, Swagger и tests.
- [x] Полная замена выполняется транзакционно; пустой массив допустим, дубликаты отклоняются.
- [x] Company isolation и self-update policy для `SYSTEM_OWNER`/`OPERATIONS_MANAGER` подтверждены tests.
- [x] Реализовать CRUD Location/Site.
- [x] Реализованы scoped `GET/PUT /users/:id/roles` для `SYSTEM_OWNER` и ограниченного `OPERATIONS_MANAGER`.
- [x] Последний `SYSTEM_OWNER` защищён; роль и session replacement выполняются одной transaction.
- [x] Пустые/дублирующиеся роли отклоняются, Swagger и focused tests подтверждены.
- [x] Подтверждено, что текущая Prisma Schema достаточна и не требует изменения.

### 1.5 Dashboard

**Статус:** `[x]` Foundation завершён.

- [x] Queries используют `Car.lifecycleStatus`, `Pso.status` и `VehicleEvent`.
- [x] Добавлены JWT authentication и company/location scope.
- [x] Добавлен явный `DashboardResponseDto`.
- [x] Service/controller tests подтверждают scoped Dashboard и Battery metrics.
- [x] Backend TypeScript build-check проходит.
- [x] Полный backend Jest: 25 suites, 152 tests passed.
- [x] Legacy Car fields, enum aliases и Cars battery helper dependencies удалены.
- [x] Battery metrics `Upcoming`, `Urgent`, `Overdue` возвращены на подтверждённом scheduling contract.

### 1.6 Tests stabilization

**Статус:** `[-]` Базовый набор стабилен; coverage/security work остаётся.

- [x] Jest согласован с generated Prisma client.
- [x] Compile errors и legacy mocks текущих suites устранены.
- [ ] Добавить недостающие Dashboard/Auth controller/security tests.
- [x] Backend Jest: 25 suites, 152 tests passed.
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

- [x] `apps/frontend` оставлен composition root для providers и routes.
- [x] Auth перенесён в `libs/auth/data-access` и `libs/auth/feature-login`.
- [x] Shell и связанные компоненты перенесены в `libs/shell/feature-layout`.
- [x] Shell-specific `LayoutService` восстановлен на Signals с проектным mobile breakpoint `768px`.
- [x] UI library физически сохранена в `libs/frontend/ui`, логически помечена `scope:shared`, `type:ui`.
- [x] Nx tags, public aliases и module boundaries настроены; graph строится без циклов и deep imports.
- [x] Корневое окружение согласовано на Angular framework `20.3.27`, tooling `20.3.32`, CDK `20.2.14`, TypeScript `5.8.3` и Nx `23.1.0`.
- [x] Nx `frontend:build`, `frontend:serve` и `frontend:test` targets подтверждены.
- [x] Login UI, Auth data-access и Shell компилируются и разрешаются через public API.
- [x] UI kit lint проходит после безопасных локальных исправлений без изменения публичного API.
- [ ] Необязательно: физически перенести `libs/frontend/ui` в `libs/shared/ui`.

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

- [x] Auth
- [x] Arrivals
- [x] Cars read API
- [x] PSO
- [x] BatteryCheck
- [x] Battery Tasks
- [x] Issue
- [x] Locations/Sites read API
- [x] Dashboard
- [x] Migrations и seed
- [x] Swagger

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
