import { api, mockDelay, USE_MOCK } from "./api";
import { createProject, deleteProject, updateProject } from "@/lib/project-store";
import type { Project, ProjectWorkflowStatus } from "@/types";

const KEY = "apcp.projects.v1";
const readAll = (): Project[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Project[];
  } catch {
    return [];
  }
};

type NewProject = Parameters<typeof createProject>[0];

export const projectService = {
  async getProjects(): Promise<Project[]> {
    if (!USE_MOCK) return api.get("/projects");
    await mockDelay(200);
    return readAll();
  },
  async getProject(id: string): Promise<Project | null> {
    if (!USE_MOCK) return api.get(`/projects/${id}`);
    await mockDelay(200);
    return readAll().find((p) => p.id === id) ?? null;
  },
  async createProject(input: NewProject): Promise<Project> {
    if (!USE_MOCK) return api.post("/projects", input);
    await mockDelay();
    return createProject(input);
  },
  async updateProject(id: string, patch: Partial<Project>): Promise<void> {
    if (!USE_MOCK) return api.put(`/projects/${id}`, patch);
    await mockDelay(150);
    updateProject(id, patch);
  },
  async deleteProject(id: string): Promise<void> {
    if (!USE_MOCK) return api.delete(`/projects/${id}`);
    await mockDelay(150);
    deleteProject(id);
  },
  async duplicateProject(id: string): Promise<Project | null> {
    if (!USE_MOCK) return api.post(`/projects/${id}/duplicate`);
    const src = readAll().find((p) => p.id === id);
    if (!src) return null;
    const copy = createProject({ name: `${src.name} (copy)`, network: src.network, country: src.country, buildingType: src.buildingType, files: src.files });
    updateProject(copy.id, { model: src.model });
    return copy;
  },
  async archiveProject(id: string, archived: boolean): Promise<void> {
    if (!USE_MOCK) return api.put(`/projects/${id}`, { archived });
    await mockDelay(150);
    updateProject(id, { archived });
  },
  async getProjectHistory(id: string): Promise<Project["versions"]> {
    if (!USE_MOCK) return api.get(`/projects/${id}/history`);
    return readAll().find((p) => p.id === id)?.versions ?? [];
  },
};

type Slice = Record<string, unknown>;
const slice = (key: string, projectId: string): Slice | null => {
  if (typeof window === "undefined") return null;
  try {
    return (JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, Slice>)[projectId] ?? null;
  } catch {
    return null;
  }
};

/** Derives the dashboard workflow status from each stage's saved output. */
export function workflowStatus(projectId: string, base: Project["status"]): ProjectWorkflowStatus {
  const exp = slice("apcp.export.v1", projectId);
  const rep = slice("apcp.reports.v1", projectId);
  const bom = slice("apcp.bom.v1", projectId);
  const opt = slice("apcp.rfopt.v1", projectId);
  const sim = slice("apcp.rfsim.v1", projectId);
  if (exp?.["finalPackage"] && exp["status"] === "done") return "Completed";
  if (rep?.["status"] === "done" && Array.isArray(exp?.["history"]) && (exp["history"] as unknown[]).length) return "Export Ready";
  if (rep?.["status"] === "done") return "Reports Ready";
  if (bom?.["savedVersion"] || bom?.["status"] === "done") return "BOM Ready";
  if (opt?.["savedAt"]) return "Optimization Completed";
  if (Array.isArray(opt?.["antennas"]) && (opt["antennas"] as unknown[]).length) return "Optimization";
  if (sim?.["status"] === "complete") return "Simulation Completed";
  if (sim?.["status"] === "running") return "Simulation Running";
  if (slice("apcp.rfprofile.v1", projectId)) return "RF Profile Ready";
  if (slice("apcp.rfconfig.v1", projectId)) return "RF Configuration";
  if (base === "ready") return "Building Validated";
  if (base === "analyzing" || base === "review" || base === "editing") return "Building Analysis";
  return "Draft";
}

export interface ProjectSummary {
  status: ProjectWorkflowStatus;
  technology: string | null;
  coverage: number | null;
  capacity: number | null;
  antennas: number | null;
  estimatedCost: number | null;
  completedAt: number | null;
  vendor: string | null;
  version: string | null;
}

/** Engineering KPIs for cards and the archive — read from stage outputs, never duplicated. */
export function projectSummary(p: Project): ProjectSummary {
  const exp = slice("apcp.export.v1", p.id);
  const pkg = exp?.["finalPackage"] as
    | { version: string; timestamp: number; kpis: { coverage: number; capacity: number; antennas: number; vendor: string; estimatedCost: number }; projectInformation: { technology: string } }
    | undefined;
  const sim = slice("apcp.rfsim.v1", p.id)?.["design"] as
    | { kpis: { coverage: number; capacity: number; antennas: number }; projectInformation: { technology: string } }
    | undefined;
  const opt = slice("apcp.rfopt.v1", p.id);
  const optK = opt?.["kpis"] as { coverage: number; capacity: number } | undefined;
  const optA = opt?.["antennas"] as unknown[] | undefined;
  return {
    status: workflowStatus(p.id, p.status),
    technology: pkg?.projectInformation.technology ?? sim?.projectInformation.technology ?? null,
    coverage: pkg?.kpis.coverage ?? optK?.coverage ?? sim?.kpis.coverage ?? null,
    capacity: pkg?.kpis.capacity ?? optK?.capacity ?? sim?.kpis.capacity ?? null,
    antennas: pkg?.kpis.antennas ?? (optA?.length || null) ?? sim?.kpis.antennas ?? null,
    estimatedCost: pkg?.kpis.estimatedCost ?? null,
    completedAt: pkg?.timestamp ?? null,
    vendor: pkg?.kpis.vendor ?? null,
    version: pkg?.version ?? null,
  };
}

/* Domain data + reactive store, exposed only through this service. */
export * from "@/lib/project-store";
