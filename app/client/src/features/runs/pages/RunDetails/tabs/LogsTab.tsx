import type { FC } from "react";

import { useArtifactContentQuery } from "@/api/services/runs";
import type { RunArtifact, RunLog } from "@/api/services/runs";

import { LogsPanel } from "../../../components/LogsPanel/logs-panel";

interface LogsTabProps {
  runId: string;
  logs: RunLog[];
  buildLogArtifact: RunArtifact | undefined;
  styles: Record<string, string>;
}

export const LogsTab: FC<LogsTabProps> = ({
  runId,
  logs,
  buildLogArtifact,
  styles,
}) => {
  const buildLogQuery = useArtifactContentQuery(runId, buildLogArtifact?.id);

  return (
    <div className={styles.panel}>
      <LogsPanel
        logs={logs}
        buildLogArtifact={buildLogArtifact}
        buildLogQuery={buildLogQuery}
      />
    </div>
  );
};
