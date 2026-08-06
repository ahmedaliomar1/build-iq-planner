import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Project } from "@/lib/building-model";
import type { RfConfig } from "@/lib/rf-config";
import type { RfProfileConfig } from "@/lib/rf-profile";
import {
  OPTIMIZATION_ITERATIONS,
  SIM_STAGES,
  TOTAL_TASKS,
  ESTIMATED_TOTAL_MS,
  placeholderRfEngine,
  runSimulation,
  saveSimState,
  simulationSeed,
  totalStageTasks,
  useSimState,
  resetSimState,
  type SimLogEntry,
  type SimulationContext,
} from "@/lib/rf-simulation";

const MAX_LOG = 120;

export function useSimulationRunner(
  project: Project | undefined,
  config: RfConfig,
  profile: RfProfileConfig,
) {
  const projectId = project?.id ?? "";
  const state = useSimState(projectId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ctx: SimulationContext | null = useMemo(
    () => (project ? { project, config, profile, seed: simulationSeed(project) } : null),
    [project, config, profile],
  );

  const candidates = useMemo(
    () => (ctx ? placeholderRfEngine.generateCandidates(ctx) : []),
    [ctx],
  );

  /* ---- derived progress ---- */
  const doneBefore = useMemo(
    () => SIM_STAGES.slice(0, state.stage).reduce((n, s) => n + totalStageTasks(s), 0),
    [state.stage],
  );
  const stage = SIM_STAGES[Math.min(state.stage, SIM_STAGES.length - 1)]!;
  const withinStage =
    stage.id === "optimization"
      ? (state.iteration - 1) * stage.tasks.length + state.task
      : state.task;
  const tasksDone = state.status === "complete" ? TOTAL_TASKS : doneBefore + withinStage;
  const progress = Math.min(100, (tasksDone / TOTAL_TASKS) * 100);
  const remainingMs = Math.max(0, ESTIMATED_TOTAL_MS - (tasksDone / TOTAL_TASKS) * ESTIMATED_TOTAL_MS);
  const candidateCount =
    state.stage > 2 || state.status === "complete"
      ? candidates.length
      : state.stage === 2
        ? Math.round((state.task / stage.tasks.length) * candidates.length)
        : 0;

  const push = useCallback(
    (log: SimLogEntry[], text: string, level: SimLogEntry["level"] = "info") =>
      [...log, { at: Date.now(), level, text }].slice(-MAX_LOG),
    [],
  );

  /* ---- ticking engine ---- */
  useEffect(() => {
    if (!ctx || state.status !== "running") return;
    const s = SIM_STAGES[state.stage];
    if (!s) return;
    timer.current = setTimeout(() => {
      const task = s.tasks[state.task];
      const label =
        s.id === "optimization"
          ? `${task?.label} — iteration ${state.iteration}/${OPTIMIZATION_ITERATIONS}`
          : (task?.label ?? "");
      let log = push(state.log, `${s.title}: ${label}`, "ok");

      const nextTask = state.task + 1;
      const elapsedMs = state.elapsedMs + s.pace;

      if (nextTask < s.tasks.length) {
        saveSimState(projectId, { task: nextTask, elapsedMs, log });
        return;
      }
      // stage iteration handling
      if (s.id === "optimization" && state.iteration < OPTIMIZATION_ITERATIONS) {
        saveSimState(projectId, {
          task: 0,
          iteration: state.iteration + 1,
          elapsedMs,
          log,
        });
        return;
      }
      log = push(log, `${s.title} — completed`, "ok");
      const nextStage = state.stage + 1;
      if (nextStage >= SIM_STAGES.length) {
        const design = runSimulation(ctx, elapsedMs / 1000);
        saveSimState(projectId, {
          status: "complete",
          stage: SIM_STAGES.length - 1,
          task: s.tasks.length,
          elapsedMs,
          design,
          activeLayer: "coverage",
          log: push(log, "Initial RF Design generated", "ok"),
        });
        return;
      }
      saveSimState(projectId, {
        status: s.gate ? "paused" : "running",
        stage: nextStage,
        task: 0,
        iteration: 1,
        elapsedMs,
        log: s.gate
          ? push(log, `${candidates.length} candidate locations found — awaiting confirmation`, "warn")
          : log,
      });
    }, s.pace);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ctx, projectId, state, push, candidates.length]);

  const start = useCallback(() => {
    if (!projectId) return;
    resetSimState(projectId);
    saveSimState(projectId, {
      status: "running",
      log: [{ at: Date.now(), level: "info", text: "Simulation started — loading engineering context" }],
    });
  }, [projectId]);

  const cancel = useCallback(() => {
    if (!projectId) return;
    saveSimState(projectId, {
      status: "cancelled",
      log: push(state.log, "Simulation cancelled by user", "warn"),
    });
  }, [projectId, push, state.log]);

  const resume = useCallback(() => {
    if (!projectId) return;
    saveSimState(projectId, { status: "running" });
  }, [projectId]);

  return {
    state,
    stage,
    progress,
    tasksDone,
    remainingMs,
    candidates,
    candidateCount,
    start,
    cancel,
    resume,
  };
}
