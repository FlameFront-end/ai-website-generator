import { RunStatus } from '../../../../common/enums';

export type RunActionResponse = Readonly<{
  id: string;
  status: RunStatus;
}>;
