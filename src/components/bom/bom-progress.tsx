import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Terminal } from "lucide-react";
import {
  BOM_STAGES,
  BOM_VENDORS,
  money,
  type BomLogEntry,
  type BomState,
  type BomVendor,
} from "@/lib/bom";

/* -------------------- animated counter -------------------- */

export function Counter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 650);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(a + (b - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className="num">
      {prefix}
      {shown.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* -------------------- live procurement dashboard -------------------- */

export function ProcurementDashboard({
  items,
  totalQuantity,
  equipmentCost,
  laborCost,
  projectCost,
  vendorStatus,
  readiness,
}: {
  items: number;
  totalQuantity: number;
  equipmentCost: number;
  laborCost: number;
  projectCost: number;
  vendorStatus: string;
  readiness: number;
}) {
  const cards = [
    { k: "Equipment Items", node: <Counter value={items} /> },
    { k: "Total Quantity", node: <Counter value={totalQuantity} decimals={0} /> },
    { k: "Equipment Cost", node: <Counter value={equipmentCost} prefix="$" /> },
    { k: "Labor Cost", node: <Counter value={laborCost} prefix="$" /> },
    { k: "Project Cost", node: <Counter value={projectCost} prefix="$" /> },
    { k: "Vendor Status", node: <span className="text-base">{vendorStatus}</span> },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight">Live Procurement Dashboard</h3>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Readiness {readiness}%
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.k} className="rounded-xl border border-border bg-background p-3">
            <p className="text-lg font-bold leading-none">{c.node}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {c.k}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-smooth"
          style={{ width: `${readiness}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------- workflow progress -------------------- */

export function BomWorkflow({
  state,
  progress,
  remainingMs,
}: {
  state: BomState;
  progress: number;
  remainingMs: number;
}) {
  const stage = BOM_STAGES[state.stageIndex];
  const seconds = Math.max(1, Math.round(remainingMs / 1000));

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Current Step
              </p>
              <h2 className="text-xl font-bold tracking-tight">{stage?.title ?? "Completed"}</h2>
            </div>
            <div className="text-right">
              <p className="num text-2xl font-bold leading-none">{progress}%</p>
              <p className="text-[11px] text-muted-foreground">≈ {seconds}s remaining</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-smooth"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {BOM_STAGES.map((s, i) => {
            const done = i < state.stageIndex || state.status === "done";
            const active = i === state.stageIndex && state.status !== "done";
            return (
              <div
                key={s.id}
                className={`rounded-2xl border p-4 transition-smooth ${
                  active
                    ? "border-primary/40 bg-card shadow-soft"
                    : done
                      ? "border-border bg-card"
                      : "border-border/60 bg-card/50 opacity-70"
                }`}
              >
                <div className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : active ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <span className="size-4 rounded-full border border-border" />
                  )}
                  <h3 className="text-sm font-semibold tracking-tight">{s.title}</h3>
                </div>
                <ul className="mt-2 space-y-1">
                  {s.tasks.map((task, ti) => {
                    const tdone = done || (active && ti < state.taskIndex);
                    const trun = active && ti === state.taskIndex;
                    return (
                      <li
                        key={task.id}
                        className={`flex items-center justify-between gap-2 text-[12px] ${
                          tdone ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <span>{task.label}</span>
                        <span className="num text-[11px]">
                          {tdone ? "✓" : trun ? "…" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <BomLog log={state.log} />
    </div>
  );
}

export function BomLog({ log }: { log: BomLogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [log.length]);
  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Terminal className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-bold tracking-tight">Engineering Activity Log</h3>
      </div>
      <div ref={ref} className="num max-h-[520px] overflow-auto p-3 text-[11px] leading-relaxed">
        {log.length === 0 && <p className="text-muted-foreground">Waiting for generation…</p>}
        {log.map((l, i) => (
          <p
            key={`${l.at}-${i}`}
            className={
              l.kind === "calc"
                ? "text-primary"
                : l.kind === "ok"
                  ? "text-foreground"
                  : "text-muted-foreground"
            }
          >
            <span className="text-muted-foreground">
              {new Date(l.at).toLocaleTimeString("en-GB")}{" "}
            </span>
            {l.text}
          </p>
        ))}
      </div>
    </div>
  );
}

/* -------------------- vendor selection -------------------- */

export function VendorSelection({
  selected,
  onSelect,
  preferred,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  preferred: string | null;
}) {
  const [pick, setPick] = useState<string | null>(selected ?? preferred);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-bold tracking-tight">Vendor Selection</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {preferred
          ? `Preferred vendor from RF Design Configuration: ${preferred}. Confirm or change it.`
          : "No vendor preference found in the earlier modules — choose one to price the BOM."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {BOM_VENDORS.map((v) => (
          <VendorCard key={v.id} vendor={v} active={pick === v.id} onClick={() => setPick(v.id)} />
        ))}
      </div>
      <button
        disabled={!pick}
        onClick={() => pick && onSelect(pick)}
        className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 disabled:opacity-50"
      >
        Confirm Vendor & Load Pricing Database
      </button>
    </div>
  );
}

function VendorCard({
  vendor,
  active,
  onClick,
}: {
  vendor: BomVendor;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-smooth ${
        active ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-background hover:bg-accent"
      }`}
    >
      <span className="grid size-10 place-items-center rounded-xl border border-border bg-card text-xs font-bold">
        {vendor.name.slice(0, 2).toUpperCase()}
      </span>
      <p className="mt-2 text-sm font-semibold tracking-tight">{vendor.name}</p>
      <p
        className={`mt-0.5 text-[11px] font-semibold ${
          vendor.availability === "In Stock"
            ? "text-success"
            : vendor.availability === "Limited"
              ? "text-warning"
              : "text-muted-foreground"
        }`}
      >
        {vendor.availability}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{vendor.note}</p>
    </button>
  );
}

/* -------------------- small shared display -------------------- */

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <p className="num text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export { money };
