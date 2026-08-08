import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  BOM_CATEGORIES,
  categoryMeta,
  money,
  money2,
  type BomCategoryId,
  type BomItem,
  type CableSummary,
  type CostBreakdown,
  type LaborRole,
  type PowerEstimate,
  type RackEstimate,
} from "@/lib/bom";
import { Counter, StatCard } from "./bom-progress";

/* -------------------- equipment browser -------------------- */

type SortKey = "name" | "quantity" | "total";

export function EquipmentBrowser({ items }: { items: BomItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BomCategoryId | "all" | "future">("all");
  const [sort, setSort] = useState<SortKey>("total");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) =>
        filter === "all" ? true : filter === "future" ? i.futureSupport : i.category === filter,
      )
      .filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          i.subcategory.toLowerCase().includes(q) ||
          i.vendor.toLowerCase().includes(q),
      )
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "quantity"
            ? b.quantity - a.quantity
            : b.totalPrice - a.totalPrice,
      );
  }, [items, query, filter, sort]);

  const groups = useMemo(() => {
    const map = new Map<BomCategoryId, BomItem[]>();
    for (const i of filtered) map.set(i.category, [...(map.get(i.category) ?? []), i]);
    return [...map.entries()];
  }, [filtered]);

  const allOpen = groups.every(([c]) => open[c] !== false);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <h3 className="mr-auto text-sm font-bold tracking-tight">Equipment Browser</h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search equipment"
            className="h-9 w-52 rounded-xl border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as BomCategoryId | "all" | "future")}
          className="h-9 rounded-xl border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        >
          <option value="all">All categories</option>
          {BOM_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
          <option value="future">Future support</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-xl border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        >
          <option value="total">Sort: total price</option>
          <option value="quantity">Sort: quantity</option>
          <option value="name">Sort: name</option>
        </select>
        <button
          onClick={() =>
            setOpen(Object.fromEntries(BOM_CATEGORIES.map((c) => [c.id, !allOpen])))
          }
          className="h-9 rounded-xl border border-border px-3 text-xs font-semibold transition-smooth hover:bg-accent"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="divide-y divide-border">
        {groups.length === 0 && (
          <p className="p-6 text-center text-xs text-muted-foreground">No equipment matches the filters.</p>
        )}
        {groups.map(([cat, list]) => {
          const expanded = open[cat] !== false;
          const meta = categoryMeta(cat);
          const total = list.reduce((s, i) => s + i.totalPrice, 0);
          return (
            <div key={cat}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [cat]: !expanded }))}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition-smooth hover:bg-accent/60"
              >
                {expanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold tracking-tight">{meta.label}</span>
                <span className="text-[11px] text-muted-foreground">{meta.note}</span>
                <span className="num ml-auto text-xs font-semibold">{money(total)}</span>
                <span className="rounded-lg border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {list.length} items
                </span>
              </button>
              {expanded && (
                <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((i) => (
                    <div key={i.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-tight">{i.name}</p>
                        <span className="num shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                          {i.quantity} {i.unit}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {i.subcategory} · {i.vendor}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{i.source}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{i.status}</span>
                        <span className="num font-semibold">{money2(i.totalPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- cost breakdown -------------------- */

export function CostBreakdownCards({ cost }: { cost: CostBreakdown }) {
  const cards: [string, number][] = [
    ["Equipment Cost", cost.equipment],
    ["Network Equipment", cost.network],
    ["Installation Materials", cost.installation],
    ["Cable Cost", cost.cable],
    ["Accessories", cost.accessories],
    ["Power Equipment", cost.power],
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-bold tracking-tight">Cost Breakdown</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-background p-3">
            <p className="text-lg font-bold leading-none">
              <Counter value={v} prefix="$" />
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {k}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Subtotal
        </span>
        <span className="text-xl font-bold">
          <Counter value={cost.subtotal} prefix="$" />
        </span>
      </div>
    </div>
  );
}

/* -------------------- cost table -------------------- */

export function CostTable({ items }: { items: BomItem[] }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<BomCategoryId | "all">("all");
  const [sort, setSort] = useState<{ key: keyof BomItem; dir: 1 | -1 }>({
    key: "totalPrice",
    dir: -1,
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => (cat === "all" ? true : i.category === cat))
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.subcategory.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
        return String(av).localeCompare(String(bv)) * sort.dir;
      });
  }, [items, query, cat, sort]);

  const th = (label: string, key: keyof BomItem) => (
    <th
      onClick={() =>
        setSort((s) => ({ key, dir: s.key === key && s.dir === -1 ? 1 : -1 }))
      }
      className="cursor-pointer whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground transition-smooth hover:text-foreground"
    >
      {label}
      {sort.key === key ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
    </th>
  );

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <h3 className="mr-auto text-sm font-bold tracking-tight">Engineering Cost Table</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items"
          className="h-9 w-48 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
        />
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
      </div>
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border">
              {th("Item", "name")}
              {th("Category", "category")}
              {th("Qty", "quantity")}
              {th("Unit", "unit")}
              {th("Unit Price", "unitPrice")}
              {th("Total Price", "totalPrice")}
              {th("Vendor", "vendor")}
              {th("Status", "status")}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-b border-border/60 transition-smooth hover:bg-accent/50">
                <td className="px-3 py-2 font-medium">{i.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{categoryMeta(i.category).label}</td>
                <td className="num px-3 py-2">{i.quantity}</td>
                <td className="px-3 py-2 text-muted-foreground">{i.unit}</td>
                <td className="num px-3 py-2">{money2(i.unitPrice)}</td>
                <td className="num px-3 py-2 font-semibold">{money2(i.totalPrice)}</td>
                <td className="px-3 py-2 text-muted-foreground">{i.vendor}</td>
                <td className="px-3 py-2">
                  <span className="rounded-lg border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {i.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------- labor -------------------- */

export function LaborPanel({ rows, total }: { rows: LaborRole[]; total: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-bold tracking-tight">Labor Estimation</h3>
      <table className="mt-3 w-full text-xs">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="py-2 text-left">Role</th>
            <th className="py-2 text-right">People</th>
            <th className="py-2 text-right">Days</th>
            <th className="py-2 text-right">Daily Cost</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60">
              <td className="py-2 font-medium">{r.role}</td>
              <td className="num py-2 text-right">{r.people}</td>
              <td className="num py-2 text-right">{r.days}</td>
              <td className="num py-2 text-right">{money(r.dailyCost)}</td>
              <td className="num py-2 text-right font-semibold">{money(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Estimated Labor Cost
        </span>
        <span className="text-lg font-bold">
          <Counter value={total} prefix="$" />
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Regional labor cost profiles arrive in a future version — Version 1 uses reference day rates.
      </p>
    </div>
  );
}

/* -------------------- power -------------------- */

export function PowerPanel({ power }: { power: PowerEstimate }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-bold tracking-tight">Power Consumption Estimation</h3>
      <ul className="mt-3 space-y-1.5">
        {power.lines.map((l) => (
          <li key={l.id} className="flex items-center justify-between text-xs">
            <span className="font-medium">{l.label}</span>
            <span className="num text-muted-foreground">
              {l.quantity} × {l.watts} W = {l.total} W
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Total Power" value={`${power.totalWatts} W`} />
        <StatCard label="Daily" value={`${power.dailyKwh} kWh`} />
        <StatCard label="Monthly" value={`${power.monthlyKwh} kWh`} />
        <StatCard label="Monthly Energy" value={money(power.monthlyCost)} />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Carbon footprint placeholder: ≈ {power.carbonKgMonth} kg CO₂e / month.
      </p>
    </div>
  );
}

/* -------------------- rack -------------------- */

export function RackPanel({ rack }: { rack: RackEstimate }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-bold tracking-tight">Rack Space Estimation</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Cabinet Size" value={`${rack.cabinetSize}U`} />
        <StatCard label="Used Space" value={`${rack.used}U`} />
        <StatCard label="Remaining" value={`${rack.remaining}U`} />
        <StatCard label="Cabinets" value={`${rack.cabinets}`} />
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Utilization</span>
          <span className="num font-semibold text-foreground">{rack.utilization}%</span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-smooth ${
              rack.utilization > 85 ? "bg-warning" : "bg-primary"
            }`}
            style={{ width: `${rack.utilization}%` }}
          />
        </div>
      </div>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {rack.lines.map((l) => (
          <li key={l.label} className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{l.label}</span>
            <span className="num font-semibold">{l.units}U</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Automatic rack layout diagrams arrive in a future version.
      </p>
    </div>
  );
}

/* -------------------- cables -------------------- */

export function CablePanel({ cables }: { cables: CableSummary }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-bold tracking-tight">Cable Routing Summary</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Fiber Cable" value={`${cables.fiber} m`} />
        <StatCard label="CAT6 Cable" value={`${cables.cat6} m`} />
        <StatCard label="Power Cable" value={`${cables.power} m`} />
        <StatCard label="Ground Cable" value={`${cables.ground} m`} />
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">
          Routing Complexity
        </span>
        <span className="font-bold">
          {cables.complexity} · <span className="num">{cables.totalMeters} m</span> total
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Automatic cable routing optimization arrives in a future version.
      </p>
    </div>
  );
}
