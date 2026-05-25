import type { FC } from "react";

import { useArtifactContentQuery, useRunLogsQuery } from "@/api/services/runs";
import type { RunArtifact } from "@/api/services/runs";

import { Panel } from "@/kit";

import { LogsPanel } from "../../../../components/LogsPanel/LogsPanel";

interface LogsTabProps {
  runId: string;
  buildLogArtifact: RunArtifact | undefined;
}

export const LogsTab: FC<LogsTabProps> = ({ runId, buildLogArtifact }) => {
  const logsQuery = useRunLogsQuery(runId);
  const buildLogQuery = useArtifactContentQuery(runId, buildLogArtifact?.id);

  return (
    <Panel>
      <LogsPanel
        logs={logsQuery.data?.items ?? []}
        buildLogArtifact={buildLogArtifact}
        buildLogQuery={buildLogQuery}
      />
    </Panel>
  );
};
