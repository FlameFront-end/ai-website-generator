import type { FC } from "react";

import {
  useArtifactContentQuery,
  useArtifactFileUrl,
} from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";

import shared from "../../lib/run-details-shared.module.scss";
import local from "./ResultTab.module.scss";

interface ResultTabProps {
  runId: string;
  desktopScreenshot: RunArtifact | undefined;
  mobileScreenshot: RunArtifact | undefined;
  diffImage: RunArtifact | undefined;
  visualReport: RunArtifact | undefined;
}

const ResultSkeleton: FC = () => (
  <div className={local.resultLayout}>
    <div className={shared.overviewGrid}>
      <div className={shared.panel}>
        <h2>Скриншоты</h2>
        <div className={local.screenshotsGrid}>
          <div className={local.screenshotContainer}>
            <span className={local.resultSkeletonTitle} />
            <div className={local.resultSkeletonImage} />
          </div>
          <div className={local.screenshotContainer}>
            <span className={local.resultSkeletonTitle} />
            <div className={local.resultSkeletonMobileImage} />
          </div>
        </div>
      </div>

      <div className={shared.panel}>
        <h2>Сравнение (Diff)</h2>
        <div className={local.resultSkeletonDiff} />
      </div>
    </div>

    <div className={shared.panel}>
      <h2>Отчет визуальной проверки</h2>
      <div className={local.resultSkeletonReport}>
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
}) => {
  const desktopFile = useArtifactFileUrl(runId, desktopScreenshot?.id);
  const mobileFile = useArtifactFileUrl(runId, mobileScreenshot?.id);
  const diffFile = useArtifactFileUrl(runId, diffImage?.id);
  const reportQuery = useArtifactContentQuery(runId, visualReport?.id);
  const hasResultArtifacts =
    desktopScreenshot || mobileScreenshot || diffImage || visualReport;

  if (!hasResultArtifacts) {
    return <ResultSkeleton />;
  }

  return (
    <div className={local.resultLayout}>
      <div className={shared.overviewGrid}>
        <div className={shared.panel}>
          <h2>Скриншоты</h2>
          <div className={local.screenshotsGrid}>
            {desktopScreenshot && (
              <div className={local.screenshotContainer}>
                <h3>Desktop (1440×900)</h3>
                {desktopFile.isError ? (
                  <p className={shared.error}>Скриншот недоступен</p>
                ) : (
                  <img
                    src={desktopFile.url ?? undefined}
                    alt="Скриншот desktop"
                    className={local.screenshotImage}
                  />
                )}
              </div>
            )}
            {mobileScreenshot && (
              <div className={local.screenshotContainer}>
                <h3>Mobile (390×844)</h3>
                {mobileFile.isError ? (
                  <p className={shared.error}>Скриншот недоступен</p>
                ) : (
                  <img
                    src={mobileFile.url ?? undefined}
                    alt="Скриншот mobile"
                    className={local.screenshotImage}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {diffImage && (
          <div className={shared.panel}>
            <h2>Сравнение (Diff)</h2>
            {diffFile.isError ? (
              <p className={shared.error}>Изображение сравнения недоступно</p>
            ) : (
              <div className={local.diffImageWrap}>
                <img
                  src={diffFile.url ?? undefined}
                  alt="Различия между референсом и результатом"
                  className={local.diffImage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {visualReport && (
        <div className={shared.panel}>
          <h2>Отчет визуальной проверки</h2>
          {reportQuery.isLoading && <p>Загружаем отчет...</p>}
          {reportQuery.isError && <p>Не удалось загрузить отчет.</p>}
          {reportQuery.data && <pre>{reportQuery.data.content}</pre>}
        </div>
      )}
    </div>
  );
};
