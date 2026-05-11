import { useState } from "react";
import {
  useArtifactContentQuery,
  useArtifactFileUrl,
} from "@/api/services/runs";
import type { ArtifactViewerProps } from "../types";
import { getLanguageFromPath, shortenArtifactPath } from "../utils";
import {
  IMAGE_MIME_TYPES,
  TEXT_MIME_TYPES,
  ARTIFACT_LABELS,
} from "../constants";
import { CodeViewer } from "./CodeViewer";

export function ArtifactViewer({
  runId,
  artifact,
  styles,
}: ArtifactViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isImage =
    artifact.mimeType && IMAGE_MIME_TYPES.includes(artifact.mimeType);
  const isText =
    artifact.mimeType && TEXT_MIME_TYPES.includes(artifact.mimeType);
  const contentQuery = useArtifactContentQuery(
    runId,
    isOpen && isText ? artifact.id : undefined,
  );
  const fileQuery = useArtifactFileUrl(runId, artifact.id);
  const fileName = artifact.path.split("/").pop() ?? artifact.path;
  const ext = fileName.split(".").pop() ?? "";
  const lang = getLanguageFromPath(fileName);

  return (
    <div className={styles.artifactItem}>
      <button
        type="button"
        className={styles.artifactHeader}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span
          className={styles.artifactChevron}
          style={{ transform: isOpen ? "rotate(90deg)" : undefined }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 2l4 3-4 3"
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={styles.artifactBadge}>
          {isImage ? "IMG" : isText ? ext.toUpperCase() : "BIN"}
        </span>
        <span className={styles.artifactLabel}>
          {ARTIFACT_LABELS[artifact.type] ?? artifact.type}
        </span>
        <span className={styles.artifactPath}>
          {shortenArtifactPath(artifact.path)}
        </span>
      </button>

      {isOpen && (
        <div className={styles.artifactBody}>
          {isImage && (
            <img
              src={fileQuery.url ?? undefined}
              alt={fileName}
              className={styles.artifactImage}
            />
          )}
          {isText && contentQuery.isLoading && (
            <div className={styles.artifactLoading}>
              <span className={styles.codeLoadingSpinner} />
            </div>
          )}
          {isText && contentQuery.data && (
            <CodeViewer
              content={contentQuery.data.content}
              language={lang}
              styles={styles}
            />
          )}
          {!isImage && !isText && (
            <div className={styles.artifactDownload}>
              <a
                href={fileQuery.url ?? "#"}
                download={fileName}
                className={styles.artifactDownloadLink}
              >
                Скачать файл
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
