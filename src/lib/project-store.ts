import { useSyncExternalStore } from "react";
import type { BuildingModel, Project } from "./building-model";
import { uid } from "./geometry";

const KEY = "apcp.projects.v1";

let cache: Project[] | null = null;
const listeners = new Set<() => void>();

function read(): Project[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Project[]) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useProjects(): Project[] {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => [] as Project[],
  );
}

export function useProject(id: string): Project | undefined {
  const projects = useProjects();
  return projects.find((p) => p.id === id);
}

export function createProject(
  input: Pick<Project, "name" | "network" | "country" | "buildingType" | "files">,
): Project {
  const now = Date.now();
  const project: Project = {
    id: uid("prj"),
    ...input,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    model: { objects: [], layers: [], scale: 1, scaleDetected: false },
    versions: [],
  };
  write([project, ...read()]);
  return project;
}

export function updateProject(id: string, patch: Partial<Project>) {
  write(
    read().map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
  );
}

export function saveModel(id: string, model: BuildingModel, label: string) {
  write(
    read().map((p) =>
      p.id === id
        ? {
            ...p,
            model,
            updatedAt: Date.now(),
            versions: [
              { at: Date.now(), label, objectCount: model.objects.length },
              ...p.versions,
            ].slice(0, 12),
          }
        : p,
    ),
  );
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}
