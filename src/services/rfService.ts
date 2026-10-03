import { api, mockDelay, readMock, USE_MOCK } from "./api";
import { emptyConfig, saveRfConfig } from "@/lib/rf-config";
import { emptyProfile, saveRfProfile, validateRfProfile } from "@/lib/rf-profile";
import type { RFProfile, RFRequirements } from "@/types";

export const rfService = {
  async getRFRequirements(projectId: string): Promise<RFRequirements> {
    if (!USE_MOCK) return api.get(`/projects/${projectId}/rf/requirements`);
    await mockDelay(150);
    return { ...emptyConfig(), ...(readMock<RFRequirements>("apcp.rfconfig.v1", projectId) ?? {}) };
  },
  async updateRFRequirements(projectId: string, patch: Partial<RFRequirements>): Promise<void> {
    if (!USE_MOCK) return api.put(`/projects/${projectId}/rf/requirements`, patch);
    saveRfConfig(projectId, patch);
  },
  async generateRFRequirements(projectId: string, data: Partial<RFRequirements>): Promise<RFRequirements> {
    if (!USE_MOCK) return api.post(`/projects/${projectId}/rf/requirements`, data);
    await mockDelay();
    saveRfConfig(projectId, data);
    return this.getRFRequirements(projectId);
  },
  async getRFProfile(projectId: string): Promise<RFProfile> {
    if (!USE_MOCK) return api.get(`/projects/${projectId}/rf/profile`);
    await mockDelay(150);
    return { ...emptyProfile(), ...(readMock<RFProfile>("apcp.rfprofile.v1", projectId) ?? {}) };
  },
  async generateRFProfile(projectId: string, data: Partial<RFProfile>): Promise<RFProfile> {
    if (!USE_MOCK) return api.post(`/projects/${projectId}/rf/profile`, data);
    await mockDelay();
    saveRfProfile(projectId, data);
    return this.getRFProfile(projectId);
  },
};
