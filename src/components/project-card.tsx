import { Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, ArrowRight, Building2, Clock, Copy, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { projectService, projectSummary, type Project } from "@/services/projectService";
import type { ProjectWorkflowStatus } from "@/types";

const tone = (s: ProjectWorkflowStatus) =>
  s === "Completed" || s === "Export Ready" || s === "Building Validated"
    ? "bg-success-soft text-success"
    : s === "Draft"
      ? "bg-secondary text-muted-foreground"
      : s.includes("Running") || s === "Building Analysis"
        ? "bg-warning-soft text-warning"
        : "bg-primary-soft text-primary";

const tech = (p: Project, t: string | null) =>
  t ?? (p.network === "5g" ? "Private 5G" : p.network === "lte" ? "Private LTE" : "Auto");

/** Shared project card used by the dashboard and the project archive. */
export function ProjectCard({ project: p }: { project: Project }) {
  const s = projectSummary(p);
  const done = s.status === "Completed" || s.status === "Export Ready" || s.status === "Reports Ready";
  const kpis: [string, string][] = [
    ["Coverage", s.coverage != null ? `${s.coverage}%` : "—"],
    ["Capacity", s.capacity != null ? `${s.capacity}%` : "—"],
    ["Antennas", s.antennas != null ? String(s.antennas) : "—"],
    ["Est. cost", s.estimatedCost != null ? `$${Math.round(s.estimatedCost).toLocaleString()}` : "—"],
  ];
  const icon =
    "grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground";

  return (
    <li className="group animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft transition-smooth hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground">
          <Building2 className="size-5" strokeWidth={1.8} />
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone(s.status)}`}>
          {s.status}
        </span>
      </div>
      <h3 className="mt-4 truncate font-semibold">{p.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {p.buildingType} · {p.country} · {tech(p, s.technology)}
      </p>
      {s.coverage != null && (
        <dl className="mt-3 grid grid-cols-4 gap-1.5">
          {kpis.map(([l, v]) => (
            <div key={l} className="rounded-lg bg-background px-2 py-1.5">
              <dt className="text-[10px] text-muted-foreground">{l}</dt>
              <dd className="num truncate text-xs font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="num mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="size-3.5" />
        {s.completedAt ? `Completed ${new Date(s.completedAt).toLocaleDateString()}` : new Date(p.updatedAt).toLocaleString()}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to="/editor/$projectId"
          params={{ projectId: p.id }}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent hover:text-accent-foreground"
        >
          Open project <ArrowRight className="size-3.5" />
        </Link>
        {done && (
          <Link to="/rf/$projectId/reports" params={{ projectId: p.id }} aria-label="View reports" title="View reports" className={icon}>
            <FileText className="size-4" />
          </Link>
        )}
        <button
          title="Duplicate"
          aria-label={`Duplicate ${p.name}`}
          onClick={() => projectService.duplicateProject(p.id).then(() => toast.success("Project duplicated"))}
          className={icon}
        >
          <Copy className="size-4" />
        </button>
        <button
          title={p.archived ? "Restore" : "Archive"}
          aria-label={p.archived ? `Restore ${p.name}` : `Archive ${p.name}`}
          onClick={() =>
            projectService
              .archiveProject(p.id, !p.archived)
              .then(() => toast.success(p.archived ? "Project restored" : "Project archived"))
          }
          className={icon}
        >
          {p.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
        </button>
        <button
          onClick={() => projectService.deleteProject(p.id)}
          aria-label={`Delete ${p.name}`}
          className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-smooth hover:border-danger hover:text-danger"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}
