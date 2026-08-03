import {
  materialById,
  type BuildingModel,
  type ColumnObj,
  type LayerId,
  type OpeningObj,
  type RoomObj,
  type WallObj,
} from "@/lib/building-model";
import { polygonArea, polygonCentroid, wallLength } from "@/lib/geometry";

export function layerOf(kind: string): LayerId {
  switch (kind) {
    case "wall":
      return "walls";
    case "door":
      return "doors";
    case "window":
      return "windows";
    case "column":
      return "columns";
    default:
      return "labels";
  }
}

interface SceneProps {
  model: BuildingModel;
  selectedId?: string | null;
  hoverId?: string | null;
  showDimensions?: boolean;
  interactive?: boolean;
  onPick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

export function Scene({
  model,
  selectedId = null,
  hoverId = null,
  showDimensions = true,
  interactive = false,
  onPick,
  onHover,
}: SceneProps) {
  const layer = (id: LayerId) => model.layers.find((l) => l.id === id);
  const on = (id: LayerId) => layer(id)?.visible ?? true;
  const op = (id: LayerId) => layer(id)?.opacity ?? 1;
  const locked = (id: LayerId) => layer(id)?.locked ?? false;

  const rooms = model.objects.filter((o): o is RoomObj => o.kind === "room");
  const walls = model.objects.filter((o): o is WallObj => o.kind === "wall");
  const openings = model.objects.filter(
    (o): o is OpeningObj => o.kind === "door" || o.kind === "window",
  );
  const columns = model.objects.filter((o): o is ColumnObj => o.kind === "column");

  const pick = (id: string, kind: string) => ({
    onPointerDown: interactive
      ? (e: React.PointerEvent) => {
          if (locked(layerOf(kind))) return;
          e.stopPropagation();
          onPick?.(id);
        }
      : undefined,
    onPointerEnter: interactive ? () => onHover?.(id) : undefined,
    onPointerLeave: interactive ? () => onHover?.(null) : undefined,
    style: interactive ? { cursor: "pointer" } : undefined,
  });

  const stroke = (id: string, base: string) =>
    selectedId === id ? "var(--primary)" : hoverId === id ? "var(--primary)" : base;

  return (
    <g>
      {/* rooms */}
      <g opacity={op("labels")} style={{ display: on("labels") ? undefined : "none" }}>
        {rooms.map((r) => {
          const c = polygonCentroid(r.points);
          const area = polygonArea(r.points);
          return (
            <g key={r.id} {...pick(r.id, "room")}>
              <polygon
                points={r.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={r.color}
                fillOpacity={selectedId === r.id ? 0.22 : 0.1}
                stroke={selectedId === r.id ? "var(--primary)" : r.color}
                strokeOpacity={0.6}
                strokeWidth={selectedId === r.id ? 0.22 : 0.08}
              />
              <text
                x={c.x}
                y={c.y}
                textAnchor="middle"
                fontSize={1.1}
                fontWeight={700}
                fill="var(--foreground)"
              >
                {r.name}
              </text>
              <text
                x={c.x}
                y={c.y + 1.5}
                textAnchor="middle"
                fontSize={0.85}
                fill="var(--muted-foreground)"
              >
                {area.toFixed(1)} m² · {r.usage}
              </text>
            </g>
          );
        })}
      </g>

      {/* walls */}
      <g opacity={op("walls")} style={{ display: on("walls") ? undefined : "none" }}>
        {walls.map((w) => {
          const m = materialById(w.material);
          const len = wallLength(w);
          const mx = (w.x1 + w.x2) / 2;
          const my = (w.y1 + w.y2) / 2;
          const horizontal = Math.abs(w.x2 - w.x1) >= Math.abs(w.y2 - w.y1);
          return (
            <g key={w.id} {...pick(w.id, "wall")}>
              <line
                x1={w.x1}
                y1={w.y1}
                x2={w.x2}
                y2={w.y2}
                stroke="transparent"
                strokeWidth={Math.max(w.thickness, 0.8)}
                strokeLinecap="round"
              />
              <line
                x1={w.x1}
                y1={w.y1}
                x2={w.x2}
                y2={w.y2}
                stroke={stroke(w.id, m.color)}
                strokeWidth={selectedId === w.id ? w.thickness + 0.18 : w.thickness}
                strokeLinecap="square"
              />
              {showDimensions && len > 4 && (
                <text
                  x={horizontal ? mx : mx + 1}
                  y={horizontal ? my - 0.6 : my}
                  textAnchor="middle"
                  fontSize={0.7}
                  className="num"
                  fill="var(--muted-foreground)"
                >
                  {len.toFixed(2)} m
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* openings */}
      <g>
        {openings.map((o) => {
          const lid = o.kind === "door" ? "doors" : "windows";
          if (!on(lid)) return null;
          const host = walls.find((w) => w.id === o.wallId);
          const angle = host
            ? Math.atan2(host.y2 - host.y1, host.x2 - host.x1)
            : 0;
          const dx = (Math.cos(angle) * o.width) / 2;
          const dy = (Math.sin(angle) * o.width) / 2;
          const color =
            o.kind === "door" ? "var(--warning)" : "var(--primary)";
          return (
            <g key={o.id} opacity={op(lid)} {...pick(o.id, o.kind)}>
              <line
                x1={o.x - dx}
                y1={o.y - dy}
                x2={o.x + dx}
                y2={o.y + dy}
                stroke="var(--card)"
                strokeWidth={0.55}
              />
              <line
                x1={o.x - dx}
                y1={o.y - dy}
                x2={o.x + dx}
                y2={o.y + dy}
                stroke={stroke(o.id, color)}
                strokeWidth={selectedId === o.id ? 0.45 : 0.28}
                strokeLinecap="round"
              />
              {o.kind === "door" && (
                <path
                  d={`M ${o.x - dx} ${o.y - dy} A ${o.width} ${o.width} 0 0 1 ${
                    o.x - dx + Math.cos(angle - Math.PI / 2) * o.width
                  } ${o.y - dy + Math.sin(angle - Math.PI / 2) * o.width}`}
                  fill="none"
                  stroke={stroke(o.id, color)}
                  strokeWidth={0.08}
                  strokeDasharray="0.3 0.25"
                />
              )}
              {!o.wallId && (
                <circle
                  cx={o.x}
                  cy={o.y}
                  r={1}
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth={0.12}
                  strokeDasharray="0.4 0.3"
                />
              )}
            </g>
          );
        })}
      </g>

      {/* columns */}
      <g opacity={op("columns")} style={{ display: on("columns") ? undefined : "none" }}>
        {columns.map((c) => (
          <rect
            key={c.id}
            x={c.x - c.width / 2}
            y={c.y - c.depth / 2}
            width={c.width}
            height={c.depth}
            fill={stroke(c.id, materialById(c.material).color)}
            stroke={selectedId === c.id ? "var(--primary)" : "var(--foreground)"}
            strokeWidth={0.06}
            {...pick(c.id, "column")}
          />
        ))}
      </g>
    </g>
  );
}
