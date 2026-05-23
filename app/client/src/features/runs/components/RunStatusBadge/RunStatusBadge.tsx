import type { RunStatus } from "@/api/services/runs";
import { Badge } from "@/kit";

import { STATUS_LABELS } from "../../lib/pipeline-labels";

interface RunStatusBadgeProps {
  status: RunStatus;
}

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  return <Badge variant="info">{STATUS_LABELS[status]}</Badge>;
}
