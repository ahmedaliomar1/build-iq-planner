import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProject } from "@/lib/project-store";
import { buildingStats, totalDevices, useRfConfig } from "@/lib/rf-config";
import { useRfProfile } from "@/lib/rf-profile";

export const Route = createFileRoute("/rf/$projectId/overview")({
  head: () => ({
    meta: [
      { title: "RF Design Overview — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Review the project, technology, building and device summary before configuring the RF profile.",
      },
      { property: "og:title", content: "RF Design Overview — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Project, technology and building summary ahead of RF parameter configuration.",
      },
    ],
  }),
  component: RfOverview,
});

function RfOverview() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const cfg = useRfConfig(projectId);
  const prof = useRfProfile(projectId);
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

  const stats = buildingStats(project.model);
  const people = cfg.devices.employees + cfg.devices.visitors;
  const iot = totalDevices(cfg.devices) - people;

  const rows: [string, string][] = [
    ["Project", project.name],
    ["Technology", cfg.technology === "lte" ? "Private LTE" : "Private 5G"],
    ["Deployment", "Indoor"],
    ["Country", project.country],
    ["Building Area", `${Math.round(stats.area).toLocaleString()} m²`],
    ["Floors", String(prof.floors.length)],
    ["Users", people.toLocaleString()],
    ["IoT Devices", iot.toLocaleString()],
  ];

  return (
    <AppShell breadcrumb={["Workspace", "Projects", project.name, "RF Design Overview"]}>
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">RF Design Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Engineering environment is ready. Confirm the deployment context before configuration.
          </p>
        </header>

        <div className="animate-rise overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0"
            >
              <span className="text-sm font-semibold text-muted-foreground">{k}</span>
              <span className="num ml-auto text-sm font-bold">{v}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 border-t border-border bg-success-soft px-5 py-3.5">
            <span className="text-sm font-semibold text-success">Status</span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-bold text-success">
              <Check className="size-4" strokeWidth={3} /> Ready
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate({ to: "/rf/$projectId/profile", params: { projectId } })}
          className="w-full rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lift transition-smooth hover:brightness-110 active:scale-[0.99]"
        >
          Continue
        </button>
      </div>
    </AppShell>
  );
}
