import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Box,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";

import type { RunLog } from "@/api/services/runs";
import type { UseQueryResult } from "@tanstack/react-query";

import { translateLogMessage } from "../../pages/RunDetails/utils";
import styles from "./logs-panel.module.scss";

interface LogsPanelProps {
  logs: RunLog[];
  buildLogArtifact?: { id: string; type: string } | undefined;
  buildLogQuery: UseQueryResult<{ content: string }, Error>;
}

const LOG_LEVEL_ICONS: Record<RunLog["level"], React.ReactNode> = {
  info: <Info size={14} />,
  warning: <AlertTriangle size={14} />,
  error: <AlertCircle size={14} />,
};

const ANSI_ESCAPE_PATTERN = new RegExp(
  `${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
  "g",
);

function formatBuildLog(content: string) {
  return content.replace(ANSI_ESCAPE_PATTERN, "").trim();
}

export function LogsPanel({
  logs,
  buildLogArtifact,
  buildLogQuery,
}: LogsPanelProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <div className={styles.panel}>
      <h2>Логи выполнения</h2>

      {/* Логи сборки */}
      {buildLogArtifact && (
        <div className={styles.buildLogSection}>
          <button
            type="button"
            className={`${styles.logCard} ${styles.expandable} ${expandedLogId === "build-log" ? styles.expanded : ""}`}
            onClick={() => toggleExpand("build-log")}
          >
            <div className={styles.logHeader}>
              <span className={styles.logIcon}>
                <Box size={14} />
              </span>
              <span className={styles.logTitleGroup}>
                <span className={styles.logTitle}>Сборка проекта</span>
                <span className={styles.logSubtitle}>
                  Установка зависимостей и production-сборка
                </span>
              </span>
              <span className={styles.logLevel}>npm install + build</span>
              <span className={styles.expandIcon}>
                {expandedLogId === "build-log" ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </span>
            </div>
          </button>

          {expandedLogId === "build-log" && (
            <div className={styles.logDetails}>
              {buildLogQuery.isLoading && <p>Загружаем логи сборки...</p>}
              {buildLogQuery.isError && (
                <p>Не удалось загрузить логи сборки.</p>
              )}
              {buildLogQuery.data && (
                <div className={styles.buildLogBody}>
                  <div className={styles.buildLogSummary}>
                    <span>npm install</span>
                    <span>npm run build</span>
                  </div>
                  <pre className={styles.buildLogContent}>
                    {formatBuildLog(buildLogQuery.data.content)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Обычные логи */}
      {logs.length === 0 ? (
        <p className={styles.empty}>Логов пока нет.</p>
      ) : (
        <div className={styles.logsList}>
          {logs.map((log) => {
            const hasMetadata =
              log.metadata && Object.keys(log.metadata).length > 0;
            const isExpanded = expandedLogId === log.id;

            return (
              <div key={log.id} className={styles.logItem}>
                {hasMetadata ? (
                  <button
                    type="button"
                    className={`${styles.logCard} ${styles.expandable} ${isExpanded ? styles.expanded : ""}`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className={styles.logHeader}>
                      <span
                        className={`${styles.logIcon} ${styles[log.level]}`}
                      >
                        {LOG_LEVEL_ICONS[log.level]}
                      </span>
                      <span className={styles.logTitle}>
                        {translateLogMessage(log.message)}
                      </span>
                      <span className={styles.logTime}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      <span className={styles.expandIcon}>
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className={`${styles.logCard} ${styles.static}`}>
                    <div className={styles.logHeader}>
                      <span
                        className={`${styles.logIcon} ${styles[log.level]}`}
                      >
                        {LOG_LEVEL_ICONS[log.level]}
                      </span>
                      <span className={styles.logTitle}>
                        {translateLogMessage(log.message)}
                      </span>
                      <span className={styles.logTime}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {isExpanded && log.metadata && (
                  <div className={styles.logDetails}>
                    <pre className={styles.metadata}>
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
