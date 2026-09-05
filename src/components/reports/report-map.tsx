import { useMemo, useRef } from "react";
import type { BuildingModel } from "@/lib/building-model";
import { modelBounds, type RfLayer } from "@/lib/rf-simulation";
import type { OptAntenna } from "@/lib/rf-optimization";

const HEAT = ["#dc2626", "#f97316", "#facc15", "#84cc16", "#16a34a"];
const PRIORITY_FILL = ["transparent", "#38bdf8", "#facc15", "#f97316", "#dc2626"];

function cellColor(layer: RfLayer, v: number, raw: number) {
  if (layer.id === "critical") return PRIORITY_FILL[Math.round(raw)] ?? "transparent";
  return HEAT[Math.min(HEAT.length - 1, Math.max(0, Math.floor(v * HEAT.length)))]!;
}

/**
 * Engineering map renderer. Draws the digital building outline with an
 * optional RF layer heatmap and the approved antenna layout. Used by the
 * Engineering Maps Center for preview, fullscreen and PNG export.
 */
export function ReportMap({
  model,
  layer,
  antennas,
  showAntennas = true,
  className,
  svgRef,
}: {
  model: BuildingModel;
  layer: RfLayer | null;
  antennas: OptAntenna[];
  showAntennas?: boolean;
  className?: string;
  svgRef?: (el: SVGSVGElement | null) => void;
}) {
  const b = useMemo(() => modelBounds(model), [model]);
  const pad = 2;
  const vb = `${b.minX - pad} ${b.minY - pad} ${b.w + pad * 2} ${b.h + pad * 2}`;
  const stroke = Math.max(0.12, b.w / 400);

  return (
    <svg
      ref={svgRef}
      viewBox={vb}
      className={className ?? "h-full w-full"}
      role="img"
      aria-label={layer ? `${layer.label} engineering map` : "Antenna layout map"}
    >
      <rect x={b.minX - pad} y={b.minY - pad} width={b.w + pad * 2} height={b.h + pad * 2} fill="#ffffff" />

      {layer &&
        layer.cells.map((c, i) => (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={layer.cellSize}
            height={layer.cellSize}
            fill={cellColor(layer, c.v, c.raw)}
            opacity={layer.id === "critical" ? 0.55 : 0.55}
          />
        ))}

      {model.objects.map((o) =>
        o.kind === "room" ? (
          <polygon
            key={o.id}
            points={o.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={stroke * 0.6}
          />
        ) : null,
      )}

      {model.objects.map((o) =>
        o.kind === "wall" ? (
          <line
            key={o.id}
            x1={o.x1}
            y1={o.y1}
            x2={o.x2}
            y2={o.y2}
            stroke="#0f172a"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        ) : null,
      )}

      {showAntennas &&
        antennas.map((a) => (
          <g key={a.id}>
            <circle cx={a.x} cy={a.y} r={a.radius} fill="#2563eb" opacity={0.08} />
            <circle cx={a.x} cy={a.y} r={a.radius} fill="none" stroke="#2563eb" strokeWidth={stroke * 0.5} opacity={0.5} />
            <circle cx={a.x} cy={a.y} r={Math.max(0.5, b.w / 90)} fill="#2563eb" stroke="#ffffff" strokeWidth={stroke * 0.6} />
          </g>
        ))}
    </svg>
  );
}

/** Serialises an SVG map to a PNG download. */
export function downloadMapPng(svg: SVGSVGElement | null, filename: string) {
  if (!svg || typeof window === "undefined") return;
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  const url = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(xml)))}`;
  img.onload = () => {
    const canvas = window.document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = Math.round((img.height / Math.max(1, img.width)) * 1600) || 1000;
    const g = canvas.getContext("2d");
    if (!g) return;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    const a = window.document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = filename;
    a.click();
  };
  img.src = url;
}

export function useMapRef() {
  return useRef<SVGSVGElement | null>(null);
}
