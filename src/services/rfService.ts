import { api, mockDelay, readMock, USE_MOCK } from "./api";
import { emptyConfig, saveRfConfig } from "@/lib/rf-config";
import { emptyProfile, saveRfProfile, validateRfProfile } from "@/lib/rf-profile";
import type { Project, RFProfile, RFRequirements } from "@/types";
import type { RfConfig } from "@/lib/rf-config";
import type { RfProfileConfig } from "@/lib/rf-profile";

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
  /** RF profile validation — mock runs the existing rule set; FastAPI later. */
  async validateRFProfile(projectId: string, project: Project, cfg: RfConfig, prof: RfProfileConfig) {
    if (!USE_MOCK) return api.post<RfProfileValidation>(`/projects/${projectId}/rf/profile/validate`, prof);
    return checkRFProfile(project, cfg, prof);
  },
};

export interface RfProfileValidation {
  valid: boolean;
  status: "validated" | "warnings" | "failed";
  items: ReturnType<typeof validateRfProfile>;
  warnings: string[];
  errors: string[];
}

/** Synchronous validation used by screens for live feedback. */
export function checkRFProfile(project: Project, cfg: RfConfig, prof: RfProfileConfig): RfProfileValidation {
  const items = validateRfProfile(project, cfg, prof);
  const errors = items.filter((i) => i.status === "fail").map((i) => i.label);
  const warnings: string[] = [];
  return {
    valid: errors.length === 0,
    status: errors.length ? "failed" : warnings.length ? "warnings" : "validated",
    items,
    warnings,
    errors,
  };
}

/* Domain data + reactive store, exposed only through this service. */
export * from "@/lib/rf-config";

/* Domain data + reactive store, exposed only through this service. */
export * from "@/lib/rf-profile";
