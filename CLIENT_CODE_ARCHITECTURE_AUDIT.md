# Client Code And Architecture Audit

Дата аудита: 2026-05-23
Область: `app/client`
Цель: довести фронтенд до качества демо-проекта для откликов.

## Проверки

- `npm run lint --workspace app/client` - проходит.
- `npm run build --workspace app/client` - проходит.
- Автотесты не запускались: в `app/client/package.json` нет `test`-скрипта и в клиенте не найдены `*.test.ts(x)` / `*.spec.ts(x)`.

## Критичные проблемы

### 1. TypeScript не включен в strict-режиме

Файл: `app/client/tsconfig.app.json`

В `compilerOptions` нет `"strict": true`, хотя проект позиционируется как TypeScript-клиент и в глобальных правилах явно требуется strict mode. Сейчас включены отдельные проверки (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`), но отсутствует полный набор строгих проверок nullability, function types, indexed access и связанных edge-case.

Почему это важно:

- демо-проект с нестрогим TypeScript выглядит слабее на code review;
- часть проблем с API-ответами и nullable-состояниями будет обнаруживаться только в runtime;
- текущие type assertions после `JSON.parse` создают ложное ощущение типобезопасности.

Рекомендация:

- включить `"strict": true`;
- отдельно рассмотреть `"noUncheckedIndexedAccess": true` и `"exactOptionalPropertyTypes": true`;
- исправить всплывшие ошибки точечно, без массовых `as`.

### 2. Нет тестовой стратегии для ключевых пользовательских сценариев

Файл: `app/client/package.json:6`

Есть только `dev`, `build`, `lint`. Для проекта, который демонстрирует качество кода, отсутствие тестов является заметным архитектурным пробелом.

Минимальный набор:

- unit-тесты для чистой логики: `brief-drafts`, `run-title`, `brief-display`, `RunDetails/utils`, доступность табов;
- component-тесты для auth forms, modal, file tree, run cards;
- e2e smoke: login/register, создание проекта из брифа, открытие run details, выбор стиля, скачивание кода;
- mock API-контрактов через MSW или аналогичный слой.

### 3. Auth хранит access token в `localStorage` и управляет редиректами из axios interceptor

Файлы:

- `app/client/src/shared/lib/auth/auth.context.tsx:11`
- `app/client/src/shared/lib/auth/auth.context.tsx:26`
- `app/client/src/shared/api/axiosInstance.ts:15`
- `app/client/src/shared/api/axiosInstance.ts:27`
- `app/client/src/shared/api/axiosInstance.ts:29`

Проблемы:

- access token в `localStorage` доступен любому XSS;
- axios interceptor напрямую пишет в `window.location.href`, минуя React Router и состояние приложения;
- при `401` нет единого logout-flow, отмены/сброса query cache и сохранения intended route;
- `readStoredUser` делает `JSON.parse(stored) as User` без runtime-валидации.

Рекомендация:

- если backend позволяет, перейти на httpOnly cookie/session;
- если bearer token обязателен, изолировать token storage behind interface и явно задокументировать риск;
- заменить hard redirect на auth event / logout service, который чистит auth state и query cache;
- валидировать shape пользователя на границе storage/API.

## Высокий приоритет

### 4. API-контракты типизированы только compile-time, но не валидируются на runtime

Файлы:

- `app/client/src/shared/api/services/runs/types.ts:1`
- `app/client/src/shared/api/services/runs/runs.api.ts`
- `app/client/src/features/runs/pages/RunDetails/tabs/StyleTab.tsx:70`
- `app/client/src/features/runs/pages/RunDetails/tabs/StyleTab.tsx:80`

Сейчас axios generic-и и `JSON.parse(...) as ...` предполагают, что backend всегда вернет корректный контракт. Например, `parseVariants` возвращает `parsed.variants ?? []`, но не проверяет типы полей, а `variant.colorPalette.map(...)` упадет, если API вернет не массив.

Рекомендация:

- добавить schema validation на границах API/storage для критичных DTO;
- начать с `Run`, `ClarifyBriefResponse`, `StyleVariantsResponse`, `User`;
- не проглатывать parse errors молча: показывать fallback и логировать диагностический контекст на boundary.

### 5. Большие page-компоненты смешивают UI, бизнес-логику, storage и API orchestration

Файлы:

- `app/client/src/features/runs/pages/RunsList/runs-list.page.tsx:45`
- `app/client/src/features/runs/pages/NewRun/new-run.page.tsx:76`
- `app/client/src/features/runs/pages/RunDetails/run-details.page.tsx:65`

`RunsListPage` содержит фильтрацию, сортировку, pinning черновиков, rename/delete flows, storage helpers и JSX карточек. `NewRunDraftPage` содержит wizard state machine, draft persistence, API orchestration, rendering разных типов вопросов и сборку финального prompt. Это ухудшает читаемость и тестируемость.

Рекомендация:

- вынести чистую доменную логику в `lib` и покрыть тестами;
- вынести orchestration в feature hooks: `useRunCards`, `useBriefWizard`, `useDraftPersistence`;
- оставить page-компоненты как composition layer.

### 6. Доступность нарушается из-за интерактивных `span/div role="button"` и вложенной интерактивности

Файлы:

- `app/client/src/features/runs/pages/RunsList/runs-list.page.tsx:218`
- `app/client/src/features/runs/pages/RunsList/runs-list.page.tsx:243`
- `app/client/src/features/runs/pages/RunsList/runs-list.page.tsx:274`
- `app/client/src/features/runs/pages/RunsList/runs-list.page.tsx:293`
- `app/client/src/features/runs/pages/RunDetails/components/RunTabs.tsx:45`
- `app/client/src/features/runs/pages/RunDetails/components/RunTabs.tsx:60`

Карточки и действия реализованы через `div/span role="button"`. В `RunTabs` интерактивный `span` с подтверждением вложен внутрь `button`. Это риск для keyboard navigation, screen readers и валидности HTML.

Рекомендация:

- карточку сделать ссылкой или отдельной кнопкой с соседними native `button` actions;
- в табах разделить tab button и approve button на sibling-элементы;
- добавить `aria-current` / корректные tab semantics, если это именно tabs.

### 7. Object URL создается без lifecycle cleanup

Файл: `app/client/src/shared/api/services/runs/hooks.ts:56`

`useArtifactFileUrl` создает `window.URL.createObjectURL(query.data)` через `useMemo`, но не вызывает `URL.revokeObjectURL` при смене blob или unmount. Для галерей и артефактов это может накапливать memory leaks.

Рекомендация:

- заменить на `useEffect + useState`;
- revoke previous URL в cleanup;
- добавить тест на cleanup через mock `URL.revokeObjectURL`.

### 8. Маршруты и API endpoints не всегда кодируют path-параметры

Файлы:

- `app/client/src/shared/model/routes.ts:19`
- `app/client/src/shared/model/routes.ts:28`
- `app/client/src/shared/api/services/runs/runs.api.ts:124`
- `app/client/src/shared/api/services/runs/runs.api.ts:129`
- `app/client/src/shared/api/services/runs/runs.api.ts:149`

Есть `artifactFileEncoded`, но остальные endpoints используют raw `runId`/`artifactId`. Если идентификатор или путь содержит `/`, `?`, `#` или пробелы, URL может сломаться. Для `codeFile` path передается через `params`, это лучше; такой же подход нужен везде.

Рекомендация:

- централизовать builders для route/API params;
- кодировать все path segments через `encodeURIComponent`;
- добавить тесты на специальные символы.

## Средний приоритет

### 9. Состояния pipeline описаны строками в нескольких местах и уже расходятся

Файлы:

- `app/client/src/shared/api/services/runs/types.ts:1`
- `app/client/src/features/runs/pages/RunDetails/constants.ts`
- `app/client/src/features/runs/pages/RunDetails/run-details.page.tsx:28`

`pipeline_failed` используется в UI (`RESTARTABLE_STATUSES`, `getEffectiveCurrentStep`, `STEP_LABELS`), но отсутствует в `RunStatus`. Это признак дрейфа контракта backend/frontend.

Рекомендация:

- держать единую таблицу статусов и шагов;
- генерировать типы из OpenAPI/contract schema или хотя бы иметь один source of truth;
- добавить exhaustiveness checks для status-to-label/action mappings.

### 10. Ошибки часто логируются через `console.error` внутри UI flow

Файлы:

- `app/client/src/features/auth/hooks/useAuthForm.ts:51`
- `app/client/src/features/runs/pages/NewRun/new-run.page.tsx:177`
- `app/client/src/features/runs/pages/RunDetails/run-details.page.tsx:75`

Для демо это выглядит как временный код. В продакшен-клиенте нужна единая политика diagnostics: что показываем пользователю, что логируем, какие поля безопасно прикладывать.

Рекомендация:

- добавить маленький `logger` / `reportClientError` boundary;
- логировать context без секретов;
- не дублировать логирование там, где ошибка уже обработана boundary-слоем.

### 11. Конфигурация окружения не валидируется

Файл: `app/client/src/shared/model/config.ts:1`

`VITE_API_URL` берется как строка с fallback на localhost. Это удобно для dev, но в демо/production может скрыть misconfiguration: сборка пройдет, а клиент пойдет в локальный backend.

Рекомендация:

- валидировать env при старте приложения;
- явно различать dev fallback и production requirement;
- проверить URL через `new URL(...)`.

### 12. ESLint-конфигурация слишком базовая для заявленной планки качества

Файл: `app/client/eslint.config.js:13`

Используются recommended configs, но нет правил, которые реально удерживают архитектурную планку:

- no floating promises для async flows;
- strict boolean expressions;
- consistent type imports;
- accessibility rules для JSX;
- import boundaries для `app/features/shared`;
- запрет deep imports между feature layers.

Рекомендация:

- добавить `typescript-eslint` type-aware config;
- добавить `eslint-plugin-jsx-a11y`;
- добавить boundaries/import rules под выбранную архитектуру.

### 13. Storage helpers проглатывают поврежденные данные без диагностики

Файлы:

- `app/client/src/features/runs/lib/brief-drafts.ts:60`
- `app/client/src/features/runs/lib/brief-drafts.ts:90`
- `app/client/src/shared/lib/auth/auth.context.tsx:14`

Сейчас corrupted storage просто удаляется или игнорируется. Для пользовательских черновиков это может означать потерю данных без объяснения.

Рекомендация:

- валидировать payload;
- при восстановимой ошибке показывать пользователю понятное сообщение;
- сохранять backup при миграции legacy draft, если payload частично читается.

### 14. Modal не завершен как доступный UI primitive

Файл: `app/client/src/shared/kit/UI/Modal/index.tsx:59`

Есть `role="dialog"` и `aria-modal`, но нет `aria-labelledby`, focus trap, возврата фокуса на trigger, обработки stacked modals и сохранения предыдущего `body.style.overflow`.

Рекомендация:

- либо доработать primitive;
- либо использовать проверенный headless-dialog primitive, если dependency budget позволяет.

## Архитектурные наблюдения

- В проекте просматривается feature/shared структура, но правила границ не зафиксированы и не проверяются линтером.
- Есть deep imports из feature pages в shared API implementation (`@/shared/api/services/runs/runs.api`), хотя рядом уже существует public alias `@/api/services/runs`.
- В `app/client` есть отдельный `package-lock.json` при workspace root lockfile. Для npm workspaces лучше оставить один lockfile в корне, иначе зависимости и CI могут расходиться.
- В `src/assets` остались starter assets (`react.svg`, `vite.svg`). Для демо-проекта это стоит удалить, если они не используются.

## Рекомендуемый порядок исправления

1. ~~Включить strict TypeScript и привести типы к честному состоянию.~~ ✅ Выполнено — `strict: true` включён, 0 ошибок.
2. ~~Добавить тестовый стек и покрыть чистую логику runs/brief/auth.~~ ✅ Выполнено — Vitest, 59 тестов для brief-drafts, brief-display, run-title, RunDetails/utils, isTabAvailable.
3. ~~Нормализовать auth flow и избавиться от hard redirect в axios interceptor.~~ ✅ Выполнено — event-based auth error bridge, `queryClient.clear()` при logout, runtime-валидация User из storage, убраны hardcoded ключи и `window.location.href`.
4. ~~Ввести runtime validation для API/storage boundary.~~ ✅ Выполнено — type guards для User, StyleVariant, StyleVariantsResponse, ClarifyBriefResponse, Run, RunArtifact + `parseJsonSafe` helper; применены в StyleTab и auth storage; 20 тестов.
5. ~~Разрезать большие page-компоненты на hooks/components/lib.~~ ✅ Выполнено — RunsList 669→129 строк (DraftCard, RunCard, ProjectCardSkeleton, useRunCards, runs-list-helpers); NewRun 633→163 строк (useBriefWizard, QuestionRenderer, AnswerHistory, FinalBriefSection, brief-wizard); удалены starter assets (react.svg, vite.svg).
6. Исправить accessibility: native controls, modal, tabs/cards.
7. Усилить ESLint type-aware и architecture boundary rules.
8. Почистить package/workspace артефакты и starter assets.
