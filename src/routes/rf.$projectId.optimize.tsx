import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Download, FileDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { OptCanvas, type CanvasApi, type OptTool } from "@/components/rf/opt-canvas";
import { OptToolbar } from "@/components/rf/opt-toolbar";
import {
  CompareDialog,
  LayerManager,
  PropertiesPanel,
  StatusBar,
  SuggestionsPanel,
  ValidationPanel,
  VersionsPanel,
} from "@/components/rf/opt-panels";
import { useOptimization } from "@/components/rf/use-optimization";
import { useProject } from "@/lib/project-store";
import { useRfConfig } from "@/lib/rf-config";
import { useRfProfile } from "@/lib/rf-profile";
import { downloadFile, useSimState } from "@/lib/rf-simulation";
import {
  CATEGORY_OPTIONS,
  buildOptimizedDesign,
  categoryDefaults,
  categoryLabel,
  costLabel,
  optimizedToCsv,
  optimizedToReport,
  saveOptState,
  type AiSuggestion,
  type LayerSettings,
  type OptAntenna,
} from "@/lib/rf-optimization";

export const Route = createFileRoute("/rf/$projectId/optimize")({
  head: () => ({
    meta: [
      { title: "Interactive RF Optimization — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Manually optimize antenna positions, power, height and categories with live local recalculation of coverage, capacity, SINR and interference layers.",
      },
      { property: "og:title", content: "Interactive RF Optimization — AI Private Cellular Planner" },
      {
        property: "og:description",
        content:
          "Engineering workspace for editing the Initial RF Design: local recalculation, AI suggestions, version history and validation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RfOptimize,
});

function RfOptimize() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const cfg = useRfConfig(projectId);
  const prof = useRfProfile(projectId);
  const sim = useSimState(projectId);
  const navigate = useNavigate();

  const initial = sim.design;
  const opt = useOptimization(project, cfg, prof, initial);
  const { state } = opt;

  const [tool, setTool] = useState<OptTool>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<Partial<OptAntenna> | null>(null);
  const [compare, setCompare] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ ids: string[]; dx: number; dy: number } | null>(
    null,
  );
  const [pendingAdd, setPendingAdd] = useState<{ x: number; y: number; category: string | null } | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const api = useRef<CanvasApi | null>(null);
  const onApi = useCallback((a: CanvasApi) => {
    api.current = a;
  }, []);

  const antennas = useMemo(
    () =>
      draft
        ? state.antennas.map((a) => (selectedIds.includes(a.id) ? { ...a, ...draft } : a))
        : state.antennas,
    [state.antennas, draft, selectedIds],
  );
  const selected = antennas.filter((a) => selectedIds.includes(a.id));
  const layer = state.activeLayer ? opt.layers?.[state.activeLayer] ?? null : null;
  const currentVersion = state.versions.find((v) => v.id === state.currentVersionId);

  const setLayerSetting = (id: string, patch: Partial<LayerSettings>) =>
    saveOptState(projectId, {
      layerSettings: {
        ...state.layerSettings,
        [id]: { ...(state.layerSettings[id] ?? { visible: true, opacity: 1, locked: false }), ...patch },
      },
    });

  /* ---------------- editing operations ---------------- */

  const commitMove = () => {
    if (!pendingMove) return;
    const next = antennas.map((a) =>
      pendingMove.ids.includes(a.id) && !a.locked
        ? { ...a, x: Number((a.x + pendingMove.dx).toFixed(2)), y: Number((a.y + pendingMove.dy).toFixed(2)) }
        : a,
    );
    opt.applyChange(next, { kind: "move", label: `Moved ${pendingMove.ids.length} antenna(s)`, antennaIds: pendingMove.ids });
    setPendingMove(null);
  };

  const commitAdd = (category: string) => {
    if (!pendingAdd) return;
    const d = categoryDefaults(category);
    const { id, label } = opt.nextAntennaId();
    const ref = antennas[0];
    const antenna: OptAntenna = {
      id,
      label,
      x: pendingAdd.x,
      y: pendingAdd.y,
      category,
      height: d.height,
      txPower: d.txPower,
      gain: d.gain,
      radius: Number(((ref?.radius ?? 28) * d.radiusFactor).toFixed(1)),
      azimuth: 0,
      tilt: 0,
      locked: false,
      roomName: opt.roomNameAt(pendingAdd.x, pendingAdd.y),
      status: "Acceptable",
      servedUsers: ref?.servedUsers ?? 20,
    };
    opt.applyChange([...antennas, antenna], {
      kind: "add",
      label: `Added ${label} (${categoryLabel(category)})`,
      antennaIds: [id],
    });
    setPendingAdd(null);
    setSelectedIds([id]);
    setTool("select");
  };

  const commitDelete = () => {
    if (!pendingDelete) return;
    opt.applyChange(
      antennas.filter((a) => !pendingDelete.includes(a.id)),
      { kind: "delete", label: `Deleted ${pendingDelete.length} antenna(s)`, antennaIds: pendingDelete },
    );
    setPendingDelete(null);
    setSelectedIds([]);
  };

  const replaceCategory = (category: string) => {
    if (!selected.length) return;
    const d = categoryDefaults(category);
    const next = antennas.map((a) =>
      selectedIds.includes(a.id)
        ? {
            ...a,
            category,
            gain: d.gain,
            radius: Number((a.radius * d.radiusFactor).toFixed(1)),
          }
        : a,
    );
    setDraft(null);
    opt.applyChange(next, {
      kind: "replace",
      label: `Replaced ${selectedIds.length} antenna(s) with ${categoryLabel(category)}`,
      antennaIds: selectedIds,
    });
  };

  const commitPatch = (patch: Partial<OptAntenna>, kind: "power" | "height") => {
    const next = state.antennas.map((a) => (selectedIds.includes(a.id) ? { ...a, ...patch } : a));
    setDraft(null);
    opt.applyChange(next, {
      kind,
      label: kind === "power" ? `Transmit power → ${patch.txPower} dBm` : `Height → ${patch.height} m`,
      antennaIds: selectedIds,
    });
  };

  const setLocked = (locked: boolean, ids = selectedIds) => {
    if (!ids.length) return;
    opt.setAntennas(
      state.antennas.map((a) => (ids.includes(a.id) ? { ...a, locked } : a)),
      locked ? "Locked antennas" : "Unlocked antennas",
    );
  };

  const applySuggestion = (s: AiSuggestion) => {
    const target = s.antennaId ? antennas.find((a) => a.id === s.antennaId) : null;
    if (s.action === "add") {
      setPendingAdd({ x: s.x, y: s.y, category: null });
      return;
    }
    if (!target) return;
    const next = antennas.map((a) => {
      if (a.id !== target.id) return a;
      if (s.action === "height") return { ...a, height: Math.min(6, a.height + (s.payload?.dh ?? 0.5)) };
      if (s.action === "power") return { ...a, txPower: Math.max(10, a.txPower + (s.payload?.dp ?? -2)) };
      if (s.action === "move")
        return {
          ...a,
          x: Number((a.x + (s.payload?.dx ?? 0)).toFixed(2)),
          y: Number((a.y + (s.payload?.dy ?? 0)).toFixed(2)),
        };
      const d = categoryDefaults(s.payload?.category ?? a.category);
      return { ...a, category: s.payload?.category ?? a.category, gain: d.gain };
    });
    opt.applyChange(next, { kind: "recommendation", label: s.title, antennaIds: [target.id] });
    toast.success(`Applied: ${s.title}`);
  };

  /* ---------------- save / export ---------------- */

  const save = useCallback(() => {
    if (!initial) return;
    saveOptState(projectId, { savedAt: Date.now() });
    toast.success("Optimized RF Design Saved Successfully");
  }, [initial, projectId]);

  const design = useMemo(
    () => (initial ? buildOptimizedDesign(initial, { ...state, layers: opt.layers }, opt.validation) : null),
    [initial, state, opt.layers, opt.validation],
  );

  const exportSnapshot = (format: "png" | "pdf" | "json") => {
    if (!design) return;
    const base = `${project?.name ?? "project"}-optimized-rf-design`.replace(/\s+/g, "-").toLowerCase();
    if (format === "json") {
      downloadFile(`${base}.json`, JSON.stringify(design, null, 2), "application/json");
    } else if (format === "pdf") {
      downloadFile(`${base}-report.txt`, optimizedToReport(design), "text/plain");
      toast.info("Placeholder engineering report exported — styled PDF arrives with the Reports module.");
    } else {
      downloadFile(`${base}-layout.csv`, optimizedToCsv(design), "text/csv");
      toast.info("Canvas image export arrives with the Reports module — antenna layout exported instead.");
    }
  };

  /* ---------------- keyboard shortcuts ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        opt.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        opt.redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if (e.key === "Delete" && selectedIds.length) {
        setPendingDelete(selectedIds);
      } else if (e.key === "Escape") {
        setSelectedIds([]);
        setPendingAdd(null);
        setPendingMove(null);
        setPendingDelete(null);
        setTool("select");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opt, save, selectedIds]);

  const crumbs = ["Projects", project?.name ?? "Project", "Interactive Optimization"];

  if (!project || !initial) {
    return (
      <AppShell breadcrumb={crumbs}>
        <div className="mx-auto max-w-xl p-10 text-center">
          <h1 className="text-xl font-bold tracking-tight">Initial RF Design required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Run the RF Simulation Engine first — Interactive Optimization edits its output.
          </p>
          <Link
            to="/rf/$projectId/simulate"
            params={{ projectId }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <ArrowLeft className="size-4" /> Go to RF Simulation
          </Link>
        </div>
      </AppShell>
    );
  }

  /* ---------------- completed screen ---------------- */
  if (state.completed && design) {
    return (
      <AppShell breadcrumb={[...crumbs, "Completed"]}>
        <div className="animate-rise mx-auto max-w-3xl p-6">
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
            <span className="animate-pop-check mx-auto grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
              <CheckCircle2 className="size-8" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Optimization Completed</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The Optimized RF Design is stored and referenced against the Initial RF Design.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left md:grid-cols-5">
              {[
                ["Coverage", `${state.kpis.coverage}%`],
                ["Capacity", `${state.kpis.capacity}%`],
                ["Total Antennas", `${state.antennas.length}`],
                ["Estimated Cost", costLabel(state.antennas)],
                ["Status", opt.validation.passed ? "Ready" : "Review"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border bg-background p-3">
                  <p className="num text-lg font-bold leading-none">{v}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {k}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => saveOptState(projectId, { completed: false })}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
              >
                Back to Workspace
              </button>
              <button
                onClick={() => exportSnapshot("json")}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
              >
                <FileDown className="size-4" /> Export Snapshot
              </button>
              <Link
                to="/rf/$projectId/bom"
                params={{ projectId }}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110"
              >
                Continue to Engineering BOM &amp; Cost Estimation
              </Link>
            </div>
          </div>
          <pre className="num mt-4 max-h-80 overflow-auto rounded-2xl border border-border bg-card p-4 text-[11px] leading-relaxed">
            {JSON.stringify(design, (k, v) => (k === "layers" ? "[7 RF layers stored]" : v), 2)}
          </pre>
        </div>
      </AppShell>
    );
  }

  /* ---------------- workspace ---------------- */
  return (
    <AppShell breadcrumb={crumbs}>
      <div className="animate-rise flex flex-col gap-3 p-4 md:p-6">
        <OptToolbar
          tool={tool}
          onTool={setTool}
          grid={state.grid}
          snap={state.snap}
          onGrid={() => saveOptState(projectId, { grid: !state.grid })}
          onSnap={() => saveOptState(projectId, { snap: !state.snap })}
          canUndo={opt.canUndo}
          canRedo={opt.canRedo}
          onUndo={opt.undo}
          onRedo={opt.redo}
          onSave={save}
          onCompare={() => setCompare(true)}
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
          hasSelection={selectedIds.length > 0}
        />

        <div className="grid gap-3 xl:grid-cols-[260px_1fr_320px]">
          <div className="order-2 space-y-3 xl:order-1">
            <LayerManager
              settings={state.layerSettings}
              activeLayer={state.activeLayer}
              onSettings={setLayerSetting}
              onActiveLayer={(id) => saveOptState(projectId, { activeLayer: id })}
            />
          </div>

          <div className="order-1 flex flex-col gap-3 xl:order-2">
            <OptCanvas
              model={project.model}
              antennas={antennas}
              layer={layer}
              layerSettings={state.layerSettings}
              selectedIds={selectedIds}
              tool={tool}
              grid={state.grid}
              snap={state.snap}
              onSelect={setSelectedIds}
              onMoveCommit={(ids, dx, dy) => setPendingMove({ ids, dx, dy })}
              onCanvasClick={(x, y) => setPendingAdd({ x, y, category: null })}
              onApi={onApi}
            />
            <StatusBar
              kpis={state.kpis}
              antennas={antennas}
              versionName={currentVersion?.name ?? "Version 1"}
              interference={Math.abs(state.kpis.avgSinr) > 0 ? 12 - state.kpis.avgSinr / 4 : 0}
            />
          </div>

          <div className="order-3 space-y-3">
            <PropertiesPanel
              selected={selected}
              onPatch={setDraft}
              onCommit={commitPatch}
              onReplace={replaceCategory}
              onDelete={() => setPendingDelete(selectedIds)}
              onLock={(locked) => setLocked(locked)}
            />
            <SuggestionsPanel
              suggestions={state.suggestions}
              onApply={applySuggestion}
              onFocus={(x, y) => api.current?.focus(x, y)}
            />
            <ValidationPanel report={opt.validation} onFocus={(x, y) => api.current?.focus(x, y)} />
            <VersionsPanel
              versions={state.versions}
              currentId={state.currentVersionId}
              onRestore={opt.restoreVersion}
              onDuplicate={opt.duplicateVersion}
              onRename={opt.renameVersion}
            />
          </div>
        </div>

        {/* bottom actions */}
        <div className="sticky bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lift backdrop-blur">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Download className="size-3.5" /> Export Snapshot
          </span>
          {(["png", "pdf", "json"] as const).map((f) => (
            <button
              key={f}
              onClick={() => exportSnapshot(f)}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold uppercase transition-smooth hover:bg-accent"
            >
              {f}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {state.savedAt && (
              <span className="text-xs font-semibold text-success">
                ✓ Optimized RF Design Saved Successfully
              </span>
            )}
            <button
              onClick={save}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
            >
              Save Optimized Design
            </button>
            <button
              onClick={() => {
                if (!opt.validation.passed) {
                  toast.error("Engineering validation failed — resolve the flagged checks first.");
                  return;
                }
                saveOptState(projectId, { completed: true, savedAt: Date.now() });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
            >
              <Sparkles className="size-4" /> Complete Optimization
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- dialogs ---------------- */}
      {opt.recalc && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-sm font-bold tracking-tight">Local Recalculation</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Only the affected engineering layers are recomputed.
            </p>
            <div className="mt-4 space-y-2">
              {opt.recalc.steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span
                    className={`grid size-5 place-items-center rounded-full text-[10px] ${
                      i < opt.recalc!.index
                        ? "bg-success-soft text-success"
                        : i === opt.recalc!.index
                          ? "bg-primary-soft text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < opt.recalc!.index ? "✓" : i + 1}
                  </span>
                  <span className={i <= opt.recalc!.index ? "font-semibold" : "text-muted-foreground"}>
                    Updating {s.toUpperCase()} Layer…
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {pendingMove && (
        <Confirm
          title="Position Changed"
          body="Recalculate coverage for the affected layers?"
          confirmLabel="Yes"
          cancelLabel="No"
          onConfirm={commitMove}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {pendingDelete && (
        <Confirm
          title="Delete Antenna"
          body="Coverage may decrease. Continue?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          danger
          onConfirm={commitDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-rise w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-lift">
            <h2 className="text-base font-bold tracking-tight">Antenna Category</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose the category to install at the selected location, then run local optimization.
            </p>
            <div className="mt-4 grid gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => commitAdd(c.id)}
                  className="rounded-xl border border-border p-3 text-left transition-smooth hover:border-primary hover:bg-primary-soft"
                >
                  <p className="text-sm font-bold">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground">{c.coverage}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingAdd(null)}
              className="mt-4 w-full rounded-xl border border-border py-2 text-xs font-semibold transition-smooth hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {compare && (
        <CompareDialog
          versions={state.versions}
          currentId={state.currentVersionId}
          onClose={() => setCompare(false)}
        />
      )}
    </AppShell>
  );
}

function Confirm({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="animate-rise w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-lift">
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-smooth hover:brightness-110 ${
              danger ? "bg-danger" : "bg-primary"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
