# CarTech Project Audit

Дата: 2026-07-29

## 1. Общий статус проекта

- **Frontend:** существует Angular 19 standalone-приложение с shell/layout, login feature, auth data-access и собственной UI-библиотекой. Auth-клиент подключён к HTTP API. Доменные экраны Cars, Arrival, Tasks и Home в основном являются UI-заготовками без data-access и без подключения к backend API.
- **Backend:** NestJS-модули Auth, Arrivals, Cars, Dashboard и Prisma зарегистрированы, Swagger подключён. Backend не компилируется против текущего Prisma Client; `nx test backend` не проходит.
- **Документация:** актуальные `AGENTS.md`, `ROADMAP.md`, `DECISIONS.md` и `AI_TASKS.md` существуют, но часть их утверждений не соответствует коду и Prisma Schema. Объявленные документы `ARCHITECTURE.md`, `DOMAIN.md`, `BUSINESS_RULES.md`, `DATABASE.md`, `API.md`, `ROLES.md` и `docs/README.md` отсутствуют.
- **Главный текущий блокер:** Prisma Schema и сгенерированный Client описывают новую доменную модель, а значительная часть Auth, Arrivals, Cars, Dashboard, seed и все существующие migrations относятся к иной/legacy-модели. Из-за этого backend не компилируется и тесты не запускаются как полноценный набор.

Проверки:

- Nx обнаруживает проекты: `backend`, `frontend`, `ui`, `auth-data-access`, `auth-feature-login`.
- `nx test backend --skip-nx-cache --runInBand`: 6 suites failed, 1 suite passed; 1 test passed.
- `tsc -p apps/backend/tsconfig.build.json --noEmit`: завершился с ошибками типов Prisma в Auth, Arrivals, Cars, Dashboard и seed.
- `nx build frontend --skip-nx-cache`: target `frontend:build` не найден.
- Фактическое состояние применённых migrations в конкретной PostgreSQL базе: **не удалось подтвердить** без подключения к БД.

## 2. Архитектура

### Текущая структура

```text
apps/
├── backend/                 NestJS application
│   ├── prisma/              schema, seed, 4 legacy migrations
│   ├── generated/prisma/    generated Prisma 7 client
│   └── src/
│       ├── auth/
│       ├── arrivals/
│       ├── cars/
│       ├── dashboard/
│       └── prisma/
└── frontend/                Angular 19 application
    └── src/app/
        ├── features/
        ├── layout/
        └── app routes/config

libs/
└── frontend/
    ├── auth/data-access/
    ├── auth/feature-login/
    └── ui/

docs/
├── AGENTS.md
├── AI_TASKS.md
├── DECISIONS.md
├── PROJECT_AUDIT.md
└── ROADMAP.md
```

### Соответствие плану

- Nx monorepo и разделение на frontend/backend фактически существуют.
- Backend следует базовой цепочке Controller → Service → Prisma.
- Frontend использует standalone components, lazy routes, Signals в auth и OnPush в большинстве компонентов.
- Собственная UI-библиотека вынесена в `libs/frontend/ui`.
- Фактическая структура библиотек не соответствует упрощённой схеме README (`ui/shared/core`): библиотеки находятся под `libs/frontend`, а `shared` и `core` отсутствуют.
- Frontend одновременно содержит отдельный Angular workspace-конфиг в `apps/frontend/angular.json` и Nx project discovery, но Nx не получает target `frontend:build`. В `angular.json` указаны `root: ""` и `sourceRoot: "src"`, хотя файл расположен внутри `apps/frontend`.
- У Nx-проектов отсутствуют архитектурные tags и ограничения зависимостей.

### Основные модули

- Backend: `AuthModule`, `ArrivalsModule`, `CarsModule`, `DashboardModule`, `PrismaModule`.
- Frontend features: login, home, cars, arrival, tasks.
- Frontend layout: shell, sidebar, headers, navigation, workspace, control center.
- UI: button, checkbox, date-picker, form-field, icon, image-logo, input, logo, select, textarea.

## 3. Backend Audit

### Auth

**Статус: ❌**

Подтверждённые части:

- login, refresh rotation, logout и `GET /auth/me` реализованы;
- refresh token хранится в HttpOnly cookie;
- refresh-сессия хранит bcrypt hash, expiry и revocation;
- access token извлекается Bearer strategy;
- `JwtAuthGuard` используется для `GET /auth/me`;
- Swagger tag, bearer auth и базовые operation/response descriptions присутствуют.

Проблемы:

- `User` в Schema не имеет scalar-поля `role`; роли находятся в relation `roles: UserRoleAssignment[]`. Auth выбирает и читает `user.role`, помещает одно поле `role` в access token и DTO. Это блокирует компиляцию.
- Schema задаёт `@@unique([companyId, username])`, но login вызывает `findUnique({ where: { username } })`. Глобальная уникальность username отсутствует, а company context при login не передаётся.
- `publicUserSelect` содержит отсутствующее `role`.
- `isActive` пользователя при login/refresh не проверяется.
- JWT validate проверяет подпись и expiry, но не проверяет актуальность пользователя, session revocation, company или location access.
- В JWT payload нет `companyId` и location scope; role guard/decorator отсутствуют.
- `POST /auth/refresh` при отсутствии cookie возвращает JSON `{ statusCode: 401 }` с фактическим HTTP 200, потому что controller не выбрасывает `UnauthorizedException`.
- Response DTO для login/refresh/me не объявлены; Swagger фиксирует только описания, но не типы схем ответов.
- Auth unit suite не компилируется; mocks и контракт тестов используют legacy scalar `role`.

### Arrivals

**Статус: ❌**

Подтверждённые части:

- controller защищён `JwtAuthGuard`;
- DTO использует class-validator/class-transformer;
- сервис задуман как одна Prisma transaction для Arrival и Cars;
- существуют service/controller specs.

Проблемы:

- В текущей Prisma Schema модели `Arrival` нет. Car хранит `arrivalSiteId` и `arrivedOn`, но relation к Arrival отсутствует.
- Сервис обращается к отсутствующим Prisma delegates/types: `arrival`, `CarModel`, `Color`, `Prisma.ArrivalInclude`.
- DTO использует legacy numeric `siteId`, `modelId`, `brandId`, `colorId`, `arrivalId`; актуальная Schema использует UUID и строковые `brand`, `model`, `color`, а также обязательные `companyId`, `ownerLocationId`, `currentSiteId`, `arrivalSiteId`, `createdById`, `shortVin`, `arrivedOn`.
- Сервис обращается к отсутствующим relations `Site.brands`, `Car.model`, `Car.color`, `Car.site`.
- `create()` controller не передаёт authenticated user context. Фактический сервис не применяет company/location scope и не заполняет `createdById`.
- `findAll()` и `findOne()` не имеют company/location scope.
- Тесты ожидают `create(dto, mockAuth)`, а реализация принимает только `create(dto)`, поэтому arrivals service suite не компилируется.
- ROADMAP и AI_TASKS отмечают transaction, company scope, location validation и unit tests как выполненные, но фактический код не подтверждает company/location scope, а тесты не проходят.
- Отдельных response DTO нет; Prisma entities планировалось возвращать напрямую.

### Cars

**Статус: ❌**

#### Что мигрировано

- `GET /cars` использует UUID user context, company scope и список доступных location IDs.
- `GET /cars/:id` использует UUID route parameter, user/company/location scope и отдельный response DTO.
- `POST /cars/:id/battery-check` использует UUID, authenticated user, scope-проверку автомобиля, отдельные request/response DTO и создаёт `BatteryCheck` по актуальным полям Schema.
- Эти три ветки используют актуальные поля `brand`, `model`, `color`, `arrivedOn`, `lifecycleStatus`, `ownerLocationId`, `currentSiteId`.

#### Что осталось

- `GET /cars/tasks` полностью legacy и не защищён guard.
- `POST /cars/:id/pso` полностью legacy, принимает numeric ID и не защищён guard.
- `POST /cars/:id/issue` полностью legacy, принимает numeric ID и не защищён guard.
- Для PSO и issue не реализованы актуальные relations `Pso`, `VehicleIssue`, `VehicleEvent`.
- Business contract задач аккумулятора, PSO и выдачи документацией не определён.

#### Legacy-части

- Поля, отсутствующие в Schema: `status`, `psoCompletedAt`, `nextBatteryCheckAt`, `issuedAt`.
- Enum values, отсутствующие в `CarLifecycleStatus`: `ARRIVED`, `PSO`, `READY`.
- Relations, отсутствующие у Car: relation `model`, relation `color`, relation `site`.
- Numeric car IDs в `completePso()` и `issueCar()`.
- Legacy DTO `CreateCarDto` остался в Cars и используется Arrivals; он содержит numeric справочники, `arrivalId` и `comment`, которых нет в текущем Car contract.
- `mapTask` типизирован полным Prisma `Car` и возвращает Prisma entity наружу, что противоречит AGENTS/ADR-008.
- Cars service/controller suites не запускаются из-за compile errors legacy-веток.

### Prisma

**Статус: ❌**

#### Schema

- Schema описывает UUID multi-company модель: Company, Location, Site, User/access, Car, Pso, BatteryCheck, movements, appointments/issues, events, feed и audit.
- Car хранит строковые `brand`, `model`, `color`, что соответствует текущему Schema, но противоречит ADR-003 и ADR-005 о `modelId` и динамических Brand/CarModel/Color.
- `Arrival` отсутствует, хотя ADR-004 и ROADMAP описывают её как отдельную сущность.
- Relations в самой Schema синтаксически отражены в сгенерированном client. Отдельный повторный `prisma generate` не выполнялся, чтобы не изменять workspace.

#### Client generation

- Сгенерированный Client присутствует в `apps/backend/generated/prisma` и содержит модели текущей Schema.
- `PrismaService` импортирует этот custom-output Client.
- Часть кода и seed импортирует типы из `@prisma/client`, то есть используется два несовместимых import path.
- Jest не может загрузить generated client: `import.meta` обрабатывается как CommonJS (`Cannot use 'import.meta' outside a module`).

#### Relations

- Текущий Cars read API соответствует scalar-полям новой Car.
- Arrivals, legacy Cars workflows и Dashboard используют relations/поля старой модели.
- Auth использует scalar role вместо relation `UserRoleAssignment`.

#### Migration state

- В репозитории четыре migrations: legacy initial schema, add user, user model change и auth sessions.
- Initial migration создаёт старые `Location`, `Site`, `Brand`, `SiteBrand`, `CarModel`, `Color`, `Arrival`, `Car`, `BatteryCheck`, numeric IDs и `CarStatus`.
- Текущая Schema использует другие table names через `@@map`, UUID, Company, access tables и множество новых доменных сущностей.
- Migration, переводящей legacy database schema в текущую Prisma Schema, в репозитории нет.
- `migration_lock.toml` присутствует.
- Применённость migrations и наличие drift в реальной БД: **не удалось подтвердить** без подключения к PostgreSQL.

### Dashboard

**Статус: ❌**

- Module/controller/service существуют и Swagger tag подключён.
- Guard, user context, company scope и location scope отсутствуют.
- Service импортирует отсутствующий `CarStatus` из `@prisma/client`.
- Запросы используют отсутствующие поля `status`, `psoCompletedAt`, `nextBatteryCheckAt`, `issuedAt`.
- Response DTO и тесты отсутствуют.

### Controllers, DTO, Guards, Tests и Swagger

- Global `ValidationPipe` включён с `whitelist` и `transform`, но без `forbidNonWhitelisted`.
- DTO есть для login, arrival create, legacy car create, battery check и части Cars responses.
- Response DTO отсутствуют у Auth, Arrivals, Dashboard и legacy Cars workflows.
- JWT guards применены не глобально и отсутствуют на Dashboard, Cars tasks/PSO/issue.
- Role guard и декларативный company/location scope отсутствуют.
- Swagger подключён по `/api/docs`; базовые tags и operations есть, но документация неполная и местами описывает неработающие endpoints.
- Backend tests существуют для app, Prisma, Auth, Arrivals и Cars. Нет Dashboard tests. Результат: 6 failed suites, 1 passed suite.
- E2E scaffold существует, но его выполнение как отдельного target не сконфигурировано и не проверялось.

## 4. Frontend Audit

**Статус: ⚠️**

### Архитектура

- Angular 19, standalone lazy-loaded components и OnPush используются.
- Feature-структура есть внутри application (`features/arrival`, `cars`, `home`, `tasks`).
- Auth корректно разделён на `feature-login` и `data-access` libraries.
- Общих `core` и `shared` layers, заявленных README, нет.
- Layout находится непосредственно в application.
- Глобальное состояние отсутствует; auth state хранится Signals. NgRx не используется.
- Доменные data-access libraries/services для Cars, Arrivals, Tasks и Dashboard отсутствуют.

### UI

- Собственная UI library реально существует и содержит 11 компонентов.
- Login и часть Arrival UI используют библиотечные компоненты.
- Доменные страницы Cars/Home/Tasks являются пустыми component classes с шаблонами-заготовками.
- В `ArrivalInterface` нет полей.
- UI foundation и responsive layout визуально представлены кодом, но функциональная готовность экранов к backend integration ограничена auth.

### Соответствие backend API

- Proxy `/api` → `http://localhost:3000` с удалением prefix соответствует backend без global prefix.
- Login frontend ожидает `{ accessToken, user }`, что соответствует форме ответа controller.
- Refresh frontend ожидает только `{ accessToken }`; backend также возвращает `user`. Это совместимо на уровне TypeScript structural parsing, но frontend игнорирует user и затем вызывает `/me`.
- Frontend `AuthUser.role: string` и `isAdmin === 'ADMIN'` соответствуют legacy Auth, но не текущему enum Schema (`SYSTEM_OWNER`, `OPERATIONS_MANAGER`, `TECHNICIAN`, `VIEWER`) и relation roles.
- Frontend использует `/api/auth/*`; другие backend endpoints не вызываются.
- Модели Cars и Arrivals на frontend отсутствуют/пусты, поэтому их соответствие API подтвердить нельзя.
- Готовы к подключению: router shell, auth interceptor/refresh coordination, auth/guest guards, login form и UI components.
- Не готовы к подключению без определения контрактов: Cars, Arrival, Tasks, Dashboard.

### Build и тестовая инфраструктура

- Nx обнаруживает проект `frontend`, но `nx build frontend` сообщает, что target `frontend:build` не сконфигурирован.
- Root `package.json` не содержит scripts, включая заявленные README `serve:backend`, `serve:frontend` и `dev`.
- Frontend имеет отдельные `package.json` и `package-lock.json`, тогда как backend dependencies находятся в root; workspace dependency strategy неоднородна.
- Frontend component specs существуют, но рабочий Nx test target не подтверждён.

## 5. Documentation Audit

| Файл | Состояние | Проблемы |
|---|---|---|
| `README.md` | ⚠️ Частично актуален | Неверная `libs`-структура; перечисляет отсутствующие документы; заявляет root scripts, которых нет; заявляет working parts без указания, что backend не компилируется; Markdown code fence в разделе запуска не закрыт. |
| `docs/AGENTS.md` | ⚠️ Частично актуален | Source-of-truth и общие правила полезны, но ссылается на отсутствующие документы; code fence после примера методов не закрыт; требование DTO/тестов/Prisma-only-in-service фактически нарушено текущим кодом. |
| `docs/ROADMAP.md` | ❌ Не соответствует прогрессу | Arrivals и Auth отмечены существенно более готовыми, чем код; “новая Prisma Schema” есть, но migrations отсутствуют; Cars read/battery foundation существуют, однако весь module не компилируется; frontend уже имеет login/layout/UI, хотя roadmap представляет frontend почти полностью будущим этапом. |
| `docs/DECISIONS.md` | ❌ Есть конфликты со Schema | ADR-003 требует `Car.modelId`, но Schema хранит `brand`/`model` strings; ADR-004 требует Arrival entity, которой нет; ADR-005 требует Brand/CarModel/Color tables, которых нет в Schema; ADR-006 сформулирован как “один сервис — одна операция”, но фактические сервисы объединяют операции. |
| `docs/AI_TASKS.md` | ❌ Не соответствует фактам | Arrivals помечен зелёным с company scope/tests, но реализация scope не содержит и tests fail; Cars migration описана как основная, но Auth/Dashboard/seed/migrations также блокируют compile; документ требует обновлять себя после каждой задачи, что конфликтует с текущим требованием изменить только audit file. |
| `docs/ARCHITECTURE.md` | ❌ Отсутствует | Архитектурное описание распределено между README, AGENTS и DECISIONS. |
| `docs/DOMAIN.md` | ❌ Отсутствует | Нет единого актуального описания домена текущей Schema. |
| `docs/BUSINESS_RULES.md` | ❌ Отсутствует | Source-of-truth ссылается на несуществующий документ; PSO, battery tasks и issue rules не определены. |
| `docs/DATABASE.md` | ❌ Отсутствует | Нет описания разрыва Schema/migrations и способа развёртывания БД. |
| `docs/API.md` | ❌ Отсутствует | Нет зафиксированных API-контрактов; Swagger неполон. |
| `docs/ROLES.md` | ❌ Отсутствует | Нет описания role model и permissions; код и Schema используют разные role contracts. |
| `docs/README.md` | ❌ Отсутствует | Root README утверждает, что файл входит в структуру docs. |

### Зафиксированные расхождения

**Документ:** README  
**Факт:** root scripts отсутствуют; `frontend:build` target не работает; backend не компилируется.  
**Проблема:** инструкции запуска и текущий статус не воспроизводимы.  
**Рекомендация:** после стабилизации toolchain проверить и документировать только реально выполняющиеся команды.

**Документ:** AGENTS  
**Факт:** `BUSINESS_RULES.md` отсутствует, а Prisma entities/legacy code используются как API contracts.  
**Проблема:** заявленный source-of-truth и development process невозможно соблюдать полностью.  
**Рекомендация:** после выбора актуальной доменной модели синхронизировать набор обязательных документов и правила с реальным workflow.

**Документ:** ROADMAP  
**Факт:** Arrivals не соответствует Schema, Auth не компилируется, migrations не соответствуют Schema.  
**Проблема:** статусы “выполнено/почти завершено” завышают фактическую готовность.  
**Рекомендация:** после устранения compile/migration blockers повторно оценить прогресс по проверяемым критериям.

**Документ:** DECISIONS  
**Факт:** ADR-003/004/005 противоречат текущей Schema.  
**Проблема:** невозможно одновременно следовать Schema как источнику истины и принятым ADR.  
**Рекомендация:** принять явное решение, какая доменная модель является целевой, затем supersede или подтвердить конфликтующие ADR.

**Документ:** AI_TASKS  
**Факт:** тесты не зелёные; Arrivals company/location scope отсутствует в реализации.  
**Проблема:** tracker не даёт достоверной картины завершённости.  
**Рекомендация:** обновлять статусы только после compile/test и проверки API contract.

## 6. Найденные проблемы

### 🔴 Critical

1. Backend не компилируется против текущего Prisma Client.
2. Репозиторий не содержит migration от legacy database schema к текущей Prisma Schema.
3. ArrivalsModule целиком зависит от отсутствующей в Schema модели `Arrival` и legacy-справочников.
4. CarsModule содержит три мигрированные ветки и три legacy workflows в одном сервисе; legacy-код блокирует компиляцию всего модуля.
5. Auth использует отсутствующее scalar-поле `User.role` и login lookup, несовместимый с compound unique `(companyId, username)`.
6. Dashboard полностью использует удалённые Car fields и enum.
7. Backend test target падает: 6 из 7 suites не запускаются/не компилируются; Jest несовместим с ESM output текущего Prisma Client.
8. Незащищённые endpoints `GET /cars/tasks`, `POST /cars/:id/pso`, `POST /cars/:id/issue` и Dashboard не имеют auth/company/location scope.
9. Prisma seed импортирует старый `@prisma/client` contract и не компилируется.
10. Целевая доменная модель не согласована: Schema противоречит ADR о CarModel/Brand/Color и Arrival.

### 🟡 Warning

1. Swagger подключён, но response schemas неполны и документируются неработающие endpoints.
2. Auth refresh без cookie возвращает HTTP 200 с телом, имитирующим 401.
3. JWT scope содержит legacy single role, не содержит company/location и не перепроверяет active user.
4. Frontend Nx build/test targets не работают или не подтверждены; Angular config расположен/настроен неоднозначно.
5. Root README launch scripts отсутствуют.
6. Frontend и root содержат отдельные dependency manifests/lockfiles.
7. Frontend domain screens не имеют API services/models; Arrival model пуст.
8. Dashboard tests отсутствуют; controller tests Auth отсутствуют; отдельный e2e target не подтверждён.
9. Documentation set неполон; README/AGENTS содержат незакрытые Markdown code fences.
10. Нет Nx tags/module-boundary policy.
11. Actual database migration status и drift не удалось подтвердить.
12. Global validation не запрещает явно лишние поля (`forbidNonWhitelisted` не включён).

### 🟢 Improvement

1. После выбора целевой модели зафиксировать один canonical Prisma import path для backend, seed и tests.
2. После стабилизации API выделить frontend data-access libraries и typed contracts для Cars, Arrivals, Dashboard и Tasks.
3. Добавить typed Swagger response/error DTO для всех endpoints.
4. Добавить единый declarative access-control подход для auth, company, locations и roles.
5. Ввести Nx tags и dependency constraints между app/feature/data-access/ui.
6. После восстановления build targets добавить воспроизводимую CI-последовательность validate → generate/check → build → test.
7. Устранить дублирование загрузки user scope в трёх Cars methods после завершения функциональной миграции.

## 7. Рекомендованный порядок действий

1. Принять и документально подтвердить целевую доменную модель: отдельно решить Arrival, Brand/CarModel/Color и role representation; не продолжать endpoint development до разрешения конфликтов Schema/ADR.
2. Создать корректный migration path и seed для подтверждённой Schema, затем проверить schema/migration drift на тестовой PostgreSQL базе.
3. Вернуть backend в компилируемое состояние по модулям: Auth → Arrivals → Cars legacy workflows → Dashboard, сохраняя company/location scope.
4. Согласовать Jest/TypeScript с Prisma 7 generated ESM client и добиться зелёного `nx test backend`; добавить недостающие security/contract tests.
5. Восстановить Nx frontend build/test targets и root launch commands; только после стабильного API подключать доменные frontend data-access слои.
6. После подтверждения кодом и тестами синхронизировать README, ROADMAP, DECISIONS, AI_TASKS и отсутствующую доменную/API документацию.
