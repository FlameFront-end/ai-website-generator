export function renderProjectSpec(content: string, className: string) {
  try {
    const spec = JSON.parse(content) as {
      siteType?: string;
      sectionType?: string;
      style?: string[];
      audience?: string;
      requiredElements?: string[];
      visualPreferences?: string[];
      copy?: {
        headline?: string;
        description?: string;
        primaryButton?: string;
        secondaryButton?: string;
      };
    };

    return (
      <dl className={className}>
        <div>
          <dt>Тип сайта</dt>
          <dd>{spec.siteType || "Не определен"}</dd>
        </div>
        <div>
          <dt>Тип блока</dt>
          <dd>{spec.sectionType || "Не определен"}</dd>
        </div>
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
        <div>
          <dt>Заголовок</dt>
          <dd>{spec.copy?.headline || "Не задан"}</dd>
        </div>
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
