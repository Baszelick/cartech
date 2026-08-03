# CarTech Architecture

Дата актуализации: 2026-08-02.

## Nx workspace

CarTech организован как Nx monorepo. Приложения находятся в `apps/`, повторно используемый frontend-код — в `libs/`.

Единым источником npm dependencies и lock history являются корневые `package.json` и `package-lock.json`. Отдельные frontend manifest и локальный `apps/frontend/node_modules` не используются.

Текущая frontend-структура:

```text
apps/
  frontend/                  # composition root, providers и маршруты

libs/
  auth/
    data-access/             # AuthService, interceptor, guards и auth contracts
    feature-login/           # login page и login form

  shell/
    feature-layout/          # Shell, Sidebar, Header, Control Center и LayoutService

  dashboard/
    feature-home/            # entry point домашней страницы Dashboard

  cars/
    feature-list/            # entry point списка автомобилей

  arrivals/
    feature-arrival/         # страница приёмки и связанные компоненты

  tasks/
    feature-tasks/           # entry point задач

  frontend/
    ui/                      # общий UI kit; физическое имя сохранено
```

Пустые библиотеки будущих доменов не создаются. Cars, Arrivals, Tasks, Dashboard и другие домены выделяются только вместе с реальным frontend-функционалом.

## Границы библиотек

Nx projects используют tags `scope:*` и `type:*`:

| Project | Tags |
|---|---|
| `auth-data-access` | `scope:auth`, `type:data-access` |
| `auth-feature-login` | `scope:auth`, `type:feature` |
| `shell-feature-layout` | `scope:shell`, `type:feature` |
| `dashboard-feature-home` | `scope:dashboard`, `type:feature` |
| `cars-feature-list` | `scope:cars`, `type:feature` |
| `arrivals-feature-arrival` | `scope:arrivals`, `type:feature` |
| `tasks-feature-tasks` | `scope:tasks`, `type:feature` |
| `ui` | `scope:shared`, `type:ui` |
| `frontend` | `type:app` |

Допустимое направление зависимостей:

```text
frontend
  ├─> shell/feature-layout
  ├─> auth/feature-login
  ├─> auth/data-access
  ├─> dashboard/feature-home
  ├─> cars/feature-list
  ├─> arrivals/feature-arrival
  ├─> tasks/feature-tasks
  └─> frontend/ui

shell/feature-layout
  ├─> auth/data-access
  └─> frontend/ui

auth/feature-login
  ├─> auth/data-access
  └─> frontend/ui
```

Импорты между Nx projects выполняются только через публичные aliases:

- `@cartech/auth/data-access`;
- `@cartech/auth/feature-login`;
- `@cartech/shell/feature-layout`;
- `@cartech/dashboard/feature-home`;
- `@cartech/cars/feature-list`;
- `@cartech/arrivals/feature-arrival`;
- `@cartech/tasks/feature-tasks`;
- `@cartech/frontend/ui`.

Deep imports во внутренние `src/lib` других библиотек не допускаются. Ограничения контролируются `@nx/enforce-module-boundaries`.

## Application composition

`apps/frontend` отвечает за:

- запуск Angular application;
- глобальные providers;
- HTTP interceptor registration;
- маршрутизацию;
- подключение Shell и feature entry points через публичные API.

AuthService остаётся единым сервисом в `libs/auth/data-access`. Разделение HTTP API, session state и facade на текущем этапе не выполняется.

Shell целиком находится в `libs/shell/feature-layout`. `LayoutService` является shell-specific сервисом и предоставляет только подтверждённый контракт:

- `sidebarCollapsed`, начальное значение `false`;
- `sidebarOpened`, начальное значение `true`;
- `dashboardOpened`, начальное значение `true`;
- `isMobile`, синхронизированный с `window.matchMedia('(max-width: 768px)')`;
- `toggleSidebar()`, изменяющий только `sidebarCollapsed`.

Desktop grid продолжает резервировать колонку Control Center согласно существующим стилям. Изменение этого поведения не входит в текущую архитектурную подготовку.

## UI kit

UI kit физически остаётся в `libs/frontend/ui` и сохраняет alias `@cartech/frontend/ui`. Он логически классифицирован как shared UI через `scope:shared` и `type:ui`. Публичный API, внешний вид и поведение компонентов не изменялись.

Физическое переименование в `libs/shared/ui` возможно отдельной необязательной задачей.

## Текущее состояние проверки

- Nx распознаёт все frontend projects.
- Nx graph строится; циклические зависимости и deep imports не обнаружены.
- Корневое frontend-окружение использует Angular framework `20.3.27`, Angular CLI/build tooling `20.3.32`, CDK `20.2.14`, TypeScript `5.8.3` и Nx `23.1.0`.
- Все frontend и library lint targets проходят, включая UI kit.
- Frontend production build проходит; lazy Login и Shell entry points разрешаются через public aliases.
- Karma/ChromeHeadless: 7 тестов проходят.
- Nx serve запускается на `http://127.0.0.1:4200`; `/login` подтверждён по HTTP 200, после smoke-проверки порт освобождается.
- Backend Jest/build, Prisma validate и TypeScript check seed проходят на общем TypeScript `5.8.3`.
