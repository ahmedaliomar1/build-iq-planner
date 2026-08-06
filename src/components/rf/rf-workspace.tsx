import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Antenna,
  Crosshair,
  Download,
  Gauge,
  Layers,
  Lightbulb,
  Maximize,
  Minus,
  Plus,
  Radio,
  Save,
  Signal,
  Target,
  TrendingUp,
  Wifi,
} from "lucide-react";
import type { BuildingModel } from "@/lib/building-model";
import { Scene } from "@/components/editor/scene";
import { GridDefs, useViewport } from "@/components/editor/viewport";
import {
  modelBounds,
  type AntennaPlacement,
  type InitialRfDesign,
  type RfLayer,
  type RfLayerId,
} from "@/lib/rf-simulation";

const RF_LAYERS: { id: RfLayerId; label: string }[] = [
  { id: "coverage", label: "Coverage" },
  { id: "capacity", label: "Capacity" },
  { id: "sinr", label: "SINR" },
  { id: "rsrp", label: "RSRP" },
  { id: "rsrq", label: "RSRQ" },
  { id: "interference", label: "Interference" },
  { id: "critical", label: "Critical Areas" },
];

const HEAT = ["#dc2626", "#f97316", "#facc15", "#84cc16", "#16a34a"];
const PRIORITY_FILL = ["transparent", "#38bdf8", "#facc15", "#f97316", "#dc2626"];

function cellColor(layer: RfLayer, v: number, raw: number) {
  if (layer.id === "critical") return PRIORITY_FILL[Math.round(raw)] ?? "transparent";
  const idx = Math.min(HEAT.length - 1, Math.max(0, Math.floor(v * HEAT.length)));
  return HEAT[idx]!;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Signal;
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <span
        className={`grid size-8 place-items-center rounded-lg ${
          tone === "warn" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <p className="num mt-2 text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function RfPlanningWorkspace({
  model,
  design,
  activeLayer,
  onActiveLayer,
  onSave,
  onExport,
  onContinue,
  saved,
}: {
  model: BuildingModel;
  design: InitialRfDesign;
  activeLayer: RfLayerId | null;
  onActiveLayer: (id: RfLayerId | null) => void;
  onSave: () => void;
  onExport: (format: "pdf" | "json" | "csv") => void;
  onContinue: () => void;
  saved: boolean;
}) {
  const vp = useViewport();
  const [base, setBase] = useState({ walls: true, rooms: true, materials: true, antennas: true });
  const [selected, setSelected] = useState<AntennaPlacement | null>(null);
  const [tab, setTab] = useState<"warnings" | "recommendations">("warnings");

  const bounds = useMemo(() => modelBounds(model), [model]);
  const layer = activeLayer ? design.layers[activeLayer] : null;

  const viewModel: BuildingModel = useMemo(
    () => ({
      ...model,
      layers: model.layers.map((l) => ({
        ...l,
        visible:
          l.id === "walls"
            ? base.walls
            : l.id === "labels"
              ? base.rooms
              : l.id === "columns"
                ? base.materials
                : l.visible,
      })),
    }),
    [model, base],
  );

  const zoomTo = (x: number, y: number) => vp.centerOn(x, y, Math.max(vp.view.z, 16));

  return (
    <div className="animate-rise flex flex-col gap-4 p-4 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* ---------------- canvas ---------------- */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          {/* layer manager */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Layers className="size-3.5" /> Layers
            </span>
            {(
              [
                ["walls", "Walls"],
                ["rooms", "Rooms"],
                ["materials", "Materials"],
                ["antennas", "Antennas"],
              ] as const
            ).map(([k, label]) => (
              <label
                key={k}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-smooth hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={base[k]}
                  onChange={(e) => setBase((b) => ({ ...b, [k]: e.target.checked }))}
                  className="size-3.5 accent-[var(--primary)]"
                />
                {label}
              </label>
            ))}
            <span className="mx-1 h-5 w-px bg-border" />
            {RF_LAYERS.map((l) => (
              <label
                key={l.id}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-smooth ${
                  activeLayer === l.id
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={activeLayer === l.id}
                  onChange={(e) => onActiveLayer(e.target.checked ? l.id : null)}
                  className="size-3.5 accent-[var(--primary)]"
                />
                {l.label}
              </label>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => vp.zoomBy(1.2)}
                aria-label="Zoom in"
                className="rounded-lg border border-border p-1.5 transition-smooth hover:bg-accent"
              >
                <Plus className="size-3.5" />
              </button>
              <button
                onClick={() => vp.zoomBy(1 / 1.2)}
                aria-label="Zoom out"
                className="rounded-lg border border-border p-1.5 transition-smooth hover:bg-accent"
              >
                <Minus className="size-3.5" />
              </button>
              <button
                onClick={() => vp.fit(bounds.w, bounds.h, 50)}
                aria-label="Fit screen"
                className="rounded-lg border border-border p-1.5 transition-smooth hover:bg-accent"
              >
                <Maximize className="size-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={vp.ref}
            onPointerDown={vp.startPan}
            onPointerMove={vp.movePan}
            onPointerUp={vp.endPan}
            onPointerLeave={vp.endPan}
            className="relative h-[520px] cursor-grab bg-[var(--canvas)] active:cursor-grabbing"
          >
            <svg className="size-full">
              <GridDefs z={vp.view.z} view={vp.view} />
              <g transform={`translate(${vp.view.x},${vp.view.y}) scale(${vp.view.z})`}>
                {layer && (
                  <g opacity={layer.id === "critical" ? 0.4 : 0.5} className="transition-smooth">
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

                {base.antennas &&
                  design.selectedAntennaLayout.map((a) => (
                    <g
                      key={a.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelected(a);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={a.x}
                        cy={a.y}
                        r={a.radius}
                        fill="var(--primary)"
                        fillOpacity={selected?.id === a.id ? 0.1 : 0.04}
                        stroke="var(--primary)"
                        strokeOpacity={0.4}
                        strokeWidth={0.08}
                        strokeDasharray="0.6 0.5"
                      />
                      <circle
                        cx={a.x}
                        cy={a.y}
                        r={selected?.id === a.id ? 1.2 : 0.9}
                        fill="var(--primary)"
                        stroke="var(--card)"
                        strokeWidth={0.18}
                      />
                      <text
                        x={a.x}
                        y={a.y - 1.6}
                        textAnchor="middle"
                        fontSize={0.9}
                        fontWeight={700}
                        className="num"
                        fill="var(--foreground)"
                      >
                        {a.id.replace("ant-", "A")}
                      </text>
                    </g>
                  ))}

                {design.warnings.map((w) => (
                  <g key={w.id}>
                    <circle
                      cx={w.x}
                      cy={w.y}
                      r={1.6}
                      fill="none"
                      stroke="var(--danger)"
                      strokeWidth={0.16}
                      strokeDasharray="0.5 0.4"
                    />
                  </g>
                ))}
              </g>
            </svg>

            {layer && (
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
          </div>
        </div>

        {/* ---------------- info panel ---------------- */}
        <aside className="flex flex-col gap-4">
          <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
            <h2 className="text-sm font-bold tracking-tight">RF Summary</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <KpiCard icon={Signal} label="Coverage" value={`${design.kpis.coverage}%`} />
              <KpiCard icon={Gauge} label="Capacity" value={`${design.kpis.capacity}%`} />
              <KpiCard
                icon={Target}
                label="Dead Zones"
                value={`${design.kpis.deadZones}`}
                tone={design.kpis.deadZones > 0 ? "warn" : "default"}
              />
              <KpiCard icon={Wifi} label="Avg SINR" value={`${design.kpis.avgSinr} dB`} />
              <KpiCard icon={Radio} label="Avg RSRP" value={`${design.kpis.avgRsrp} dBm`} />
              <KpiCard icon={Antenna} label="Antennas" value={`${design.kpis.antennas}`} />
              <KpiCard
                icon={TrendingUp}
                label="Simulation Time"
                value={`${design.kpis.simulationSeconds}s`}
              />
              <KpiCard
                icon={Crosshair}
                label="Best Score"
                value={`${design.simulationResults.optimization.bestScore}`}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
            <h2 className="text-sm font-bold tracking-tight">Antenna Inspector</h2>
            {selected ? (
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["Antenna ID", selected.label],
                  ["Category", selected.category],
                  ["Location", selected.roomName],
                  ["Height", `${selected.height} m`],
                  ["Transmit Power", `${selected.txPower} dBm`],
                  ["Gain", `${selected.gain} dBi`],
                  ["Coverage Radius", `${selected.radius} m`],
                  ["Served Devices", `${selected.servedUsers}`],
                  ["Status", selected.status],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="num text-xs font-bold">{v}</dd>
                  </div>
                ))}
                <p className="pt-2 text-[11px] text-muted-foreground">
                  Read-only in version 1. Editing arrives with Interactive Optimization.
                </p>
              </dl>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Select an antenna on the canvas to inspect its engineering parameters.
              </p>
            )}
          </section>
        </aside>
      </div>

      {/* ---------------- warnings & recommendations ---------------- */}
      <section className="rounded-3xl border border-border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b border-border p-3">
          {(
            [
              ["warnings", `Warnings (${design.warnings.length})`, AlertTriangle],
              ["recommendations", `Recommendations (${design.recommendations.length})`, Lightbulb],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-smooth ${
                tab === id ? "bg-primary-soft text-primary" : "hover:bg-accent"
              }`}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {tab === "warnings" &&
            (design.warnings.length ? (
              design.warnings.map((w) => (
                <article key={w.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        w.severity === "critical"
                          ? "bg-danger-soft text-danger"
                          : w.severity === "high"
                            ? "bg-warning-soft text-warning"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {w.severity}
                    </span>
                    <h3 className="text-sm font-bold">{w.title}</h3>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{w.location}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{w.description}</p>
                  <button
                    onClick={() => zoomTo(w.x, w.y)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-smooth hover:bg-accent"
                  >
                    <Crosshair className="size-3.5" /> Zoom to Area
                  </button>
                </article>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No engineering issues detected in this design.
              </p>
            ))}

          {tab === "recommendations" &&
            design.recommendations.map((r) => (
              <article key={r.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      r.priority === "high"
                        ? "bg-warning-soft text-warning"
                        : r.priority === "medium"
                          ? "bg-primary-soft text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.priority}
                  </span>
                  <h3 className="text-sm font-bold">{r.title}</h3>
                </div>
                <p className="mt-2 text-xs text-success">{r.improvement}</p>
                <p className="mt-1 text-xs text-muted-foreground">Affected area: {r.area}</p>
                <button
                  onClick={() => zoomTo(r.x, r.y)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-smooth hover:bg-accent"
                >
                  <Crosshair className="size-3.5" /> Zoom to Area
                </button>
              </article>
            ))}
        </div>
      </section>

      {/* ---------------- action bar ---------------- */}
      <div className="sticky bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lift backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Download className="size-3.5" /> Export
          </span>
          {(["pdf", "json", "csv"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onExport(f)}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold uppercase transition-smooth hover:bg-accent"
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {saved && (
            <span className="text-xs font-semibold text-success">✓ RF Design Saved Successfully</span>
          )}
          <button
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
          >
            <Save className="size-4" /> Save RF Design
          </button>
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
          >
            <Antenna className="size-4" /> Continue to Interactive Optimization
          </button>
        </div>
      </div>
    </div>
  );
}
