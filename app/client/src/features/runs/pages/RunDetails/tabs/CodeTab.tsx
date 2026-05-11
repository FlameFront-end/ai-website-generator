import type { FC } from "react";
import { useState } from "react";

import { Skeleton } from "@/kit";
import {
  useCodeFileContentQuery,
  useCodeFilesQuery,
} from "@/api/services/runs";

import { FileTree } from "../components/FileTree";

interface CodeTabProps {
  runId: string;
  styles: Record<string, string>;
}

export const CodeTab: FC<CodeTabProps> = ({ runId, styles }) => {
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
            styles={styles}
          />
        )}
      </div>
      <div className={styles.codeViewer}>
        {selectedFile && contentQuery.isLoading && <p>Загружаем файл...</p>}
        {selectedFile && contentQuery.isError && (
          <p>Не удалось загрузить файл.</p>
        )}
        {contentQuery.data && (
          <pre className={styles.codeBlock}>
            <code>{contentQuery.data.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
