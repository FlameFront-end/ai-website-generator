import { useEffect, useRef, useState } from "react";

import { Link, useParams } from "react-router-dom";

import { useRunQuery } from "@/api/services/runs";
import { runsApi } from "@/shared/api/services/runs/runs-api";
import { ROUTES } from "@/model";

import { DeleteRunDialog, ProgressBar, RunHeader, RunTabs } from "./components";
import { useActiveTab, useRunActions, useRunArtifacts } from "./hooks";
import {
  ArtifactsTab,
  CodeTab,
  LogsTab,
  OverviewTab,
  ReferenceTab,
  ResultTab,
  StyleTab,
} from "./tabs";
import styles from "./RunDetails.module.scss";

const STATUS_TO_TAB = {
  awaiting_style_selection: "style",
  awaiting_reference_approval: "reference",
  awaiting_final_approval: "result",
} as const;

const RESTARTABLE_STATUSES = new Set([
  "awaiting_style_selection",
  "awaiting_reference_approval",
  "failed",
  "pipeline_failed",
]);

const CODE_RESTARTABLE_STATUSES = new Set([
  "awaiting_code_approval",
  "awaiting_final_approval",
  "build_failed",
  "visual_failed",
  "needs_manual_review",
  "failed",
  "completed",
]);

export default function RunDetailsPage() {
  const { runId = "" } = useParams();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const runQuery = useRunQuery(runId);
  const { activeTab, setActiveTab } = useActiveTab();
  const actions = useRunActions();
  const artifacts = useRunArtifacts(runQuery.data);
  const previousStatusRef = useRef<string | null>(null);

  const getStepFromStatus = (
    status: string,
  ): "style" | "reference" | "code" | "final" | null => {
    if (status === "awaiting_style_selection") return "style";
    if (status === "awaiting_reference_approval") return "reference";
    if (status === "awaiting_final_approval") return "final";
    return null;
  };

  const handleApprove = async () => {
    if (!run) return;
    const step = getStepFromStatus(run.status);
    if (!step) return;

    setIsApproving(true);
    try {
      await runsApi.approveStep(run.id, step);
      runQuery.refetch();
    } catch (error) {
      console.error("Failed to approve step:", error);
    } finally {
      setIsApproving(false);
    }
  };

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
        <div className={styles.loadingState}>
          <span />
          <h1>Загружаем проект...</h1>
          <p>Подготавливаем статус, артефакты и доступные действия.</p>
        </div>
      </section>
    );
  }

  const run = runQuery.data;

  if (runQuery.isError || !run) {
    return (
      <section className={styles.page}>
        <div className={styles.emptyPageState}>
          <Link to={ROUTES.RUNS}>Назад к проектам</Link>
          <h1>Проект недоступен</h1>
          <p>
            Не удалось загрузить данные проекта. Попробуйте обновить страницу.
          </p>
        </div>
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
        onApprove={handleApprove}
        isApproving={isApproving}
      />

      <div key={activeTab} className={styles.tabContent}>
        {activeTab === "overview" && <OverviewTab run={run} />}

        {activeTab === "reference" && (
          <ReferenceTab
            runId={run.id}
            artifact={artifacts.reference_image}
            blocks={artifacts.reference_blocks}
          />
        )}

        {activeTab === "result" && (
          <ResultTab
            runId={run.id}
            desktopScreenshot={artifacts.desktop_screenshot}
            mobileScreenshot={artifacts.mobile_screenshot}
            diffImage={artifacts.diff_image}
            visualReport={artifacts.visual_report}
          />
        )}

        {activeTab === "style" && (
          <StyleTab
            runId={run.id}
            status={run.status}
            variantsArtifact={artifacts.style_variants}
            imageArtifacts={artifacts.style_variant_images}
            selectedStyleArtifact={artifacts.selected_style}
            onSelected={() => void runQuery.refetch()}
          />
        )}

        {activeTab === "code" && <CodeTab runId={run.id} />}

        {activeTab === "artifacts" && <ArtifactsTab run={run} />}

        {activeTab === "logs" && (
          <LogsTab
            runId={run.id}
            logs={run.logs}
            buildLogArtifact={artifacts.build_log}
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

function getEffectiveCurrentStep(
  currentStep: string | null | undefined,
  artifacts: {
    hasStyleVariants: boolean;
    hasReferenceImage: boolean;
    hasFrontendProject: boolean;
  },
): string {
  if (currentStep && currentStep !== "pipeline_failed") {
    return currentStep;
  }

  if (!artifacts.hasStyleVariants) {
    return "queued";
  }

  if (!artifacts.hasReferenceImage) {
    return "awaiting_style_selection";
  }

  if (!artifacts.hasFrontendProject) {
    return "awaiting_reference_approval";
  }

  return "awaiting_code_approval";
}
