import { useEffect, useRef } from "react";
import {
  Activity,
  Check,
  CircleSlash,
  Loader2,
  Minimize2,
  Maximize2,
  X,
} from "lucide-react";
import {
  OPTIMIZATION_ITERATIONS,
  SIM_STAGES,
  totalStageTasks,
  type SimState,
  type SimStage,
} from "@/lib/rf-simulation";

function StageIcon({ status }: { status: "done" | "active" | "todo" }) {
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

function TaskRow({
  label,
  status,
}: {
  label: string;
  status: "done" | "active" | "todo";
}) {
  return (
    <li className="flex items-center gap-2.5 py-1.5 text-sm">
      <StageIcon status={status} />
      <span
        className={
          status === "todo"
            ? "text-muted-foreground"
            : status === "active"
              ? "font-semibold text-foreground"
              : "text-foreground"
        }
      >
        {label}
      </span>
    </li>
  );
}

export function SimulationProgress({
  state,
  stage,
  progress,
  remainingMs,
  candidateCount,
  minimized,
  onToggleMinimize,
  onCancel,
  onContinue,
}: {
  state: SimState;
  stage: SimStage;
  progress: number;
  remainingMs: number;
  candidateCount: number;
  minimized: boolean;
  onToggleMinimize: () => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const logRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [state.log.length]);

  const r = 54;
  const circ = 2 * Math.PI * r;

  if (minimized) {
    return (
      <div className="animate-rise fixed bottom-4 right-4 z-50 w-80 rounded-2xl border border-border bg-card p-4 shadow-lift">
        <div className="flex items-center gap-3">
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{stage.title}</p>
            <p className="num text-xs text-muted-foreground">{progress.toFixed(0)}% complete</p>
          </div>
          <button
            onClick={onToggleMinimize}
            aria-label="Expand simulation"
            className="rounded-lg border border-border p-1.5 transition-smooth hover:bg-accent"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-smooth"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise mx-auto max-w-6xl p-4 md:p-8">
      <div className="rounded-3xl border border-border bg-card shadow-lift">
        {/* header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-5 md:p-6">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Activity className="size-5" />
          </span>
          <div className="mr-auto">
            <h1 className="text-lg font-bold tracking-tight">RF Simulation Engine</h1>
            <p className="text-xs text-muted-foreground">
              {state.status === "running"
                ? "Simulation in progress"
                : state.status === "paused"
                  ? "Awaiting confirmation"
                  : state.status === "cancelled"
                    ? "Simulation cancelled"
                    : "Simulation complete"}
            </p>
          </div>
          <button
            onClick={onToggleMinimize}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
          >
            <Minimize2 className="size-3.5" /> Minimize
          </button>
          <button
            onClick={onCancel}
            disabled={state.status === "cancelled"}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-danger transition-smooth hover:bg-danger-soft disabled:opacity-50"
          >
            <X className="size-3.5" /> Cancel
          </button>
        </div>

        <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[300px_1fr_320px]">
          {/* progress ring */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background p-6">
            <svg viewBox="0 0 128 128" className="size-40">
              <circle cx="64" cy="64" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
              <circle
                cx="64"
                cy="64"
                r={r}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - (circ * progress) / 100}
                transform="rotate(-90 64 64)"
                style={{ transition: "stroke-dashoffset .3s ease" }}
              />
              <text
                x="64"
                y="62"
                textAnchor="middle"
                className="num"
                fontSize="22"
                fontWeight="700"
                fill="var(--foreground)"
              >
                {progress.toFixed(0)}%
              </text>
              <text
                x="64"
                y="80"
                textAnchor="middle"
                fontSize="9"
                fill="var(--muted-foreground)"
              >
                overall progress
              </text>
            </svg>
            <p className="mt-4 text-center text-sm font-bold">{stage.title}</p>
            <p className="num mt-1 text-xs text-muted-foreground">
              Estimated remaining {Math.ceil(remainingMs / 1000)}s
            </p>
            {stage.id === "optimization" && state.status !== "complete" && (
              <p className="num mt-3 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                Iteration {state.iteration} / {OPTIMIZATION_ITERATIONS}
              </p>
            )}
            {stage.id === "candidates" && (
              <div className="mt-3 rounded-2xl border border-border bg-card px-4 py-3 text-center">
                <p className="num text-2xl font-bold text-primary">{candidateCount}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Candidate locations found
                </p>
              </div>
            )}
          </div>

          {/* current stage tasks */}
          <div className="rounded-2xl border border-border bg-background p-5">
            <h2 className="text-sm font-bold tracking-tight">{stage.title}</h2>
            <ul className="mt-2">
              {stage.tasks.map((task, i) => (
                <TaskRow
                  key={task.id}
                  label={task.label}
                  status={
                    state.status === "complete" || i < state.task
                      ? "done"
                      : i === state.task && state.status === "running"
                        ? "active"
                        : "todo"
                  }
                />
              ))}
            </ul>

            {state.status === "paused" && (
              <button
                onClick={onContinue}
                className="mt-4 w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
              >
                Continue
              </button>
            )}
            {state.status === "cancelled" && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
                <CircleSlash className="size-4" /> Simulation cancelled — progress preserved.
              </p>
            )}

            {/* stage rail */}
            <ol className="mt-6 space-y-1.5 border-t border-border pt-4">
              {SIM_STAGES.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2.5 text-xs">
                  <StageIcon
                    status={
                      state.status === "complete" || i < state.stage
                        ? "done"
                        : i === state.stage
                          ? "active"
                          : "todo"
                    }
                  />
                  <span
                    className={
                      i === state.stage && state.status !== "complete"
                        ? "font-semibold"
                        : "text-muted-foreground"
                    }
                  >
                    {s.title}
                  </span>
                  <span className="num ml-auto text-[11px] text-muted-foreground">
                    {totalStageTasks(s)} tasks
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* live log */}
          <div className="flex min-h-64 flex-col rounded-2xl border border-border bg-background p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Live Engineering Log
            </h2>
            <div ref={logRef} className="num mt-3 flex-1 space-y-1 overflow-auto text-[11px] leading-relaxed">
              {state.log.map((l, i) => (
                <p
                  key={`${l.at}-${i}`}
                  className={
                    l.level === "ok"
                      ? "text-success"
                      : l.level === "warn"
                        ? "text-warning"
                        : "text-muted-foreground"
                  }
                >
                  [{new Date(l.at).toLocaleTimeString()}] {l.text}
                </p>
              ))}
              {!state.log.length && (
                <p className="text-muted-foreground">Waiting for simulation output…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
