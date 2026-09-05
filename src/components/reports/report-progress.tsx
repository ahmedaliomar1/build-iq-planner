import { useEffect, useRef } from "react";
import { Activity, Check, FileStack, Loader2, Map as MapIcon, Package, Percent } from "lucide-react";
import {
  REPORT_STAGES,
  reportDate,
  type ReportKpis,
  type ReportStage,
  type ReportsState,
} from "@/lib/reports";

function StatusDot({ status }: { status: "done" | "active" | "todo" }) {
  if (status === "done")
    return (
      <span className="animate-pop-check grid size-5 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  if (status === "active")
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Loader2 className="size-3 animate-spin" />
      </span>
    );
  return <span className="size-5 shrink-0 rounded-full border border-border" />;
}

/* ------------------------- live KPI dashboard ------------------------- */

export function ReportKpiStrip({ kpis }: { kpis: ReportKpis }) {
  const cards = [
    { label: "Reports Generated", value: `${kpis.reportsGenerated}`, icon: FileStack },
    { label: "Chapters Completed", value: `${kpis.chaptersCompleted}`, icon: Activity },
    { label: "Maps Generated", value: `${kpis.mapsGenerated}`, icon: MapIcon },
    { label: "Documents Ready", value: `${kpis.documentsReady}`, icon: Check },
    { label: "Package Status", value: kpis.packageStatus, icon: Package },
    { label: "Project Completion", value: `${kpis.projectCompletion}%`, icon: Percent },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="size-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
          </div>
          <p className="num mt-2 truncate text-lg font-bold tracking-tight">{value}</p>
        </div>
      ))}
    </div>
  );
}

/* --------------------------- start screen --------------------------- */

export function ReportsStartScreen({
  project,
  technology,
  deployment,
  coverage,
  capacity,
  bomStatus,
  estimatedMs,
  onStart,
}: {
  project: string;
  technology: string;
  deployment: string;
  coverage: number;
  capacity: number;
  bomStatus: string;
  estimatedMs: number;
  onStart: () => void;
}) {
  const facts: [string, string][] = [
    ["Project", project],
    ["Technology", technology],
    ["Deployment", deployment],
    ["Coverage", `${coverage.toFixed(1)}%`],
    ["Capacity", `${capacity.toFixed(0)}%`],
    ["Engineering BOM", bomStatus],
  ];
  return (
    <div className="animate-rise mx-auto max-w-5xl p-4 md:p-8">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-lift md:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Module 7</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          Final Reports &amp; Export Center
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every engineering object created across the project lifecycle is collected and transformed
          into a complete professional RF design package — reports, engineering maps and customer
          deliverables.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className="num mt-1 text-base font-bold tracking-tight">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-success/30 bg-success-soft p-4">
          <span className="grid size-8 place-items-center rounded-xl bg-success text-success-foreground">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <div>
            <p className="text-sm font-semibold">Status — Ready to Generate Reports</p>
            <p className="text-xs text-muted-foreground">
              Estimated generation time ≈ {Math.round(estimatedMs / 1000)} s across{" "}
              {REPORT_STAGES.length} engineering stages.
            </p>
          </div>
        </div>

        <button
          onClick={onStart}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:opacity-90"
        >
          <FileStack className="size-4" /> Generate Final Reports
        </button>
      </div>
    </div>
  );
}

/* ------------------------- generation workflow ------------------------- */

export function ReportWorkflow({
  state,
  stage,
  progress,
  remainingMs,
  kpis,
}: {
  state: ReportsState;
  stage: ReportStage;
  progress: number;
  remainingMs: number;
  kpis: ReportKpis;
}) {
  const logRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [state.log.length]);

  const r = 54;
  const circ = 2 * Math.PI * r;

  return (
    <div className="animate-rise mx-auto max-w-6xl p-4 md:p-8">
      <div className="rounded-3xl border border-border bg-card shadow-lift">
        <div className="flex flex-wrap items-center gap-5 border-b border-border p-5 md:p-6">
          <div className="relative size-32 shrink-0">
            <svg viewBox="0 0 128 128" className="size-32 -rotate-90">
              <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted" />
              <circle
                cx="64"
                cy="64"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
                className="text-primary transition-smooth"
                strokeDasharray={circ}
                strokeDashoffset={circ - (circ * progress) / 100}
              />
            </svg>
            <span className="num absolute inset-0 grid place-items-center text-xl font-bold">
              {progress}%
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Stage {Math.min(state.stageIndex + 1, REPORT_STAGES.length)} of {REPORT_STAGES.length}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">{stage.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{stage.note}</p>
            <p className="num mt-2 text-xs text-muted-foreground">
              Estimated remaining · {Math.max(1, Math.round(remainingMs / 1000))} s
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2 md:p-6">
          <div className="space-y-4">
            {REPORT_STAGES.map((s, si) => {
              const stageStatus =
                si < state.stageIndex || state.status === "done"
                  ? "done"
                  : si === state.stageIndex
                    ? "active"
                    : "todo";
              return (
                <div
                  key={s.id}
                  className={`rounded-2xl border p-4 transition-smooth ${
                    stageStatus === "active" ? "border-primary/40 bg-primary-soft/40" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StatusDot status={stageStatus} />
                    <p className="text-sm font-bold tracking-tight">{s.title}</p>
                  </div>
                  {stageStatus !== "todo" && (
                    <ul className="mt-2 pl-1">
                      {s.tasks.map((t, ti) => {
                        const status =
                          stageStatus === "done" || ti < state.taskIndex
                            ? "done"
                            : ti === state.taskIndex
                              ? "active"
                              : "todo";
                        return (
                          <li key={t.id} className="flex items-center gap-2.5 py-1 text-sm">
                            <StatusDot status={status} />
                            <span className={status === "todo" ? "text-muted-foreground" : ""}>
                              {t.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <ReportKpiStrip kpis={kpis} />
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Engineering Activity Log
              </p>
              <div ref={logRef} className="num mt-2 max-h-72 space-y-1 overflow-auto text-[11px] leading-relaxed">
                {state.log.map((l, i) => (
                  <p
                    key={i}
                    className={
                      l.kind === "calc" ? "text-primary" : l.kind === "info" ? "text-muted-foreground" : ""
                    }
                  >
                    [{reportDate(l.at).split(", ")[1]}] {l.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
