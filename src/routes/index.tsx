import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Clock, Plus, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { deleteProject, useProjects } from "@/lib/project-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Create and continue AI-assisted Private LTE and Private 5G indoor network planning projects.",
      },
      { property: "og:title", content: "Dashboard — AI Private Cellular Planner" },
      {
        property: "og:description",
        content:
          "Turn building drawings into validated digital twins, ready for indoor RF planning.",
      },
    ],
  }),
  component: Dashboard,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-secondary text-muted-foreground" },
  analyzing: { label: "AI Analysis", cls: "bg-warning-soft text-warning" },
  review: { label: "Review", cls: "bg-warning-soft text-warning" },
  editing: { label: "Editing", cls: "bg-primary-soft text-primary" },
  ready: { label: "Digital Twin Ready", cls: "bg-success-soft text-success" },
};

function Dashboard() {
  const projects = useProjects();

  return (
    <AppShell breadcrumb={["Workspace", "Dashboard"]}>
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
        <section className="animate-rise overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
          <div className="relative p-6 md:p-10">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "linear-gradient(var(--canvas-grid) 1px, transparent 1px), linear-gradient(90deg, var(--canvas-grid) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                maskImage: "radial-gradient(120% 80% at 90% 0%, black, transparent 70%)",
              }}
            />
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Phase 1 · Digital Twin
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                Welcome Back
              </h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Create or continue your Private Cellular Planning projects.
              </p>
              <Link
                to="/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
              >
                <Plus className="size-4" /> New Project
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
            <span className="num text-xs text-muted-foreground">
              {projects.length} total
            </span>
          </div>

          {projects.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => {
                const s = STATUS[p.status] ?? STATUS["draft"]!;
                return (
                  <li
                    key={p.id}
                    className="group animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft transition-smooth hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground">
                        <Building2 className="size-5" strokeWidth={1.8} />
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}
                      >
                        {s.label}
                      </span>
                    </div>
                    <h3 className="mt-4 truncate font-semibold">{p.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.buildingType} · {p.country} ·{" "}
                      {p.network === "5g"
                        ? "Private 5G"
                        : p.network === "lte"
                          ? "Private LTE"
                          : "Auto"}
                    </p>
                    <p className="num mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="size-3.5" />
                      {new Date(p.updatedAt).toLocaleString()}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Link
                        to="/editor/$projectId"
                        params={{ projectId: p.id }}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent hover:text-accent-foreground"
                      >
                        Open editor <ArrowRight className="size-3.5" />
                      </Link>
                      <button
                        onClick={() => deleteProject(p.id)}
                        aria-label={`Delete ${p.name}`}
                        className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-smooth hover:border-danger hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <svg viewBox="0 0 220 140" className="h-32 w-56" aria-hidden>
        <rect x="10" y="10" width="200" height="120" rx="12" fill="var(--secondary)" />
        <g stroke="var(--canvas-grid)" strokeWidth="1">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1={10 + i * 22} y1="10" x2={10 + i * 22} y2="130" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1="10" y1={10 + i * 22} x2="210" y2={10 + i * 22} />
          ))}
        </g>
        <rect
          x="46"
          y="38"
          width="128"
          height="64"
          rx="6"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
        />
        <line
          x1="110"
          y1="38"
          x2="110"
          y2="102"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeDasharray="6 5"
        />
        <circle cx="110" cy="70" r="9" fill="var(--primary-soft)" />
        <circle cx="110" cy="70" r="3.5" fill="var(--primary)" />
      </svg>
      <p className="mt-6 font-semibold">No projects yet.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a building drawing and let AI build your digital twin.
      </p>
      <Link
        to="/new"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
      >
        <Plus className="size-4" /> Create your first project
      </Link>
    </div>
  );
}
