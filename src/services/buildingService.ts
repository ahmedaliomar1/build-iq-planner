import { api, mockDelay, USE_MOCK } from "./api";
import { saveModel, updateProject } from "@/lib/project-store";
import { projectService } from "./projectService";
import type { DigitalBuilding, FileUploadResponse } from "@/types";

/** AI drawing analysis boundary — mock now, FastAPI + AI engine later. */
export const buildingService = {
  async uploadBuildingFile(projectId: string, file: File): Promise<FileUploadResponse> {
    if (!USE_MOCK) {
      const form = new FormData();
      form.append("file", file);
      return api.post(`/projects/${projectId}/building/upload`, form);
    }
    await mockDelay(300);
    return { fileId: `file_${Date.now()}`, name: file.name, size: file.size, uploadedAt: Date.now() };
  },
  async analyzeBuilding(projectId: string): Promise<DigitalBuilding | null> {
    if (!USE_MOCK) return api.post(`/projects/${projectId}/building/analyze`);
    await mockDelay(600);
    return (await projectService.getProject(projectId))?.model ?? null;
  },
  async getDigitalBuilding(projectId: string): Promise<DigitalBuilding | null> {
    if (!USE_MOCK) return api.get(`/projects/${projectId}/building`);
    return (await projectService.getProject(projectId))?.model ?? null;
  },
  async updateDigitalBuilding(projectId: string, model: DigitalBuilding): Promise<void> {
    if (!USE_MOCK) return api.put(`/projects/${projectId}/building`, model);
    updateProject(projectId, { model });
  },
  async validateDigitalBuilding(projectId: string): Promise<{ valid: boolean; issues: string[] }> {
    if (!USE_MOCK) return api.post(`/projects/${projectId}/building/validate`);
    const model = await this.getDigitalBuilding(projectId);
    const walls = model?.objects.filter((o) => o.kind === "wall").length ?? 0;
    return walls > 0 ? { valid: true, issues: [] } : { valid: false, issues: ["No walls detected"] };
  },
  async saveDigitalBuilding(projectId: string, model: DigitalBuilding, label: string): Promise<void> {
    if (!USE_MOCK) return api.put(`/projects/${projectId}/building`, { model, label });
    await mockDelay(150);
    saveModel(projectId, model, label);
  },
};

/* Domain data + reactive store, exposed only through this service. */
export * from "@/lib/building-model";
