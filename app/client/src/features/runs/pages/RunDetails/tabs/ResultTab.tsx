import type { FC } from "react";

import { Skeleton } from "@/kit";
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

  return (
    <div className={styles.resultLayout}>
      <div className={styles.overviewGrid}>
        <div className={styles.panel}>
          <h2>Скриншоты</h2>
          <div className={styles.screenshotsGrid}>
            {!desktopScreenshot && !mobileScreenshot && <Skeleton lines={4} />}
            {desktopScreenshot && (
              <div className={styles.screenshotContainer}>
                <h3>Desktop (1440×900)</h3>
                <img
                  src={desktopFile.url ?? undefined}
                  alt="Скриншот desktop"
                  className={styles.screenshotImage}
                />
              </div>
            )}
            {mobileScreenshot && (
              <div className={styles.screenshotContainer}>
                <h3>Mobile (390×844)</h3>
                <img
                  src={mobileFile.url ?? undefined}
                  alt="Скриншот mobile"
                  className={styles.screenshotImage}
                />
              </div>
            )}
          </div>
        </div>

        {diffImage && (
          <div className={styles.panel}>
            <h2>Сравнение (Diff)</h2>
            <div className={styles.diffImageWrap}>
              <img
                src={diffFile.url ?? undefined}
                alt="Различия между референсом и результатом"
                className={styles.diffImage}
              />
            </div>
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
