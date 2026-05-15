import { useEffect, useRef, useState } from "react";

import { Link, useParams } from "react-router-dom";

import { useRunQuery } from "@/api/services/runs";
import { runsApi } from "@/shared/api/services/runs/runs.api";
import { ROUTES } from "@/model";

import { DeleteRunDialog, ProgressBar, RunHeader, RunTabs } from "./components";
import { useActiveTab, useRunActions, useRunArtifacts } from "./hooks";
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

const STATUS_TO_TAB = {
  awaiting_spec_approval: "spec",
  awaiting_design_approval: "design",
  awaiting_reference_approval: "reference",
  awaiting_final_approval: "result",
} as const;

const RESTARTABLE_STATUSES = new Set([
  "awaiting_spec_approval",
  "awaiting_design_approval",
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
  ): "spec" | "design" | "reference" | "code" | "final" | null => {
    if (status === "awaiting_spec_approval") return "spec";
    if (status === "awaiting_design_approval") return "design";
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
    hasProjectSpec: Boolean(artifacts.project_spec),
    hasDesignTokens: Boolean(artifacts.design_tokens),
    hasDesignDescription: Boolean(artifacts.design_description),
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
          Boolean(
            artifacts.project_spec &&
            artifacts.design_tokens &&
            artifacts.design_description,
          )
        }
        onRename={(displayName) => actions.rename(run.id, displayName)}
        onDelete={() => setShowDeleteModal(true)}
        onDownload={() => actions.download(run.id)}
        onRestartStep={() => actions.restartCurrentStep(run.id)}
        onStopStep={() => actions.stopCurrentStep(run.id)}
        onRestartCodeStep={() => actions.restartCodeStep(run.id)}
        styles={styles}
      />

      <ProgressBar step={run.currentStep} status={run.status} styles={styles} />

      <RunTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        styles={styles}
        status={run.status}
        currentStep={effectiveCurrentStep}
        onApprove={handleApprove}
        isApproving={isApproving}
      />

      <div key={activeTab} className={styles.tabContent}>
        {activeTab === "overview" && <OverviewTab run={run} styles={styles} />}

        {activeTab === "reference" && (
          <ReferenceTab
            runId={run.id}
            artifact={artifacts.reference_image}
            blocks={artifacts.reference_blocks}
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

        {activeTab === "artifacts" && (
          <ArtifactsTab run={run} styles={styles} />
        )}

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

function getEffectiveCurrentStep(
  currentStep: string | null | undefined,
  artifacts: {
    hasProjectSpec: boolean;
    hasDesignTokens: boolean;
    hasDesignDescription: boolean;
    hasReferenceImage: boolean;
    hasFrontendProject: boolean;
  },
): string {
  if (currentStep && currentStep !== "pipeline_failed") {
    return currentStep;
  }

  if (!artifacts.hasProjectSpec) {
    return "queued";
  }

  if (!artifacts.hasDesignTokens || !artifacts.hasDesignDescription) {
    return "awaiting_spec_approval";
  }

  if (!artifacts.hasReferenceImage) {
    return "awaiting_design_approval";
  }

  if (!artifacts.hasFrontendProject) {
    return "awaiting_reference_approval";
  }

  return "awaiting_code_approval";
}
