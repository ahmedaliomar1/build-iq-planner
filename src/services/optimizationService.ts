import { api, mockDelay, readMock, USE_MOCK } from "./api";
import { saveOptState, type OptAntenna, type OptState } from "@/lib/rf-optimization";

const read = (id: string) => readMock<OptState>("apcp.rfopt.v1", id);
const write = async (id: string, antennas: OptAntenna[]) => {
  await mockDelay(120);
  saveOptState(id, { antennas });
  return antennas;
};

/** Optimization boundary — local recalculation stays in the editor hook. */
export const optimizationService = {
  async getOptimizedRFDesign(projectId: string): Promise<OptState | null> {
    if (!USE_MOCK) return api.get(`/projects/${projectId}/optimization`);
    return read(projectId);
  },
  async moveAntenna(projectId: string, antennaId: string, x: number, y: number) {
    if (!USE_MOCK) return api.put<OptAntenna[]>(`/projects/${projectId}/optimization/antennas/${antennaId}`, { x, y });
    return write(projectId, (read(projectId)?.antennas ?? []).map((a) => (a.id === antennaId ? { ...a, x, y } : a)));
  },
  async addAntenna(projectId: string, antenna: OptAntenna) {
    if (!USE_MOCK) return api.post<OptAntenna[]>(`/projects/${projectId}/optimization/antennas`, antenna);
    return write(projectId, [...(read(projectId)?.antennas ?? []), antenna]);
  },
  async deleteAntenna(projectId: string, antennaId: string) {
    if (!USE_MOCK) return api.delete<OptAntenna[]>(`/projects/${projectId}/optimization/antennas/${antennaId}`);
    return write(projectId, (read(projectId)?.antennas ?? []).filter((a) => a.id !== antennaId));
  },
  async updateAntennaParameters(projectId: string, antennaId: string, patch: Partial<OptAntenna>) {
    if (!USE_MOCK) return api.put<OptAntenna[]>(`/projects/${projectId}/optimization/antennas/${antennaId}`, patch);
    return write(projectId, (read(projectId)?.antennas ?? []).map((a) => (a.id === antennaId ? { ...a, ...patch } : a)));
  },
  async replaceAntenna(projectId: string, antennaId: string, next: OptAntenna) {
    return this.updateAntennaParameters(projectId, antennaId, { ...next, id: antennaId });
  },
  async recalculateLocalRF(projectId: string) {
    if (!USE_MOCK) return api.post(`/projects/${projectId}/optimization/recalculate`);
    await mockDelay(200);
    return read(projectId)?.kpis ?? null;
  },
  async saveOptimizedDesign(projectId: string, patch: Partial<OptState>) {
    if (!USE_MOCK) return api.put(`/projects/${projectId}/optimization`, patch);
    saveOptState(projectId, patch);
  },
  async getDesignHistory(projectId: string) {
    if (!USE_MOCK) return api.get(`/projects/${projectId}/optimization/history`);
    return read(projectId)?.versions ?? [];
  },
  async rollbackDesign(projectId: string, versionIndex: number) {
    if (!USE_MOCK) return api.post(`/projects/${projectId}/optimization/rollback`, { versionIndex });
    const v = read(projectId)?.versions?.[versionIndex];
    if (v) await write(projectId, v.antennas);
  },
};
