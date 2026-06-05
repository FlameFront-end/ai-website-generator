import { formatTokenValue, isRecord } from "./render-utils";

export function renderDesignTokens(content: string, className: string) {
  try {
    const tokens = JSON.parse(content) as Record<string, unknown>;

    return (
      <dl className={className}>
        {Object.entries(tokens).flatMap(([groupName, group]) => {
          if (!isRecord(group)) {
            return [
              <div key={groupName}>
                <dt>{groupName}</dt>
                <dd>{formatTokenValue(group)}</dd>
              </div>,
            ];
          }

          return Object.entries(group).map(([key, value]) => (
            <div key={`${groupName}-${key}`}>
              <dt>
                {groupName} · {key}
              </dt>
              <dd>{formatTokenValue(value)}</dd>
            </div>
          ));
        })}
      </dl>
    );
  } catch {
    return <pre>{content}</pre>;
  }
}
