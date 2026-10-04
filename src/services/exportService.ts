import { api, mockDelay, readMock, USE_MOCK } from "./api";
import { downloadBlob, type ExportState } from "@/lib/export-package";

/** Export boundary — ZIP is assembled locally now; FastAPI returns binaries later. */
export const exportService = {
  async getExportStatus(projectId: string) {
    if (!USE_MOCK) return api.get<{ status: ExportState["status"] }>(`/projects/${projectId}/export/status`);
    return { status: readMock<ExportState>("apcp.export.v1", projectId)?.status ?? "idle" };
  },
  async getFinalPackage(projectId: string) {
    if (!USE_MOCK) return api.get<ExportState["finalPackage"]>(`/projects/${projectId}/export/package`);
    await mockDelay(150);
    return readMock<ExportState>("apcp.export.v1", projectId)?.finalPackage ?? null;
  },
  /** Backend-only binary download; mock mode builds files in the browser. */
  async download(projectId: string, format: "pdf" | "excel" | "png" | "json" | "zip", filename: string) {
    if (USE_MOCK) return false;
    downloadBlob(await api.blob(`/projects/${projectId}/export/${format}`), filename);
    return true;
  },
};

/* Domain data + reactive store, exposed only through this service. */
export * from "@/lib/export-package";
