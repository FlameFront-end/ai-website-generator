import { useState } from "react";

import { Link, useParams } from "react-router-dom";

import { useRunQuery } from "@/api/services/runs";

import {
  DeleteRunDialog,
  ProgressBar,
  RunHeader,
  RunTabs,
} from "./components";
import {
  useActiveTab,
  useRunActions,
  useRunArtifacts,
} from "./hooks";
import {
  ArtifactsTab,
  CodeTab,
  DesignTab,
  LogsTab,
  OverviewTab,
  ReferenceTab,
  ResultTab,
  SpecTab,
} from "./tabs";
import styles from "./run-details.module.scss";

export default function RunDetailsPage() {
  const { runId = "" } = useParams();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const runQuery = useRunQuery(runId);
  const { activeTab, setActiveTab } = useActiveTab();
  const actions = useRunActions();
  const artifacts = useRunArtifacts(runQuery.data);

  if (runQuery.isLoading) {
    return <p>Загружаем запуск...</p>;
  }

  const run = runQuery.data;

  if (runQuery.isError || !run) {
    return (
      <section className={styles.page}>
        <Link to="/">Назад к запускам</Link>
        <h1>Запуск недоступен</h1>
        <p>Не удалось загрузить данные запуска.</p>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Link to="/">Назад к запускам</Link>

      <RunHeader
        run={run}
        hasFrontendProject={Boolean(artifacts.frontend_project)}
        isRenaming={actions.isRenaming}
        isDeleting={actions.isDeleting}
        isDownloading={actions.isDownloading}
        isRebuilding={actions.isRebuilding}
        onRename={(displayName) => actions.rename(run.id, displayName)}
        onDelete={() => setShowDeleteModal(true)}
        onDownload={() => actions.download(run.id)}
        onRebuild={() => actions.rebuild(run.id)}
        styles={styles}
      />

      <ProgressBar
        step={run.currentStep}
        status={run.status}
        styles={styles}
      />

      <RunTabs activeTab={activeTab} onChange={setActiveTab} styles={styles} />

      <div key={activeTab} className={styles.tabContent}>
        {activeTab === "overview" && <OverviewTab run={run} styles={styles} />}

        {activeTab === "reference" && (
          <ReferenceTab
            runId={run.id}
            artifact={artifacts.reference_image}
            styles={styles}
          />
        )}

        {activeTab === "result" && (
          <ResultTab
            runId={run.id}
            desktopScreenshot={artifacts.desktop_screenshot}
            mobileScreenshot={artifacts.mobile_screenshot}
            diffImage={artifacts.diff_image}
            visualReport={artifacts.visual_report}
            styles={styles}
          />
        )}

        {activeTab === "spec" && (
          <SpecTab
            runId={run.id}
            artifact={artifacts.project_spec}
            styles={styles}
          />
        )}

        {activeTab === "design" && (
          <DesignTab
            runId={run.id}
            designDescription={artifacts.design_description}
            designTokens={artifacts.design_tokens}
            styles={styles}
          />
        )}

        {activeTab === "code" && <CodeTab runId={run.id} styles={styles} />}

        {activeTab === "artifacts" && <ArtifactsTab run={run} styles={styles} />}

        {activeTab === "logs" && (
          <LogsTab
            runId={run.id}
            logs={run.logs}
            buildLogArtifact={artifacts.build_log}
            styles={styles}
          />
        )}
      </div>

      <DeleteRunDialog
        run={run}
        isOpen={showDeleteModal}
        isLoading={actions.isDeleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          actions.remove(run.id);
          setShowDeleteModal(false);
        }}
      />
    </section>
  );
}
