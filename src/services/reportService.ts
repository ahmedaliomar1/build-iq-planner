import { api, mockDelay, readMock, USE_MOCK } from "./api";
import {
  buildReportDocument,
  type ReportContext,
  type ReportDocument,
  type ReportId,
  type ReportsState,
} from "@/lib/reports";

/** Report boundary — document assembly runs locally until FastAPI renders it. */
export const reportService = {
  async getReports(projectId: string) {
    if (!USE_MOCK) return api.get<ReportsState["reports"]>(`/projects/${projectId}/reports`);
    return readMock<ReportsState>("apcp.reports.v1", projectId)?.reports ?? [];
  },
  async getReportStatus(projectId: string) {
    if (!USE_MOCK) return api.get<{ status: ReportsState["status"] }>(`/projects/${projectId}/reports/status`);
    return { status: readMock<ReportsState>("apcp.reports.v1", projectId)?.status ?? "idle" };
  },
  async getReportPreview(projectId: string, id: ReportId, ctx: ReportContext): Promise<ReportDocument> {
    if (!USE_MOCK) return api.get(`/projects/${projectId}/reports/${id}`);
    await mockDelay(150);
    return buildReportDocument(id, ctx, "v1.0", Date.now());
  },
};

/* Domain data + reactive store, exposed only through this service. */
export * from "@/lib/reports";
