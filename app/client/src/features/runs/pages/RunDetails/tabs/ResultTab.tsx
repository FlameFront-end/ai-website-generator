import type { FC } from "react";

import {
  useArtifactContentQuery,
  useArtifactFileUrl,
} from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";

interface ResultTabProps {
  runId: string;
  desktopScreenshot: RunArtifact | undefined;
  mobileScreenshot: RunArtifact | undefined;
  diffImage: RunArtifact | undefined;
  visualReport: RunArtifact | undefined;
  styles: Record<string, string>;
}

const ResultSkeleton: FC<{ styles: Record<string, string> }> = ({ styles }) => (
  <div className={styles.resultLayout}>
    <div className={styles.overviewGrid}>
      <div className={styles.panel}>
        <h2>Скриншоты</h2>
        <div className={styles.screenshotsGrid}>
          <div className={styles.screenshotContainer}>
            <span className={styles.resultSkeletonTitle} />
            <div className={styles.resultSkeletonImage} />
          </div>
          <div className={styles.screenshotContainer}>
            <span className={styles.resultSkeletonTitle} />
            <div className={styles.resultSkeletonMobileImage} />
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <h2>Сравнение (Diff)</h2>
        <div className={styles.resultSkeletonDiff} />
      </div>
    </div>

    <div className={styles.panel}>
      <h2>Отчет визуальной проверки</h2>
      <div className={styles.resultSkeletonReport}>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  </div>
);

export const ResultTab: FC<ResultTabProps> = ({
  runId,
  desktopScreenshot,
  mobileScreenshot,
  diffImage,
  visualReport,
  styles,
}) => {
  const desktopFile = useArtifactFileUrl(runId, desktopScreenshot?.id);
  const mobileFile = useArtifactFileUrl(runId, mobileScreenshot?.id);
  const diffFile = useArtifactFileUrl(runId, diffImage?.id);
  const reportQuery = useArtifactContentQuery(runId, visualReport?.id);
  const hasResultArtifacts =
    desktopScreenshot || mobileScreenshot || diffImage || visualReport;

  if (!hasResultArtifacts) {
    return <ResultSkeleton styles={styles} />;
  }

  return (
    <div className={styles.resultLayout}>
      <div className={styles.overviewGrid}>
        <div className={styles.panel}>
          <h2>Скриншоты</h2>
          <div className={styles.screenshotsGrid}>
            {desktopScreenshot && (
              <div className={styles.screenshotContainer}>
                <h3>Desktop (1440×900)</h3>
                {desktopFile.isError ? (
                  <p className={styles.error}>Скриншот недоступен</p>
                ) : (
                  <img
                    src={desktopFile.url ?? undefined}
                    alt="Скриншот desktop"
                    className={styles.screenshotImage}
                  />
                )}
              </div>
            )}
            {mobileScreenshot && (
              <div className={styles.screenshotContainer}>
                <h3>Mobile (390×844)</h3>
                {mobileFile.isError ? (
                  <p className={styles.error}>Скриншот недоступен</p>
                ) : (
                  <img
                    src={mobileFile.url ?? undefined}
                    alt="Скриншот mobile"
                    className={styles.screenshotImage}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {diffImage && (
          <div className={styles.panel}>
            <h2>Сравнение (Diff)</h2>
            {diffFile.isError ? (
              <p className={styles.error}>Изображение сравнения недоступно</p>
            ) : (
              <div className={styles.diffImageWrap}>
                <img
                  src={diffFile.url ?? undefined}
                  alt="Различия между референсом и результатом"
                  className={styles.diffImage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {visualReport && (
        <div className={styles.panel}>
          <h2>Отчет визуальной проверки</h2>
          {reportQuery.isLoading && <p>Загружаем отчет...</p>}
          {reportQuery.isError && <p>Не удалось загрузить отчет.</p>}
          {reportQuery.data && (
            <pre className={styles.markdown}>{reportQuery.data.content}</pre>
          )}
        </div>
      )}
    </div>
  );
};
