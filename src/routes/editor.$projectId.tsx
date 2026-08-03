import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  Check,
  Columns3,
  DoorOpen,
  Grid3x3,
  Layers,
  Magnet,
  Minus,
  MousePointer2,
  Move,
  Maximize,
  PanelsTopLeft,
  Redo2,
  Ruler,
  Save,
  ShieldCheck,
  SquareDashed,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { Scene } from "@/components/editor/scene";
import {
  LayersPanel,
  MaterialsPanel,
  ValidationPanel,
} from "@/components/editor/side-panels";
import { GridDefs, useViewport } from "@/components/editor/viewport";
import type {
  BuildingModel,
  BuildingObject,
  MaterialId,
} from "@/lib/building-model";
import {
  dist,
  uid,
  validateModel,
  type ValidationIssue,
} from "@/lib/geometry";
import { saveModel, updateProject, useProject } from "@/lib/project-store";

export const Route = createFileRoute("/editor/$projectId")({
  head: () => ({
    meta: [
      { title: "Building Editor — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Vector CAD workspace to edit walls, doors, windows, columns, rooms, materials and layers of the building digital twin.",
      },
      { property: "og:title", content: "Building Editor — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Edit and validate the AI-generated building model before RF planning.",
      },
    ],
  }),
  component: EditorPage,
});

type Tool =
  | "select"
  | "move"
  | "wall"
  | "door"
  | "window"
  | "column"
  | "room"
  | "measure";

function EditorPage() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const navigate = useNavigate();

  const [model, setModel] = useState<BuildingModel | null>(null);
  const [past, setPast] = useState<BuildingModel[]>([]);
  const [future, setFuture] = useState<BuildingModel[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(true);
  const [panel, setPanel] = useState<"properties" | "layers" | "materials" | "validation">(
    "properties",
  );
  const [draft, setDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(
    null,
  );
  const [measure, setMeasure] = useState<
    { x1: number; y1: number; x2: number; y2: number } | null
  >(null);
  const [scaleWizard, setScaleWizard] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const vp = useViewport();
  const modelRef = useRef<BuildingModel | null>(null);
  modelRef.current = model;

  useEffect(() => {
    if (project && !model) {
      setModel(project.model);
      setTimeout(() => vp.fit(), 30);
      if (!project.model.scaleDetected) setScaleWizard(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const commit = useCallback((next: BuildingModel) => {
    setPast((p) => [...p.slice(-40), modelRef.current!].filter(Boolean));
    setFuture([]);
    setModel(next);
  }, []);

  const patchObjects = useCallback(
    (fn: (objs: BuildingObject[]) => BuildingObject[]) => {
      const m = modelRef.current;
      if (!m) return;
      commit({ ...m, objects: fn(m.objects) });
    },
    [commit],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1]!;
      setFuture((f) => [modelRef.current!, ...f]);
      setModel(prev);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0]!;
      setPast((p) => [...p, modelRef.current!]);
      setModel(next);
      return f.slice(1);
    });
  }, []);

  const save = useCallback(
    (label = "Manual save") => {
      const m = modelRef.current;
      if (!m) return;
      saveModel(projectId, m, label);
      updateProject(projectId, { status: "editing" });
      setSavedAt(Date.now());
      if (label === "Manual save") toast.success("Digital building model saved");
    },
    [projectId],
  );

  // autosave every 30s
  useEffect(() => {
    const t = setInterval(() => save("Autosave"), 30000);
    return () => clearInterval(t);
  }, [save]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        setConfirmDelete(selected);
      } else if (e.key === "Escape") {
        setSelected(null);
        setDraft(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, save, selected]);

  const issues = useMemo(() => (model ? validateModel(model) : []), [model]);
  const selectedObject = model?.objects.find((o) => o.id === selected) ?? null;

  const snapVal = (n: number) => (snap ? Math.round(n * 2) / 2 : n);

  const onCanvasDown = (e: React.PointerEvent) => {
    if (!model) return;
    if (e.button === 1 || tool === "move" || tool === "select") {
      vp.startPan(e);
      if (tool === "select") setSelected(null);
      return;
    }
    const p = vp.toModel(e.clientX, e.clientY);
    const x = snapVal(p.x);
    const y = snapVal(p.y);

    if (tool === "wall" || tool === "room" || tool === "measure") {
      setDraft({ x1: x, y1: y, x2: x, y2: y });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if (tool === "column") {
      patchObjects((objs) => [
        ...objs,
        {
          id: uid("col"),
          kind: "column",
          x,
          y,
          width: 0.6,
          depth: 0.6,
          height: 4,
          material: "concrete",
        },
      ]);
      toast.success("Column added");
      return;
    }
    if (tool === "door" || tool === "window") {
      const walls = model.objects.filter((o) => o.kind === "wall");
      let best: { id: string; d: number; t: number } | null = null;
      for (const w of walls) {
        if (w.kind !== "wall") continue;
        const vx = w.x2 - w.x1;
        const vy = w.y2 - w.y1;
        const len2 = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((x - w.x1) * vx + (y - w.y1) * vy) / len2));
        const d = dist(x, y, w.x1 + vx * t, w.y1 + vy * t);
        if (!best || d < best.d) best = { id: w.id, d, t };
      }
      const host = best && best.d < 2 ? best : null;
      const hostWall = host
        ? model.objects.find((o) => o.id === host.id && o.kind === "wall")
        : null;
      const px =
        hostWall && hostWall.kind === "wall"
          ? hostWall.x1 + (hostWall.x2 - hostWall.x1) * host!.t
          : x;
      const py =
        hostWall && hostWall.kind === "wall"
          ? hostWall.y1 + (hostWall.y2 - hostWall.y1) * host!.t
          : y;
      patchObjects((objs) => [
        ...objs,
        {
          id: uid(tool),
          kind: tool,
          wallId: host?.id ?? null,
          t: host?.t ?? 0,
          x: px,
          y: py,
          width: tool === "door" ? 1.1 : 1.8,
          height: tool === "door" ? 2.1 : 1.4,
          material: tool === "door" ? "wood" : "glass",
          ...(tool === "door"
            ? { opening: "inward-left" as const }
            : { glassType: "Double Glazed Low-E", frameType: "Aluminium" }),
        },
      ]);
      toast[host ? "success" : "warning"](
        host
          ? `${tool === "door" ? "Door" : "Window"} hosted on wall`
          : `${tool === "door" ? "Door" : "Window"} placed without a host wall`,
      );
    }
  };

  const onCanvasMove = (e: React.PointerEvent) => {
    vp.movePan(e);
    if (!draft) return;
    const p = vp.toModel(e.clientX, e.clientY);
    setDraft({ ...draft, x2: snapVal(p.x), y2: snapVal(p.y) });
  };

  const onCanvasUp = (e: React.PointerEvent) => {
    vp.endPan();
    if (!draft) return;
    const d = draft;
    setDraft(null);
    if (tool === "measure") {
      setMeasure(d);
      return;
    }
    if (dist(d.x1, d.y1, d.x2, d.y2) < 0.4) return;
    if (tool === "wall") {
      patchObjects((objs) => [
        ...objs,
        {
          id: uid("wall"),
          kind: "wall",
          x1: d.x1,
          y1: d.y1,
          x2: d.x2,
          y2: d.y2,
          height: 3.2,
          thickness: 0.2,
          material: "gypsum",
        },
      ]);
      toast.success(`Wall added · ${dist(d.x1, d.y1, d.x2, d.y2).toFixed(2)} m`);
    }
    if (tool === "room") {
      const x = Math.min(d.x1, d.x2);
      const y = Math.min(d.y1, d.y2);
      const w = Math.abs(d.x2 - d.x1);
      const h = Math.abs(d.y2 - d.y1);
      patchObjects((objs) => [
        ...objs,
        {
          id: uid("room"),
          kind: "room",
          name: "New Room",
          usage: "Office",
          color: "#2563EB",
          points: [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
          ],
        },
      ]);
      toast.success(`Room added · ${(w * h).toFixed(1)} m²`);
    }
    void e;
  };

  if (!project) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-center">
        <div>
          <p className="font-semibold">Project not found</p>
          <Link to="/" className="mt-3 inline-block text-sm text-primary underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const TOOLBOX: { id: Tool; label: string; icon: typeof Move }[] = [
    { id: "wall", label: "Add Wall", icon: Minus },
    { id: "door", label: "Add Door", icon: DoorOpen },
    { id: "window", label: "Add Window", icon: PanelsTopLeft },
    { id: "column", label: "Add Column", icon: Columns3 },
    { id: "room", label: "Add Room", icon: SquareDashed },
    { id: "measure", label: "Measure", icon: Ruler },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* top toolbar */}
      <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-card px-3">
        <Link
          to="/"
          className="mr-2 truncate text-sm font-bold tracking-tight hover:text-primary"
        >
          {project.name}
        </Link>
        <span className="hidden rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground md:block">
          Digital Twin Editor
        </span>

        <div className="mx-auto flex items-center gap-1">
          <TB icon={MousePointer2} label="Select" active={tool === "select"} onClick={() => setTool("select")} />
          <TB icon={Move} label="Move / Pan" active={tool === "move"} onClick={() => setTool("move")} />
          <TB
            icon={Trash2}
            label="Delete (Del)"
            onClick={() => selected && setConfirmDelete(selected)}
            disabled={!selected}
          />
          <Divider />
          <TB icon={Undo2} label="Undo (Ctrl+Z)" onClick={undo} disabled={past.length === 0} />
          <TB icon={Redo2} label="Redo (Ctrl+Y)" onClick={redo} disabled={future.length === 0} />
          <Divider />
          <TB icon={Ruler} label="Measure" active={tool === "measure"} onClick={() => setTool("measure")} />
          <TB icon={ZoomIn} label="Zoom In" onClick={() => vp.zoomBy(1.2)} />
          <TB icon={ZoomOut} label="Zoom Out" onClick={() => vp.zoomBy(1 / 1.2)} />
          <TB icon={Maximize} label="Fit Screen" onClick={() => vp.fit()} />
        </div>

        <span className="num hidden text-[11px] text-muted-foreground lg:block">
          {savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : "Autosave on"}
        </span>
        <button
          onClick={() => save()}
          className="ml-2 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
        >
          <Save className="size-3.5" /> Save
        </button>
        <button
          onClick={() => {
            save("Digital twin finalised");
            updateProject(projectId, { status: "ready" });
            navigate({ to: "/ready/$projectId", params: { projectId } });
          }}
          disabled={issues.some((i) => i.severity === "error")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 disabled:opacity-40"
        >
          <ShieldCheck className="size-3.5" /> Finish
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* left toolbox */}
        <aside className="flex w-20 shrink-0 flex-col items-center gap-1.5 border-r border-border bg-card py-3">
          {TOOLBOX.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-smooth ${
                tool === t.id
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <t.icon className="size-4.5" strokeWidth={1.8} />
              {t.label.replace("Add ", "")}
            </button>
          ))}
          <div className="my-1 h-px w-10 bg-border" />
          <button
            onClick={() => setSnap((s) => !s)}
            className={`flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-smooth ${
              snap ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Magnet className="size-4.5" strokeWidth={1.8} /> Snap
          </button>
          <button
            onClick={() => setGrid((g) => !g)}
            className={`flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-smooth ${
              grid ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Grid3x3 className="size-4.5" strokeWidth={1.8} /> Grid
          </button>
          <button
            onClick={() => setPanel("layers")}
            className="flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-muted-foreground transition-smooth hover:bg-secondary"
          >
            <Layers className="size-4.5" strokeWidth={1.8} /> Layers
          </button>
          <button
            onClick={() => setPanel("materials")}
            className="flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-muted-foreground transition-smooth hover:bg-secondary"
          >
            <Boxes className="size-4.5" strokeWidth={1.8} /> Materials
          </button>
        </aside>

        {/* canvas */}
        <div
          ref={vp.ref}
          onPointerDown={onCanvasDown}
          onPointerMove={onCanvasMove}
          onPointerUp={onCanvasUp}
          className="relative min-w-0 flex-1 touch-none select-none bg-canvas"
          style={{ cursor: tool === "select" || tool === "move" ? "grab" : "crosshair" }}
        >
          <svg className="absolute inset-0 size-full">
            {grid && <GridDefs z={vp.view.z} view={vp.view} />}
            <g transform={`translate(${vp.view.x} ${vp.view.y}) scale(${vp.view.z})`}>
              {/* origin axes */}
              <line x1={-1000} y1={0} x2={1000} y2={0} stroke="var(--primary)" strokeWidth={0.03} opacity={0.4} />
              <line x1={0} y1={-1000} x2={0} y2={1000} stroke="var(--primary)" strokeWidth={0.03} opacity={0.4} />
              {model && (
                <Scene
                  model={model}
                  selectedId={selected}
                  hoverId={hover}
                  interactive={tool === "select"}
                  onPick={setSelected}
                  onHover={setHover}
                />
              )}
              {draft && (
                <g>
                  {tool === "room" ? (
                    <rect
                      x={Math.min(draft.x1, draft.x2)}
                      y={Math.min(draft.y1, draft.y2)}
                      width={Math.abs(draft.x2 - draft.x1)}
                      height={Math.abs(draft.y2 - draft.y1)}
                      fill="var(--primary)"
                      fillOpacity={0.12}
                      stroke="var(--primary)"
                      strokeWidth={0.1}
                      strokeDasharray="0.4 0.3"
                    />
                  ) : (
                    <line
                      x1={draft.x1}
                      y1={draft.y1}
                      x2={draft.x2}
                      y2={draft.y2}
                      stroke="var(--primary)"
                      strokeWidth={0.18}
                      strokeDasharray="0.5 0.35"
                    />
                  )}
                  <text
                    x={(draft.x1 + draft.x2) / 2}
                    y={(draft.y1 + draft.y2) / 2 - 0.6}
                    textAnchor="middle"
                    fontSize={0.9}
                    fill="var(--primary)"
                  >
                    {dist(draft.x1, draft.y1, draft.x2, draft.y2).toFixed(2)} m
                  </text>
                </g>
              )}
              {measure && (
                <g>
                  <line
                    x1={measure.x1}
                    y1={measure.y1}
                    x2={measure.x2}
                    y2={measure.y2}
                    stroke="var(--warning)"
                    strokeWidth={0.14}
                  />
                  <text
                    x={(measure.x1 + measure.x2) / 2}
                    y={(measure.y1 + measure.y2) / 2 - 0.5}
                    textAnchor="middle"
                    fontSize={0.9}
                    fill="var(--warning)"
                  >
                    {dist(measure.x1, measure.y1, measure.x2, measure.y2).toFixed(2)} m
                  </text>
                </g>
              )}
            </g>
          </svg>

          <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2">
            <Chip>
              {model?.scaleDetected ? "Scale calibrated" : "Scale not calibrated"}
            </Chip>
            <Chip>Zoom {Math.round(vp.view.z * 8)}%</Chip>
            <Chip>{snap ? "Snap 0.5 m" : "Snap off"}</Chip>
          </div>
          <button
            onClick={() => setScaleWizard(true)}
            className="absolute bottom-3 right-3 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold shadow-soft transition-smooth hover:bg-accent"
          >
            Manual Scale Wizard
          </button>
        </div>

        {/* right panel */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
          <div className="flex shrink-0 gap-1 border-b border-border p-2">
            {(["properties", "layers", "materials", "validation"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-smooth ${
                  panel === p
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {p === "validation" ? `Check${issues.length ? ` (${issues.length})` : ""}` : p}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {panel === "properties" && (
              <PropertiesPanel
                object={selectedObject}
                onChange={(patch) =>
                  patchObjects((objs) =>
                    objs.map((o) => (o.id === selected ? ({ ...o, ...patch } as BuildingObject) : o)),
                  )
                }
              />
            )}
            {panel === "layers" && model && (
              <LayersPanel
                layers={model.layers}
                onChange={(id, patch) =>
                  commit({
                    ...model,
                    layers: model.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
                  })
                }
              />
            )}
            {panel === "materials" && (
              <MaterialsPanel
                onApply={(id: MaterialId) => {
                  if (!selected) {
                    toast.warning("Select an object first to apply a material");
                    return;
                  }
                  patchObjects((objs) =>
                    objs.map((o) =>
                      o.id === selected && o.kind !== "room"
                        ? ({ ...o, material: id } as BuildingObject)
                        : o,
                    ),
                  );
                  toast.success("Material applied");
                }}
              />
            )}
            {panel === "validation" && (
              <ValidationPanel
                issues={issues}
                onZoom={(i: ValidationIssue) => {
                  vp.centerOn(i.target.x, i.target.y, 26);
                  if (i.objectId) setSelected(i.objectId);
                  if (i.code === "INVALID_SCALE") setScaleWizard(true);
                }}
              />
            )}
          </div>
          <div className="shrink-0 border-t border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Version history
            </p>
            <ul className="num mt-2 max-h-24 space-y-1 overflow-y-auto text-[11px] text-muted-foreground">
              {project.versions.length === 0 && <li>No saved versions yet</li>}
              {project.versions.map((v) => (
                <li key={v.at} className="flex justify-between gap-2">
                  <span className="truncate">{v.label}</span>
                  <span>{new Date(v.at).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} title="Delete object?">
          <p className="text-sm text-muted-foreground">
            This removes the object from the digital building model. You can undo with
            Ctrl+Z.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-smooth hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                patchObjects((objs) => objs.filter((o) => o.id !== confirmDelete));
                setSelected(null);
                setConfirmDelete(null);
                toast.success("Object deleted");
              }}
              className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-primary-foreground transition-smooth hover:brightness-110"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}

      {scaleWizard && model && (
        <ScaleWizard
          onClose={() => setScaleWizard(false)}
          onApply={(meters, pixels) => {
            const factor = meters / pixels;
            commit({
              ...model,
              scale: 1,
              scaleDetected: true,
              objects: model.objects.map((o) => scaleObject(o, factor)),
            });
            setScaleWizard(false);
            toast.success("Model rescaled to real-world dimensions");
          }}
        />
      )}
    </div>
  );
}

function scaleObject(o: BuildingObject, f: number): BuildingObject {
  if (o.kind === "wall")
    return { ...o, x1: o.x1 * f, y1: o.y1 * f, x2: o.x2 * f, y2: o.y2 * f };
  if (o.kind === "room")
    return { ...o, points: o.points.map((p) => ({ x: p.x * f, y: p.y * f })) };
  return { ...o, x: o.x * f, y: o.y * f };
}

function ScaleWizard({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (meters: number, pixels: number) => void;
}) {
  const [meters, setMeters] = useState("20");
  const [picked, setPicked] = useState<{ x: number; y: number }[]>([]);
  const measured = picked.length === 2 ? dist(picked[0]!.x, picked[0]!.y, picked[1]!.x, picked[1]!.y) : 0;

  return (
    <Modal onClose={onClose} title="Manual Scale Wizard">
      <p className="text-sm text-muted-foreground">
        AI could not confirm the drawing scale. Select two reference points, then enter the
        real-world distance between them.
      </p>
      <div
        className="mt-4 h-44 cursor-crosshair rounded-xl border border-dashed border-border bg-background"
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const p = { x: (e.clientX - r.left) / 8, y: (e.clientY - r.top) / 8 };
          setPicked((prev) => (prev.length >= 2 ? [p] : [...prev, p]));
        }}
      >
        <svg className="size-full">
          {picked.map((p, i) => (
            <circle key={i} cx={p.x * 8} cy={p.y * 8} r="5" fill="var(--primary)" />
          ))}
          {picked.length === 2 && (
            <line
              x1={picked[0]!.x * 8}
              y1={picked[0]!.y * 8}
              x2={picked[1]!.x * 8}
              y2={picked[1]!.y * 8}
              stroke="var(--primary)"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>
      <label className="mt-4 block">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          What is the real-world distance? (meters)
        </span>
        <input
          value={meters}
          onChange={(e) => setMeters(e.target.value)}
          placeholder="20 meters"
          className="num mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-smooth hover:bg-accent"
        >
          Skip
        </button>
        <button
          disabled={picked.length !== 2 || !Number(meters)}
          onClick={() => onApply(Number(meters), measured || 1)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-smooth hover:brightness-110 disabled:opacity-40"
        >
          <Check className="size-4" /> Rescale model
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-rise w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-panel"
      >
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="num rounded-lg border border-border bg-card/90 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-soft">
      {children}
    </span>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-border" />;
}

function TB({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: typeof Move;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid size-9 place-items-center rounded-xl transition-smooth disabled:opacity-30 ${
        active
          ? "bg-primary-soft text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="size-4" strokeWidth={1.9} />
    </button>
  );
}
