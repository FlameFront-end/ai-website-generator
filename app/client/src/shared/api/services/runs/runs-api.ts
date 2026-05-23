import { axiosInstance } from "@/api";
import { API_ENDPOINTS } from "@/model";

import type {
  ArtifactContent,
  ClarifyBriefRequest,
  ClarifyBriefResponse,
  CodeFile,
  CodeFileContent,
  CreateRunRequest,
  CreateRunResponse,
  DeleteRunResponse,
  Run,
  RunStatus,
  SelectStyleRequest,
  StyleVariantsResponse,
  UpdateRunPinnedRequest,
  UpdateRunRequest,
} from "./types";

export const runsApi = {
  async clarifyBrief(
    payload: ClarifyBriefRequest,
  ): Promise<ClarifyBriefResponse> {
    const { data } = await axiosInstance.post<ClarifyBriefResponse>(
      `${API_ENDPOINTS.RUNS}/brief/clarify`,
      payload,
    );
    return data;
  },

  async createRun(payload: CreateRunRequest): Promise<CreateRunResponse> {
    const { data } = await axiosInstance.post<CreateRunResponse>(
      API_ENDPOINTS.RUNS,
      payload,
    );
    return data;
  },

  async getRuns(): Promise<Run[]> {
    const { data } = await axiosInstance.get<Run[]>(API_ENDPOINTS.RUNS);
    return data;
  },

  async getRun(id: string): Promise<Run> {
    const { data } = await axiosInstance.get<Run>(API_ENDPOINTS.run(id));
    return data;
  },

  async getArtifactContent(
    runId: string,
    artifactId: string,
  ): Promise<ArtifactContent> {
    const { data } = await axiosInstance.get<ArtifactContent>(
      API_ENDPOINTS.artifactContent(runId, artifactId),
    );
    return data;
  },

  async updateRun(runId: string, payload: UpdateRunRequest): Promise<Run> {
    const { data } = await axiosInstance.patch<Run>(
      API_ENDPOINTS.run(runId),
      payload,
    );
    return data;
  },

  async updateRunPinned(
    runId: string,
    payload: UpdateRunPinnedRequest,
  ): Promise<Run> {
    const { data } = await axiosInstance.patch<Run>(
      `${API_ENDPOINTS.run(runId)}/pinned`,
      payload,
    );
    return data;
  },

  async deleteRun(runId: string): Promise<DeleteRunResponse> {
    const { data } = await axiosInstance.delete<DeleteRunResponse>(
      API_ENDPOINTS.run(runId),
    );
    return data;
  },

  async rebuildRun(runId: string): Promise<{ id: string; status: RunStatus }> {
    const { data } = await axiosInstance.post<{
      id: string;
      status: RunStatus;
    }>(API_ENDPOINTS.rebuildRun(runId));
    return data;
  },

  async restartCurrentStep(
    runId: string,
  ): Promise<{ id: string; status: RunStatus }> {
    const { data } = await axiosInstance.post<{
      id: string;
      status: RunStatus;
    }>(API_ENDPOINTS.restartCurrentStep(runId));
    return data;
  },

  async stopCurrentStep(
    runId: string,
  ): Promise<{ id: string; status: RunStatus }> {
    const { data } = await axiosInstance.post<{
      id: string;
      status: RunStatus;
    }>(API_ENDPOINTS.stopCurrentStep(runId));
    return data;
  },
  async restartCodeStep(
    runId: string,
  ): Promise<{ id: string; status: RunStatus }> {
    const { data } = await axiosInstance.post<{
      id: string;
      status: RunStatus;
    }>(API_ENDPOINTS.restartCodeStep(runId));
    return data;
  },

  getArtifactFileUrl(runId: string, artifactId: string): string {
    return `${axiosInstance.defaults.baseURL}${API_ENDPOINTS.artifactFileEncoded(runId, artifactId)}`;
  },

  async getArtifactFile(runId: string, artifactId: string): Promise<Blob> {
    const { data } = await axiosInstance.get<Blob>(
      API_ENDPOINTS.artifactFile(runId, artifactId),
      {
        responseType: "blob",
      },
    );
    return data;
  },

  async getCodeFiles(runId: string): Promise<CodeFile[]> {
    const { data } = await axiosInstance.get<CodeFile[]>(
      API_ENDPOINTS.codeFiles(runId),
    );
    return data;
  },

  async getCodeFileContent(
    runId: string,
    filePath: string,
  ): Promise<CodeFileContent> {
    const { data } = await axiosInstance.get<CodeFileContent>(
      API_ENDPOINTS.codeFile(runId),
      { params: { path: filePath } },
    );
    return data;
  },

  async downloadCode(runId: string): Promise<Blob> {
    const { data } = await axiosInstance.get<Blob>(
      API_ENDPOINTS.downloadCode(runId),
      {
        responseType: "blob",
      },
    );
    return data;
  },

  async approveStep(
    runId: string,
    step: "style" | "reference" | "code" | "final",
  ): Promise<{ id: string; status: RunStatus }> {
    const { data } = await axiosInstance.post<{
      id: string;
      status: RunStatus;
    }>(API_ENDPOINTS.approveStep(runId), { step });
    return data;
  },

  async requestEdit(
    runId: string,
    step: "style" | "reference" | "code" | "final",
    instruction: string,
  ): Promise<{ id: string; status: RunStatus }> {
    const { data } = await axiosInstance.post<{
      id: string;
      status: RunStatus;
    }>(API_ENDPOINTS.editRequest(runId), { step, instruction });
    return data;
  },

  async getStyleVariants(runId: string): Promise<StyleVariantsResponse> {
    const { data } = await axiosInstance.get<StyleVariantsResponse>(
      API_ENDPOINTS.artifactContent(runId, "style-variants"),
    );
    return data;
  },

  async selectStyle(
    runId: string,
    payload: SelectStyleRequest,
  ): Promise<{ id: string; status: RunStatus }> {
    const { data } = await axiosInstance.post<{
      id: string;
      status: RunStatus;
    }>(`${API_ENDPOINTS.run(runId)}/select-style`, payload);
    return data;
  },
};
