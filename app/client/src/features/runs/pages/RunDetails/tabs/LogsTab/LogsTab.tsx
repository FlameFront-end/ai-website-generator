import type { FC } from "react";

import { useArtifactContentQuery } from "@/api/services/runs";
import type { RunArtifact, RunLog } from "@/api/services/runs";

import { Panel } from "@/kit";

import { LogsPanel } from "../../../../components/LogsPanel/LogsPanel";

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
    <Panel>
      <LogsPanel
        logs={logs}
        buildLogArtifact={buildLogArtifact}
        buildLogQuery={buildLogQuery}
      />
    </Panel>
  );
};
