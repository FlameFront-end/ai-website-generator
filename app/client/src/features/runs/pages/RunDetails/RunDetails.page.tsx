import { useEffect, useRef, useState } from "react";

import { Link, useParams } from "react-router-dom";

import { useRunQuery, useRunStatusQuery } from "@/api/services/runs";
import { EmptyState, ErrorBoundary } from "@/kit";
import { ROUTES } from "@/model";

import {
  DeleteRunDialog,
  ProgressBar,
  RunDetailsTabContent,
  RunHeader,
  RunTabs,
} from "./components";
import {
  useActiveTab,
  useRunActions,
  useRunApproval,
  useRunArtifacts,
} from "./hooks";
import {
  CODE_RESTARTABLE_STATUSES,
  getEffectiveCurrentStep,
  isRunStatusActive,
  RESTARTABLE_STATUSES,
  STATUS_TO_TAB,
} from "./lib/run-status-flow";
import styles from "./RunDetails.module.scss";

export default function RunDetailsPage() {
  const { runId = "" } = useParams();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const runQuery = useRunQuery(runId);
  useRunStatusQuery(runId, isRunStatusActive(runQuery.data?.status));
  const { activeTab, setActiveTab } = useActiveTab();
  const actions = useRunActions();
  const artifacts = useRunArtifacts(runQuery.data);
  const approval = useRunApproval(() => void runQuery.refetch());
  const previousStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const status = runQuery.data?.status;
    if (!status) return;

    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (previousStatus !== "running") return;

    const nextTab = STATUS_TO_TAB[status as keyof typeof STATUS_TO_TAB];
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }, [runQuery.data?.status, setActiveTab]);

  if (runQuery.isLoading) {
    return (
      <section className={styles.page}>
        <EmptyState
          loading
          title="Загружаем проект..."
          description="Подготавливаем статус, артефакты и доступные действия."
        />
      </section>
    );
  }

  const run = runQuery.data;

  if (runQuery.isError || !run) {
    return (
      <section className={styles.page}>
        <EmptyState
          title="Проект недоступен"
          description="Не удалось загрузить данные проекта. Попробуйте обновить страницу."
        >
          <Link to={ROUTES.RUNS}>Назад к проектам</Link>
        </EmptyState>
      </section>
    );
  }

  const effectiveCurrentStep = getEffectiveCurrentStep(run.currentStep, {
    hasStyleVariants: Boolean(artifacts.style_variants),
    hasReferenceImage: Boolean(artifacts.reference_image),
    hasFrontendProject: Boolean(artifacts.frontend_project),
  });

  return (
    <section className={styles.page}>
      <RunHeader
        run={run}
        canDownloadCode={Boolean(artifacts.frontend_project)}
        isRenaming={actions.isRenaming}
        isDeleting={actions.isDeleting}
        isDownloading={actions.isDownloading}
        isRestartingStep={actions.isRestartingStep}
        isStoppingStep={actions.isStoppingStep}
        isRestartingCodeStep={actions.isRestartingCodeStep}
        canRestartStep={RESTARTABLE_STATUSES.has(run.status)}
        canStopStep={run.status === "running" || run.status === "queued"}
        canRestartCodeStep={
          Boolean(artifacts.frontend_project) &&
          CODE_RESTARTABLE_STATUSES.has(run.status) &&
          Boolean(artifacts.selected_style && artifacts.reference_image)
        }
        onRename={(displayName) => actions.rename(run.id, displayName)}
        onDelete={() => setShowDeleteModal(true)}
        onDownload={() => actions.download(run.id)}
        onRestartStep={() => actions.restartCurrentStep(run.id)}
        onStopStep={() => actions.stopCurrentStep(run.id)}
        onRestartCodeStep={() => actions.restartCodeStep(run.id)}
      />

      <ProgressBar step={run.currentStep} status={run.status} />

      <RunTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        status={run.status}
        currentStep={effectiveCurrentStep}
        onApprove={() => void approval.approveCurrentStep(run)}
        isApproving={approval.isApproving}
      />

      <ErrorBoundary key={activeTab}>
        <div className={styles.tabContent}>
          <RunDetailsTabContent
            activeTab={activeTab}
            artifacts={artifacts}
            run={run}
            onStyleSelected={() => runQuery.refetch().then(() => undefined)}
          />
        </div>
      </ErrorBoundary>

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
