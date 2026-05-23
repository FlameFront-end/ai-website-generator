# AI Website Generator

Сервис, который по текстовому брифу генерирует готовый фронтенд-проект: от визуального стиля и референсных изображений до собранного кода с автоматической проверкой.

## Что делает

Пользователь описывает сайт текстом. Система проводит его через пайплайн:

1. **Кларификация брифа** — AI задаёт уточняющие вопросы, формирует финальный бриф
2. **Варианты стилистик** — генерация нескольких визуальных направлений с превью-картинками, пользователь выбирает одно
3. **Референсные изображения** — посекционная генерация визуала выбранного стиля
4. **Кодогенерация** — split-подход: план → контент → лейаут → секции, с валидацией и авторепейром на каждом этапе
5. **Сборка и починка** — `next build`, при ошибке AI получает лог и правит код (до 3 попыток)
6. **Скриншоты и визуальный QA** — Playwright делает скриншоты desktop/mobile, отчёт сравнения с референсом

На каждом шаге сохраняются артефакты (JSON, изображения, код, логи). Есть точки ожидания, где пользователь подтверждает результат или откатывает назад.

## Структура

```
├── app/
│   ├── client/          # React 19, Vite, TypeScript, SCSS Modules
│   └── server/          # NestJS, TypeORM, PostgreSQL, Redis
├── docker-compose.yml   # Postgres, Redis, server, client
└── package.json         # npm workspaces
```

**Серверные модули** (`app/server/src/modules/`):

- `ai/` — провайдеры LLM, промпты, skills registry, summary-билдеры
- `pipeline/` — оркестрация пайплайна: билд, скриншоты, visual QA
- `code-generator/` — split-кодогенерация и скаффолдинг проекта
- `runs/` — CRUD запусков, REST API
- `auth/` — JWT-аутентификация
- `images/` — генерация изображений (Replicate, OpenAI)
- `storage/` — файловое хранилище артефактов

## Требования

- Node.js 22+
- Docker и Docker Compose
- Один из AI-провайдеров: [LM Studio](https://lmstudio.ai/) (локально), OpenAI, OpenRouter

## Локальный запуск

```bash
cp .env.example .env
# отредактировать .env — как минимум настроить AI-провайдер

docker compose up -d          # postgres + redis
npm install
npm run dev:server            # http://localhost:3000
npm run dev:client            # http://localhost:5173
```

## Конфигурация AI

В `.env` три независимых слота для разных моделей:

| Слот            | Назначение                 | Переменные                                    |
| --------------- | -------------------------- | --------------------------------------------- |
| `AI_ANALYSIS_*` | Бриф, спека, дизайн-токены | `AI_ANALYSIS_PROVIDER`, `_BASE_URL`, `_MODEL` |
| `AI_CODE_*`     | Кодогенерация и репейр     | `AI_CODE_PROVIDER`, `_BASE_URL`, `_MODEL`     |
| `AI_IMAGE_*`    | Генерация картинок         | `AI_IMAGE_PROVIDER`, `_BASE_URL`, `_MODEL`    |

Поддерживаемые провайдеры: `lmstudio`, `openai`, `openrouter`, `llm7`.
Для изображений: `replicate`, `openai` (DALL-E через gateway).

По умолчанию всё смотрит на LM Studio (`http://localhost:1234/v1`).

## Скрипты

```bash
npm run dev:client        # vite dev server
npm run dev:server        # nest --watch
npm run build             # собрать клиент и сервер
npm run lint:client       # eslint клиент
npm run lint:server       # eslint сервер
```

## CI/CD

**CI** (GitHub Actions на push/PR в `main`):

- Lint и typecheck для клиента и сервера
- Тесты клиента
- Проверка размера бандла (лимит 512 KB)
- Smoke-test сборки Docker-образов

**Deploy** (push в `main`):

- Сборка и пуш образов в GHCR
- Деплой на сервер через SSH + `docker compose up -d`

## Docker

Полный запуск всех сервисов:

```bash
docker compose up -d
```

Контейнеры: `postgres`, `redis`, `server`, `client`. Порты и креды настраиваются через `.env`.
