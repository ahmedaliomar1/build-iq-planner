import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Search,
} from "lucide-react";
import { MATERIALS, type LayerState } from "@/lib/building-model";
import { VALIDATION_CHECKS, type ValidationIssue } from "@/lib/geometry";

export function LayersPanel({
  layers,
  onChange,
}: {
  layers: LayerState[];
  onChange: (id: string, patch: Partial<LayerState>) => void;
}) {
  return (
    <ul className="space-y-1.5 p-3">
      {layers.map((l) => (
        <li key={l.id} className="rounded-xl border border-border bg-card p-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange(l.id, { visible: !l.visible })}
              aria-label={`Toggle ${l.name} visibility`}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-smooth hover:bg-secondary"
            >
              {l.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
            <span
              className={`flex-1 text-xs font-semibold ${l.visible ? "" : "text-muted-foreground"}`}
            >
              {l.name}
            </span>
            <button
              onClick={() => onChange(l.id, { locked: !l.locked })}
              aria-label={`Toggle ${l.name} lock`}
              className={`grid size-7 place-items-center rounded-lg transition-smooth hover:bg-secondary ${
                l.locked ? "text-warning" : "text-muted-foreground"
              }`}
            >
              {l.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(l.opacity * 100)}
              onChange={(e) => onChange(l.id, { opacity: Number(e.target.value) / 100 })}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
            />
            <span className="num w-9 text-right text-[10px] text-muted-foreground">
              {Math.round(l.opacity * 100)}%
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MaterialsPanel({
  onApply,
}: {
  onApply: (id: (typeof MATERIALS)[number]["id"]) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const cats = ["All", ...new Set(MATERIALS.map((m) => m.category))];
  const list = MATERIALS.filter(
    (m) =>
      (cat === "All" || m.category === cat) &&
      m.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search materials…"
          className="w-full rounded-lg border border-input bg-card py-2 pl-8.5 pr-3 text-xs outline-none transition-smooth focus:border-primary"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-smooth ${
              cat === c
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {list.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => onApply(m.id)}
              className="w-full rounded-xl border border-border bg-card p-3 text-left transition-smooth hover:border-primary hover:shadow-soft"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-6 rounded-md border border-border"
                  style={{ background: m.color }}
                />
                <span className="text-xs font-bold">{m.name}</span>
              </div>
              <dl className="num mt-2 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                <div>Density {m.density} kg/m³</div>
                <div>Loss {m.wallLoss} dB</div>
                <div>Thickness {m.thickness} m</div>
                <div>Thermal {m.thermal} W/mK</div>
              </dl>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ValidationPanel({
  issues,
  onZoom,
}: {
  issues: ValidationIssue[];
  onZoom: (issue: ValidationIssue) => void;
}) {
  return (
    <div className="p-3">
      <div
        className={`rounded-xl px-3 py-2.5 text-xs font-bold ${
          issues.length === 0
            ? "bg-success-soft text-success"
            : "bg-warning-soft text-warning"
        }`}
      >
        {issues.length === 0
          ? "All checks passed — model is valid"
          : `${issues.length} issue${issues.length > 1 ? "s" : ""} to resolve`}
      </div>

      <ul className="mt-3 space-y-1">
        {VALIDATION_CHECKS.map((c) => {
          const failing = issues.filter((i) => i.code === c.code);
          return (
            <li key={c.code}>
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                {failing.length === 0 ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                ) : (
                  <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                )}
                <span
                  className={`text-[11px] font-semibold ${failing.length ? "" : "text-muted-foreground"}`}
                >
                  {c.label}
                </span>
                {failing.length > 0 && (
                  <span className="num ml-auto text-[10px] text-muted-foreground">
                    {failing.length}
                  </span>
                )}
              </div>
              {failing.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onZoom(f)}
                  className="mt-1 block w-full rounded-xl border border-border bg-card p-2.5 text-left transition-smooth hover:border-primary"
                >
                  <p className="flex items-center gap-1.5 text-[11px] font-bold">
                    <Crosshair className="size-3 text-primary" /> {f.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {f.detail}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-primary">
                    Fix: {f.suggestion}
                  </p>
                </button>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
