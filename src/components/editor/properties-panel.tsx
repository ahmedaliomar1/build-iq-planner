import {
  MATERIALS,
  ROOM_USAGES,
  materialById,
  type BuildingObject,
  type ColumnObj,
  type MaterialId,
  type OpeningObj,
  type RoomObj,
  type WallObj,
} from "@/lib/building-model";
import { polygonArea, polygonPerimeter, wallLength } from "@/lib/geometry";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls =
  "num w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-smooth focus:border-primary focus:ring-3 focus:ring-primary/20";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="num mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

export function PropertiesPanel({
  object,
  onChange,
}: {
  object: BuildingObject | null;
  onChange: (patch: Partial<BuildingObject>) => void;
}) {
  if (!object) {
    return (
      <div className="p-5 text-center">
        <p className="text-sm font-semibold">No selection</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Select any object on the canvas to edit its engineering properties.
        </p>
      </div>
    );
  }

  const materialSelect = (value: MaterialId, options = MATERIALS) => (
    <Row label="Material">
      <select
        value={value}
        onChange={(e) => onChange({ material: e.target.value as MaterialId } as never)}
        className={inputCls}
      >
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <span
          className="size-5 rounded-md border border-border"
          style={{ background: materialById(value).color }}
        />
        <span className="num text-[11px] text-muted-foreground">
          {materialById(value).wallLoss} dB loss · {materialById(value).density} kg/m³
        </span>
      </div>
    </Row>
  );

  if (object.kind === "wall") {
    const w = object as WallObj;
    return (
      <div className="space-y-4 p-4">
        <PanelTitle kind="Wall" id={w.id} />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Length" value={`${wallLength(w).toFixed(2)} m`} />
          <Stat label="Start" value={`${w.x1.toFixed(1)}, ${w.y1.toFixed(1)}`} />
        </div>
        <Row label="Height (m)">
          <input
            type="number"
            step="0.1"
            value={w.height}
            onChange={(e) => onChange({ height: Number(e.target.value) } as never)}
            className={inputCls}
          />
        </Row>
        <Row label="Thickness (m)">
          <input
            type="number"
            step="0.05"
            value={w.thickness}
            onChange={(e) => onChange({ thickness: Number(e.target.value) } as never)}
            className={inputCls}
          />
        </Row>
        {materialSelect(w.material)}
      </div>
    );
  }

  if (object.kind === "room") {
    const r = object as RoomObj;
    return (
      <div className="space-y-4 p-4">
        <PanelTitle kind="Room" id={r.id} />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Area" value={`${polygonArea(r.points).toFixed(1)} m²`} />
          <Stat label="Perimeter" value={`${polygonPerimeter(r.points).toFixed(1)} m`} />
        </div>
        <Row label="Room Name">
          <input
            value={r.name}
            onChange={(e) => onChange({ name: e.target.value } as never)}
            className={inputCls.replace("num ", "")}
          />
        </Row>
        <Row label="Usage">
          <select
            value={r.usage}
            onChange={(e) => onChange({ usage: e.target.value } as never)}
            className={inputCls}
          >
            {ROOM_USAGES.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Row>
        <Row label="Room Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={r.color}
              onChange={(e) => onChange({ color: e.target.value } as never)}
              className="h-9 w-14 cursor-pointer rounded-lg border border-input bg-card"
            />
            <span className="num text-xs text-muted-foreground">{r.color}</span>
          </div>
        </Row>
      </div>
    );
  }

  if (object.kind === "column") {
    const c = object as ColumnObj;
    return (
      <div className="space-y-4 p-4">
        <PanelTitle kind="Column" id={c.id} />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Section" value={`${c.width.toFixed(2)} × ${c.depth.toFixed(2)} m`} />
          <Stat label="Position" value={`${c.x.toFixed(1)}, ${c.y.toFixed(1)}`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Width (m)">
            <input
              type="number"
              step="0.05"
              value={c.width}
              onChange={(e) => onChange({ width: Number(e.target.value) } as never)}
              className={inputCls}
            />
          </Row>
          <Row label="Depth (m)">
            <input
              type="number"
              step="0.05"
              value={c.depth}
              onChange={(e) => onChange({ depth: Number(e.target.value) } as never)}
              className={inputCls}
            />
          </Row>
        </div>
        <Row label="Height (m)">
          <input
            type="number"
            step="0.1"
            value={c.height}
            onChange={(e) => onChange({ height: Number(e.target.value) } as never)}
            className={inputCls}
          />
        </Row>
        {materialSelect(c.material)}
      </div>
    );
  }

  const o = object as OpeningObj;
  const isDoor = o.kind === "door";
  return (
    <div className="space-y-4 p-4">
      <PanelTitle kind={isDoor ? "Door" : "Window"} id={o.id} />
      <div className="grid grid-cols-2 gap-3">
        <Row label="Width (m)">
          <input
            type="number"
            step="0.05"
            value={o.width}
            onChange={(e) => onChange({ width: Number(e.target.value) } as never)}
            className={inputCls}
          />
        </Row>
        <Row label="Height (m)">
          <input
            type="number"
            step="0.05"
            value={o.height}
            onChange={(e) => onChange({ height: Number(e.target.value) } as never)}
            className={inputCls}
          />
        </Row>
      </div>
      {materialSelect(
        o.material,
        isDoor
          ? MATERIALS.filter((m) => ["metal", "wood", "glass"].includes(m.id))
          : MATERIALS,
      )}
      {isDoor ? (
        <Row label="Opening Direction">
          <select
            value={o.opening ?? "inward-left"}
            onChange={(e) => onChange({ opening: e.target.value } as never)}
            className={inputCls}
          >
            <option value="inward-left">Inward · Left</option>
            <option value="inward-right">Inward · Right</option>
            <option value="outward-left">Outward · Left</option>
            <option value="outward-right">Outward · Right</option>
          </select>
        </Row>
      ) : (
        <>
          <Row label="Glass Type">
            <select
              value={o.glassType ?? "Double Glazed Low-E"}
              onChange={(e) => onChange({ glassType: e.target.value } as never)}
              className={inputCls}
            >
              <option>Single Glazed</option>
              <option>Double Glazed Low-E</option>
              <option>Triple Glazed</option>
              <option>Metallised / Solar Control</option>
            </select>
          </Row>
          <Row label="Frame Type">
            <select
              value={o.frameType ?? "Aluminium"}
              onChange={(e) => onChange({ frameType: e.target.value } as never)}
              className={inputCls}
            >
              <option>Aluminium</option>
              <option>Steel</option>
              <option>uPVC</option>
              <option>Timber</option>
            </select>
          </Row>
        </>
      )}
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Live preview
        </p>
        <svg viewBox="0 0 120 60" className="mt-2 h-16 w-full">
          <rect x="4" y="26" width="112" height="8" fill="var(--muted)" />
          <rect
            x={60 - o.width * 12}
            y="24"
            width={o.width * 24}
            height="12"
            rx="2"
            fill={materialById(o.material).color}
            stroke="var(--primary)"
            strokeWidth="1.5"
          />
          <text
            x="60"
            y="52"
            textAnchor="middle"
            fontSize="9"
            fill="var(--muted-foreground)"
          >
            {o.width.toFixed(2)} × {o.height.toFixed(2)} m
          </text>
        </svg>
      </div>
      {!o.wallId && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
          Not hosted by a wall — flagged by the validation engine.
        </p>
      )}
    </div>
  );
}

function PanelTitle({ kind, id }: { kind: string; id: string }) {
  return (
    <div className="border-b border-border pb-3">
      <p className="text-sm font-bold">{kind} Properties</p>
      <p className="num mt-0.5 text-[11px] text-muted-foreground">{id}</p>
    </div>
  );
}
