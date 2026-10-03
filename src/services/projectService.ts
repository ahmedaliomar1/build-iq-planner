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
  async getProjectHistory(id: string): Promise<Project["versions"]> {
    if (!USE_MOCK) return api.get(`/projects/${id}/history`);
    return readAll().find((p) => p.id === id)?.versions ?? [];
  },
};

/** Derives the dashboard workflow status from the stored stage outputs. */
export function workflowStatus(projectId: string, base: Project["status"]): ProjectWorkflowStatus {
  if (typeof window === "undefined") return "Draft";
  const has = (key: string, test: (v: Record<string, unknown>) => boolean) => {
    try {
      const v = (JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, Record<string, unknown>>)[projectId];
      return v ? test(v) : false;
    } catch {
      return false;
    }
  };
  if (has("apcp.export.v1", (v) => v.status === "done")) return "Completed";
  if (has("apcp.reports.v1", (v) => v.status === "done")) return "Reports Ready";
  if (has("apcp.bom.v1", (v) => v.status === "done")) return "BOM Ready";
  if (has("apcp.rfopt.v1", (v) => Array.isArray(v.antennas) && v.antennas.length > 0)) return "Optimization";
  if (has("apcp.rfsim.v1", (v) => v.status === "done")) return "Simulation Completed";
  if (has("apcp.rfsim.v1", (v) => v.status === "running")) return "Simulation Running";
  if (has("apcp.rfprofile.v1", () => true)) return "RF Profile Ready";
  if (has("apcp.rfconfig.v1", () => true)) return "RF Configuration";
  if (base === "ready") return "Building Validated";
  if (base === "analyzing" || base === "review" || base === "editing") return "Building Analysis";
  return "Draft";
}
