import { useState } from "react";
import {
  BadgeCheck,
  Check,
  Copy,
  Crosshair,
  History,
  Layers,
  Lightbulb,
  Lock,
  LockOpen,
  Pencil,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  BASE_LAYERS,
  CATEGORY_OPTIONS,
  HEIGHT_MAX,
  HEIGHT_MIN,
  RF_LAYER_IDS,
  RF_LAYER_LABELS,
  TX_POWER_MAX,
  TX_POWER_MIN,
  categoryLabel,
  costLabel,
  type AiSuggestion,
  type LayerSettings,
  type OptAntenna,
  type OptVersion,
  type ValidationReport,
} from "@/lib/rf-optimization";
import type { RfLayerId } from "@/lib/rf-simulation";

/* ---------------- layer manager ---------------- */

export function LayerManager({
  settings,
  activeLayer,
  onSettings,
  onActiveLayer,
}: {
  settings: Record<string, LayerSettings>;
  activeLayer: RfLayerId | null;
  onSettings: (id: string, patch: Partial<LayerSettings>) => void;
  onActiveLayer: (id: RfLayerId | null) => void;
}) {
  const row = (id: string, label: string, isRf: boolean) => {
    const s = settings[id] ?? { visible: true, opacity: 1, locked: false };
    const active = isRf && activeLayer === id;
    return (
      <div
        key={id}
        className={`rounded-xl border p-2.5 transition-smooth ${
          active ? "border-primary bg-primary-soft" : "border-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            aria-label={`${label} visibility`}
            checked={isRf ? active : s.visible}
            onChange={(e) => {
              if (isRf) onActiveLayer(e.target.checked ? (id as RfLayerId) : null);
              else onSettings(id, { visible: e.target.checked });
            }}
            disabled={s.locked}
            className="size-3.5 accent-[var(--primary)]"
          />
          <span className={`flex-1 text-xs font-semibold ${active ? "text-primary" : ""}`}>
            {label}
          </span>
          <button
            onClick={() => onSettings(id, { locked: !s.locked })}
            aria-label={s.locked ? `Unlock ${label}` : `Lock ${label}`}
            className="rounded-md p-1 text-muted-foreground transition-smooth hover:bg-accent"
          >
            {s.locked ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
          </button>
        </div>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={s.opacity}
          aria-label={`${label} opacity`}
          onChange={(e) => onSettings(id, { opacity: Number(e.target.value) })}
          className="mt-2 w-full accent-[var(--primary)]"
        />
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Layers className="size-3.5" /> Layer Manager
      </h2>
      <div className="mt-3 space-y-2">{BASE_LAYERS.map((b) => row(b.id, b.label, false))}</div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        RF layers — one active at a time
      </p>
      <div className="mt-2 space-y-2">
        {RF_LAYER_IDS.map((id) => row(id, RF_LAYER_LABELS[id], true))}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Layer reordering arrives with the 3D engineering viewer.
      </p>
    </section>
  );
}

/* ---------------- properties panel ---------------- */

export function PropertiesPanel({
  selected,
  onPatch,
  onCommit,
  onReplace,
  onDelete,
  onLock,
}: {
  selected: OptAntenna[];
  onPatch: (patch: Partial<OptAntenna>) => void;
  onCommit: (patch: Partial<OptAntenna>, kind: "power" | "height") => void;
  onReplace: (category: string) => void;
  onDelete: () => void;
  onLock: (locked: boolean) => void;
}) {
  const one = selected.length === 1 ? selected[0]! : null;
  const [power, setPower] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  if (!selected.length) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h2 className="text-sm font-bold tracking-tight">Properties</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Select an antenna on the canvas to edit its engineering parameters. Ctrl + Click or box
          selection edits several antennas at once.
        </p>
      </section>
    );
  }

  const pv = power ?? (one ? one.txPower : Math.round(selected.reduce((s, a) => s + a.txPower, 0) / selected.length));
  const hv = height ?? (one ? one.height : Number((selected.reduce((s, a) => s + a.height, 0) / selected.length).toFixed(1)));

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">
          {one ? one.label : `${selected.length} Antennas`}
        </h2>
        {one && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              one.status === "Optimal"
                ? "bg-success-soft text-success"
                : one.status === "Acceptable"
                  ? "bg-primary-soft text-primary"
                  : "bg-warning-soft text-warning"
            }`}
          >
            {one.status}
          </span>
        )}
      </div>

      {one && (
        <dl className="mt-3 space-y-1.5 text-xs">
          {[
            ["Antenna ID", one.id.toUpperCase()],
            ["Category", categoryLabel(one.category)],
            ["Location", one.roomName],
            ["Gain", `${one.gain} dBi`],
            ["Azimuth", `${one.azimuth}°`],
            ["Tilt", `${one.tilt}°`],
            ["Coverage Radius", `${one.radius} m`],
            ["Served Devices", `${one.servedUsers}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="num font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Transmit Power</span>
            <span className="num text-primary">{pv} dBm</span>
          </div>
          <input
            type="range"
            min={TX_POWER_MIN}
            max={TX_POWER_MAX}
            step={1}
            value={pv}
            aria-label="Transmit power"
            onChange={(e) => {
              setPower(Number(e.target.value));
              onPatch({ txPower: Number(e.target.value) });
            }}
            className="mt-1.5 w-full accent-[var(--primary)]"
          />
          <button
            onClick={() => {
              onCommit({ txPower: pv }, "power");
              setPower(null);
            }}
            className="mt-1.5 w-full rounded-lg border border-border py-1.5 text-[11px] font-semibold transition-smooth hover:bg-accent"
          >
            Confirm power &amp; recalculate
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Antenna Height</span>
            <span className="num text-primary">{hv} m</span>
          </div>
          <input
            type="range"
            min={HEIGHT_MIN}
            max={HEIGHT_MAX}
            step={0.1}
            value={hv}
            aria-label="Antenna height"
            onChange={(e) => {
              setHeight(Number(e.target.value));
              onPatch({ height: Number(e.target.value) });
            }}
            className="mt-1.5 w-full accent-[var(--primary)]"
          />
          <button
            onClick={() => {
              onCommit({ height: hv }, "height");
              setHeight(null);
            }}
            className="mt-1.5 w-full rounded-lg border border-border py-1.5 text-[11px] font-semibold transition-smooth hover:bg-accent"
          >
            Confirm height &amp; recalculate
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold">Replace Category</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => onReplace(c.id)}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-smooth ${
                  one?.category === c.id
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onLock(!selected.every((a) => a.locked))}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[11px] font-semibold transition-smooth hover:bg-accent"
          >
            {selected.every((a) => a.locked) ? (
              <>
                <LockOpen className="size-3.5" /> Unlock Position
              </>
            ) : (
              <>
                <Lock className="size-3.5" /> Lock Position
              </>
            )}
          </button>
          <button
            onClick={onDelete}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger/40 py-2 text-[11px] font-semibold text-danger transition-smooth hover:bg-danger-soft"
          >
            <X className="size-3.5" /> Delete
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- AI suggestions ---------------- */

export function SuggestionsPanel({
  suggestions,
  onApply,
  onFocus,
}: {
  suggestions: AiSuggestion[];
  onApply: (s: AiSuggestion) => void;
  onFocus: (x: number, y: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight">
        <Sparkles className="size-4 text-primary" /> AI Suggestions
      </h2>
      {suggestions.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          No further improvements detected for the current layout.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {suggestions.map((s) => (
          <article key={s.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  s.priority === "high"
                    ? "bg-warning-soft text-warning"
                    : s.priority === "medium"
                      ? "bg-primary-soft text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s.priority}
              </span>
              <h3 className="text-xs font-bold">{s.title}</h3>
            </div>
            <p className="mt-1.5 text-[11px] text-success">{s.improvement}</p>
            <p className="text-[11px] text-muted-foreground">Affected area: {s.area}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                onClick={() => onApply(s)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground transition-smooth hover:brightness-110"
              >
                <Lightbulb className="size-3" /> Apply
              </button>
              <button
                onClick={() => onFocus(s.x, s.y)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold transition-smooth hover:bg-accent"
              >
                <Crosshair className="size-3" /> Zoom
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- design history ---------------- */

export function VersionsPanel({
  versions,
  currentId,
  onRestore,
  onDuplicate,
  onRename,
}: {
  versions: OptVersion[];
  currentId: string;
  onRestore: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight">
        <History className="size-4" /> Design History
      </h2>
      <div className="mt-3 space-y-2">
        {[...versions].reverse().map((v) => (
          <div
            key={v.id}
            className={`rounded-xl border p-2.5 ${
              v.id === currentId ? "border-primary bg-primary-soft" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold">{v.name}</p>
              <span className="num text-[10px] text-muted-foreground">
                {new Date(v.at).toLocaleTimeString()}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{v.note}</p>
            <p className="num mt-1 text-[11px] text-muted-foreground">
              {v.kpis.coverage}% coverage · {v.antennas.length} antennas · {v.cost} cost
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => onRestore(v.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold transition-smooth hover:bg-accent"
              >
                <RotateCcw className="size-3" /> Restore
              </button>
              <button
                onClick={() => onDuplicate(v.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold transition-smooth hover:bg-accent"
              >
                <Copy className="size-3" /> Duplicate
              </button>
              <button
                onClick={() => {
                  const name = window.prompt("Rename version", v.name);
                  if (name) onRename(v.id, name);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold transition-smooth hover:bg-accent"
              >
                <Pencil className="size-3" /> Rename
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- compare dialog ---------------- */

export function CompareDialog({
  versions,
  currentId,
  onClose,
}: {
  versions: OptVersion[];
  currentId: string;
  onClose: () => void;
}) {
  const current = versions.find((v) => v.id === currentId) ?? versions[versions.length - 1];
  const [otherId, setOtherId] = useState(
    versions.find((v) => v.id !== currentId)?.id ?? versions[0]?.id ?? "",
  );
  const other = versions.find((v) => v.id === otherId);

  const rows: { label: string; a: string; b: string; better: number }[] = current && other
    ? [
        {
          label: "Coverage",
          a: `${current.kpis.coverage}%`,
          b: `${other.kpis.coverage}%`,
          better: Math.sign(current.kpis.coverage - other.kpis.coverage),
        },
        {
          label: "Capacity",
          a: `${current.kpis.capacity}%`,
          b: `${other.kpis.capacity}%`,
          better: Math.sign(current.kpis.capacity - other.kpis.capacity),
        },
        {
          label: "Average SINR",
          a: `${current.kpis.avgSinr} dB`,
          b: `${other.kpis.avgSinr} dB`,
          better: Math.sign(current.kpis.avgSinr - other.kpis.avgSinr),
        },
        {
          label: "Antennas",
          a: `${current.antennas.length}`,
          b: `${other.antennas.length}`,
          better: Math.sign(other.antennas.length - current.antennas.length),
        },
        {
          label: "Estimated Cost",
          a: current.cost,
          b: other.cost,
          better: 0,
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="animate-rise w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-lift">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">Compare Designs</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <label className="mt-4 block text-xs font-semibold">
          Compare current against
          <select
            value={otherId}
            onChange={(e) => setOtherId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            {versions
              .filter((v) => v.id !== currentId)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {new Date(v.at).toLocaleString()}
                </option>
              ))}
          </select>
        </label>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2">Metric</th>
              <th className="py-2">{current?.name ?? "Current"}</th>
              <th className="py-2">{other?.name ?? "—"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <td className="py-2 text-xs text-muted-foreground">{r.label}</td>
                <td
                  className={`num py-2 text-xs font-bold ${r.better > 0 ? "text-success" : ""}`}
                >
                  {r.a}
                  {r.better > 0 && " ▲"}
                </td>
                <td className={`num py-2 text-xs font-bold ${r.better < 0 ? "text-success" : ""}`}>
                  {r.b}
                  {r.better < 0 && " ▲"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- validation ---------------- */

export function ValidationPanel({
  report,
  onFocus,
}: {
  report: ValidationReport;
  onFocus: (x: number, y: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight">
        <BadgeCheck className="size-4 text-primary" /> Engineering Validation
      </h2>
      <div className="mt-3 space-y-2">
        {report.items.map((i) => (
          <div key={i.id} className="rounded-xl border border-border bg-background p-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
                  i.pass ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                }`}
              >
                {i.pass ? <Check className="size-3" /> : <X className="size-3" />}
              </span>
              <p className="text-xs font-bold">{i.label}</p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{i.detail}</p>
            {!i.pass && typeof i.x === "number" && typeof i.y === "number" && (
              <button
                onClick={() => onFocus(i.x!, i.y!)}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold transition-smooth hover:bg-accent"
              >
                <Crosshair className="size-3" /> Go to area
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- status bar ---------------- */

export function StatusBar({
  kpis,
  antennas,
  versionName,
  interference,
}: {
  kpis: { coverage: number; capacity: number; avgSinr: number; avgRsrp: number; avgRsrq: number };
  antennas: OptAntenna[];
  versionName: string;
  interference: number;
}) {
  const items: [string, string][] = [
    ["Coverage", `${kpis.coverage}%`],
    ["Capacity", `${kpis.capacity}%`],
    ["Avg SINR", `${kpis.avgSinr} dB`],
    ["Avg RSRP", `${kpis.avgRsrp} dBm`],
    ["Avg RSRQ", `${kpis.avgRsrq} dB`],
    ["Interference", `${interference.toFixed(1)} dB`],
    ["Est. Cost", costLabel(antennas)],
    ["Antennas", `${antennas.length}`],
    ["Version", versionName],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-card/95 px-4 py-2.5 shadow-soft backdrop-blur">
      {items.map(([k, v]) => (
        <span key={k} className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {k}
          </span>
          <span className="num text-sm font-bold">{v}</span>
        </span>
      ))}
    </div>
  );
}
