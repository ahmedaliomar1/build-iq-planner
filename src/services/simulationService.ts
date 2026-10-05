import { api, mockDelay, readMock, USE_MOCK } from "./api";
import { saveSimState, type SimState } from "@/lib/rf-simulation";
import type { InitialRFDesign, SimulationResponse } from "@/types";

/** RF engine boundary — deterministic mock engine now, FastAPI later. */
export const simulationService = {
  async runRFSimulation(projectId: string): Promise<SimulationResponse> {
    if (!USE_MOCK) return api.post(`/projects/${projectId}/simulation`);
    await mockDelay(200);
    saveSimState(projectId, { status: "running", startedAt: Date.now() } as Partial<SimState>);
    return { projectId, status: "processing", progress: 0 };
  },
  async getSimulationStatus(projectId: string): Promise<SimulationResponse> {
    if (!USE_MOCK) return api.get(`/projects/${projectId}/simulation/status`);
    const s = readMock<SimState>("apcp.rfsim.v1", projectId);
    const status =
      s?.status === "complete" ? "success" : s?.status === "running" ? "processing" : "idle";
    return { projectId, status, progress: status === "success" ? 100 : 0 };
  },
  async getInitialRFDesign(projectId: string): Promise<InitialRFDesign | null> {
    if (!USE_MOCK) return api.get(`/projects/${projectId}/simulation/result`);
    await mockDelay(150);
    return readMock<SimState>("apcp.rfsim.v1", projectId)?.design ?? null;
  },
  async getRFSimulationResults(projectId: string) {
    return (await this.getInitialRFDesign(projectId))?.kpis ?? null;
  },
};

/* Domain data + reactive store, exposed only through this service. */
export * from "@/lib/rf-simulation";
