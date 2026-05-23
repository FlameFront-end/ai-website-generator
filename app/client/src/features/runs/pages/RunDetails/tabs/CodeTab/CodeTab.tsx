import type { FC } from "react";
import { useState } from "react";

import { Skeleton } from "@/kit";
import {
  useCodeFileContentQuery,
  useCodeFilesQuery,
} from "@/api/services/runs";

import { CodeViewer } from "../../components/CodeViewer/CodeViewer";
import { FileTree } from "../../components/FileTree/FileTree";
import { getLanguageFromPath } from "../../lib/utils";

import styles from "./CodeTab.module.scss";

interface CodeTabProps {
  runId: string;
}

export const CodeTab: FC<CodeTabProps> = ({ runId }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const filesQuery = useCodeFilesQuery(runId, true);
  const contentQuery = useCodeFileContentQuery(runId, selectedFile);

  return (
    <div className={styles.codeExplorer}>
      <div className={styles.fileTree}>
        <div className={styles.fileTreeHeader}>Файлы проекта</div>
        {filesQuery.isLoading && <Skeleton lines={6} />}
        {filesQuery.isError && (
          <p className={styles.fileTreeEmpty}>Код ещё не сгенерирован</p>
        )}
        {filesQuery.data && filesQuery.data.length === 0 && (
          <p className={styles.fileTreeEmpty}>Нет файлов</p>
        )}
        {filesQuery.data && filesQuery.data.length > 0 && (
          <FileTree
            files={filesQuery.data}
            selectedFile={selectedFile}
            onSelect={setSelectedFile}
          />
        )}
      </div>
      <div className={styles.fileViewer}>
        {selectedFile && contentQuery.isLoading && (
          <div className={styles.codeLoading}>
            <span className={styles.codeLoadingSpinner} />
          </div>
        )}
        {selectedFile && contentQuery.isError && (
          <div className={styles.fileViewerEmpty}>
            <p>Не удалось загрузить файл.</p>
          </div>
        )}
        {contentQuery.data && (
          <CodeViewer
            content={contentQuery.data.content}
            language={getLanguageFromPath(selectedFile ?? "")}
          />
        )}
        {!selectedFile && (
          <div className={styles.fileViewerEmpty}>
            <p>Выберите файл в дереве проекта</p>
          </div>
        )}
      </div>
    </div>
  );
};
