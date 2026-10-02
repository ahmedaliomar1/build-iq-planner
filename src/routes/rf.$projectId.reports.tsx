import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  ReportKpiStrip,
  ReportWorkflow,
  ReportsStartScreen,
} from "@/components/reports/report-progress";
import {
  ChapterBuilder,
  MapsCenter,
  ReportCards,
  ReportLibrary,
  ReportPreview,
  downloadDocument,
} from "@/components/reports/report-panels";
import { useReportGeneration } from "@/components/reports/use-reports";
import { useProject } from "@/lib/project-store";
import { useRfConfig } from "@/lib/rf-config";
import { useRfProfile } from "@/lib/rf-profile";
import { useSimState } from "@/lib/rf-simulation";
import {
  buildOptimizedDesign,
  useOptState,
  validateOptimization,
} from "@/lib/rf-optimization";
import { useBomGeneration } from "@/components/bom/use-bom";
import {
  ESTIMATED_REPORT_MS,
  buildAllChapters,
  resetReportsState,
  type ReportContext,
  type ReportId,
} from "@/lib/reports";

export const Route = createFileRoute("/rf/$projectId/reports")({
  head: () => ({
    meta: [
      { title: "Final Reports & Export Center — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Generate the complete professional RF design package: executive summary, RF engineering report, cost estimation, bill of materials, installation guide and engineering maps.",
      },
      {
        property: "og:title",
        content: "Final Reports & Export Center — AI Private Cellular Planner",
      },
      {
        property: "og:description",
        content:
          "Collect every engineering object of the project and transform it into professional reports, engineering maps and customer deliverables.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsRoute,
});

function ReportsRoute() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const cfg = useRfConfig(projectId);
  const profile = useRfProfile(projectId);
  const sim = useSimState(projectId);
  const opt = useOptState(projectId);
  const initial = sim.design;

  const optimized = useMemo(() => {
    if (!initial || !opt.antennas.length) return null;
    const validation = validateOptimization(opt.antennas, opt.kpis, opt.warnings, 0);
    return buildOptimizedDesign(initial, { ...opt, layers: null }, validation);
  }, [initial, opt]);

  const bomGen = useBomGeneration(projectId, optimized);
  const bom = bomGen.bom;

  const ctx: ReportContext | null = useMemo(() => {
    if (!project || !initial || !optimized || !bom) return null;
    return {
      project,
      config: cfg,
      profile,
      initial,
      optimized,
      bom,
    };
  }, [project, cfg, profile, initial, optimized, bom]);

  const gen = useReportGeneration(projectId, ctx);
  const [previewId, setPreviewId] = useState<ReportId | null>(null);

  const chapters = useMemo(() => (ctx ? buildAllChapters(ctx) : []), [ctx]);
  const layers = opt.layers ?? initial?.layers ?? null;
  const crumbs = ["Projects", project?.name ?? "Project", "Final Reports"];

  if (!project || !ctx || !layers) {
    return (
      <AppShell breadcrumb={crumbs}>
        <div className="mx-auto max-w-xl p-10 text-center">
          <h1 className="text-xl font-bold tracking-tight">Engineering BOM required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The Final Reports &amp; Export Center collects every engineering object of the project.
            Complete the Engineering BOM first.
          </p>
          <Link
            to="/rf/$projectId/bom"
            params={{ projectId }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="size-4" /> Go to Engineering BOM
          </Link>
        </div>
      </AppShell>
    );
  }

  if (gen.state.status === "idle") {
    return (
      <AppShell breadcrumb={crumbs}>
        <ReportsStartScreen
          project={project.name}
          technology={ctx.initial.projectInformation.technology}
          deployment={ctx.config.purpose ?? "Enterprise coverage"}
          coverage={ctx.optimized.kpis.coverage}
          capacity={ctx.optimized.kpis.capacity}
          bomStatus={`${ctx.bom.items.length} line items`}
          estimatedMs={ESTIMATED_REPORT_MS}
          onStart={gen.start}
        />
      </AppShell>
    );
  }

  if (gen.state.status === "running") {
    return (
      <AppShell breadcrumb={crumbs}>
        <ReportWorkflow
          state={gen.state}
          stage={gen.stage}
          progress={gen.progress}
          remainingMs={gen.remainingMs}
          kpis={gen.kpis}
        />
      </AppShell>
    );
  }

  const previewDoc = previewId ? gen.document(previewId) : null;

  return (
    <AppShell breadcrumb={crumbs}>
      <div className="animate-rise space-y-5 p-4 md:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Module 7</p>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              Final Reports &amp; Export Center
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Professional RF design package generated from every engineering object of{" "}
              {project.name}.
            </p>
          </div>
          <button
            onClick={() => {
              resetReportsState(projectId);
              toast.info("Report generation reset");
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-smooth hover:bg-accent"
          >
            <RotateCcw className="size-4" /> Regenerate all
          </button>
        </header>

        <ReportKpiStrip kpis={gen.kpis} />

        <section>
          <h2 className="text-sm font-bold tracking-tight">Final Reports Dashboard</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Six professional documents assembled from independently generated chapters.
          </p>
          <div className="mt-3">
            <ReportCards
              records={gen.state.reports}
              onPreview={setPreviewId}
              onDownload={(id) => {
                const doc = gen.document(id);
                if (doc) downloadDocument(doc, "pdf");
              }}
              onDownloadExcel={(id) => {
                const doc = gen.document(id);
                if (doc) downloadDocument(doc, "excel");
              }}
              onRegenerate={(id) => {
                gen.regenerate(id);
                toast.success("Report regenerated");
              }}
            />
          </div>
        </section>

        <MapsCenter model={project.model} layers={layers} antennas={ctx.optimized.optimizedAntennaLayout} />

        <ChapterBuilder chapters={chapters} completed={gen.state.chaptersDone} />

        <ReportLibrary
          records={gen.state.reports}
          onPreview={setPreviewId}
          onDownload={(id) => {
            const doc = gen.document(id);
            if (doc) downloadDocument(doc, "pdf");
          }}
          onDuplicate={(key) => {
            gen.duplicate(key);
            toast.success("Report duplicated");
          }}
          onRegenerate={(id) => {
            gen.regenerate(id);
            toast.success("Report regenerated");
          }}
          onDelete={(key) => {
            gen.remove(key);
            toast.info("Report removed from library");
          }}
        />

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div>
            <h3 className="text-sm font-bold tracking-tight">Next — Export Center</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Build the ZIP package and save the Final RF Design Package.
            </p>
          </div>
          <Link
            to="/rf/$projectId/export"
            params={{ projectId }}
            className="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Open Export Center
          </Link>
        </div>
      </div>

      {previewDoc && (
        <ReportPreview
          doc={previewDoc}
          onClose={() => setPreviewId(null)}
          onDownload={() => downloadDocument(previewDoc, "pdf")}
        />
      )}
    </AppShell>
  );
}
