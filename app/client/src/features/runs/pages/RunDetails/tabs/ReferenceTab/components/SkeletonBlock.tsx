import type { FC } from "react";

import refStyles from "../ReferenceTab.module.scss";

export const SkeletonBlock: FC<{ index: number; pending?: boolean }> = ({
  index,
  pending,
}) => (
  <figure
    className={refStyles.block}
    aria-label={`Блок ${index + 1} (генерация)`}
  >
    <header className={refStyles.skeletonHeader}>
      <div className={refStyles.skeletonTitle}>
        <span className={refStyles.skeletonPill} />
        <span className={refStyles.skeletonType} />
      </div>
      <span className={refStyles.skeletonFile} />
    </header>
    <div className={refStyles.skeletonImage}>
      {pending && (
        <span className={refStyles.skeletonCaption}>
          <span className={refStyles.spinner} aria-hidden />
          Генерация блока {index + 1}…
        </span>
      )}
    </div>
  </figure>
);
