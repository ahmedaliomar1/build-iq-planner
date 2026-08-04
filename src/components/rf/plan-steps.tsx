import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { BuildingModel, RoomObj } from "@/lib/building-model";
import { polygonCentroid } from "@/lib/geometry";
import { Scene } from "@/components/editor/scene";
import { GridDefs, useViewport } from "@/components/editor/viewport";
import {
  PRIORITY_META,
  RESTRICTION_TYPES,
  type Priority,
  type RestrictedArea,
} from "@/lib/rf-config";
import { uid } from "@/lib/geometry";

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

function modelBounds(model: BuildingModel) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const o of model.objects) {
    if (o.kind === "wall") {
      add(o.x1, o.y1);
      add(o.x2, o.y2);
    } else if (o.kind === "room") {
      o.points.forEach((p) => add(p.x, p.y));
    } else if ("x" in o && "y" in o) {
      add(o.x, o.y);
    }
  }
  if (!Number.isFinite(minX)) return { w: 60, h: 38 };
  return { w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

function useFittedViewport(model: BuildingModel) {
  const vp = useViewport();
  const { w, h } = useMemo(() => modelBounds(model), [model]);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const t = setTimeout(() => vp.fit(w, h, 50), 30);
    return () => clearTimeout(t);
  }, [vp, w, h]);
  return vp;
}

/* ---------------- Step 7 — Critical Areas ---------------- */

export function CriticalAreasStep({
  model,
  value,
  onChange,
}: {
  model: BuildingModel;
  value: Record<string, Priority>;
  onChange: (next: Record<string, Priority>) => void;
}) {
  const vp = useFittedViewport(model);
  const [brush, setBrush] = useState<Priority>("critical");
  const rooms = model.objects.filter((o): o is RoomObj => o.kind === "room");
  const usages = Array.from(new Set(rooms.map((r) => r.usage)));
  const [bulkUsage, setBulkUsage] = useState(usages[0] ?? "");

  const assign = (id: string) => onChange({ ...value, [id]: brush });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="overflow-hidden rounded-2xl border border-border bg-canvas">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">Priority brush</span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setBrush(p)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-smooth ${
                brush === p ? "border-primary bg-primary-soft text-primary" : "border-border"
              }`}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: PRIORITY_META[p].color }}
              />
              {PRIORITY_META[p].label}
            </button>
          ))}
        </div>
        <div
          ref={vp.ref}
          className="relative h-[420px] touch-none"
          onPointerDown={vp.startPan}
          onPointerMove={vp.movePan}
          onPointerUp={vp.endPan}
        >
          <svg className="size-full">
            <GridDefs z={vp.view.z} view={vp.view} />
            <g transform={`translate(${vp.view.x} ${vp.view.y}) scale(${vp.view.z})`}>
              <Scene model={model} showDimensions={false} />
              {rooms.map((r) => {
                const p = value[r.id];
                const c = polygonCentroid(r.points);
                return (
                  <g
                    key={r.id}
                    style={{ cursor: "pointer" }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      assign(r.id);
                    }}
                  >
                    <polygon
                      points={r.points.map((q) => `${q.x},${q.y}`).join(" ")}
                      fill={p ? PRIORITY_META[p].color : "transparent"}
                      fillOpacity={p ? 0.3 : 0.001}
                      stroke={p ? PRIORITY_META[p].color : "transparent"}
                      strokeWidth={0.25}
                    />
                    {p && (
                      <text
                        x={c.x}
                        y={c.y + 3}
                        textAnchor="middle"
                        fontSize={0.9}
                        fontWeight={700}
                        fill={PRIORITY_META[p].color}
                      >
                        {PRIORITY_META[p].label.toUpperCase()}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Legend
          </p>
          <ul className="mt-3 space-y-2">
            {PRIORITIES.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm">
                <span
                  className="size-3 rounded"
                  style={{ background: PRIORITY_META[p].color }}
                />
                {PRIORITY_META[p].label}
                <span className="num ml-auto text-xs text-muted-foreground">
                  {Object.values(value).filter((v) => v === p).length}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Bulk edit
          </p>
          <select
            value={bulkUsage}
            onChange={(e) => setBulkUsage(e.target.value)}
            className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            {usages.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const next = { ...value };
              rooms
                .filter((r) => r.usage === bulkUsage)
                .forEach((r) => (next[r.id] = brush));
              onChange(next);
            }}
            className="mt-2 w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-smooth hover:brightness-110"
          >
            Apply {PRIORITY_META[brush].label} to all “{bulkUsage}”
          </button>
          <button
            onClick={() => onChange({})}
            className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
          >
            Clear all priorities
          </button>
        </div>

        <div className="max-h-64 overflow-auto rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Rooms
          </p>
          <ul className="mt-2 space-y-1">
            {rooms.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-xs">
                <span className="truncate">{r.name}</span>
                <select
                  value={value[r.id] ?? ""}
                  onChange={(e) => {
                    const next = { ...value };
                    if (e.target.value) next[r.id] = e.target.value as Priority;
                    else delete next[r.id];
                    onChange(next);
                  }}
                  className="ml-auto rounded-lg border border-border bg-background px-2 py-1"
                >
                  <option value="">—</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 8 — Installation Restrictions ---------------- */

export function RestrictedAreasStep({
  model,
  value,
  onChange,
}: {
  model: BuildingModel;
  value: RestrictedArea[];
  onChange: (next: RestrictedArea[]) => void;
}) {
  const vp = useFittedViewport(model);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  const start = useRef<{ x: number; y: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const patch = (id: string, p: Partial<RestrictedArea>) =>
    onChange(value.map((a) => (a.id === id ? { ...a, ...p } : a)));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-2xl border border-border bg-canvas">
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
          <button
            onClick={() => setDrawing((d) => !d)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-smooth ${
              drawing
                ? "border-danger bg-danger/10 text-danger"
                : "border-border hover:bg-accent"
            }`}
          >
            {drawing ? "Drawing — drag on plan" : "Add Restricted Area"}
          </button>
          <span className="text-xs text-muted-foreground">
            Drag a rectangle over the area to restrict.
          </span>
        </div>
        <div
          ref={vp.ref}
          className="relative h-[420px] touch-none"
          onPointerDown={(e) => {
            if (!drawing) return vp.startPan(e);
            const p = vp.toModel(e.clientX, e.clientY);
            start.current = p;
            setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drawing) return vp.movePan(e);
            const s = start.current;
            if (!s) return;
            const p = vp.toModel(e.clientX, e.clientY);
            setDraft({
              x: Math.min(s.x, p.x),
              y: Math.min(s.y, p.y),
              w: Math.abs(p.x - s.x),
              h: Math.abs(p.y - s.y),
            });
          }}
          onPointerUp={() => {
            if (!drawing) return vp.endPan();
            const d = draft;
            start.current = null;
            setDraft(null);
            if (!d || d.w < 0.5 || d.h < 0.5) return;
            const area: RestrictedArea = {
              id: uid("rz"),
              name: `Restricted Zone ${value.length + 1}`,
              type: RESTRICTION_TYPES[0]!,
              reason: "",
              ...d,
            };
            onChange([...value, area]);
            setActiveId(area.id);
            setDrawing(false);
          }}
        >
          <svg className="size-full">
            <GridDefs z={vp.view.z} view={vp.view} />
            <g transform={`translate(${vp.view.x} ${vp.view.y}) scale(${vp.view.z})`}>
              <Scene model={model} showDimensions={false} />
              {value.map((a) => (
                <g key={a.id} onPointerDown={() => !drawing && setActiveId(a.id)}>
                  <rect
                    x={a.x}
                    y={a.y}
                    width={a.w}
                    height={a.h}
                    fill="#ef4444"
                    fillOpacity={0.22}
                    stroke="#ef4444"
                    strokeWidth={activeId === a.id ? 0.3 : 0.15}
                    strokeDasharray="0.6 0.4"
                  />
                  <text
                    x={a.x + a.w / 2}
                    y={a.y + a.h / 2}
                    textAnchor="middle"
                    fontSize={0.9}
                    fontWeight={700}
                    fill="#ef4444"
                  >
                    {a.name}
                  </text>
                </g>
              ))}
              {draft && (
                <rect
                  x={draft.x}
                  y={draft.y}
                  width={draft.w}
                  height={draft.h}
                  fill="#ef4444"
                  fillOpacity={0.15}
                  stroke="#ef4444"
                  strokeWidth={0.15}
                />
              )}
            </g>
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        {value.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No restricted zones yet. Restrictions are optional but improve AI placement.
          </p>
        )}
        {value.map((a) => (
          <div
            key={a.id}
            className={`space-y-2 rounded-2xl border bg-card p-4 ${
              activeId === a.id ? "border-primary" : "border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                value={a.name}
                onChange={(e) => patch(a.id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-semibold"
              />
              <button
                onClick={() => onChange(value.filter((x) => x.id !== a.id))}
                aria-label="Delete restricted area"
                className="grid size-8 place-items-center rounded-lg border border-border text-danger transition-smooth hover:bg-danger/10"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <select
              value={a.type}
              onChange={(e) => patch(a.id, { type: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            >
              {RESTRICTION_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <textarea
              value={a.reason}
              placeholder="Reason (e.g. hazardous atmosphere, no drilling allowed)"
              onChange={(e) => patch(a.id, { reason: e.target.value })}
              className="h-16 w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
            />
            <p className="num text-[11px] text-muted-foreground">
              {a.w.toFixed(1)} × {a.h.toFixed(1)} m
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
