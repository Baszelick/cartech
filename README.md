# CarTech

> Внутренняя система управления автомобильной площадкой дилерского центра.

CarTech автоматизирует процессы работы с автомобилями: приёмка, хранение, предпродажная подготовка, контроль аккумуляторов, выдача автомобилей и аналитика склада.

Проект построен как Nx monorepo с архитектурой, приближенной к реальным Enterprise-приложениям.

---

## Требования

| Инструмент | Версия |
|---|---|
| Node.js | `22.14.x` (см. `.nvmrc`, `.node-version`) |
| npm | `10.9.x` (см. `packageManager` в `package.json`) |

Установка на новой машине зависит только от:

- Git-репозитория;
- закоммиченного `package-lock.json`;
- версии Node.js/npm, указанной в репозитории;
- локального файла `.env`.

Локальные кеши, старый `node_modules` и настройки IDE не являются источником истины.

---

## Быстрый старт

### Первый запуск на новом компьютере

Рекомендованный сценарий в Windows PowerShell:

```powershell
git clone https://github.com/Baszelick/cartech.git
cd cartech
```

Установите версию Node.js из `.nvmrc` (например, с помощью nvm-windows или другого менеджера версий), затем проверьте:

```powershell
node --version
npm --version
```

Создайте локальный `.env` из шаблона:

```powershell
Copy-Item .env.example .env
```

Заполните локальные секреты вручную (не коммитьте `.env`).

Установите зависимости и запустите проект:

```powershell
npm ci
npm run setup:check
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run dev
```

Адреса после запуска:

- Frontend: http://127.0.0.1:4200
- Backend: http://127.0.0.1:3000
- Swagger: http://127.0.0.1:3000/api/docs

### Обычное обновление проекта

```powershell
git pull
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run dev
```

### Добавление зависимости

```powershell
npm install <package>
# или
npm install -D <package>
```

После изменения зависимостей обязательно закоммитьте оба файла: `package.json` и `package-lock.json`.

---

## npm ci и npm install

- `npm ci` — установка строго по `package-lock.json`. Используется на чистой или обновляемой машине.
- `npm install` — установка с пересчётом дерева зависимостей. Используется только при сознательном изменении зависимостей.

Соглашения:

| Артефакт | Статус |
|---|---|
| `package-lock.json` | обязательно коммитится |
| `.env` | не коммитится |
| `.env.example` | коммитится |
| `node_modules` | не коммитится |
| `.nx/cache/` | не коммитится |
| `.nx/workspace-data/` | не коммитится |

---

## Скрипты

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск backend и frontend параллельно |
| `npm run serve:backend` | Запуск backend в dev-режиме |
| `npm run serve:frontend` | Запуск frontend в dev-режиме |
| `npm run build` | Сборка backend и frontend |
| `npm run test` | Запуск тестов backend и frontend |
| `npm run lint` | Линтинг backend и frontend |
| `npm run prisma:generate` | Генерация Prisma Client |
| `npm run prisma:validate` | Валидация Prisma Schema |
| `npm run prisma:migrate` | Создание и применение миграции в dev |
| `npm run prisma:deploy` | Применение миграций на окружении |
| `npm run prisma:studio` | Открытие Prisma Studio |
| `npm run seed` | Заполнение базы тестовыми данными |
| `npm run setup:check` | Проверка окружения (Node/npm/.env) |
| `npm run verify:deps` | Проверка дерева зависимостей верхнего уровня |
| `npm run verify` | Полная проверка: lint, test, build |

---

## Технологический стек

### Frontend

- Angular 20.3
- TypeScript 5.8
- Standalone Components
- Signals
- RxJS 7
- SCSS
- Angular CDK

### Backend

- NestJS 11
- Prisma 7
- PostgreSQL
- JWT Authentication (access/refresh, HttpOnly cookie)

### Инструменты

- Nx 23
- ESLint 9
- Prettier
- Git
- GitHub

---

## Структура проекта

```text
apps/
├── backend/                  NestJS application
│   └── src/
│       ├── auth/             login, refresh, roles, password policy
│       ├── arrivals/         приёмка автомобилей
│       ├── battery/          контроль аккумуляторов
│       ├── cars/             автомобили
│       ├── company/          компании
│       ├── dashboard/        аналитика
│       ├── locations/        локации и площадки
│       ├── users/            пользователи, роли, доступ к локациям
│       └── prisma/           подключение к базе
└── frontend/                 Angular application
    └── src/app/              shell, маршрутизация, конфигурация

libs/
├── admin/feature-admin/      заготовка администрирования
├── arrivals/feature-arrival/ экран приёмки
├── auth/
│   ├── data-access/          HTTP-клиент, интерфейсы, guards, interceptors
│   └── feature-login/        login-форма и login-страница
├── cars/feature-list/        экран списка автомобилей
├── dashboard/feature-home/   домашний экран
├── frontend/ui/              UI-библиотека (button, input, select, tabs и др.)
├── shell/feature-layout/     layout: sidebar, header, navigation
└── tasks/feature-tasks/      экран задач
```

---

## Документация

Документация находится в директории `docs/`:

- `ARCHITECTURE.md` — архитектура проекта
- `BUSINESS_RULES.md` — бизнес-правила
- `DATABASE.md` — модель данных
- `DECISIONS.md` — принятые архитектурные решения
- `ROADMAP.md` — план развития
- `PROJECT_AUDIT.md` — аудит состояния проекта
- `AI_TASKS.md` — задачи для AI-ассистентов
- `AGENTS.md` — инструкции для агентов

---

## Текущий статус

Статус согласно актуальному `docs/ROADMAP.md`:

- Prisma migrations: применение на тестовой PostgreSQL подтверждено.
- Backend: сборка и запуск проходят.
- Backend tests: проходят.
- Swagger: `/api/docs` отвечает HTTP 200.
- Frontend: foundation (Angular, Auth/Shell библиотеки, сборка, тесты, линтинг) подтверждён; доменные экраны пока не подключены к API.

---

## Лицензия

Проект создан в образовательных целях.
