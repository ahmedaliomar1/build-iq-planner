import { api, mockDelay, readMock, USE_MOCK } from "./api";
import { BOM_VENDORS, compareVendors, saveBomState, type BomState } from "@/lib/bom";
import type { EngineeringBOM } from "@/types";

const read = (id: string) => readMock<BomState>("apcp.bom.v1", id);

/** Pricing/BOM boundary — placeholder pricing DB now, FastAPI later. */
export const bomService = {
  async generateEngineeringBOM(projectId: string) {
    if (!USE_MOCK) return api.post<EngineeringBOM>(`/projects/${projectId}/bom`);
    await mockDelay();
    saveBomState(projectId, { status: "running" } as Partial<BomState>);
    return null;
  },
  async getBOM(projectId: string): Promise<BomState | null> {
    if (!USE_MOCK) return api.get(`/projects/${projectId}/bom`);
    return read(projectId);
  },
  async updateBOM(projectId: string, patch: Partial<BomState>) {
    if (!USE_MOCK) return api.put(`/projects/${projectId}/bom`, patch);
    saveBomState(projectId, patch);
    return null;
  },
  async getVendorPricing() {
    if (!USE_MOCK) return api.get<typeof BOM_VENDORS>("/vendors");
    await mockDelay(150);
    return BOM_VENDORS;
  },
  compareVendors,
  async selectVendor(projectId: string, vendorId: string) {
    if (!USE_MOCK) return api.put(`/projects/${projectId}/bom/vendor`, { vendorId });
    saveBomState(projectId, { vendorId } as Partial<BomState>);
    return null;
  },
};

/* Domain data + reactive store, exposed only through this service. */
export * from "@/lib/bom";
