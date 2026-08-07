import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Maximize, Minus, Plus } from "lucide-react";
import type { BuildingModel } from "@/lib/building-model";
import { Scene } from "@/components/editor/scene";
import { GridDefs, useViewport } from "@/components/editor/viewport";
import { modelBounds, type RfLayer, type RfLayerId } from "@/lib/rf-simulation";
import type { LayerSettings, OptAntenna } from "@/lib/rf-optimization";

const HEAT = ["#dc2626", "#f97316", "#facc15", "#84cc16", "#16a34a"];
const PRIORITY_FILL = ["transparent", "#38bdf8", "#facc15", "#f97316", "#dc2626"];

function cellColor(layer: RfLayer, v: number, raw: number) {
  if (layer.id === "critical") return PRIORITY_FILL[Math.round(raw)] ?? "transparent";
  return HEAT[Math.min(HEAT.length - 1, Math.max(0, Math.floor(v * HEAT.length)))]!;
}

export type OptTool =
  | "select"
  | "move"
  | "add"
  | "delete"
  | "replace"
  | "measure"
  | "box";

export interface CanvasApi {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  focus: (x: number, y: number) => void;
}

export function OptCanvas({
  model,
  antennas,
  layer,
  layerSettings,
  selectedIds,
  tool,
  grid,
  snap,
  onSelect,
  onMoveCommit,
  onCanvasClick,
  onApi,
}: {
  model: BuildingModel;
  antennas: OptAntenna[];
  layer: RfLayer | null;
  layerSettings: Record<string, LayerSettings>;
  selectedIds: string[];
  tool: OptTool;
  grid: boolean;
  snap: boolean;
  onSelect: (ids: string[]) => void;
  onMoveCommit: (ids: string[], dx: number, dy: number) => void;
  onCanvasClick: (x: number, y: number) => void;
  onApi: (api: CanvasApi) => void;
}) {
  const vp = useViewport();
  const bounds = useMemo(() => modelBounds(model), [model]);
  const fitted = useRef(false);
  const [hover, setHover] = useState<OptAntenna | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [box, setBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [measure, setMeasure] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(
    null,
  );
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (fitted.current) return;
    fitted.current = true;
    const t = setTimeout(() => vp.fit(bounds.w, bounds.h, 60), 30);
    return () => clearTimeout(t);
  }, [vp, bounds.w, bounds.h]);

  const apiRef = useRef<CanvasApi | null>(null);
  useEffect(() => {
    const api: CanvasApi = {
      zoomIn: () => vp.zoomBy(1.2),
      zoomOut: () => vp.zoomBy(1 / 1.2),
      fit: () => vp.fit(bounds.w, bounds.h, 60),
      focus: (x, y) => vp.centerOn(x, y, Math.max(vp.view.z, 16)),
    };
    apiRef.current = api;
    onApi(api);
  }, [vp, bounds.w, bounds.h, onApi]);

  const layerVisible = layer ? layerSettings[layer.id]?.visible !== false : false;
  const layerOpacity = layer ? (layerSettings[layer.id]?.opacity ?? 0.5) : 0.5;

  const viewModel: BuildingModel = useMemo(
    () => ({
      ...model,
      layers: model.layers.map((l) => ({
        ...l,
        visible:
          l.id === "walls"
            ? layerSettings.walls?.visible !== false
            : l.id === "labels"
              ? layerSettings.rooms?.visible !== false
              : l.id === "columns"
                ? layerSettings.materials?.visible !== false
                : l.visible,
      })),
    }),
    [model, layerSettings],
  );

  const snapVal = (v: number) => (snap ? Math.round(v * 2) / 2 : Number(v.toFixed(2)));

  const onPointerDown = (e: React.PointerEvent) => {
    const p = vp.toModel(e.clientX, e.clientY);
    if (tool === "add") {
      onCanvasClick(snapVal(p.x), snapVal(p.y));
      return;
    }
    if (tool === "measure") {
      setMeasure({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      dragStart.current = p;
      return;
    }
    if (tool === "box") {
      setBox({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      dragStart.current = p;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    onSelect([]);
    vp.startPan(e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = vp.toModel(e.clientX, e.clientY);
    if (measure && dragStart.current) {
      setMeasure({ ...dragStart.current && { x1: dragStart.current.x, y1: dragStart.current.y }, x2: p.x, y2: p.y } as typeof measure);
      return;
    }
    if (box && dragStart.current) {
      setBox({ x1: dragStart.current.x, y1: dragStart.current.y, x2: p.x, y2: p.y });
      return;
    }
    if (drag && dragStart.current) {
      setDrag({ dx: p.x - dragStart.current.x, dy: p.y - dragStart.current.y });
      return;
    }
    vp.movePan(e);
  };

  const onPointerUp = () => {
    if (box) {
      const x1 = Math.min(box.x1, box.x2);
      const x2 = Math.max(box.x1, box.x2);
      const y1 = Math.min(box.y1, box.y2);
      const y2 = Math.max(box.y1, box.y2);
      const ids = antennas.filter((a) => a.x >= x1 && a.x <= x2 && a.y >= y1 && a.y <= y2).map((a) => a.id);
      onSelect(ids);
      setBox(null);
      dragStart.current = null;
      return;
    }
    if (drag) {
      const dx = snap ? Math.round(drag.dx * 2) / 2 : Number(drag.dx.toFixed(2));
      const dy = snap ? Math.round(drag.dy * 2) / 2 : Number(drag.dy.toFixed(2));
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) onMoveCommit(selectedIds, dx, dy);
      setDrag(null);
      dragStart.current = null;
      return;
    }
    dragStart.current = null;
    vp.endPan();
  };

  const antennaDown = (e: React.PointerEvent, a: OptAntenna) => {
    e.stopPropagation();
    if (tool === "measure" || tool === "box" || tool === "add") return;
    const multi = e.ctrlKey || e.metaKey;
    const ids = multi
      ? selectedIds.includes(a.id)
        ? selectedIds.filter((i) => i !== a.id)
        : [...selectedIds, a.id]
      : selectedIds.includes(a.id)
        ? selectedIds
        : [a.id];
    onSelect(ids);
    if (tool === "move" && !a.locked) {
      dragStart.current = vp.toModel(e.clientX, e.clientY);
      setDrag({ dx: 0, dy: 0 });
      (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-card">
      <div
        ref={vp.ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className={`relative h-[560px] bg-[var(--canvas)] ${
          tool === "add" ? "cursor-crosshair" : tool === "move" ? "cursor-move" : "cursor-grab"
        }`}
      >
        <svg className="size-full">
          {grid && <GridDefs z={vp.view.z} view={vp.view} />}
          <g transform={`translate(${vp.view.x},${vp.view.y}) scale(${vp.view.z})`}>
            {layer && layerVisible && (
              <g opacity={layerOpacity} className="transition-smooth">
                {layer.cells.map((c, i) => {
                  const fill = cellColor(layer, c.v, c.raw);
                  if (fill === "transparent") return null;
                  return (
                    <rect
                      key={i}
                      x={c.x}
                      y={c.y}
                      width={layer.cellSize}
                      height={layer.cellSize}
                      fill={fill}
                      shapeRendering="crispEdges"
                    />
                  );
                })}
              </g>
            )}

            <Scene model={viewModel} showDimensions={false} />

            {layerSettings.antennas?.visible !== false &&
              antennas.map((a) => {
                const sel = selectedIds.includes(a.id);
                const ox = sel && drag ? drag.dx : 0;
                const oy = sel && drag ? drag.dy : 0;
                return (
                  <g
                    key={a.id}
                    onPointerDown={(e) => antennaDown(e, a)}
                    onPointerEnter={() => setHover(a)}
                    onPointerLeave={() => setHover(null)}
                    style={{ cursor: "pointer" }}
                    opacity={layerSettings.antennas?.opacity ?? 1}
                  >
                    <circle
                      cx={a.x + ox}
                      cy={a.y + oy}
                      r={a.radius}
                      fill="var(--primary)"
                      fillOpacity={sel ? 0.1 : 0.04}
                      stroke="var(--primary)"
                      strokeOpacity={sel ? 0.7 : 0.35}
                      strokeWidth={0.08}
                      strokeDasharray="0.6 0.5"
                    />
                    <circle
                      cx={a.x + ox}
                      cy={a.y + oy}
                      r={sel ? 1.25 : 0.9}
                      fill={sel ? "var(--primary)" : "var(--primary)"}
                      stroke={sel ? "var(--foreground)" : "var(--card)"}
                      strokeWidth={0.18}
                    />
                    {a.locked && (
                      <text x={a.x + ox + 1.2} y={a.y + oy - 0.9} fontSize={1.1} fill="var(--warning)">
                        ●
                      </text>
                    )}
                    <text
                      x={a.x + ox}
                      y={a.y + oy - 1.7}
                      textAnchor="middle"
                      fontSize={0.9}
                      fontWeight={700}
                      className="num"
                      fill="var(--foreground)"
                    >
                      {a.id.replace("ant-", "A")}
                    </text>
                  </g>
                );
              })}

            {box && (
              <rect
                x={Math.min(box.x1, box.x2)}
                y={Math.min(box.y1, box.y2)}
                width={Math.abs(box.x2 - box.x1)}
                height={Math.abs(box.y2 - box.y1)}
                fill="var(--primary)"
                fillOpacity={0.08}
                stroke="var(--primary)"
                strokeWidth={0.1}
                strokeDasharray="0.5 0.4"
              />
            )}

            {measure && (
              <g>
                <line
                  x1={measure.x1}
                  y1={measure.y1}
                  x2={measure.x2}
                  y2={measure.y2}
                  stroke="var(--primary)"
                  strokeWidth={0.12}
                />
                <text
                  x={(measure.x1 + measure.x2) / 2}
                  y={(measure.y1 + measure.y2) / 2 - 0.6}
                  textAnchor="middle"
                  fontSize={1}
                  className="num"
                  fill="var(--primary)"
                >
                  {Math.hypot(measure.x2 - measure.x1, measure.y2 - measure.y1).toFixed(2)} m
                </text>
              </g>
            )}
          </g>
        </svg>

        {hover && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-xl border border-border bg-card/95 px-3 py-2 text-[11px] shadow-soft backdrop-blur">
            <p className="num font-bold">{hover.label}</p>
            <p className="text-muted-foreground">{hover.category}</p>
            <p className="text-muted-foreground">
              {hover.status}
              {hover.locked ? " · Locked" : ""}
            </p>
          </div>
        )}

        {layer && layerVisible && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-border bg-card/90 px-3 py-2 text-[11px] backdrop-blur">
            <p className="font-bold">
              {layer.label} <span className="text-muted-foreground">({layer.unit})</span>
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              {HEAT.map((c) => (
                <span key={c} className="h-2 w-6 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <p className="num mt-1 flex justify-between gap-6 text-muted-foreground">
              <span>{layer.min.toFixed(1)}</span>
              <span>{layer.max.toFixed(1)}</span>
            </p>
          </div>
        )}

        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <button
            onClick={() => apiRef.current?.zoomIn()}
            aria-label="Zoom in"
            className="rounded-lg border border-border bg-card/90 p-1.5 backdrop-blur transition-smooth hover:bg-accent"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            onClick={() => apiRef.current?.zoomOut()}
            aria-label="Zoom out"
            className="rounded-lg border border-border bg-card/90 p-1.5 backdrop-blur transition-smooth hover:bg-accent"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            onClick={() => apiRef.current?.fit()}
            aria-label="Fit to screen"
            className="rounded-lg border border-border bg-card/90 p-1.5 backdrop-blur transition-smooth hover:bg-accent"
          >
            <Maximize className="size-3.5" />
          </button>
        </div>

        {selectedIds.length > 1 && (
          <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur">
            <Lock className="size-3" /> {selectedIds.length} antennas selected
          </div>
        )}
      </div>
    </div>
  );
}
