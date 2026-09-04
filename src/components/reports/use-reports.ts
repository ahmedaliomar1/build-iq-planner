import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  CHAPTER_ORDER,
  ESTIMATED_REPORT_MS,
  MAP_DEFS,
  REPORT_DEFS,
  REPORT_STAGES,
  TOTAL_REPORT_TASKS,
  buildReportDocument,
  reportKpis,
  resetReportsState,
  saveReportsState,
  useReportsState,
  type ChapterId,
  type ReportContext,
  type ReportId,
  type ReportLogEntry,
  type ReportRecord,
} from "@/lib/reports";

const MAX_LOG = 140;

/** chapter task id -> chapters completed by that task */
const CHAPTER_TASK_MAP: Record<string, ChapterId[]> = {
  executive: ["executive"],
  project: ["project"],
  building: ["building"],
  rf: ["requirements", "profile"],
  simulation: ["simulation"],
  optimization: ["optimization"],
  cost: ["cost"],
  bom: ["bom"],
  installation: ["installation"],
  metadata: ["metadata"],
};

/**
 * Module 7 workflow runner. Drives the three-stage report generation
 * pipeline and keeps the live report dashboard in sync. No engineering
 * calculation happens here — only document assembly.
 */
export function useReportGeneration(projectId: string, ctx: ReportContext | null) {
  const state = useReportsState(projectId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const completedTasks = useMemo(() => {
    let n = 0;
    for (let i = 0; i < state.stageIndex; i++) n += REPORT_STAGES[i]!.tasks.length;
    return Math.min(TOTAL_REPORT_TASKS, n + state.taskIndex);
  }, [state.stageIndex, state.taskIndex]);

  const progress =
    state.status === "done" ? 100 : Math.round((completedTasks / TOTAL_REPORT_TASKS) * 100);

  const remainingMs = useMemo(() => {
    if (state.status === "done") return 0;
    let ms = 0;
    for (let i = state.stageIndex; i < REPORT_STAGES.length; i++) {
      const s = REPORT_STAGES[i]!;
      const done = i === state.stageIndex ? state.taskIndex : 0;
      ms += Math.max(0, s.tasks.length - done) * s.pace;
    }
    return Math.min(ESTIMATED_REPORT_MS, ms);
  }, [state.status, state.stageIndex, state.taskIndex]);

  const stage = REPORT_STAGES[Math.min(state.stageIndex, REPORT_STAGES.length - 1)]!;

  const push = useCallback(
    (log: ReportLogEntry[], text: string, kind: ReportLogEntry["kind"] = "ok") =>
      [...log, { at: Date.now(), text, kind }].slice(-MAX_LOG),
    [],
  );

  const makeRecords = useCallback(
    (at: number): ReportRecord[] =>
      REPORT_DEFS.map((d, i) => ({
        key: `${d.id}-${at}-${i}`,
        reportId: d.id,
        name: d.title,
        type: d.type,
        version: "v1.0",
        generatedAt: at,
        status: "Ready" as const,
        pages: ctx ? buildReportDocument(d.id, ctx, "v1.0", at).pages.length : 0,
        chapters: d.chapters,
      })),
    [ctx],
  );

  /* ---- ticking pipeline ---- */
  useEffect(() => {
    if (!ctx || state.status !== "running") return;
    const s = REPORT_STAGES[state.stageIndex];
    if (!s) return;

    timer.current = setTimeout(() => {
      const task = s.tasks[state.taskIndex];
      if (!task) return;
      let log = push(state.log, `${s.title}: ${task.label}`);

      const chaptersDone =
        s.id === "chapters"
          ? Array.from(new Set([...state.chaptersDone, ...(CHAPTER_TASK_MAP[task.id] ?? [])]))
          : state.chaptersDone;

      const mapsDone =
        s.id === "builder" && task.id === "figures"
          ? MAP_DEFS.map((m) => m.id)
          : state.mapsDone;

      if (s.id === "builder" && task.id === "figures") {
        log = push(log, `${MAP_DEFS.length} engineering maps rendered`, "calc");
      }

      const nextTask = state.taskIndex + 1;
      if (nextTask < s.tasks.length) {
        saveReportsState(projectId, { taskIndex: nextTask, log, chaptersDone, mapsDone });
        return;
      }

      log = push(log, `${s.title} — completed`);
      const nextStage = state.stageIndex + 1;
      if (nextStage >= REPORT_STAGES.length) {
        const at = Date.now();
        saveReportsState(projectId, {
          status: "done",
          stageIndex: REPORT_STAGES.length - 1,
          taskIndex: s.tasks.length,
          finishedAt: at,
          chaptersDone: CHAPTER_ORDER,
          mapsDone: MAP_DEFS.map((m) => m.id),
          reports: makeRecords(at),
          log: push(log, "Final report package assembled — 6 documents ready", "calc"),
        });
        return;
      }
      saveReportsState(projectId, {
        stageIndex: nextStage,
        taskIndex: 0,
        log,
        chaptersDone,
        mapsDone,
      });
    }, s.pace);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ctx, projectId, state, push, makeRecords]);

  const start = useCallback(() => {
    if (!projectId) return;
    resetReportsState(projectId);
    saveReportsState(projectId, {
      status: "running",
      startedAt: Date.now(),
      log: [{ at: Date.now(), kind: "info", text: "Report generation started — collecting engineering objects" }],
    });
  }, [projectId]);

  const regenerate = useCallback(
    (reportId: ReportId) => {
      if (!ctx) return;
      const at = Date.now();
      const reports = state.reports.map((r) => {
        if (r.reportId !== reportId) return r;
        const major = Number(r.version.replace("v", "").split(".")[0] ?? 1);
        const minor = Number(r.version.split(".")[1] ?? 0) + 1;
        return {
          ...r,
          version: `v${major}.${minor}`,
          generatedAt: at,
          status: "Ready" as const,
          pages: buildReportDocument(reportId, ctx, `v${major}.${minor}`, at).pages.length,
        };
      });
      saveReportsState(projectId, {
        reports,
        log: push(state.log, `${reportId} regenerated`, "calc"),
      });
    },
    [ctx, projectId, state.reports, state.log, push],
  );

  const duplicate = useCallback(
    (key: string) => {
      const source = state.reports.find((r) => r.key === key);
      if (!source) return;
      const copy: ReportRecord = {
        ...source,
        key: `${source.reportId}-${Date.now()}`,
        name: `${source.name} (copy)`,
        generatedAt: Date.now(),
      };
      saveReportsState(projectId, { reports: [...state.reports, copy] });
    },
    [projectId, state.reports],
  );

  const remove = useCallback(
    (key: string) => {
      saveReportsState(projectId, { reports: state.reports.filter((r) => r.key !== key) });
    },
    [projectId, state.reports],
  );

  const document = useCallback(
    (reportId: ReportId) => {
      if (!ctx) return null;
      const rec = state.reports.find((r) => r.reportId === reportId);
      return buildReportDocument(reportId, ctx, rec?.version ?? "v1.0", rec?.generatedAt ?? Date.now());
    },
    [ctx, state.reports],
  );

  return {
    state,
    stage,
    progress,
    remainingMs,
    completedTasks,
    kpis: reportKpis(state),
    start,
    regenerate,
    duplicate,
    remove,
    document,
  };
}
