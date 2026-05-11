import { axiosInstance } from "@/api";

import type {
  ArtifactContent,
  CodeFile,
  CodeFileContent,
  CreateRunRequest,
  CreateRunResponse,
  DeleteRunResponse,
  Run,
  RunStatus,
  UpdateRunRequest,
} from "./types";

export const runsApi = {
  async createRun(payload: CreateRunRequest): Promise<CreateRunResponse> {
    const { data } = await axiosInstance.post<CreateRunResponse>(
      "/runs",
      payload,
    );
    return data;
  },

  async getRuns(): Promise<Run[]> {
    const { data } = await axiosInstance.get<Run[]>("/runs");
    return data;
  },

  async getRun(id: string): Promise<Run> {
    const { data } = await axiosInstance.get<Run>(`/runs/${id}`);
    return data;
  },

  async getArtifactContent(
    runId: string,
    artifactId: string,
  ): Promise<ArtifactContent> {
    const { data } = await axiosInstance.get<ArtifactContent>(
      `/runs/${runId}/artifacts/${artifactId}/content`,
    );
    return data;
  },

  async updateRun(runId: string, payload: UpdateRunRequest): Promise<Run> {
    const { data } = await axiosInstance.patch<Run>(`/runs/${runId}`, payload);
    return data;
  },

  async deleteRun(runId: string): Promise<DeleteRunResponse> {
    const { data } = await axiosInstance.delete<DeleteRunResponse>(
      `/runs/${runId}`,
    );
    return data;
  },

  async rebuildRun(runId: string): Promise<{ id: string; status: RunStatus }> {
    const { data } = await axiosInstance.post<{
      id: string;
      status: RunStatus;
    }>(`/runs/${runId}/rebuild`);
    return data;
  },

  getArtifactFileUrl(runId: string, artifactId: string): string {
    return `${axiosInstance.defaults.baseURL}/runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(
      artifactId,
    )}/file`;
  },

  async getArtifactFile(runId: string, artifactId: string): Promise<Blob> {
    const { data } = await axiosInstance.get<Blob>(
      `/runs/${runId}/artifacts/${artifactId}/file`,
      {
        responseType: "blob",
      },
    );
    return data;
  },

  async getCodeFiles(runId: string): Promise<CodeFile[]> {
    const { data } = await axiosInstance.get<CodeFile[]>(
      `/runs/${runId}/code-files`,
    );
    return data;
  },

  async getCodeFileContent(
    runId: string,
    filePath: string,
  ): Promise<CodeFileContent> {
    const { data } = await axiosInstance.get<CodeFileContent>(
      `/runs/${runId}/code-file`,
      { params: { path: filePath } },
    );
    return data;
  },

  async downloadCode(runId: string): Promise<Blob> {
    const { data } = await axiosInstance.get<Blob>(
      `/runs/${runId}/download-code`,
      {
        responseType: "blob",
      },
    );
    return data;
  },
};
