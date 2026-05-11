import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "react-toastify";

import hljs from "highlight.js/lib/core";
import langCss from "highlight.js/lib/languages/css";
import langHtml from "highlight.js/lib/languages/xml";
import langJs from "highlight.js/lib/languages/javascript";
import langJson from "highlight.js/lib/languages/json";
import langMarkdown from "highlight.js/lib/languages/markdown";
import langTs from "highlight.js/lib/languages/typescript";

import { LogsPanel } from "@/features/runs/components/LogsPanel/logs-panel";
import { RunStatusBadge } from "@/features/runs/components/RunStatusBadge";
import {
  runsApi,
  useArtifactContentQuery,
  useCodeFileContentQuery,
  useCodeFilesQuery,
  useDeleteRunMutation,
  useDownloadCodeMutation,
  useRebuildRunMutation,
  useRunQuery,
  useUpdateRunMutation,
} from "@/shared/api/services/runs";
import type { RunArtifact } from "@/shared/api/services/runs";
import { Modal } from "@/shared/widgets/Modal/modal";

import styles from "./run-details.module.scss";

const STEP_LABELS: Record<string, string> = {
  queued: "В очереди",
  prepare_brief: "Подготовка брифа",
  project_spec_ready: "Спецификация проекта готова",
  prepare_design_artifacts: "Подготовка описания дизайна",
  design_artifacts_ready: "Описание дизайна и токены готовы",
  prepare_reference_image: "Подготовка визуального референса",
  reference_ready: "Визуальный референс готов",
  prepare_frontend_project: "Генерация клиентского проекта",
  build_project: "Сборка проекта",
  build_success: "Сборка успешна",
  take_screenshots: "Создание скриншотов",
  screenshots_ready: "Скриншоты готовы",
  visual_qa: "Визуальный анализ",
  completed: "Завершено",
  frontend_project_ready: "Клиентский проект готов",
  pipeline_failed: "Ошибка пайплайна",
  build_failed: "Ошибка сборки",
  screenshots_failed: "Ошибка создания скриншотов",
  visual_qa_failed: "Ошибка визуального анализа",
};

const STEP_PROGRESS: Record<string, number> = {
  queued: 5,
  prepare_brief: 15,
  project_spec_ready: 25,
  prepare_design_artifacts: 35,
  design_artifacts_ready: 45,
  prepare_reference_image: 55,
  reference_ready: 65,
  prepare_frontend_project: 75,
  build_project: 80,
  build_success: 85,
  take_screenshots: 90,
  screenshots_ready: 95,
  visual_qa: 98,
  completed: 100,
  frontend_project_ready: 100,
  pipeline_failed: 100,
  build_failed: 100,
  screenshots_failed: 100,
  visual_qa_failed: 100,
};

const ARTIFACT_LABELS: Record<string, string> = {
  project_spec: "Спецификация проекта",
  reference_image: "Визуальный референс",
  design_description: "Описание дизайна",
  design_tokens: "Дизайн-токены",
  frontend_project: "Клиентский проект",
  desktop_screenshot: "Скриншот desktop",
  mobile_screenshot: "Скриншот mobile",
  visual_report: "Отчет визуальной проверки",
  diff_image: "Изображение отличий",
  build_error: "Ошибка сборки",
  build_log: "Логи сборки",
  reference_validation: "Проверка референса",
};

type RunDetailsTab =
  | "overview"
  | "reference"
  | "result"
  | "spec"
  | "design"
  | "code"
  | "artifacts"
  | "logs";

const TABS: Array<{ id: RunDetailsTab; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "spec", label: "Спецификация" },
  { id: "reference", label: "Референс" },
  { id: "design", label: "Дизайн" },
  { id: "code", label: "Код" },
  { id: "result", label: "Результат" },
  { id: "artifacts", label: "Артефакты" },
  { id: "logs", label: "Логи" },
];

function formatRunTitle(slug: string) {
  return slug.replace(/^run-(\d+)$/, "Запуск $1");
}

function getRunTitle(run: { slug: string; displayName: string | null }) {
  return run.displayName || formatRunTitle(run.slug);
}

function formatStep(step: string | null) {
  return step ? STEP_LABELS[step] || step : "Ожидаем статус пайплайна";
}

function getProgress(step: string | null, status: string) {
  if (status === "completed") return 100;
  if (status === "failed") return 100;
  return step ? STEP_PROGRESS[step] || 12 : 12;
}

function formatArtifactType(artifact: RunArtifact) {
  return ARTIFACT_LABELS[artifact.type] || artifact.type;
}

function renderProjectSpec(content: string) {
  try {
    const spec = JSON.parse(content) as {
      siteType?: string;
      sectionType?: string;
      style?: string[];
      audience?: string;
      requiredElements?: string[];
      visualPreferences?: string[];
      copy?: {
        headline?: string;
        description?: string;
        primaryButton?: string;
        secondaryButton?: string;
      };
    };

    return (
      <dl className={styles.spec}>
        <div>
          <dt>Тип сайта</dt>
          <dd>{spec.siteType || "Не определен"}</dd>
        </div>
        <div>
          <dt>Тип блока</dt>
          <dd>{spec.sectionType || "Не определен"}</dd>
        </div>
        <div>
          <dt>Аудитория</dt>
          <dd>{spec.audience || "Не определена"}</dd>
        </div>
        <div>
          <dt>Стиль</dt>
          <dd>{spec.style?.join(", ") || "Не определен"}</dd>
        </div>
        <div>
          <dt>Обязательные элементы</dt>
          <dd>{spec.requiredElements?.join(", ") || "Не определены"}</dd>
        </div>
        <div>
          <dt>Визуальные пожелания</dt>
          <dd>{spec.visualPreferences?.join(", ") || "Не определены"}</dd>
        </div>
        <div>
          <dt>Заголовок</dt>
          <dd>{spec.copy?.headline || "Не задан"}</dd>
        </div>
        <div>
          <dt>Описание</dt>
          <dd>{spec.copy?.description || "Не задано"}</dd>
        </div>
        <div>
          <dt>Основная кнопка</dt>
          <dd>{spec.copy?.primaryButton || "Не задана"}</dd>
        </div>
        <div>
          <dt>Вторая кнопка</dt>
          <dd>{spec.copy?.secondaryButton || "Не задана"}</dd>
        </div>
      </dl>
    );
  } catch {
    return <pre>{content}</pre>;
  }
}

function renderDesignTokens(content: string) {
  try {
    const tokens = JSON.parse(content) as Record<
      string,
      Record<string, string | number>
    >;

    return (
      <dl className={styles.spec}>
        {Object.entries(tokens).flatMap(([groupName, group]) =>
          Object.entries(group).map(([key, value]) => (
            <div key={`${groupName}-${key}`}>
              <dt>
                {groupName} · {key}
              </dt>
              <dd>{String(value)}</dd>
            </div>
          )),
        )}
      </dl>
    );
  } catch {
    return <pre>{content}</pre>;
  }
}

function SkeletonBlock({ lines = 4 }: { lines?: number }) {
  return (
    <div className={styles.skeletonBlock} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

hljs.registerLanguage("javascript", langJs);
hljs.registerLanguage("typescript", langTs);
hljs.registerLanguage("json", langJson);
hljs.registerLanguage("html", langHtml);
hljs.registerLanguage("xml", langHtml);
hljs.registerLanguage("css", langCss);
hljs.registerLanguage("scss", langCss);
hljs.registerLanguage("markdown", langMarkdown);

function CodeViewer({
  content,
  language,
  styles,
}: {
  content: string;
  language: string;
  styles: Record<string, string>;
}) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!codeRef.current) return;
    codeRef.current.removeAttribute("data-highlighted");
    codeRef.current.textContent = content;
    const lang = hljs.getLanguage(language) ? language : "plaintext";
    if (lang !== "plaintext") {
      hljs.highlightElement(codeRef.current);
    }
  }, [content, language]);

  const lines = content.split("\n");

  return (
    <div className={styles.codeWrapper}>
      <div className={styles.lineNumbers} aria-hidden="true">
        {lines.map((_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
      <pre className={styles.codeBlock}>
        <code ref={codeRef} />
      </pre>
    </div>
  );
}

type FileTreeNode =
  | { kind: "file"; name: string; path: string }
  | { kind: "dir"; name: string; children: FileTreeNode[] };

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes]
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    })
    .map((n) =>
      n.kind === "dir" ? { ...n, children: sortNodes(n.children) } : n,
    );
}

function buildFileTree(files: { path: string }[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let nodes = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        nodes.push({ kind: "file", name: part, path: file.path });
      } else {
        let dir = nodes.find(
          (n): n is Extract<FileTreeNode, { kind: "dir" }> =>
            n.kind === "dir" && n.name === part,
        );
        if (!dir) {
          dir = { kind: "dir", name: part, children: [] };
          nodes.push(dir);
        }
        nodes = dir.children;
      }
    }
  }

  return sortNodes(root);
}

function IconFile({ ext }: { ext: string }) {
  const colors: Record<string, string> = {
    ts: "#3178c6",
    tsx: "#3178c6",
    js: "#f7df1e",
    jsx: "#61dafb",
    json: "#f97316",
    html: "#e34c26",
    css: "#264de4",
    scss: "#cc6699",
    md: "#6b7280",
  };
  const color = colors[ext] ?? "#94a3b8";
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 2a1 1 0 011-1h6.586a1 1 0 01.707.293l2.414 2.414A1 1 0 0114 4.414V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2z"
        fill={color}
        opacity="0.85"
      />
    </svg>
  );
}

function TreeDirNode({
  node,
  selectedFile,
  depth,
  onSelect,
  styles,
}: {
  node: Extract<FileTreeNode, { kind: "dir" }>;
  selectedFile: string | null;
  depth: number;
  onSelect: (path: string) => void;
  styles: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className={styles.treeDir}>
      <button
        type="button"
        className={styles.treeDirLabel}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span
          className={styles.treeIcon}
          style={{ transform: isOpen ? "rotate(90deg)" : undefined }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 2l4 3-4 3"
              stroke="#6b7280"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={styles.treeDirName}>{node.name}</span>
      </button>
      {isOpen && (
        <ul className={styles.fileList2}>
          <FileTreeNodes
            nodes={node.children}
            selectedFile={selectedFile}
            depth={depth + 1}
            onSelect={onSelect}
            styles={styles}
          />
        </ul>
      )}
    </li>
  );
}

function FileTreeNodes({
  nodes,
  selectedFile,
  depth,
  onSelect,
  styles,
}: {
  nodes: FileTreeNode[];
  selectedFile: string | null;
  depth: number;
  onSelect: (path: string) => void;
  styles: Record<string, string>;
}) {
  return (
    <>
      {nodes.map((node) =>
        node.kind === "dir" ? (
          <TreeDirNode
            key={node.name}
            node={node}
            selectedFile={selectedFile}
            depth={depth}
            onSelect={onSelect}
            styles={styles}
          />
        ) : (
          <li key={node.path}>
            <button
              type="button"
              className={
                selectedFile === node.path
                  ? styles.fileItemActive
                  : styles.fileItem
              }
              style={{ paddingLeft: `${12 + depth * 16}px` }}
              onClick={() => onSelect(node.path)}
              title={node.path}
            >
              <span className={styles.treeIcon}>
                <IconFile ext={node.name.split(".").pop() ?? ""} />
              </span>
              <span className={styles.fileItemName}>{node.name}</span>
            </button>
          </li>
        ),
      )}
    </>
  );
}

const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
];
const TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/html",
  "text/css",
  "text/typescript",
  "text/javascript",
  "application/json",
];

function ArtifactViewer({
  runId,
  artifact,
  styles,
}: {
  runId: string;
  artifact: RunArtifact;
  styles: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isImage =
    artifact.mimeType && IMAGE_MIME_TYPES.includes(artifact.mimeType);
  const isText =
    artifact.mimeType && TEXT_MIME_TYPES.includes(artifact.mimeType);
  const contentQuery = useArtifactContentQuery(
    runId,
    isOpen && isText ? artifact.id : undefined,
  );
  const fileUrl = runsApi.getArtifactFileUrl(runId, artifact.id);
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
        <span className={styles.artifactPath}>{artifact.path}</span>
      </button>

      {isOpen && (
        <div className={styles.artifactBody}>
          {isImage && (
            <img
              src={fileUrl}
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
                href={fileUrl}
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

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
  };
  return map[ext] ?? "plaintext";
}

export default function RunDetailsPage() {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { runId = "" } = useParams();

  const TAB_IDS = TABS.map((t) => t.id);
  const rawTab = searchParams.get("tab");
  const activeTab: RunDetailsTab = TAB_IDS.includes(rawTab as RunDetailsTab)
    ? (rawTab as RunDetailsTab)
    : "overview";

  const setActiveTab = (tab: RunDetailsTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };
  const runQuery = useRunQuery(runId);
  const updateRunMutation = useUpdateRunMutation();
  const deleteRunMutation = useDeleteRunMutation();
  const downloadCodeMutation = useDownloadCodeMutation();
  const rebuildRunMutation = useRebuildRunMutation();
  const run = runQuery.data;
  const projectSpecArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "project_spec",
  );
  const referenceArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "reference_image",
  );
  const designDescriptionArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "design_description",
  );
  const designTokensArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "design_tokens",
  );
  const frontendProjectArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "frontend_project",
  );
  const buildLogArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "build_log",
  );
  const desktopScreenshotArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "desktop_screenshot",
  );
  const mobileScreenshotArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "mobile_screenshot",
  );
  const diffImageArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "diff_image",
  );
  const visualReportArtifact = run?.artifacts.find(
    (artifact) => artifact.type === "visual_report",
  );
  const projectSpecQuery = useArtifactContentQuery(
    run?.id ?? "",
    projectSpecArtifact?.id,
  );
  const designDescriptionQuery = useArtifactContentQuery(
    run?.id ?? "",
    designDescriptionArtifact?.id,
  );
  const designTokensQuery = useArtifactContentQuery(
    run?.id ?? "",
    designTokensArtifact?.id,
  );
  const visualReportQuery = useArtifactContentQuery(
    run?.id ?? "",
    visualReportArtifact?.id,
  );
  const buildLogQuery = useArtifactContentQuery(
    run?.id ?? "",
    buildLogArtifact?.id,
  );
  const codeFilesQuery = useCodeFilesQuery(run?.id ?? "", activeTab === "code");
  const codeFileContentQuery = useCodeFileContentQuery(
    run?.id ?? "",
    selectedFile,
  );
  const progress = getProgress(
    run?.currentStep ?? null,
    run?.status ?? "queued",
  );

  if (runQuery.isLoading) {
    return <p>Загружаем запуск...</p>;
  }

  if (runQuery.isError || !run) {
    return (
      <section className={styles.page}>
        <Link to="/">Назад к запускам</Link>
        <h1>Запуск недоступен</h1>
        <p>Не удалось загрузить данные запуска.</p>
      </section>
    );
  }

  const handleStartRename = () => {
    setDraftName(run.displayName || formatRunTitle(run.slug));
    setIsRenaming(true);
  };

  const handleSaveRename = () => {
    updateRunMutation.mutate(
      {
        runId: run.id,
        displayName: draftName.trim() || null,
      },
      {
        onSuccess: () => {
          setIsRenaming(false);
          toast.success("Название запуска обновлено");
        },
        onError: () => toast.error("Не удалось переименовать запуск"),
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!run) return;
    deleteRunMutation.mutate(run.id, {
      onSuccess: () => {
        setShowDeleteModal(false);
        navigate("/");
      },
      onError: () => toast.error("Не удалось удалить запуск"),
    });
  };

  return (
    <section className={styles.page}>
      <Link to="/">Назад к запускам</Link>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          {isRenaming ? (
            <div className={styles.renameForm}>
              <input
                value={draftName}
                maxLength={80}
                autoFocus
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSaveRename();
                  if (event.key === "Escape") setIsRenaming(false);
                }}
              />
              <button
                type="button"
                disabled={updateRunMutation.isPending}
                onClick={handleSaveRename}
              >
                Сохранить
              </button>
              <button type="button" onClick={() => setIsRenaming(false)}>
                Отмена
              </button>
            </div>
          ) : (
            <h1>{getRunTitle(run)}</h1>
          )}
          <div className={styles.headerMeta}>
            <RunStatusBadge status={run.status} />
            {run.score !== null && run.score !== undefined && (
              <span className={styles.scoreBadge}>Score: {run.score}/100</span>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={handleStartRename}>
            Переименовать
          </button>
          {frontendProjectArtifact && (
            <button
              type="button"
              disabled={downloadCodeMutation.isPending}
              onClick={() => downloadCodeMutation.mutate(run.id)}
            >
              {downloadCodeMutation.isPending ? "Скачивание..." : "Скачать код"}
            </button>
          )}
          <button
            type="button"
            disabled={rebuildRunMutation.isPending}
            onClick={() => rebuildRunMutation.mutate(run.id)}
            title="Пересобрать проект"
          >
            {rebuildRunMutation.isPending ? "Пересборка..." : "Пересобрать"}
          </button>
          <div className={styles.headerDivider} />
          <button
            type="button"
            className={styles.dangerButton}
            disabled={deleteRunMutation.isPending}
            onClick={() => setShowDeleteModal(true)}
          >
            Удалить
          </button>
        </div>
      </div>

      <div className={styles.progressPanel}>
        <div>
          <strong>{formatStep(run.currentStep)}</strong>
          <span>{progress}%</span>
        </div>
        <div className={styles.progressTrack}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Разделы запуска">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? styles.activeTab : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div key={activeTab} className={styles.tabContent}>
        {activeTab === "overview" && (
          <div className={styles.overviewGrid}>
            <div className={styles.panel}>
              <h2>Бриф</h2>
              <pre>{run.brief}</pre>
            </div>

            <div className={styles.panel}>
              <h2>Артефакты</h2>
              {run.artifacts.length === 0 && <SkeletonBlock lines={3} />}
              <ul className={styles.list}>
                {run.artifacts.map((artifact) => (
                  <li key={artifact.id}>
                    <strong>{formatArtifactType(artifact)}</strong>
                    <span>{artifact.path}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "reference" && (
          <div className={styles.previewPanel}>
            <h2>Визуальный референс</h2>
            {!referenceArtifact && <SkeletonBlock lines={6} />}
            {referenceArtifact && (
              <img
                src={runsApi.getArtifactFileUrl(run.id, referenceArtifact.id)}
                alt="Визуальный референс первого экрана"
              />
            )}
          </div>
        )}

        {activeTab === "result" && (
          <div className={styles.resultLayout}>
            <div className={styles.overviewGrid}>
              <div className={styles.panel}>
                <h2>Скриншоты</h2>
                <div className={styles.screenshotsGrid}>
                  {!desktopScreenshotArtifact && !mobileScreenshotArtifact && (
                    <SkeletonBlock lines={4} />
                  )}
                  {desktopScreenshotArtifact && (
                    <div className={styles.screenshotContainer}>
                      <h3>Desktop (1440×900)</h3>
                      <img
                        src={runsApi.getArtifactFileUrl(
                          run.id,
                          desktopScreenshotArtifact.id,
                        )}
                        alt="Скриншот desktop"
                        className={styles.screenshotImage}
                      />
                    </div>
                  )}
                  {mobileScreenshotArtifact && (
                    <div className={styles.screenshotContainer}>
                      <h3>Mobile (390×844)</h3>
                      <img
                        src={runsApi.getArtifactFileUrl(
                          run.id,
                          mobileScreenshotArtifact.id,
                        )}
                        alt="Скриншот mobile"
                        className={styles.screenshotImage}
                      />
                    </div>
                  )}
                </div>
              </div>

              {diffImageArtifact && (
                <div className={styles.panel}>
                  <h2>Сравнение (Diff)</h2>
                  <div className={styles.diffImageWrap}>
                    <img
                      src={runsApi.getArtifactFileUrl(
                        run.id,
                        diffImageArtifact.id,
                      )}
                      alt="Различия между референсом и результатом"
                      className={styles.diffImage}
                    />
                  </div>
                </div>
              )}
            </div>

            {visualReportArtifact && (
              <div className={styles.panel}>
                <h2>Отчет визуальной проверки</h2>
                {visualReportQuery.isLoading && <p>Загружаем отчет...</p>}
                {visualReportQuery.isError && (
                  <p>Не удалось загрузить отчет.</p>
                )}
                {visualReportQuery.data && (
                  <pre className={styles.markdown}>
                    {visualReportQuery.data.content}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "spec" && (
          <div className={styles.panel}>
            <h2>Спецификация проекта</h2>
            {!projectSpecArtifact && <SkeletonBlock lines={8} />}
            {projectSpecQuery.isLoading && (
              <p>Загружаем спецификацию проекта...</p>
            )}
            {projectSpecQuery.isError && (
              <p>Не удалось загрузить спецификацию проекта.</p>
            )}
            {projectSpecQuery.data &&
              renderProjectSpec(projectSpecQuery.data.content)}
          </div>
        )}

        {activeTab === "design" && (
          <div className={styles.overviewGrid}>
            <div className={styles.panel}>
              <h2>Описание дизайна</h2>
              {!designDescriptionArtifact && <SkeletonBlock lines={9} />}
              {designDescriptionQuery.isLoading && (
                <p>Загружаем описание дизайна...</p>
              )}
              {designDescriptionQuery.isError && (
                <p>Не удалось загрузить описание дизайна.</p>
              )}
              {designDescriptionQuery.data && (
                <pre>{designDescriptionQuery.data.content}</pre>
              )}
            </div>

            <div className={styles.panel}>
              <h2>Дизайн-токены</h2>
              {!designTokensArtifact && <SkeletonBlock lines={9} />}
              {designTokensQuery.isLoading && <p>Загружаем дизайн-токены...</p>}
              {designTokensQuery.isError && (
                <p>Не удалось загрузить дизайн-токены.</p>
              )}
              {designTokensQuery.data &&
                renderDesignTokens(designTokensQuery.data.content)}
            </div>
          </div>
        )}

        {activeTab === "code" && (
          <div className={styles.codeExplorer}>
            <div className={styles.fileTree}>
              <div className={styles.fileTreeHeader}>Файлы проекта</div>
              {codeFilesQuery.isLoading && <SkeletonBlock lines={6} />}
              {codeFilesQuery.isError && (
                <p className={styles.fileTreeEmpty}>Код ещё не сгенерирован</p>
              )}
              {codeFilesQuery.data && codeFilesQuery.data.length === 0 && (
                <p className={styles.fileTreeEmpty}>Нет файлов</p>
              )}
              {codeFilesQuery.data && codeFilesQuery.data.length > 0 && (
                <ul className={styles.fileList2}>
                  <FileTreeNodes
                    nodes={buildFileTree(codeFilesQuery.data)}
                    selectedFile={selectedFile}
                    depth={0}
                    onSelect={setSelectedFile}
                    styles={styles}
                  />
                </ul>
              )}
            </div>

            <div className={styles.fileViewer}>
              {!selectedFile && (
                <div className={styles.fileViewerEmpty}>
                  <p>Выберите файл слева</p>
                </div>
              )}
              {selectedFile && codeFileContentQuery.isLoading && (
                <div className={styles.codeLoading}>
                  <span className={styles.codeLoadingSpinner} />
                </div>
              )}
              {selectedFile && codeFileContentQuery.isError && (
                <p>Не удалось загрузить файл.</p>
              )}
              {selectedFile && codeFileContentQuery.data && (
                <>
                  <div className={styles.fileViewerPath}>
                    <div className={styles.fileViewerPathInfo}>
                      <span className={styles.fileViewerFileName}>
                        {selectedFile.split("/").pop()}
                      </span>
                      {selectedFile.includes("/") && (
                        <span className={styles.fileViewerDir}>
                          {selectedFile.substring(
                            0,
                            selectedFile.lastIndexOf("/"),
                          )}
                        </span>
                      )}
                    </div>
                    <span className={styles.fileViewerLang}>
                      {getLanguageFromPath(selectedFile)}
                    </span>
                  </div>
                  <CodeViewer
                    content={codeFileContentQuery.data.content}
                    language={getLanguageFromPath(selectedFile)}
                    styles={styles}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "artifacts" && (
          <div className={styles.artifactsList}>
            {run.artifacts.length === 0 && (
              <p className={styles.artifactsEmpty}>Нет артефактов</p>
            )}
            {run.artifacts.map((artifact) => (
              <ArtifactViewer
                key={artifact.id}
                runId={run.id}
                artifact={artifact}
                styles={styles}
              />
            ))}
          </div>
        )}

        {activeTab === "logs" && (
          <LogsPanel
            logs={run.logs}
            buildLogArtifact={buildLogArtifact}
            buildLogQuery={buildLogQuery}
          />
        )}
      </div>

      <Modal
        isOpen={showDeleteModal}
        title="Удалить запуск?"
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        isLoading={deleteRunMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      >
        {run && (
          <p>
            Запуск <strong>«{getRunTitle(run)}»</strong> и все его файлы в папке
            generated будут безвозвратно удалены.
          </p>
        )}
      </Modal>
    </section>
  );
}
