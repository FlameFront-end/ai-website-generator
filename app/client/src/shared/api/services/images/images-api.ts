import { axiosInstance } from "@/api";
import { API_ENDPOINTS } from "@/model";

export interface GenerateImageRequest {
  prompt: string;
}

export interface GenerateImageResponse {
  image: string;
  model: string;
}

export const imagesApi = {
  async generateImage(
    payload: GenerateImageRequest,
  ): Promise<GenerateImageResponse> {
    const { data } = await axiosInstance.post<GenerateImageResponse>(
      API_ENDPOINTS.GENERATE_IMAGE,
      payload,
    );
    return data;
  },
};
