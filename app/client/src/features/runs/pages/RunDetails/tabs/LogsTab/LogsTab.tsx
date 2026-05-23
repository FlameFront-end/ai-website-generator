import type { FC } from "react";

import { useArtifactContentQuery } from "@/api/services/runs";
import type { RunArtifact, RunLog } from "@/api/services/runs";

import { LogsPanel } from "../../../../components/LogsPanel/LogsPanel";

import shared from "../../lib/run-details-shared.module.scss";

interface LogsTabProps {
  runId: string;
  logs: RunLog[];
  buildLogArtifact: RunArtifact | undefined;
}

export const LogsTab: FC<LogsTabProps> = ({
  runId,
  logs,
  buildLogArtifact,
}) => {
  const buildLogQuery = useArtifactContentQuery(runId, buildLogArtifact?.id);

  return (
    <div className={shared.panel}>
      <LogsPanel
        logs={logs}
        buildLogArtifact={buildLogArtifact}
        buildLogQuery={buildLogQuery}
      />
    </div>
  );
};
