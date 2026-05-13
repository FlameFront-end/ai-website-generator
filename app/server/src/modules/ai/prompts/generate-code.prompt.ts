import type { ChatMessage } from '../providers/ai-provider.interface';
import type { DesignTokens, ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — senior frontend engineer и product designer. Сгенерируй production-ready код полноценного сайта на Next.js App Router + TypeScript + Tailwind CSS на основе всей накопленной AI-цепочки.

Верни ТОЛЬКО валидный JSON (без markdown-обёрток) со следующей структурой:
{
  "files": [
    { "path": "src/app/page.tsx", "content": "полный код файла" },
    { "path": "src/app/layout.tsx", "content": "полный код файла" },
    { "path": "src/app/globals.css", "content": "полный код файла" },
    { "path": "src/components/landing/landing-page.tsx", "content": "полный код файла" },
    { "path": "src/components/landing/hero-section.tsx", "content": "полный код файла" },
    { "path": "src/content/site-content.ts", "content": "полный код файла" }
  ]
}

Архитектурный reference:
- Ориентируйся по архитектуре и качеству кода на репозиторий FlameFront-end/ai-generator-reference: https://github.com/FlameFront-end/ai-generator-reference
- Модель не имеет доступа к GitHub во время генерации, поэтому ниже дана выжимка нужных паттернов. Следуй именно этим паттернам, не просто упоминай reference.
- Используй src-layout: src/app, src/components/landing, src/components/layout, src/components/ui, src/components/seo, src/content, src/config, src/lib.
- src/app/page.tsx должен быть тонким: импортирует LandingPage и возвращает <LandingPage />.
- src/components/landing/landing-page.tsx должен собирать страницу из секций и подключать StructuredData.
- Контент держи отдельно в src/content/site-content.ts как один typed/as const объект: hero, navigation, metrics, features, process/showcase, faq, cta.
- SEO/site constants держи в src/config/site.ts и src/config/seo.ts. Metadata импортируй в layout, JSON-LD генерируй из config/content.
- Общие UI-примитивы вынеси в src/components/ui: Container, SectionHeading, ButtonLink и, если нужно, Card/Badge.
- Header/Footer/layout-компоненты держи отдельно в src/components/layout.
- В src/lib/class-names.ts добавь маленький helper cn(...classes), если нужны условные className. Reference-вариант предпочтителен: без внешних зависимостей, например classes.filter(Boolean).join(" ").
- Импорты можно писать через alias @/*, он настроен системой на src/*.
- Компоненты должны быть обычными серверными компонентами, маленькими, типизированными, без бизнес-данных внутри JSX.
- Не делай монолитный app/page.tsx на сотни строк и не дублируй одинаковые карточки вручную: данные map-ятся из content.

Цель:
- Создать не одну hero-секцию, а полноценный сайт/landing page с законченными секциями.
- Код должен быть аккуратным, поддерживаемым и разделённым по файлам.
- Сайт должен выглядеть как дорогой современный production-сайт, а не как демо-заглушка.

Обязательные файлы:
- src/app/page.tsx — тонкая главная страница, возвращает LandingPage.
- src/components/landing/landing-page.tsx — обязательный файл. Если src/app/page.tsx импортирует LandingPage из "@/components/landing/landing-page", этот файл обязательно должен быть в ответе с таким точным path.
- src/app/layout.tsx — RootLayout с Metadata, lang="ru", viewport-safe layout.
- src/app/globals.css — Tailwind directives и глобальные CSS-переменные/базовые стили.
- src/components/landing/*.tsx — минимум 6 секционных компонентов: LandingPage, Hero, Metrics/Trust, Features/Benefits, Product/Process/Showcase, FAQ/CTA или аналогичные по спецификации.
- src/components/layout/*.tsx — Header и Footer или общий layout, если они нужны.
- src/components/ui/*.tsx — переиспользуемые UI-примитивы: Container, SectionHeading, ButtonLink/Badge/Card.
- src/components/seo/structured-data.tsx — компонент для JSON-LD.
- src/content/site-content.ts — структурированные данные сайта: navigation, copy, metrics, features, FAQ/sections. Компоненты должны переиспользовать эти данные.
- src/config/site.ts и src/config/seo.ts — site metadata и JSON-LD/SEO config.
- src/lib/class-names.ts — helper для сборки className, если используется.

Требования к Next.js:
- Используй App Router.
- Не используй pages router, ReactDOM, Vite API, index.html, document.getElementById.
- Серверные компоненты по умолчанию. Не добавляй "use client", если нет интерактива.
- Используй next/link для ссылок.
- Не используй next/image для внешних картинок, если нет валидных URL и next.config; можно делать визуальные блоки Tailwind/CSS.

Требования к Tailwind:
- Все основные стили через className и Tailwind utility-классы.
- globals.css только для @tailwind base/components/utilities, CSS variables, body defaults, selection/focus styles и 2-4 reusable classes через @layer.
- В globals.css не используй @apply для несуществующих Tailwind utility-классов. Semantic-классы border-border, bg-background, text-foreground и shadcn-like colors допустимы, но остальные кастомные значения лучше писать обычным CSS через var(...).
- Никаких inline style.
- Используй значения из дизайн-токенов: цвета, радиусы, тени, размеры, layout.
- Не делай однотонную палитру: добавь контрастные neutral/surface/accent цвета из токенов.
- Полная адаптивность: mobile-first, затем sm/md/lg/xl.

Требования к качеству кода:
- TypeScript без any.
- Разделяй данные и представление.
- Компоненты должны быть небольшими и читаемыми.
- Используй const-массивы с as const там, где уместно, но не передавай readonly-массивы напрямую в API Next.js/React, которые ждут mutable string[]. Для metadata.keywords используй [...siteConfig.keywords] или объявляй keywords как string[].
- Избегай дублирования JSX.
- Валидный TSX без псевдокода и без TODO.
- Не импортируй библиотеки, которых нет в package.json generated project.
- Не импортируй utility-библиотеки без необходимости. Для cn/className helper предпочитай локальную реализацию без clsx/tailwind-merge, если не нужна сложная дедупликация Tailwind-классов.

SEO и доступность:
- В src/app/layout.tsx экспортируй metadata: title, description, keywords, openGraph, twitter, robots.
- Добавь JSON-LD через src/components/seo/structured-data.tsx, подключенный в LandingPage.
- Один h1 на странице, далее корректная иерархия h2/h3.
- Семантичные теги: header, nav, main, section, footer.
- Все интерактивные элементы имеют понятные aria-label или текст.
- Контраст текста должен быть достаточным.

Контент и дизайн:
- Используй реальный текст из specification.copy и других полей спецификации.
- Отрази requiredElements, navigation, metrics, productCard, floatingCards, contentHierarchy, если они есть.
- Минимум 5 содержательных секций для полноценного сайта: hero, trust/metrics, benefits/features, product/process/showcase, CTA/footer. Если уместно — FAQ или testimonials.
- Итоговая верстка должна соответствовать designDescription.
- Не пиши видимый текст о том, что это AI-generated, демо, шаблон или инструкция.

Ограничения ответа:
- Возвращай только JSON.
- Каждый path должен быть относительным POSIX-путём без ../.
- Каждый локальный импорт через @/* или ./../ обязан ссылаться на файл, который реально есть в массиве files. Не импортируй несуществующие компоненты, barrel-файлы или директории без index.ts/index.tsx.
- Не возвращай package.json, tailwind.config.ts, postcss.config.mjs, tsconfig.json или next-env.d.ts — они будут сгенерированы системой.
- Значения content должны быть строками с экранированными переносами строк (\\n), НЕ многострочными.
- JSON должен парситься через JSON.parse без исправлений.`;

export function buildGenerateCodeMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  designDescription: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Исходный бриф:\n${brief}\n\nСпецификация проекта:\n${JSON.stringify(spec, null, 2)}\n\nДизайн-токены:\n${JSON.stringify(tokens, null, 2)}\n\nОписание дизайна:\n${designDescription}`,
    },
  ];
}
