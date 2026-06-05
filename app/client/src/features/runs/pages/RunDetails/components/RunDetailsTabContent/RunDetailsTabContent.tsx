import type { FC } from "react";

import type { Run } from "@/api/services/runs";

import type { RunArtifactsMap } from "../../hooks";
import type { RunDetailsTab } from "../../lib/types";
import {
  ArtifactsTab,
  CodeTab,
  LogsTab,
  OverviewTab,
  ReferenceTab,
  ResultTab,
  StyleTab,
} from "../../tabs";

interface RunDetailsTabContentProps {
  activeTab: RunDetailsTab;
  artifacts: RunArtifactsMap;
  run: Run;
  onStyleSelected: () => Promise<void> | void;
}

export const RunDetailsTabContent: FC<RunDetailsTabContentProps> = ({
  activeTab,
  artifacts,
  run,
  onStyleSelected,
}) => {
  if (activeTab === "overview") return <OverviewTab run={run} />;

  if (activeTab === "reference") {
    return (
      <ReferenceTab
        runId={run.id}
        artifact={artifacts.reference_image}
        blocks={artifacts.reference_blocks}
      />
    );
  }

  if (activeTab === "result") {
    return (
      <ResultTab
        runId={run.id}
        desktopScreenshot={artifacts.desktop_screenshot}
        mobileScreenshot={artifacts.mobile_screenshot}
        diffImage={artifacts.diff_image}
        visualReport={artifacts.visual_report}
      />
    );
  }

  if (activeTab === "style") {
    return (
      <StyleTab
        runId={run.id}
        status={run.status}
        variantsArtifact={artifacts.style_variants}
        imageArtifacts={artifacts.style_variant_images}
        selectedStyleArtifact={artifacts.selected_style}
        onSelected={onStyleSelected}
      />
    );
  }

  if (activeTab === "code") return <CodeTab runId={run.id} />;
  if (activeTab === "artifacts") return <ArtifactsTab run={run} />;

  return <LogsTab runId={run.id} buildLogArtifact={artifacts.build_log} />;
};
