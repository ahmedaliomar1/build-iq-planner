import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Package } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  DownloadManager,
  ExportCompleted,
  ExportSelector,
  ExportSummary,
  FormatCards,
  PackageInfoForm,
  PackagingWorkflow,
  ProjectCompletion,
  ValidationPanel,
} from "@/components/reports/export-center";
import { useExportCenter } from "@/components/reports/use-export";
import { useReportGeneration } from "@/components/reports/use-reports";
import { useBomGeneration } from "@/components/bom/use-bom";
import { useProject } from "@/services/projectService";
import { useRfConfig } from "@/services/rfService";
import { useRfProfile } from "@/services/rfService";
import { useSimState } from "@/services/simulationService";
import {
  buildOptimizedDesign,
  useOptState,
  validateOptimization,
} from "@/services/optimizationService";
import { estimatedExportMs } from "@/services/exportService";
import type { ReportContext } from "@/services/reportService";

export const Route = createFileRoute("/rf/$projectId/export")({
  head: () => ({
    meta: [
      { title: "Export Center — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Package every report, map and engineering object into the Final RF Design Package.",
      },
      { property: "og:title", content: "Export Center — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Generate, validate and download the final Private 5G / LTE RF design package.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExportRoute,
});

const btn =
  "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent";

function ExportRoute() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const cfg = useRfConfig(projectId);
  const profile = useRfProfile(projectId);
  const sim = useSimState(projectId);
  const opt = useOptState(projectId);
  const initial = sim.design;

  const optimized = useMemo(() => {
    if (!initial || !opt.antennas.length) return null;
    const v = validateOptimization(opt.antennas, opt.kpis, opt.warnings, 0);
    return buildOptimizedDesign(initial, { ...opt, layers: null }, v);
  }, [initial, opt]);
  const bom = useBomGeneration(projectId, optimized).bom;

  const ctx: ReportContext | null = useMemo(
    () =>
      project && initial && optimized && bom
        ? { project, config: cfg, profile, initial, optimized, bom }
        : null,
    [project, cfg, profile, initial, optimized, bom],
  );

  const reports = useReportGeneration(projectId, ctx);
  const ex = useExportCenter(projectId, ctx, reports.state);
  const crumbs = ["Projects", project?.name ?? "Project", "Export Center"];

  if (!project || !ctx || reports.state.status !== "done") {
    return (
      <AppShell breadcrumb={crumbs}>
        <div className="mx-auto max-w-xl p-10 text-center">
          <h1 className="text-xl font-bold tracking-tight">Final reports required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate the final reports before building the export package.
          </p>
          <Link
            to="/rf/$projectId/reports"
            params={{ projectId }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="size-4" /> Go to Final Reports
          </Link>
        </div>
      </AppShell>
    );
  }

  if (ex.state.status === "running") {
    return (
      <AppShell breadcrumb={crumbs}>
        <PackagingWorkflow
          state={ex.state}
          progress={ex.progress}
          remainingMs={ex.remainingMs}
          current={ex.currentTask.label}
          onCancel={() => {
            ex.cancel();
            toast.info("Package generation cancelled — nothing was saved");
          }}
        />
      </AppShell>
    );
  }

  const manager = (
    <DownloadManager
      history={ex.state.history}
      onDownload={ex.download}
      onDuplicate={(k) => {
        ex.duplicatePackage(k);
        toast.success("Package duplicated");
      }}
      onRegenerate={ex.start}
      onDelete={(k) => {
        ex.removePackage(k);
        toast.info("Package removed");
      }}
    />
  );

  if (ex.state.status === "done") {
    return (
      <AppShell breadcrumb={crumbs}>
        <ExportCompleted
          state={ex.state}
          onDownload={ex.download}
          actions={
            <>
              <Link to="/rf/$projectId/reports" params={{ projectId }} className={btn}>
                Open Report Library
              </Link>
              <Link to="/" className={btn}>
                Back to Dashboard
              </Link>
              <Link to="/new" className={btn}>
                Create New Project
              </Link>
              <button onClick={ex.reset} className={btn}>
                Export Again
              </button>
            </>
          }
        />
        <div className="mx-auto max-w-5xl space-y-5 px-4 pb-8">
          <ProjectCompletion
            state={ex.state}
            actions={
              <>
                <button onClick={() => navigate({ to: "/" })} className={btn}>
                  Open Dashboard
                </button>
                <button onClick={ex.download} className={btn}>
                  Download Package
                </button>
                <Link to="/new" className={btn}>
                  Start New Project
                </Link>
              </>
            }
          />
          {manager}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumb={crumbs}>
      <div className="animate-rise space-y-5 p-4 md:p-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Module 7 · Part 2
          </p>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Export Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Package the approved design of {project.name} into the Final RF Design Package.
          </p>
        </header>
        {ex.state.status === "cancelled" && (
          <p className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-2 text-sm text-warning">
            The last package generation was cancelled. Adjust your selection and generate again.
          </p>
        )}
        <ExportSummary
          count={ex.state.selected.length}
          sizeKb={ex.sizeKb}
          estimatedMs={estimatedExportMs(ex.state.selected)}
        />
        <ExportSelector
          selected={ex.state.selected}
          onToggle={ex.toggleItem}
          onSetAll={ex.setSelected}
        />
        <FormatCards formats={ex.state.formats} onToggle={ex.toggleFormat} />
        <PackageInfoForm info={ex.info} projectId={projectId} onChange={ex.setInfo} />
        <ValidationPanel
          checks={ex.validation.checks}
          onRegenerate={(c) => {
            if (c.reportId) reports.regenerate(c.reportId);
            else navigate({ to: "/rf/$projectId/reports", params: { projectId } });
            toast.info(`Regenerating ${c.label}`);
          }}
        />
        <div className="flex justify-end">
          <button
            disabled={!ex.validation.passed || ex.state.formats.length === 0}
            onClick={ex.start}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lift disabled:opacity-50"
          >
            <Package className="size-4" /> Generate Final Package
          </button>
        </div>
        {manager}
      </div>
    </AppShell>
  );
}
