import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Download, FileDown, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  BomWorkflow,
  ProcurementDashboard,
  VendorSelection,
} from "@/components/bom/bom-progress";
import {
  CablePanel,
  CostBreakdownCards,
  CostTable,
  EquipmentBrowser,
  LaborPanel,
  PowerPanel,
  RackPanel,
} from "@/components/bom/bom-panels";
import { useBomGeneration } from "@/components/bom/use-bom";
import { useProject } from "@/lib/project-store";
import { useRfConfig } from "@/lib/rf-config";
import { downloadFile, useSimState } from "@/lib/rf-simulation";
import {
  buildOptimizedDesign,
  costLabel,
  useOptState,
  validateOptimization,
} from "@/lib/rf-optimization";
import { bomToCsv, money, resetBomState, saveBomState, ESTIMATED_BOM_MS } from "@/lib/bom";

export const Route = createFileRoute("/rf/$projectId/bom")({
  head: () => ({
    meta: [
      { title: "Engineering BOM & Cost Estimation — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Generate the complete procurement package from the Optimized RF Design: equipment detection, bill of materials, vendor pricing, labor, power, rack and cable estimation.",
      },
      {
        property: "og:title",
        content: "Engineering BOM & Cost Estimation — AI Private Cellular Planner",
      },
      {
        property: "og:description",
        content:
          "Equipment detection, BOM generation, vendor pricing database and full engineering cost estimation for private LTE / 5G deployments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BomRoute,
});

function BomRoute() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const cfg = useRfConfig(projectId);
  const sim = useSimState(projectId);
  const opt = useOptState(projectId);
  const initial = sim.design;

  const design = useMemo(() => {
    if (!initial || !opt.antennas.length) return null;
    const validation = validateOptimization(opt.antennas, opt.kpis, opt.warnings, 0);
    return buildOptimizedDesign(initial, { ...opt, layers: null }, validation);
  }, [initial, opt]);

  const gen = useBomGeneration(projectId, design);
  const { state, preview } = gen;

  const crumbs = ["Projects", project?.name ?? "Project", "Engineering BOM"];

  if (!project || !design) {
    return (
      <AppShell breadcrumb={crumbs}>
        <div className="mx-auto max-w-xl p-10 text-center">
          <h1 className="text-xl font-bold tracking-tight">Optimized RF Design required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete Interactive RF Optimization first — the Engineering BOM is generated from its
            approved output.
          </p>
          <Link
            to="/rf/$projectId/optimize"
            params={{ projectId }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="size-4" /> Go to RF Optimization
          </Link>
        </div>
      </AppShell>
    );
  }

  const dashboard = (
    <ProcurementDashboard
      items={state.items.length}
      totalQuantity={Math.round(state.items.reduce((s, i) => s + i.quantity, 0))}
      equipmentCost={(preview?.cost.equipment ?? 0) + (preview?.cost.network ?? 0)}
      laborCost={state.status === "idle" ? 0 : preview?.labor ?? 0}
      projectCost={state.items.length ? preview?.projectCost ?? 0 : 0}
      vendorStatus={gen.vendor && state.vendor ? gen.vendor.availability : "Pending"}
      readiness={state.status === "done" ? 100 : gen.progress}
    />
  );

  /* ---------------- start screen ---------------- */
  if (state.status === "idle") {
    return (
      <AppShell breadcrumb={crumbs}>
        <div className="animate-rise mx-auto max-w-4xl space-y-4 p-4 md:p-6">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <PackageSearch className="size-7" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              Engineering BOM & Cost Estimation
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The approved Optimized RF Design is transformed into a complete procurement package —
              equipment, materials, network infrastructure, labor, power, rack space and cost.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                ["Project", project.name],
                ["Technology", design.projectInformation.technology],
                ["Optimized Coverage", `${opt.kpis.coverage}%`],
                ["Optimized Capacity", `${opt.kpis.capacity}%`],
                ["Optimized Antennas", `${opt.antennas.length}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border bg-background p-3">
                  <p className="num truncate text-base font-bold leading-none">{v}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {k}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="rounded-xl bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
                Status: Ready
              </span>
              <span className="text-xs text-muted-foreground">
                Estimated generation time ≈ {Math.round(ESTIMATED_BOM_MS / 1000)}s ·{" "}
                {costLabel(opt.antennas)} equipment footprint
              </span>
            </div>

            <button
              onClick={gen.start}
              className="mt-6 w-full rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-soft transition-smooth hover:brightness-110"
            >
              Generate Engineering BOM
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ---------------- workflow ---------------- */
  if (state.status === "running" || state.status === "gate") {
    return (
      <AppShell breadcrumb={[...crumbs, "Generating"]}>
        <div className="animate-rise space-y-3 p-4 md:p-6">
          {dashboard}
          {state.status === "gate" && (
            <VendorSelection
              selected={state.vendor}
              preferred={cfg.vendor}
              onSelect={(id) => gen.chooseVendor(id)}
            />
          )}
          <BomWorkflow state={state} progress={gen.progress} remainingMs={gen.remainingMs} />
        </div>
      </AppShell>
    );
  }

  /* ---------------- completed procurement workspace ---------------- */
  const bom = gen.bom;
  if (!bom) return null;

  const base = `${project.name}-engineering-bom`.replace(/\s+/g, "-").toLowerCase();

  return (
    <AppShell breadcrumb={[...crumbs, "Procurement Package"]}>
      <div className="animate-rise space-y-3 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="mr-auto">
            <h1 className="text-lg font-bold tracking-tight">Engineering BOM Generated</h1>
            <p className="text-xs text-muted-foreground">
              {bom.items.length} line items · vendor {bom.vendor.name} ({bom.vendor.availability}) ·
              estimated project cost {money(bom.procurementSummary.estimatedProjectCost)}
            </p>
          </div>
          <button
            onClick={() => {
              saveBomState(projectId, { savedAt: Date.now() });
              toast.success("Engineering BOM saved");
            }}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
          >
            Save
          </button>
          <button
            onClick={() =>
              downloadFile(`${base}.csv`, bomToCsv(bom), "text/csv")
            }
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
          >
            <Download className="size-4" /> Export CSV
          </button>
          <button
            onClick={() =>
              downloadFile(`${base}.json`, JSON.stringify(bom, null, 2), "application/json")
            }
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
          >
            <FileDown className="size-4" /> Export Engineering BOM
          </button>
          <button
            onClick={() => resetBomState(projectId)}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110"
          >
            Regenerate
          </button>
        </div>

        <ProcurementDashboard
          items={bom.procurementSummary.equipmentItems}
          totalQuantity={Math.round(bom.procurementSummary.totalQuantity)}
          equipmentCost={bom.procurementSummary.estimatedEquipmentCost}
          laborCost={bom.procurementSummary.estimatedLaborCost}
          projectCost={bom.procurementSummary.estimatedProjectCost}
          vendorStatus={bom.procurementSummary.vendorStatus}
          readiness={bom.procurementSummary.readiness}
        />

        <CostBreakdownCards cost={bom.cost} />
        <EquipmentBrowser items={bom.items} />
        <CostTable items={bom.items} />

        <div className="grid gap-3 xl:grid-cols-2">
          <LaborPanel rows={bom.labor.rows} total={bom.labor.total} />
          <PowerPanel power={bom.power} />
          <RackPanel rack={bom.rack} />
          <CablePanel cables={bom.cables} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-bold tracking-tight">Engineering BOM Object</h3>
          <pre className="num mt-3 max-h-80 overflow-auto rounded-xl border border-border bg-background p-3 text-[11px] leading-relaxed">
            {JSON.stringify(bom, (k, v) => (k === "items" ? `[${bom.items.length} BOM line items]` : v), 2)}
          </pre>
        </div>
      </div>
    </AppShell>
  );
}
