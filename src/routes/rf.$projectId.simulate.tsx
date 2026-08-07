import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Play, RotateCcw, Signal } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { SimulationProgress } from "@/components/rf/sim-progress";
import { RfPlanningWorkspace } from "@/components/rf/rf-workspace";
import { useSimulationRunner } from "@/components/rf/use-simulation";
import { useProject } from "@/lib/project-store";
import { useRfConfig } from "@/lib/rf-config";
import { BANDS, useRfProfile } from "@/lib/rf-profile";
import {
  designToCsv,
  designToReport,
  downloadFile,
  saveSimState,
  type RfLayerId,
} from "@/lib/rf-simulation";

export const Route = createFileRoute("/rf/$projectId/simulate")({
  head: () => ({
    meta: [
      { title: "RF Simulation Engine — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Run the indoor RF simulation pipeline and generate the Initial RF Design with coverage, capacity, SINR and interference layers.",
      },
      { property: "og:title", content: "RF Simulation Engine — AI Private Cellular Planner" },
      {
        property: "og:description",
        content:
          "Building processing, candidate antennas, link budget, coverage and capacity simulation, optimization and RF layer generation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RfSimulate,
});

function RfSimulate() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const cfg = useRfConfig(projectId);
  const prof = useRfProfile(projectId);
  const navigate = useNavigate();
  const [minimized, setMinimized] = useState(false);

  const run = useSimulationRunner(project, cfg, prof);
  const { state } = run;
  const band = BANDS.find((b) => b.id === prof.band);

  const setLayer = (id: RfLayerId | null) => saveSimState(projectId, { activeLayer: id });

  const save = () => {
    if (!state.design) return;
    saveSimState(projectId, {
      savedAt: Date.now(),
      versions: [
        {
          at: Date.now(),
          label: `Initial RF Design v${state.versions.length + 1}`,
          antennas: state.design.kpis.antennas,
          coverage: state.design.kpis.coverage,
        },
        ...state.versions,
      ].slice(0, 12),
    });
    toast.success("RF Design Saved Successfully");
  };

  const exportDesign = (format: "pdf" | "json" | "csv") => {
    if (!state.design) return;
    const base = `${project?.name ?? "project"}-initial-rf-design`.replace(/\s+/g, "-").toLowerCase();
    if (format === "json") {
      downloadFile(`${base}.json`, JSON.stringify(state.design, null, 2), "application/json");
    } else if (format === "csv") {
      downloadFile(`${base}.csv`, designToCsv(state.design), "text/csv");
    } else {
      downloadFile(`${base}-report.txt`, designToReport(state.design), "text/plain");
      toast.info("Placeholder engineering report exported — PDF rendering arrives with the final report module.");
    }
  };

  if (!project) {
    return (
      <AppShell breadcrumb={["Workspace", "Projects", "RF Simulation"]}>
        <div className="p-10 text-sm text-muted-foreground">Project not found.</div>
      </AppShell>
    );
  }

  const crumbs = ["Workspace", "Projects", project.name, "RF Simulation"];

  /* ---------------- start screen ---------------- */
  if (state.status === "idle" || state.status === "cancelled") {
    return (
      <AppShell breadcrumb={crumbs}>
        <div className="mx-auto max-w-3xl p-4 md:p-10">
          <div className="animate-rise rounded-3xl border border-border bg-card p-8 shadow-lift md:p-12">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Signal className="size-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">RF Simulation Engine</h1>
                <p className="text-sm text-muted-foreground">
                  Generates the Initial RF Design from your building, requirements and RF profile.
                </p>
              </div>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Project", project.name],
                ["Technology", cfg.technology === "lte" ? "Private LTE" : "Private 5G"],
                ["Band", band?.label ?? "—"],
                ["Simulation Status", state.status === "cancelled" ? "Cancelled" : "Ready"],
                ["Estimated Time", "20–40 Seconds"],
                ["Engine Mode", "Modular Placeholder v1"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border bg-background p-4">
                  <dd className="num text-sm font-bold">{v}</dd>
                  <dt className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {k}
                  </dt>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-col items-center">
              <button
                onClick={run.start}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-primary px-10 py-4 text-base font-bold text-primary-foreground shadow-lift transition-smooth hover:brightness-110 active:scale-[0.98]"
              >
                {state.status === "cancelled" ? (
                  <RotateCcw className="size-5" />
                ) : (
                  <Play className="size-5" />
                )}
                {state.status === "cancelled" ? "Restart RF Simulation" : "Start RF Simulation"}
              </button>
              <Link
                to="/rf/$projectId/profile-ready"
                params={{ projectId }}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-smooth hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Back to RF Profile
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ---------------- completed workspace ---------------- */
  if (state.status === "complete" && state.design) {
    return (
      <AppShell breadcrumb={[...crumbs, "Initial RF Design"]}>
        <RfPlanningWorkspace
          model={project.model}
          design={state.design}
          activeLayer={state.activeLayer}
          onActiveLayer={setLayer}
          onSave={save}
          onExport={exportDesign}
          onContinue={() => navigate({ to: "/rf/$projectId/optimize", params: { projectId } })}
          saved={Boolean(state.savedAt)}
        />
      </AppShell>
    );
  }

  /* ---------------- running workspace ---------------- */
  return (
    <AppShell breadcrumb={crumbs}>
      {minimized ? (
        <div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">
          Simulation is running in the background. Expand the panel to follow the engineering log.
        </div>
      ) : null}
      <SimulationProgress
        state={state}
        stage={run.stage}
        progress={run.progress}
        remainingMs={run.remainingMs}
        candidateCount={run.candidateCount}
        minimized={minimized}
        onToggleMinimize={() => setMinimized((m) => !m)}
        onCancel={run.cancel}
        onContinue={run.resume}
      />
      <div className="pb-6 text-center">
        <button
          onClick={() => navigate({ to: "/projects" })}
          className="text-xs font-semibold text-muted-foreground transition-smooth hover:text-foreground"
        >
          Leave — simulation progress is autosaved
        </button>
      </div>
    </AppShell>
  );
}
