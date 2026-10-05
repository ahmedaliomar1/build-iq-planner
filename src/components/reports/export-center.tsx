import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  Package,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  EXPORT_FORMATS,
  EXPORT_GROUPS,
  EXPORT_ITEMS,
  FUTURE_FORMATS,
  PACKAGE_TASKS,
  formatSize,
  type ExportFormatId,
  type ExportState,
  type PackageCheck,
  type PackageInfo,
  type PackageRecord,
} from "@/services/exportService";
import { reportDate } from "@/services/reportService";
import { cn } from "@/lib/utils";

const card = "rounded-2xl border border-border bg-card p-4 shadow-soft";
const fmtMs = (ms: number) => `${Math.max(1, Math.ceil(ms / 1000))}s`;

/* ---------------- selection ---------------- */

export function ExportSelector({
  selected,
  onToggle,
  onSetAll,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onSetAll: (ids: string[]) => void;
}) {
  return (
    <section className={card}>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold tracking-tight">Select Export Content</h2>
        <button
          onClick={() => onSetAll(EXPORT_ITEMS.map((i) => i.id))}
          className="ml-auto text-xs font-semibold text-primary hover:underline"
        >
          Select all
        </button>
        <button
          onClick={() => onSetAll([])}
          className="text-xs font-semibold text-muted-foreground hover:underline"
        >
          Clear
        </button>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {EXPORT_GROUPS.map((g) => (
          <div key={g}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g}
            </p>
            <div className="mt-2 space-y-1.5">
              {EXPORT_ITEMS.filter((i) => i.group === g).map((i) => (
                <label
                  key={i.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-smooth hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(i.id)}
                    onChange={() => onToggle(i.id)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {i.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ExportSummary({
  count,
  sizeKb,
  estimatedMs,
}: {
  count: number;
  sizeKb: number;
  estimatedMs: number;
}) {
  const items = [
    ["Selected Items", String(count)],
    ["Package Size Estimate", formatSize(sizeKb)],
    ["Estimated Generation Time", fmtMs(estimatedMs)],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(([l, v]) => (
        <div key={l} className={card}>
          <p className="text-xs text-muted-foreground">{l}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{v}</p>
        </div>
      ))}
    </div>
  );
}

export function FormatCards({
  formats,
  onToggle,
}: {
  formats: ExportFormatId[];
  onToggle: (id: ExportFormatId) => void;
}) {
  return (
    <section className={card}>
      <h2 className="text-sm font-bold tracking-tight">Export Formats</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Only the ZIP package combines every selected file into one download.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {EXPORT_FORMATS.map((f) => {
          const on = formats.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => onToggle(f.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-smooth",
                on ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{f.label}</span>
                {on && <CheckCircle2 className="size-4 text-primary" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{f.note}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {FUTURE_FORMATS.map((f) => (
          <span
            key={f.id}
            title={f.note}
            className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground"
          >
            {f.label} · soon
          </span>
        ))}
      </div>
    </section>
  );
}

export function PackageInfoForm({
  info,
  projectId,
  onChange,
}: {
  info: PackageInfo;
  projectId: string;
  onChange: (p: Partial<PackageInfo>) => void;
}) {
  const input =
    "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
  const field = (k: keyof PackageInfo, label: string) => (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      <input
        className={input}
        value={info[k]}
        onChange={(e) => onChange({ [k]: e.target.value })}
      />
    </label>
  );
  return (
    <section className={card}>
      <h2 className="text-sm font-bold tracking-tight">Package Information</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {field("name", "Package Name")}
        {field("version", "Version")}
        {field("author", "Author")}
        {field("company", "Company (optional)")}
        {field("description", "Description (optional)")}
        {field("notes", "Notes (optional)")}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Automatically included: creation date, generation time, project ID ({projectId}) and
        software version.
      </p>
    </section>
  );
}

/* ---------------- packaging workflow ---------------- */

export function PackagingWorkflow({
  state,
  progress,
  remainingMs,
  current,
  onCancel,
}: {
  state: ExportState;
  progress: number;
  remainingMs: number;
  current: string;
  onCancel?: () => void;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="animate-rise mx-auto max-w-5xl space-y-5 p-4 md:p-8">
      <h1 className="text-center text-2xl font-bold tracking-tight">
        Preparing Final RF Design Package
      </h1>
      <div className="grid gap-5 md:grid-cols-[260px_1fr]">
        <div className={cn(card, "flex flex-col items-center gap-3")}>
          <svg viewBox="0 0 120 120" className="size-40 -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - progress / 100)}
              className="transition-all duration-300"
            />
          </svg>
          <p className="-mt-28 mb-16 text-3xl font-bold">{progress}%</p>
          <p className="text-xs text-muted-foreground">Overall Progress</p>
          <p className="text-sm font-semibold">Current: {current}</p>
          <p className="text-xs text-muted-foreground">Remaining ≈ {fmtMs(remainingMs)}</p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              Cancel
            </button>
          )}
        </div>
        <div className={card}>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {PACKAGE_TASKS.map((t, i) => {
              const done = i < state.taskIndex;
              const active = i === state.taskIndex;
              return (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <span
                      className={cn(
                        "size-4 rounded-full border-2",
                        active
                          ? "animate-dash-spin border-primary border-t-transparent"
                          : "border-border",
                      )}
                    />
                  )}
                  <span className={cn(!done && !active && "text-muted-foreground")}>{t.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 h-44 overflow-y-auto rounded-xl bg-background p-3 font-mono text-xs">
            {[...state.log].reverse().map((l, i) => (
              <p key={i} className={l.kind === "calc" ? "text-primary" : "text-muted-foreground"}>
                [{new Date(l.at).toLocaleTimeString()}] {l.text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- validation ---------------- */

export function ValidationPanel({
  checks,
  onRegenerate,
}: {
  checks: PackageCheck[];
  onRegenerate: (c: PackageCheck) => void;
}) {
  const failed = checks.filter((c) => !c.passed);
  return (
    <section className={card}>
      <h2 className="text-sm font-bold tracking-tight">Final Validation</h2>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-sm">
            {c.passed ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <AlertTriangle className="size-4 text-danger" />
            )}
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
      {failed.map((c) => (
        <div key={c.id} className="mt-3 rounded-xl border border-danger/40 bg-danger/5 p-3 text-sm">
          <p className="font-bold text-danger">Validation Error — {c.label}</p>
          <p className="mt-1 text-muted-foreground">{c.detail}</p>
          <p className="mt-1">Suggested resolution: {c.resolution}</p>
          <button
            onClick={() => onRegenerate(c)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            <RefreshCw className="size-3.5" /> Regenerate affected item
          </button>
        </div>
      ))}
    </section>
  );
}

/* ---------------- completion ---------------- */

export function ExportCompleted({
  state,
  onDownload,
  actions,
}: {
  state: ExportState;
  onDownload: () => void;
  actions: React.ReactNode;
}) {
  const pkg = state.finalPackage;
  if (!pkg) return null;
  const items = [
    ["Package Name", pkg.zipPackage.name],
    ["Size", formatSize(pkg.zipPackage.sizeKb)],
    ["Generated", reportDate(pkg.timestamp)],
    ["Version", pkg.version],
    ["Status", "✓ Ready for Download"],
  ];
  return (
    <div className="animate-rise mx-auto max-w-4xl space-y-5 p-4 text-center md:p-8">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="animate-pop-check size-12 text-success" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Export Completed Successfully</h1>
      <p className="text-sm font-semibold text-success">
        ✓ Final RF Design Package Saved Successfully
      </p>
      <div className="grid gap-3 text-left sm:grid-cols-5">
        {items.map(([l, v]) => (
          <div key={l} className={card}>
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-1 break-all text-sm font-bold">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Download className="size-4" /> Download Package
        </button>
        {actions}
      </div>
    </div>
  );
}

export function ProjectCompletion({
  state,
  actions,
}: {
  state: ExportState;
  actions: React.ReactNode;
}) {
  const k = state.finalPackage?.kpis;
  if (!k) return null;
  const items = [
    ["Coverage", `${k.coverage}%`],
    ["Capacity", `${k.capacity}%`],
    ["Total Antennas", String(k.antennas)],
    ["Selected Vendor", k.vendor],
    ["Estimated Cost", `$${Math.round(k.estimatedCost).toLocaleString()}`],
    ["Status", "Completed"],
  ];
  return (
    <section className={cn(card, "text-center")}>
      <h2 className="text-lg font-bold tracking-tight">Project Completed Successfully</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The complete Private Cellular RF design is approved, documented and packaged for delivery.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map(([l, v]) => (
          <div key={l} className="rounded-xl bg-background p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-1 text-sm font-bold">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>
    </section>
  );
}

/* ---------------- download manager ---------------- */

export function DownloadManager({
  history,
  onDownload,
  onDuplicate,
  onRegenerate,
  onDelete,
}: {
  history: PackageRecord[];
  onDownload: () => void;
  onDuplicate: (key: string) => void;
  onRegenerate: () => void;
  onDelete: (key: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"date" | "name" | "size">("date");
  const [fmt, setFmt] = useState<"all" | ExportFormatId>("all");
  const rows = useMemo(() => {
    const r = history.filter(
      (h) =>
        h.name.toLowerCase().includes(q.toLowerCase()) &&
        (fmt === "all" || h.formats.includes(fmt)),
    );
    return [...r].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "size"
          ? b.sizeKb - a.sizeKb
          : b.exportedAt - a.exportedAt,
    );
  }, [history, q, sort, fmt]);
  const icon =
    "rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground";
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold tracking-tight">Download Manager</h2>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search packages"
              className="rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs outline-none"
            />
          </div>
          <select
            value={fmt}
            onChange={(e) => setFmt(e.target.value as typeof fmt)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="all">All formats</option>
            {EXPORT_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="date">Newest</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No exported packages yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2">Package</th>
                <th>Version</th>
                <th>Export Date</th>
                <th>Size</th>
                <th>Format</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.key} className="border-t border-border">
                  <td className="py-2 font-semibold">
                    <FileArchive className="mr-1.5 inline size-4 text-primary" />
                    {h.name}
                  </td>
                  <td>{h.version}</td>
                  <td className="text-muted-foreground">{reportDate(h.exportedAt)}</td>
                  <td>{formatSize(h.sizeKb)}</td>
                  <td className="uppercase text-muted-foreground">{h.formats.join(", ")}</td>
                  <td className="text-success">{h.status}</td>
                  <td className="whitespace-nowrap text-right">
                    <button title="Download again" onClick={onDownload} className={icon}>
                      <Download className="size-4" />
                    </button>
                    <button title="Duplicate" onClick={() => onDuplicate(h.key)} className={icon}>
                      <Copy className="size-4" />
                    </button>
                    <button title="Regenerate" onClick={onRegenerate} className={icon}>
                      <RefreshCw className="size-4" />
                    </button>
                    <button title="Delete" onClick={() => onDelete(h.key)} className={icon}>
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Archive className="size-3.5" /> Cloud storage sync is coming in a future release.
      </p>
    </section>
  );
}

export { Package as PackageIcon };
