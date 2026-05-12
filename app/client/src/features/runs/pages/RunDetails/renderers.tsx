interface SpecData {
  siteType?: string;
  sectionType?: string;
  productName?: string;
  productDescription?: string;
  style?: string[];
  audience?: string;
  requiredElements?: string[];
  visualPreferences?: string[];
  contentHierarchy?: string[];
  copy?: {
    badge?: string;
    headline?: string;
    headlineAccent?: string;
    description?: string;
    primaryButton?: string;
    secondaryButton?: string;
    trustLine?: string;
  };
  navigation?: {
    logo?: string;
    menuItems?: string[];
    ctaButton?: string;
    authButton?: string;
  };
  metrics?: Array<{ value?: string; label?: string }>;
  productCard?: {
    title?: string;
    statusBadge?: string;
    sections?: Array<{
      type?: string;
      title?: string;
      content?: string;
      details?: Record<string, string>;
    }>;
  };
  floatingCards?: Array<{ value?: string; label?: string }>;
  colorHints?: {
    background?: string;
    accent?: string[];
    text?: string;
  };
}

export function renderProjectSpec(content: string, className: string) {
  try {
    const spec = JSON.parse(content) as SpecData;

    return (
      <dl className={className}>
        {/* ── Основное ── */}
        <div>
          <dt>Тип сайта</dt>
          <dd>{spec.siteType || "Не определен"}</dd>
        </div>
        <div>
          <dt>Тип блока</dt>
          <dd>{spec.sectionType || "Не определен"}</dd>
        </div>
        {spec.productName && (
          <div>
            <dt>Продукт</dt>
            <dd>{spec.productName}</dd>
          </div>
        )}
        {spec.productDescription && (
          <div>
            <dt>О продукте</dt>
            <dd>{spec.productDescription}</dd>
          </div>
        )}
        <div>
          <dt>Аудитория</dt>
          <dd>{spec.audience || "Не определена"}</dd>
        </div>
        <div>
          <dt>Стиль</dt>
          <dd>{spec.style?.join(", ") || "Не определен"}</dd>
        </div>
        <div>
          <dt>Обязательные элементы</dt>
          <dd>{spec.requiredElements?.join(", ") || "Не определены"}</dd>
        </div>
        <div>
          <dt>Визуальные пожелания</dt>
          <dd>{spec.visualPreferences?.join(", ") || "Не определены"}</dd>
        </div>

        {/* ── Контент ── */}
        {spec.copy?.badge && (
          <div>
            <dt>Бейдж</dt>
            <dd>{spec.copy.badge}</dd>
          </div>
        )}
        <div>
          <dt>Заголовок</dt>
          <dd>{spec.copy?.headline || "Не задан"}</dd>
        </div>
        {spec.copy?.headlineAccent && (
          <div>
            <dt>Акцент в заголовке</dt>
            <dd>{spec.copy.headlineAccent}</dd>
          </div>
        )}
        <div>
          <dt>Описание</dt>
          <dd>{spec.copy?.description || "Не задано"}</dd>
        </div>
        <div>
          <dt>Основная кнопка</dt>
          <dd>{spec.copy?.primaryButton || "Не задана"}</dd>
        </div>
        <div>
          <dt>Вторая кнопка</dt>
          <dd>{spec.copy?.secondaryButton || "Не задана"}</dd>
        </div>
        {spec.copy?.trustLine && (
          <div>
            <dt>Строка доверия</dt>
            <dd>{spec.copy.trustLine}</dd>
          </div>
        )}

        {/* ── Навигация ── */}
        {spec.navigation && (
          <>
            <div>
              <dt>Логотип</dt>
              <dd>{spec.navigation.logo}</dd>
            </div>
            {spec.navigation.menuItems && (
              <div>
                <dt>Меню</dt>
                <dd>{spec.navigation.menuItems.join(" · ")}</dd>
              </div>
            )}
            {spec.navigation.ctaButton && (
              <div>
                <dt>CTA в навигации</dt>
                <dd>{spec.navigation.ctaButton}</dd>
              </div>
            )}
            {spec.navigation.authButton && (
              <div>
                <dt>Кнопка входа</dt>
                <dd>{spec.navigation.authButton}</dd>
              </div>
            )}
          </>
        )}

        {/* ── Метрики ── */}
        {spec.metrics && spec.metrics.length > 0 && (
          <div>
            <dt>Метрики</dt>
            <dd>
              {spec.metrics.map((m, i) => (
                <span key={i}>
                  <strong>{m.value}</strong> {m.label}
                  {i < spec.metrics!.length - 1 ? " · " : ""}
                </span>
              ))}
            </dd>
          </div>
        )}

        {/* ── Карточка продукта ── */}
        {spec.productCard && (
          <>
            <div>
              <dt>Карточка продукта</dt>
              <dd>
                {spec.productCard.title}
                {spec.productCard.statusBadge &&
                  ` (${spec.productCard.statusBadge})`}
              </dd>
            </div>
            {spec.productCard.sections?.map((s, i) => (
              <div key={i}>
                <dt>Карточка · {s.title || s.type}</dt>
                <dd>
                  {s.content}
                  {s.details &&
                    Object.entries(s.details).map(([k, v]) => (
                      <span key={k}>
                        {" "}
                        — {k}: {v}
                      </span>
                    ))}
                </dd>
              </div>
            ))}
          </>
        )}

        {/* ── Плавающие карточки ── */}
        {spec.floatingCards && spec.floatingCards.length > 0 && (
          <div>
            <dt>Мини-карточки</dt>
            <dd>
              {spec.floatingCards.map((c, i) => (
                <span key={i}>
                  <strong>{c.value}</strong> {c.label}
                  {i < spec.floatingCards!.length - 1 ? " · " : ""}
                </span>
              ))}
            </dd>
          </div>
        )}

        {/* ── Цвета ── */}
        {spec.colorHints && (
          <div>
            <dt>Палитра</dt>
            <dd>
              {spec.colorHints.background && (
                <>Фон: {spec.colorHints.background}. </>
              )}
              {spec.colorHints.accent && (
                <>Акценты: {spec.colorHints.accent.join(", ")}. </>
              )}
              {spec.colorHints.text && <>Текст: {spec.colorHints.text}</>}
            </dd>
          </div>
        )}

        {/* ── Иерархия ── */}
        {spec.contentHierarchy && spec.contentHierarchy.length > 0 && (
          <div>
            <dt>Иерархия контента</dt>
            <dd>{spec.contentHierarchy.join(" → ")}</dd>
          </div>
        )}
      </dl>
    );
  } catch {
    return <pre>{content}</pre>;
  }
}

export function renderDesignTokens(content: string, className: string) {
  try {
    const tokens = JSON.parse(content) as Record<
      string,
      Record<string, string | number>
    >;

    return (
      <dl className={className}>
        {Object.entries(tokens).flatMap(([groupName, group]) =>
          Object.entries(group).map(([key, value]) => (
            <div key={`${groupName}-${key}`}>
              <dt>
                {groupName} · {key}
              </dt>
              <dd>{String(value)}</dd>
            </div>
          )),
        )}
      </dl>
    );
  } catch {
    return <pre>{content}</pre>;
  }
}
