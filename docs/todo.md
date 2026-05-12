# Visual‑First AI Website Generator

## Подробный внутренний отчёт по идее, MVP и первому запуску

**Дата:** 11 мая 2026
**Формат:** внутренний документ для обсуждения между основателями
**Статус:** черновик стратегии и MVP, не юридическая консультация

---

## 0. Короткое резюме

Мы хотим сделать AI‑сервис для генерации сайтов, где пользователь сначала получает **визуальный дизайн сайта как изображение**, утверждает его, редактирует через AI, а потом получает **рабочий frontend‑код**, максимально похожий на выбранный дизайн.

Ключевая идея:

```text
Бриф пользователя
→ AI генерирует красивые изображения сайта по блокам
→ пользователь выбирает/редактирует дизайн
→ система создаёт DESIGN.md, tokens, design-spec
→ AI генерирует frontend-код
→ система запускает сайт и делает screenshot
→ AI сравнивает screenshot с исходным дизайном
→ AI чинит визуальные расхождения
→ пользователь скачивает ZIP
```

Главное отличие от обычных AI website builders:

> Обычные сервисы часто идут напрямую “prompt → code” и дают generic‑результат.
> Мы идём “visual design → approved blocks → structured design system → code”.

Это делает продукт более дизайнерским, контролируемым и визуально продаваемым.

---

## 1. Что за сервис мы хотим сделать

### Рабочее определение

**Visual‑First AI Website Generator** — сервис, который генерирует красивые визуальные концепты сайтов, позволяет пользователю выбрать дизайн глазами, а потом превращает утверждённые изображения в код.

### Основное обещание

```text
Generate premium landing page visuals first.
Then export clean frontend code.
```

Или по‑русски:

> Сначала получи красивый визуальный дизайн лендинга.
> Потом преврати его в рабочий frontend‑код.

### Почему это отличается от “обычного AI-конструктора”

Многие AI‑сервисы сейчас делают:

```text
Промпт → сразу код
```

Проблема такого подхода:

- AI часто делает generic UI;
- нет сильной арт‑дирекции;
- пользователь не успевает утвердить визуальное направление;
- код может быть рабочим, но дизайн выглядит шаблонно;
- сложно объяснить AI “сделай красиво”, если нет визуального ориентира.

Наш подход:

```text
Промпт → visual direction → block images → user approval → code
```

Пользователь сначала видит, что именно он получит, а код уже строится вокруг выбранного визуала.

---

## 2. Почему идея выглядит перспективной

### 2.1. Workflow уже зарождается

В AI/dev/design‑сообществе уже появляется ручной workflow:

```text
GPT Image 2 / ChatGPT Images
→ UI/site mockup
→ Codex / Claude Code / Cursor
→ frontend
→ screenshot comparison
→ manual fixes
```

То есть люди уже начинают использовать image‑модель как “дизайнера”, а coding agent — как “фронтендера”.

### 2.2. Есть open-source ориентиры

Есть open-source наборы skills, например Taste Skill, где уже есть подходы вроде:

- imagegen frontend web;
- imagegen frontend mobile;
- image‑to‑code workflow;
- design taste frontend;
- brandkit;
- high‑end visual design.

Идея там похожая: сначала сделать сильный визуальный reference, потом использовать coding agent для реализации.

### 2.3. Есть концепция DESIGN.md

DESIGN.md — это markdown‑файл с дизайн‑системой для AI‑агента:

```text
colors
typography
spacing
radius
components
layout rules
brand voice
do / don't rules
responsive behavior
```

Это важно, потому что coding agent должен не просто смотреть на картинку, а понимать систему дизайна.

### 2.4. Главная возможность

Сейчас workflow есть, но он ручной и неудобный:

```text
генерируешь картинку в ChatGPT
скачиваешь
отправляешь в Codex
пишешь промпты
запускаешь код
делаешь screenshot
сравниваешь
просишь исправить
собираешь ZIP
```

Наша задача — превратить это в продукт:

```text
один сервис
один проект
один workflow
одна история версий
один ZIP на выходе
```

---

## 3. Что уже понятно

### Понятно по продукту

- Сервис должен быть visual‑first.
- Первый MVP лучше делать только под landing pages.
- Генерация должна идти по блокам.
- Код должен экспортироваться в ZIP.
- Нужно делать live preview.
- Нужна история проектов.
- Нужны credits/лимиты.
- Нужно оставить возможность будущих тарифов.

### Понятно по дизайну

- Главная ценность — качество визуального направления.
- Нужны design rules, чтобы не получать AI‑slop.
- Нужны style presets.
- Нужно разрешить пользователю редактировать блоки через AI.
- Нужно сохранять единый стиль между блоками.

### Понятно по технологии

- Нельзя делать просто “image → code”.
- Нужен промежуточный слой:
  - DESIGN.md;
  - design tokens;
  - design-spec.json;
  - asset-map.json.
- Нужен screenshot‑based QA.
- Нужен repair loop.
- Нужен build check.
- Нужен ZIP export.

### Понятно по MVP

Первый MVP должен доказывать одну вещь:

> Пользователь может получить красивый дизайн лендинга как изображение, а потом получить рабочий frontend‑код, визуально похожий на этот дизайн.

---

## 4. Что пока не понятно

### Технические неизвестные

- Насколько точно получится переносить изображение в код.
- Какая будет средняя visual match точность.
- Сколько repair loops нужно.
- Как стабильно делать assets.
- Как лучше делать mobile.
- Какой model routing будет оптимальным.
- Сколько будет стоить один полный лендинг.
- Нужно ли часть декоративных элементов оставлять картинками.
- Какой уровень сложности дизайна можно разрешать в MVP.

### Продуктовые неизвестные

- Сколько бесплатных credits давать.
- Можно ли давать бесплатный ZIP или только один coded block.
- Какой тариф будет лучше: $19, $39, $99 или credits pack.
- Кто первый ICP: founders, agencies, small business, designers.
- Какой стиль продавать первым: SaaS, premium service, real estate, clinic.

### Юридические неизвестные

- Какой legal/payment route возможен, если основатели находятся в РФ.
- Можно ли открыть легальный контур в другой стране.
- Можно ли подключить Stripe / Paddle / Lemon Squeezy.
- Как легально использовать OpenAI API.
- Что делать с Terms, Privacy, Refund Policy.
- Как хранить пользовательские данные.
- Можно ли использовать пользовательские проекты для улучшения продукта.

---

## 5. MVP: что делаем в первой версии

### MVP‑формулировка

```text
AI-сервис для генерации одностраничных лендингов:
сначала изображения блоков, потом frontend-код, preview и ZIP.
```

### Что входит в MVP

| Блок                       | Входит? | Комментарий                    |
| -------------------------- | ------: | ------------------------------ |
| Главная страница сервиса   |      Да | Объяснить отличие visual-first |
| Регистрация / логин        |      Да | Минимально                     |
| Создание проекта           |      Да | Project dashboard              |
| Короткий бриф              |      Да | Ниша, цель, стиль, язык, блоки |
| Генерация visual direction |      Да | 2–3 варианта hero/style        |
| Генерация блоков           |      Да | 5–7 блоков лендинга            |
| AI‑редактирование блоков   |      Да | Через чат/quick actions        |
| Full‑page preview image    |      Да | Собранная картинка лендинга    |
| Генерация кода             |      Да | Next.js + TS + Tailwind        |
| Live preview               |      Да | Desktop / mobile preview       |
| Download ZIP               |      Да | Главная ценность               |
| Credits / лимиты           |      Да | Даже если сначала простые      |
| История проектов           |      Да | Базово                         |

### Что не входит в MVP

```text
- многостраничники;
- e-commerce;
- dashboards;
- mobile apps;
- Figma export;
- GitHub integration;
- Vercel deploy;
- CMS;
- backend для форм;
- drag-and-drop editor;
- canvas editor;
- командная работа;
- сложные анимации;
- полноценная дизайн-система в UI.
```

Это всё нужно держать в roadmap, но не делать на старте.

---

## 6. Пользовательский путь в MVP

### Шаг 1 — Landing page сервиса

Пользователь заходит на сайт и видит:

```text
Generate beautiful landing page visuals first.
Then turn them into real frontend code.
```

На главной странице:

- короткое объяснение;
- видео/гифка процесса;
- примеры результатов;
- кнопка Create landing page;
- pricing / early access;
- короткое сравнение с обычными AI website builders.

---

### Шаг 2 — Create project

Пользователь создаёт проект.

Форма:

```text
What are you building?
Industry / niche
Main goal
Target audience
Preferred style
Language
Sections needed
References
Logo / brand assets
Things to avoid
```

Пример:

```text
I need a premium landing page for an AI legal assistant for small law firms.
Style: clean SaaS, premium, trustworthy.
Goal: collect demo requests.
Language: English.
```

---

### Шаг 3 — Visual direction

AI генерирует 2–3 варианта первого визуального направления.

Пример:

```text
Option A — Clean SaaS
Option B — Premium Editorial
Option C — Bold Startup
```

Пользователь выбирает один.

Зачем это нужно:

- не тратить credits на весь лендинг сразу;
- быстро понять стиль;
- дать пользователю контроль;
- зафиксировать visual direction.

---

### Шаг 4 — Генерация блоков

AI генерирует лендинг по блокам.

Базовый набор:

```text
1. Header / Hero
2. Benefits
3. Features
4. How it works
5. Use cases / Pricing
6. FAQ / Trust
7. Final CTA / Footer
```

Каждый блок — отдельное изображение.

Потом можно показать full‑page preview:

```text
Все блоки собраны в одну длинную страницу.
```

---

### Шаг 5 — Редактирование

Пользователь может выбрать блок и попросить правку.

Примеры quick actions:

```text
Make more premium
Improve spacing
Make typography stronger
Change accent color
Regenerate section
Make more conversion-focused
Simplify layout
Generate mobile version
```

Также есть свободный prompt:

```text
Make the hero lighter, increase whitespace and make the CTA more visible.
```

В MVP не нужен canvas. Редактирование только через AI‑чат и кнопки.

---

### Шаг 6 — Mobile

Правило MVP:

```text
Responsive code — всегда.
Mobile visual previews — опционально.
```

То есть сайт в коде всегда должен быть адаптивным.
Но если пользователь хочет заранее увидеть мобильные картинки блоков, он может сгенерировать mobile previews отдельно.

---

### Шаг 7 — Generate code

Когда пользователь доволен блоками, он нажимает:

```text
Generate website code
```

Перед запуском можно показать:

```text
This will generate:
- Next.js project
- TypeScript
- Tailwind CSS
- Responsive layout
- Reusable sections
- Assets
- README
- ZIP export
```

И стоимость:

```text
This action will use X credits.
```

---

### Шаг 8 — Live preview

После генерации пользователь видит live preview.

Экран:

```text
слева — чат / actions
справа — live preview
сверху — Desktop / Tablet / Mobile
кнопка — Download ZIP
```

Пользователь может попросить:

```text
Make the hero image smaller.
Increase headline size.
Improve mobile spacing.
Make CTA button more visible.
```

На этом этапе AI правит уже код, а не изображение.

---

### Шаг 9 — ZIP export

Пользователь скачивает ZIP.

Пример структуры:

```text
project/
  app/
  components/
    sections/
    ui/
  public/
    assets/
  styles/
  tokens/
  DESIGN.md
  design-spec.json
  package.json
  README.md
```

README:

```text
npm install
npm run dev
```

---

## 7. Внутренний технический pipeline

### Общая схема

```text
brief
→ visual direction
→ block images
→ block approval
→ assets
→ DESIGN.md
→ design-spec.json
→ code generation
→ build check
→ screenshot
→ visual comparison
→ repair loop
→ preview
→ ZIP
```

### Детальнее

#### 1. Brief parser

Собирает:

- нишу;
- цель;
- аудиторию;
- стиль;
- блоки;
- язык;
- референсы;
- загруженные assets.

#### 2. Style direction generator

Генерирует первые 2–3 визуальных направления.

#### 3. Block image generator

Генерирует каждый блок отдельно.

#### 4. Design critic

Проверяет, не выглядит ли результат generic / weak / unreadable.

#### 5. Asset extractor

Создаёт или выделяет:

- фоновые изображения;
- product visuals;
- icons;
- logos;
- decorative shapes;
- photos.

#### 6. DESIGN.md generator

Создаёт markdown‑документ с правилами:

```text
brand direction
colors
typography
spacing
layout
buttons
cards
image treatment
mobile behavior
do / don't
```

#### 7. Design spec generator

Создаёт структурный JSON:

```json
{
  "pageType": "landing",
  "sections": [
    {
      "id": "hero",
      "layout": "asymmetrical split",
      "components": ["header", "headline", "cta", "visual"]
    }
  ]
}
```

#### 8. Code generator

Создаёт проект:

```text
Next.js
TypeScript
Tailwind
React components
```

#### 9. Build checker

Запускает:

```text
npm run build
```

Если есть ошибки — AI чинит.

#### 10. Screenshot renderer

Через Playwright делает screenshots:

```text
1440px desktop
1024px tablet
390px mobile
```

#### 11. Visual QA

AI сравнивает:

```text
reference image vs rendered screenshot
```

Проверяет:

- spacing;
- typography;
- colors;
- alignment;
- section height;
- image scale;
- button placement;
- card sizes.

#### 12. Repair agent

Исправляет код без изменения дизайн‑направления.

#### 13. Exporter

Удаляет лишнее, собирает ZIP, добавляет README.

---

## 8. Skill-система

Мы можем использовать open-source skills как основу, но под наш продукт лучше собрать собственную систему.

### Нужные skills

```text
01-image-art-direction.md
02-block-generation.md
03-mobile-block-generation.md
04-asset-extraction.md
05-design-md-generator.md
06-design-spec-generator.md
07-image-to-code.md
08-visual-qa-repair.md
09-export-zip.md
```

### 01 — Image Art Direction

Цель: генерировать не generic AI‑картинки, а frontend‑implementable premium UI.

Правила:

```text
no generic AI landing
no random purple blobs
strong hierarchy
real typography
clean spacing
frontend-friendly layout
readable text
no device mockups
straight-on website screenshot
```

### 02 — Block Generation

Цель: каждый блок должен быть отдельной секцией.

Пример:

```text
Generate one Hero section.
Desktop width: 1440px.
No browser chrome.
No device mockup.
Must look like a real shipped website.
Must be easy to implement in React/Tailwind.
```

### 03 — Mobile Block Generation

Цель: делать mobile preview по утверждённому desktop‑блоку.

Правила:

```text
same visual identity
mobile-first hierarchy
no overcrowding
clear CTA
readable typography
```

### 04 — Asset Extraction

Цель: подготовить assets для кода.

Разделение:

```text
photos → webp/png
complex illustrations → png/webp
simple icons → svg
logos → svg
backgrounds/textures → webp
```

### 05 — DESIGN.md Generator

Цель: зафиксировать визуальную систему.

### 06 — Design Spec Generator

Цель: сделать machine-readable структуру страницы.

### 07 — Image-to-Code

Цель: генерировать production‑like frontend.

Правила:

```text
Use Next.js + TS + Tailwind.
Split into reusable components.
Use semantic HTML.
Use assets from /public/assets.
Use DESIGN.md.
Use design-spec.json.
Do not redesign.
Match reference images.
```

### 08 — Visual QA Repair

Цель: сравнивать screenshot и reference, затем чинить.

### 09 — Export ZIP

Цель: собрать чистый проект без мусора.

---

## 9. Первый локальный R&D-проект

Перед созданием SaaS нужно собрать локальный стенд.

Структура:

```text
ai-website-pipeline/
  input/
    brief.md
    references/

  generated/
    images/
      hero.png
      features.png
      pricing.png
      faq.png
      cta.png
    mobile/
    assets/

  spec/
    DESIGN.md
    design-spec.json
    asset-map.json

  app-output/
    app/
    components/
    public/
    package.json
    README.md

  qa/
    target-images/
    rendered-screenshots/
    visual-report.md
    repair-log.md

  skills/
    01-image-art-direction.md
    02-block-generation.md
    03-asset-extraction.md
    04-design-md-generator.md
    05-image-to-code.md
    06-visual-qa-repair.md
```

### Первый тест

Не полный сайт. Только hero.

```text
hero image
→ code
→ screenshot
→ compare
→ repair
```

Критерии успеха:

```text
код запускается
визуально похоже на 80–85%
структура нормальная
адаптив не разваливается
```

### Второй тест

3 блока:

```text
Hero
Features
CTA
```

### Третий тест

Полный лендинг:

```text
Hero
Benefits
Features
Process
Pricing/Use cases
FAQ
CTA/Footer
```

---

## 10. Pricing и credits: предварительная логика

### Почему credits лучше “безлимита”

AI‑генерация имеет себестоимость. Если дать безлимит, пользователь может сжечь слишком много денег.

Лучше модель:

```text
subscription + credits
```

И отдельно top‑ups.

### Пример действий

```text
Generate style direction: 10 credits
Generate one block image: 8 credits
Edit one block: 6 credits
Generate mobile block: 6 credits
Generate assets for block: 5 credits
Generate full code: 40 credits
Repair loop: 10 credits
```

### Пример тарифов

Черновик:

| Тариф   |   Цена | Что даёт                                             |
| ------- | -----: | ---------------------------------------------------- |
| Free    |     $0 | 1 project, несколько генераций, 1 coded block        |
| Starter | $19/mo | 1 full landing или ограниченный credits              |
| Pro     | $39/mo | больше credits, mobile previews, больше repair loops |
| Studio  | $99/mo | агентский режим, больше projects/credits             |

### Важное

Цены нельзя финально фиксировать до замеров.

Нужно провести 20–30 тестовых генераций и измерить:

```text
cost per image block
cost per edit
cost per full landing
cost per code generation
cost per repair loop
average total cost
```

---

## 11. Примерная unit‑economics модель

Очень грубо, до реальных замеров:

| Сценарий           | Что входит                         | Примерная себестоимость |
| ------------------ | ---------------------------------- | ----------------------: |
| Лёгкий тест        | 3–5 блоков, без mobile, 1 code gen |                    $3–8 |
| Нормальный лендинг | 7 блоков, assets, code, 1–2 repair |                   $6–15 |
| Дорогой лендинг    | desktop + mobile + edits + repair  |                 $12–30+ |

Цель:

```text
AI cost должен быть примерно 20–35% от revenue.
```

Если пользователь платит $39, желательно, чтобы API‑cost был не $30, а ближе к $8–15.

---

## 12. Legal/payment блок

> Важно: это не юридическая консультация. Перед запуском платного продукта нужна консультация по выбранной юрисдикции.

### OpenAI API

OpenAI API доступен только в поддерживаемых странах. OpenAI пишет, что доступ или предоставление доступа к API вне списка поддерживаемых стран может привести к блокировке или suspension.

Практический вывод:

```text
Публичный SaaS из РФ на OpenAI API — риск.
Нужен легальный операционный контур в поддерживаемой стране.
```

### Stripe

Stripe не поддерживает пользователей, находящихся в России, Украине и Беларуси.

Практический вывод:

```text
Stripe напрямую из РФ — не вариант.
```

### Paddle

Paddle работает с software businesses во многих странах, кроме unsupported countries. Россия находится в проблемном/unsupported контуре.

Практический вывод:

```text
Paddle может быть полезен только при нормальном иностранном контуре.
```

### Lemon Squeezy

Lemon Squeezy поддерживает merchants/affiliates, которые могут получать payouts в поддерживаемых странах. Казахстан/Узбекистан могут быть интересны для проверки, но всё зависит от KYC, банка, резидентства, payout и compliance.

### Крипта

Крипта может быть временным вариантом для закрытой beta, но не лучшая основа для массового SaaS:

- ниже доверие;
- хуже конверсия;
- неудобно для подписок;
- сложнее налоги;
- compliance‑риски.

### Донаты

Если пользователь “донатит” и получает credits / доступ / ZIP, это по сути продажа услуги, а не настоящий донат.

### Возможные legal routes

```text
1. Реальная компания/ИП/структура в поддерживаемой стране.
2. Реальный партнёр/кофаундер за рубежом.
3. Один из основателей оформляет контур вне РФ.
4. Сначала waitlist/beta без платежей, пока решается legal.
5. RU-версия отдельно, но тогда вопрос AI-провайдеров и качества.
```

---

## 13. Что обсудить с другом

### Технические вопросы

```text
1. Согласен ли начинать с локального R&D pipeline?
2. Согласен ли export stack: Next.js + TS + Tailwind?
3. Как запускать generated code для preview?
4. Как делать screenshot через Playwright?
5. Как хранить images/assets/spec/code versions?
6. Сколько repair loops реально автоматизировать?
7. Можно ли за 3–7 дней сделать hero image → code → screenshot → repair?
```

### Продуктовые вопросы

```text
1. MVP = только landing pages?
2. Free plan даёт один coded block или вообще без ZIP?
3. Full ZIP только платно?
4. Mobile visual previews — optional/paid, но responsive code всегда?
5. Какие первые demo-ниши?
```

### Юридические вопросы

```text
1. Есть ли у кого-то возможность открыть структуру вне РФ?
2. Есть ли реальный партнёр в Казахстане/Узбекистане/другой стране?
3. Готов ли этот человек быть участником, а не номиналом?
4. Какой бюджет на legal/payment setup?
5. Какой payment route реально возможен?
6. Как легально использовать OpenAI API?
```

---

## 14. Roadmap на 7 дней

### День 1

Зафиксировать:

```text
MVP = landing pages
Export = Next.js + TS + Tailwind
Core = visual-first + block-based + ZIP
```

### День 2

Разобрать Taste Skill / open-source skills.
Выделить полезные части.

### День 3

Сгенерировать первый hero image.

### День 4

Передать hero image в Codex.
Сделать hero в коде.

### День 5

Добавить Playwright screenshot.

### День 6

Сделать visual QA prompt и repair loop.

### День 7

Собрать первый ZIP и оценить:

```text
насколько похоже
где сломалось
сколько заняло времени
что нужно автоматизировать
```

---

## 15. Roadmap на 30 дней

### Неделя 1 — Proof of concept

Результат:

```text
1 лендинг или хотя бы hero/3 blocks:
image → code → screenshot → repair → ZIP
```

### Неделя 2 — Internal tool

Результат:

```text
простая админка/локальный интерфейс
generate images
generate code
preview
download zip
```

### Неделя 3 — Product shell

Результат:

```text
auth
projects
history
credits mock
simple dashboard
landing page сервиса
```

### Неделя 4 — Early beta

Результат:

```text
10–30 beta users
feedback
pricing test
legal/payment route decision
```

---

## 16. Первые demo-ниши

Для первых примеров лучше брать визуально сильные и продаваемые ниши:

```text
1. AI SaaS
2. Architecture / premium real estate
3. Premium clinic / dental / private medical
4. Course / creator platform
5. Design / marketing agency
```

Для старта достаточно 3 кейсов:

```text
AI SaaS
Architecture studio
Premium clinic
```

---

## 17. Позиционирование

### Не так

```text
AI website builder for everything.
```

Слишком общее.

### Лучше

```text
Generate the design first.
Approve it visually.
Then export real frontend code.
```

Или:

```text
AI website builders generate code first.
We generate the visual direction first — then build the code to match.
```

### Hero copy для будущего сайта

```text
Generate premium landing page visuals first.
Then export clean Next.js code.
```

Subheadline:

```text
Describe your idea, choose a visual direction, refine sections with AI, and turn approved designs into responsive frontend code.
```

---

## 18. Основные риски

| Риск                           | Почему важен               | Что делать                                       |
| ------------------------------ | -------------------------- | ------------------------------------------------ |
| Image-to-code будет неточным   | Главная ценность продукта  | DESIGN.md + visual QA + repair                   |
| AI будет делать generic дизайн | Потеря отличия             | Art direction skills + design critic             |
| Себестоимость будет высокой    | Можно уйти в минус         | Credits, limits, routing models                  |
| Legal/payment из РФ            | Может заблокировать запуск | Иностранный контур / партнёр / консультация      |
| Слишком широкий MVP            | Продукт не соберётся       | Начать только с landing pages                    |
| Assets extraction сложный      | Картинка не перенесётся    | Hybrid code + assets                             |
| Mobile будет ломаться          | Плохой UX                  | Responsive by default + optional mobile previews |

---

## 19. Главный вывод

Идея выглядит сильной, потому что она попадает в новый workflow:

```text
image model as designer
+
coding agent as frontend developer
```

Но продукт надо строить не как “ещё один генератор сайтов”, а как:

```text
visual-first website generation pipeline
```

Самая ценная часть — не картинка и не код отдельно, а мост между ними:

```text
approved visual
→ design system
→ frontend code
→ screenshot verification
→ repair
```

Если это ядро получится, дальше можно добавлять:

```text
многостраничники
Figma export
Vercel deploy
CMS
GitHub
agency mode
team workspace
```

---

## 20. Источники для проверки

- OpenAI API Supported Countries:
  https://developers.openai.com/api/docs/supported-countries

- OpenAI API Pricing:
  https://developers.openai.com/api/docs/pricing

- OpenAI GPT‑Image‑2 Pricing:
  https://openai.com/api/pricing/

- Stripe sanctions / Russia & Belarus:
  https://support.stripe.com/questions/sanctions-on-russia-and-belarus

- Paddle supported countries:
  https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle

- Paddle sanctions:
  https://www.paddle.com/help/legal/sanctions/impact-of-sanctions-on-russia-and-belarus

- Lemon Squeezy supported countries:
  https://docs.lemonsqueezy.com/help/getting-started/supported-countries

- Taste Skill repository:
  https://github.com/leonxlnx/taste-skill

- Awesome DESIGN.md repository:
  https://github.com/voltagent/awesome-design-md

---

## 21. Финальная формулировка для обсуждения

Мы делаем не обычный конструктор сайтов.

Мы делаем сервис, где пользователь сначала получает красивый AI‑дизайн лендинга как набор изображений, утверждает стиль и блоки, а потом система превращает эти утверждённые визуалы в рабочий frontend‑код через DESIGN.md, tokens, design spec, screenshot‑проверку и repair loop.

Первый MVP — только одностраничные лендинги.

Главный результат для пользователя:

```text
красивый визуальный дизайн
+
live preview
+
ZIP с Next.js / TypeScript / Tailwind проектом
```

Главный тест перед созданием SaaS:

```text
hero image → code → screenshot → visual repair → ZIP
```

Если это работает — можно строить продукт.
