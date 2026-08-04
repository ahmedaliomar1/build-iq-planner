import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProject } from "@/lib/project-store";
import { buildingStats } from "@/lib/rf-config";

export const Route = createFileRoute("/rf/$projectId/")({
  head: () => ({
    meta: [
      { title: "RF Design Configuration — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Confirm your validated building digital twin and start the RF design configuration wizard for indoor private LTE and 5G planning.",
      },
      {
        property: "og:title",
        content: "RF Design Configuration — AI Private Cellular Planner",
      },
      {
        property: "og:description",
        content:
          "Capture requirements, constraints and objectives before AI RF planning begins.",
      },
    ],
  }),
  component: RfEntry,
});

function RfEntry() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const navigate = useNavigate();

  if (!project) {
    return (
      <AppShell breadcrumb={["Workspace", "RF Design"]}>
        <div className="mx-auto max-w-md p-10 text-center">
          <p className="text-sm text-muted-foreground">Project not found.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
            Back to Dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const s = buildingStats(project.model);
  const rows: [string, string][] = [
    ["Project Name", project.name],
    ["Building Type", project.buildingType],
    ["Floors", String(s.floors)],
    ["Rooms", String(s.rooms)],
    ["Walls", String(s.walls)],
    ["Doors", String(s.doors)],
    ["Windows", String(s.windows)],
    ["Total Area", `${Math.round(s.area).toLocaleString()} m²`],
  ];

  return (
    <AppShell breadcrumb={["Workspace", "Projects", project.name, "RF Design"]}>
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-10">
        <div className="animate-rise rounded-3xl border border-border bg-card p-6 shadow-lift md:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                Building Summary
              </h1>
              <p className="text-sm text-muted-foreground">
                Confirm the digital twin before RF design configuration begins.
              </p>
            </div>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success sm:inline-flex">
              <Check className="size-3.5" /> Digital Model Ready
            </span>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3"
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {k}
                </dt>
                <dd className="num text-sm font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          <button
            onClick={() => navigate({ to: "/rf/$projectId/config", params: { projectId } })}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.99]"
          >
            Continue <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
