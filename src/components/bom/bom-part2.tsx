import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Printer,
  Redo2,
  Search,
  Truck,
  Undo2,
  XCircle,
} from "lucide-react";
import {
  BOM_CATEGORIES,
  categoryMeta,
  money,
  money2,
  vendorCatalog,
  type BomCategoryId,
  type BomCheck,
  type BomItem,
  type BomVersionRecord,
  type CostOptimization,
  type FinancialSummary,
  type OptimizationId,
  type ProcurementOverview,
  type VendorComparisonRow,
} from "@/lib/bom";
import { Counter, StatCard } from "./bom-progress";

/* ==================================================================
 * Module 6 — Part 2 presentation layer
 * ================================================================== */

const availabilityTone = (a: string) =>
  a === "In Stock" ? "text-success" : a === "Limited" ? "text-warning" : "text-muted-foreground";

/* -------------------- Step 10 — vendor comparison -------------------- */

export function VendorComparison({
  rows,
  selected,
  onSelect,
}: {
  rows: VendorComparisonRow[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [detail, setDetail] = useState<string | null>(null);
  const open = rows.find((r) => r.vendorId === detail);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <div className="mr-auto">
          <h3 className="text-sm font-bold tracking-tight">Vendor Comparison</h3>
          <p className="text-[11px] text-muted-foreground">
            All supported vendors re-priced against the generated Bill of Materials.
          </p>
        </div>
        <span className="rounded-lg border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Placeholder catalogs · vendor API ready
        </span>
      </div>

      <div className="overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left">Vendor</th>
              <th className="px-3 py-2 text-right">Estimated Cost</th>
              <th className="px-3 py-2 text-left">Equipment</th>
              <th className="px-3 py-2 text-left">Availability</th>
              <th className="px-3 py-2 text-right">Lead Time</th>
              <th className="px-3 py-2 text-left">Warranty</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.vendorId}
                onClick={() => setDetail(r.vendorId)}
                className={`cursor-pointer border-b border-border/60 transition-smooth hover:bg-accent/50 ${
                  selected === r.vendorId ? "bg-primary/5" : ""
                }`}
              >
                <td className="px-3 py-2 font-semibold">
                  {r.vendor.name}
                  {selected === r.vendorId && (
                    <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      Approved
                    </span>
                  )}
                </td>
                <td className="num px-3 py-2 text-right font-semibold">{money(r.estimatedCost)}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.equipment}</td>
                <td className={`px-3 py-2 font-semibold ${availabilityTone(r.availability)}`}>
                  {r.availability}
                </td>
                <td className="num px-3 py-2 text-right">{r.leadTimeDays} Days</td>
                <td className="px-3 py-2 text-muted-foreground">{r.warranty}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {r.cheapest ? "Lowest Cost" : r.fastest ? "Fastest Delivery" : r.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <div
            key={r.vendorId}
            className={`rounded-2xl border p-4 transition-smooth ${
              selected === r.vendorId ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-background"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold tracking-tight">{r.vendor.name}</p>
                <p className={`text-[11px] font-semibold ${availabilityTone(r.availability)}`}>
                  {r.availability} · {r.leadTimeDays} days · {r.warranty}
                </p>
              </div>
              <p className="num text-base font-bold">{money(r.estimatedCost)}</p>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{r.catalog.notes}</p>
            <ul className="mt-2 space-y-1">
              {r.catalog.advantages.map((a) => (
                <li key={a} className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="size-3 text-success" /> {a}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">{r.equipment} compatible</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onSelect(r.vendorId)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-smooth ${
                  selected === r.vendorId
                    ? "border border-primary/40 bg-primary/10 text-primary"
                    : "bg-primary text-primary-foreground hover:brightness-110"
                }`}
              >
                {selected === r.vendorId ? "Selected Vendor" : "Select Vendor"}
              </button>
              <button
                onClick={() => setDetail(r.vendorId)}
                className="rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && <VendorDetails row={open} onClose={() => setDetail(null)} />}
    </div>
  );
}

function VendorDetails({ row, onClose }: { row: VendorComparisonRow; onClose: () => void }) {
  const c = vendorCatalog(row.vendorId);
  return (
    <div className="border-t border-border p-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" />
          <h4 className="text-sm font-bold tracking-tight">{row.vendor.name} — Engineering Details</h4>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg border border-border px-2 py-1 text-[11px] font-semibold transition-smooth hover:bg-accent"
          >
            Close
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Product Family" value={c.productFamily} />
          <StatCard label="Availability" value={row.availability} />
          <StatCard label="Estimated Delivery" value={`${row.leadTimeDays} days`} />
          <StatCard label="Warranty" value={row.warranty} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <DetailList title="Supported Frequency Bands" values={c.bands} />
          <DetailList title="Compatible Antennas" values={c.antennas} />
          <DetailList title="Compatible Radio Units" values={c.radioUnits} />
        </div>
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          <span className="font-semibold text-foreground">Engineering notes: </span>
          {c.notes} {c.compatibility}
        </p>
      </div>
    </div>
  );
}

function DetailList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {values.map((v) => (
          <li key={v} className="text-[11px]">
            {v}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------- Step 11 — procurement summary -------------------- */

export function ProcurementOverviewPanel({ overview }: { overview: ProcurementOverview }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <Truck className="size-4 text-primary" />
        <h3 className="text-sm font-bold tracking-tight">Procurement Summary</h3>
        <span
          className={`ml-auto rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
            overview.status === "Ready"
              ? "bg-success-soft text-success"
              : "bg-warning/10 text-warning"
          }`}
        >
          {overview.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <StatCard label="Vendor" value={overview.vendorName} />
        <StatCard label="Availability" value={`${overview.availabilityPercent}%`} />
        <StatCard label="Lead Time" value={`${overview.leadTimeDays} Days`} />
        <StatCard label="Warranty" value={overview.warranty} />
        <StatCard label="Estimated Delivery" value={overview.estimatedDelivery} />
      </div>
      <div className="mt-3 space-y-2">
        <Bar label="Availability" value={overview.availabilityPercent} />
        <Bar label="Procurement Readiness" value={overview.readiness} />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Supplier API integration (live stock and delivery tracking) arrives in a future version.
      </p>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="num font-semibold text-foreground">{value}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-smooth" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* -------------------- Step 12 — AI cost optimization -------------------- */

export function AiCostOptimization({
  options,
  applied,
  canUndo,
  canRedo,
  onApply,
  onUndo,
  onRedo,
}: {
  options: CostOptimization[];
  applied: OptimizationId[];
  canUndo: boolean;
  canRedo: boolean;
  onApply: (id: OptimizationId) => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const totalSaving = options
    .filter((o) => applied.includes(o.id))
    .reduce((s, o) => s + o.saving, 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <Lightbulb className="size-4 text-primary" />
        <h3 className="mr-auto text-sm font-bold tracking-tight">AI Cost Optimization</h3>
        <span className="rounded-lg bg-success-soft px-2 py-1 text-[11px] font-bold text-success">
          Applied savings <Counter value={totalSaving} prefix="$" />
        </span>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent disabled:opacity-40"
        >
          <Undo2 className="size-3.5" /> Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent disabled:opacity-40"
        >
          <Redo2 className="size-3.5" /> Redo
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Recommendations never modify the approved RF design — applying one re-prices only the
        affected BOM lines through the local recalculation service.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {options.map((o, idx) => {
          const on = applied.includes(o.id);
          return (
            <div
              key={o.id}
              className={`rounded-2xl border p-4 transition-smooth ${
                on ? "border-success/40 bg-success-soft/40" : "border-border bg-background"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Option {idx + 1}
              </p>
              <p className="mt-0.5 text-sm font-bold tracking-tight">{o.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{o.description}</p>
              <p className="mt-2 text-xl font-bold text-success">
                <Counter value={o.saving} prefix="$" />
              </p>
              <dl className="mt-2 space-y-1 text-[11px]">
                <Row k="Engineering Impact" v={o.impact} />
                <Row k="Difficulty" v={o.difficulty} />
                <Row k="Performance" v={o.performanceChange} />
              </dl>
              <button
                onClick={() => onApply(o.id)}
                disabled={on || o.saving <= 0}
                className="mt-3 w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-smooth hover:brightness-110 disabled:opacity-50"
              >
                {on ? "Applied" : o.saving <= 0 ? "No saving available" : "Apply Recommendation"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}

/* -------------------- cost summary -------------------- */

export function CostSummary({ finance }: { finance: FinancialSummary }) {
  const cards: [string, number][] = [
    ["Equipment", finance.equipment],
    ["Network Equipment", finance.network],
    ["Installation Materials", finance.installationMaterials],
    ["Cable / Transmission", finance.cable],
    ["Labor", finance.labor],
    ["Power Equipment", finance.power],
    ["Accessories", finance.accessories],
    ["Tax", finance.tax],
    ["Contingency", finance.contingency],
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight">Project Cost Summary</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          USD · multi-currency support planned
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-background p-3">
            <p className="text-lg font-bold leading-none">
              <Counter value={v} prefix="$" />
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {k}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Grand Total
        </span>
        <span className="text-3xl font-bold">
          <Counter value={finance.grandTotal} prefix="$" />
        </span>
      </div>
    </div>
  );
}

/* -------------------- engineering BOM viewer -------------------- */

export function BomViewer({ items }: { items: BomItem[] }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<BomCategoryId | "all">("all");
  const [sort, setSort] = useState<"total" | "quantity" | "name">("total");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items
      .filter((i) => (cat === "all" ? true : i.category === cat))
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.subcategory.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "quantity"
            ? b.quantity - a.quantity
            : b.totalPrice - a.totalPrice,
      );
    const map = new Map<BomCategoryId, BomItem[]>();
    for (const i of rows) map.set(i.category, [...(map.get(i.category) ?? []), i]);
    return [...map.entries()];
  }, [items, query, cat, sort]);

  const grand = items.reduce((s, i) => s + i.totalPrice, 0);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4 print:hidden">
        <h3 className="mr-auto text-sm font-bold tracking-tight">Engineering BOM Viewer</h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search BOM"
            className="h-9 w-48 rounded-xl border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as BomCategoryId | "all")}
          className="h-9 rounded-xl border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        >
          <option value="all">All categories</option>
          {BOM_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "total" | "quantity" | "name")}
          className="h-9 rounded-xl border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        >
          <option value="total">Sort: total price</option>
          <option value="quantity">Sort: quantity</option>
          <option value="name">Sort: name</option>
        </select>
        <button
          onClick={() => setCollapsed({})}
          className="h-9 rounded-xl border border-border px-3 text-xs font-semibold transition-smooth hover:bg-accent"
        >
          Expand all
        </button>
        <button
          onClick={() => setCollapsed(Object.fromEntries(BOM_CATEGORIES.map((c) => [c.id, true])))}
          className="h-9 rounded-xl border border-border px-3 text-xs font-semibold transition-smooth hover:bg-accent"
        >
          Collapse all
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold transition-smooth hover:bg-accent"
        >
          <Printer className="size-3.5" /> Print Preview
        </button>
      </div>

      <div className="divide-y divide-border">
        {groups.map(([c, list]) => {
          const isOpen = !collapsed[c];
          const subtotal = list.reduce((s, i) => s + i.totalPrice, 0);
          return (
            <div key={c}>
              <button
                onClick={() => setCollapsed((o) => ({ ...o, [c]: isOpen }))}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-smooth hover:bg-accent/60"
              >
                {isOpen ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold tracking-tight">{categoryMeta(c).label}</span>
                <span className="num ml-auto text-xs font-semibold">{money2(subtotal)}</span>
              </button>
              {isOpen && (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-y border-border/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-1.5 text-left">Item</th>
                      <th className="px-3 py-1.5 text-right">Qty</th>
                      <th className="px-3 py-1.5 text-left">Unit</th>
                      <th className="px-3 py-1.5 text-right">Unit Price</th>
                      <th className="px-3 py-1.5 text-right">Total Price</th>
                      <th className="px-3 py-1.5 text-left">Vendor</th>
                      <th className="px-4 py-1.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((i) => (
                      <tr key={i.id} className="border-b border-border/40">
                        <td className="px-4 py-1.5 font-medium">{i.name}</td>
                        <td className="num px-3 py-1.5 text-right">{i.quantity}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{i.unit}</td>
                        <td className="num px-3 py-1.5 text-right">{money2(i.unitPrice)}</td>
                        <td className="num px-3 py-1.5 text-right font-semibold">{money2(i.totalPrice)}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{i.vendor}</td>
                        <td className="px-4 py-1.5 text-muted-foreground">{i.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bill of Materials subtotal
        </span>
        <span className="num text-base font-bold">{money(grand)}</span>
      </div>
    </div>
  );
}

/* -------------------- engineering validation -------------------- */

export function ProcurementValidation({
  checks,
  passed,
}: {
  checks: BomCheck[];
  passed: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <h3 className="mr-auto text-sm font-bold tracking-tight">Engineering Validation</h3>
        <span
          className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
            passed ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"
          }`}
        >
          {passed ? "All checks passed" : "Issues detected"}
        </span>
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {checks.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2"
          >
            {c.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <div>
              <p className="text-xs font-semibold">{c.label}</p>
              <p className="text-[11px] text-muted-foreground">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {!passed && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
          Resolve the failed checks before saving the Engineering BOM and continuing to the final
          reports.
        </p>
      )}
    </div>
  );
}

/* -------------------- versions -------------------- */

export function BomVersions({ versions }: { versions: BomVersionRecord[] }) {
  if (!versions.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-bold tracking-tight">Engineering BOM Versions</h3>
      <table className="mt-3 w-full text-xs">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="py-2 text-left">Version</th>
            <th className="py-2 text-left">Saved</th>
            <th className="py-2 text-left">Vendor</th>
            <th className="py-2 text-right">Items</th>
            <th className="py-2 text-right">Grand Total</th>
            <th className="py-2 text-right">Optimizations</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.version} className="border-b border-border/60">
              <td className="py-2 font-semibold">v{v.version}</td>
              <td className="num py-2 text-muted-foreground">
                {new Date(v.at).toLocaleString("en-GB")}
              </td>
              <td className="py-2">{v.vendor}</td>
              <td className="num py-2 text-right">{v.items}</td>
              <td className="num py-2 text-right font-semibold">{money(v.grandTotal)}</td>
              <td className="num py-2 text-right">{v.optimizations.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
