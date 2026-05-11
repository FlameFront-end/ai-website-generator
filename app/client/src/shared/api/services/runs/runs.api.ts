import axiosInstance from '@/shared/api/axiosInstance'

import type { ArtifactContent, CreateRunRequest, CreateRunResponse, DeleteRunResponse, Run, UpdateRunRequest } from './types'

export const runsApi = {
  async createRun(payload: CreateRunRequest): Promise<CreateRunResponse> {
    const { data } = await axiosInstance.post<CreateRunResponse>('/runs', payload)
    return data
  },

  async getRuns(): Promise<Run[]> {
    const { data } = await axiosInstance.get<Run[]>('/runs')
    return data
  },

  async getRun(id: string): Promise<Run> {
    const { data } = await axiosInstance.get<Run>(`/runs/${id}`)
    return data
  },

  async getArtifactContent(runId: string, artifactId: string): Promise<ArtifactContent> {
    const { data } = await axiosInstance.get<ArtifactContent>(`/runs/${runId}/artifacts/${artifactId}/content`)
    return data
  },

  async updateRun(runId: string, payload: UpdateRunRequest): Promise<Run> {
    const { data } = await axiosInstance.patch<Run>(`/runs/${runId}`, payload)
    return data
  },

  async deleteRun(runId: string): Promise<DeleteRunResponse> {
    const { data } = await axiosInstance.delete<DeleteRunResponse>(`/runs/${runId}`)
    return data
  },

  getArtifactFileUrl(runId: string, artifactId: string): string {
    return `${axiosInstance.defaults.baseURL}/runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(
      artifactId,
    )}/file`
  },
}
