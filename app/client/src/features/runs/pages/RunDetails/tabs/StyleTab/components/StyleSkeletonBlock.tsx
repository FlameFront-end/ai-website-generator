import type { FC } from "react";

import visualStyles from "./StyleVisual.module.scss";

export const StyleSkeletonBlock: FC<{ index: number; pending?: boolean }> = ({
  index,
  pending,
}) => (
  <figure
    className={visualStyles.block}
    aria-label={`Вариант визуального стиля ${index + 1} (генерация)`}
  >
    <header className={visualStyles.skeletonHeader}>
      <div className={visualStyles.skeletonTitle}>
        <span className={visualStyles.skeletonPill} />
        <span className={visualStyles.skeletonType} />
      </div>
      <span className={visualStyles.skeletonFile} />
    </header>
    <div className={visualStyles.skeletonImage}>
      {pending && (
        <span className={visualStyles.skeletonCaption}>
          <span className={visualStyles.spinner} aria-hidden />
          Готовим вариант стиля {index + 1}…
        </span>
      )}
    </div>
  </figure>
);
