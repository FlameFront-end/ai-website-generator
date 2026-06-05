import { useMutation } from "@tanstack/react-query";

import { runsApi } from "./runs-api";

export function useDownloadCodeMutation() {
  return useMutation({
    mutationFn: async (runId: string) => {
      const blob = await runsApi.downloadCode(runId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "frontend-project.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
