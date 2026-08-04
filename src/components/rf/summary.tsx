import { Pencil } from "lucide-react";
import type { Project } from "@/lib/building-model";
import {
  PRIORITY_META,
  PURPOSES,
  SERVICES,
  buildingStats,
  coverageLabel,
  totalDevices,
  type RfConfig,
} from "@/lib/rf-config";

export function RfSummary({
  project,
  cfg,
  onEditStep,
}: {
  project: Project;
  cfg: RfConfig;
  onEditStep: (step: number) => void;
}) {
  const stats = buildingStats(project.model);
  const purpose = PURPOSES.find((p) => p.id === cfg.purpose)?.label ?? "—";
  const services = SERVICES.filter((s) => cfg.services.includes(s.id)).map((s) => s.label);
  const critical = Object.values(cfg.roomPriorities).filter((p) => p === "critical").length;

  const rows: { label: string; value: string; step: number }[] = [
    {
      label: "Technology",
      value: cfg.technology === "5g" ? "Private 5G" : cfg.technology === "lte" ? "Private LTE" : "—",
      step: 0,
    },
    { label: "Deployment Purpose", value: purpose, step: 1 },
    { label: "Required Services", value: services.join(", ") || "—", step: 2 },
    {
      label: "Employees",
      value: cfg.devices.employees.toLocaleString(),
      step: 3,
    },
    { label: "IoT Devices", value: cfg.devices.iot.toLocaleString(), step: 3 },
    {
      label: "Total Connected Devices",
      value: totalDevices(cfg.devices).toLocaleString(),
      step: 3,
    },
    {
      label: "Coverage Objective",
      value: `${coverageLabel(cfg.coverageBias).label} (${cfg.coverageBias}/100)`,
      step: 4,
    },
    { label: "Capacity Requirement", value: cfg.capacity ?? "—", step: 5 },
    {
      label: "Critical Areas",
      value: `${critical} critical · ${Object.keys(cfg.roomPriorities).length} prioritised`,
      step: 6,
    },
    { label: "Restricted Areas", value: String(cfg.restricted.length), step: 7 },
    {
      label: "Ceiling",
      value: `${cfg.ceiling.height} m · ${cfg.ceiling.falseCeiling ? "false ceiling" : "no false ceiling"} · ${cfg.ceiling.material}`,
      step: 8,
    },
    {
      label: "Reviewed Wall Materials",
      value: String(Object.keys(cfg.wallMaterials).length),
      step: 9,
    },
    { label: "Preferred Vendor", value: cfg.vendor ?? "—", step: 10 },
    {
      label: "Primary Optimization Goal",
      value: cfg.goals[0] ?? "—",
      step: 11,
    },
    { label: "Priority Ranking", value: cfg.goals.join(" › "), step: 11 },
    { label: "Area", value: `${Math.round(stats.area).toLocaleString()} m²`, step: 12 },
  ];

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">
          Review RF Design Requirements
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything collected for {project.name}. Edit any section before generating.
        </p>
      </div>

      <dl className="grid gap-2 md:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {r.label}
              </dt>
              <dd className="truncate text-sm font-bold capitalize">{r.value}</dd>
            </div>
            {r.step < 12 && (
              <button
                onClick={() => onEditStep(r.step)}
                aria-label={`Edit ${r.label}`}
                className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </dl>

      {Object.keys(cfg.roomPriorities).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Room priorities
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(project.model.objects.filter((o) => o.kind === "room") as {
              id: string;
              name: string;
            }[])
              .filter((r) => cfg.roomPriorities[r.id])
              .map((r) => {
                const p = cfg.roomPriorities[r.id]!;
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: PRIORITY_META[p].color }}
                    />
                    {r.name} · {PRIORITY_META[p].label}
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}
