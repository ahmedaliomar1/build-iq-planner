import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ESTIMATED_PACKAGE_MS,
  PACKAGE_PACE,
  PACKAGE_TASKS,
  buildFinalPackage,
  buildManifest,
  buildPackageFiles,
  defaultPackageInfo,
  downloadPackage,
  packageSizeKb,
  resetExportState,
  saveExportState,
  useExportState,
  validatePackage,
  type ExportFormatId,
  type PackageInfo,
  type PackageRecord,
} from "@/services/exportService";
import type { ReportContext, ReportsState } from "@/services/reportService";

const MAX_LOG = 140;

/**
 * Module 7 Part 2 runner. Drives the packaging workflow and keeps the
 * Export Center in sync. No engineering data is recalculated here —
 * artefacts are only collected, packaged and validated.
 */
export function useExportCenter(
  projectId: string,
  ctx: ReportContext | null,
  reports: ReportsState,
) {
  const state = useExportState(projectId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const info: PackageInfo = useMemo(
    () =>
      state.info ??
      (ctx
        ? defaultPackageInfo(ctx.project.name, ctx.optimized.projectInformation.technology)
        : defaultPackageInfo("Project", "RF")),
    [state.info, ctx],
  );

  const sizeKb = useMemo(
    () => packageSizeKb(state.selected, state.formats),
    [state.selected, state.formats],
  );

  const validation = useMemo(
    () => (ctx ? validatePackage(ctx, reports, state.selected) : { checks: [], passed: false }),
    [ctx, reports, state.selected],
  );

  const files = useMemo(
    () => (ctx ? buildPackageFiles(ctx, reports, state.selected, state.formats, info) : []),
    [ctx, reports, state.selected, state.formats, info],
  );

  const progress =
    state.status === "done"
      ? 100
      : Math.round((Math.min(state.taskIndex, PACKAGE_TASKS.length) / PACKAGE_TASKS.length) * 100);

  const remainingMs =
    state.status === "done"
      ? 0
      : Math.max(0, (PACKAGE_TASKS.length - state.taskIndex) * PACKAGE_PACE);

  const push = useCallback(
    (log: typeof state.log, text: string, kind: "info" | "ok" | "calc" = "ok") =>
      [...log, { at: Date.now(), text, kind }].slice(-MAX_LOG),
    [],
  );

  /* ---- packaging pipeline ---- */
  useEffect(() => {
    if (!ctx || state.status !== "running") return;
    const task = PACKAGE_TASKS[state.taskIndex];

    timer.current = setTimeout(() => {
      if (!task) return;
      let log = push(state.log, task.label);
      const next = state.taskIndex + 1;

      if (next < PACKAGE_TASKS.length) {
        saveExportState(projectId, { taskIndex: next, log });
        return;
      }

      const generationTimeMs = Date.now() - (state.startedAt ?? Date.now());
      const manifest = buildManifest(ctx, info, state.formats, files, generationTimeMs);
      const finalPackage = buildFinalPackage(
        ctx,
        reports,
        state.selected,
        state.formats,
        info,
        files,
        manifest,
        validation,
      );
      const record: PackageRecord = {
        key: `pkg-${Date.now()}`,
        name: `${info.name}.zip`,
        version: info.version,
        exportedAt: Date.now(),
        sizeKb,
        formats: state.formats,
        status: "Ready",
        files: files.length,
      };
      log = push(log, `Package manifest built — ${files.length} files`, "calc");
      log = push(log, "Final RF Design Package saved successfully", "calc");

      saveExportState(projectId, {
        status: "done",
        taskIndex: PACKAGE_TASKS.length,
        finishedAt: Date.now(),
        info,
        finalPackage,
        history: [record, ...state.history].slice(0, 20),
        log,
      });
    }, PACKAGE_PACE);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ctx, projectId, state, info, files, reports, validation, sizeKb, push]);

  const setSelected = useCallback(
    (selected: string[]) => saveExportState(projectId, { selected }),
    [projectId],
  );

  const toggleItem = useCallback(
    (id: string) =>
      saveExportState(projectId, {
        selected: state.selected.includes(id)
          ? state.selected.filter((s) => s !== id)
          : [...state.selected, id],
      }),
    [projectId, state.selected],
  );

  const toggleFormat = useCallback(
    (id: ExportFormatId) =>
      saveExportState(projectId, {
        formats: state.formats.includes(id)
          ? state.formats.filter((f) => f !== id)
          : [...state.formats, id],
      }),
    [projectId, state.formats],
  );

  const setInfo = useCallback(
    (patch: Partial<PackageInfo>) => saveExportState(projectId, { info: { ...info, ...patch } }),
    [projectId, info],
  );

  const start = useCallback(() => {
    saveExportState(projectId, {
      status: "running",
      taskIndex: 0,
      startedAt: Date.now(),
      finishedAt: null,
      info,
      log: [
        {
          at: Date.now(),
          kind: "info",
          text: `Preparing final RF design package — ${info.name}`,
        },
      ],
    });
  }, [projectId, info]);

  const reset = useCallback(() => resetExportState(projectId), [projectId]);

  const download = useCallback(() => {
    if (!state.finalPackage) return;
    downloadPackage(info, files, state.finalPackage.manifest, state.finalPackage);
  }, [state.finalPackage, info, files]);

  const duplicatePackage = useCallback(
    (key: string) => {
      const source = state.history.find((h) => h.key === key);
      if (!source) return;
      saveExportState(projectId, {
        history: [
          {
            ...source,
            key: `pkg-${Date.now()}`,
            name: source.name.replace(".zip", "-copy.zip"),
            exportedAt: Date.now(),
          },
          ...state.history,
        ].slice(0, 20),
      });
    },
    [projectId, state.history],
  );

  const removePackage = useCallback(
    (key: string) =>
      saveExportState(projectId, { history: state.history.filter((h) => h.key !== key) }),
    [projectId, state.history],
  );

  return {
    state,
    info,
    files,
    sizeKb,
    validation,
    progress,
    remainingMs,
    estimatedMs: ESTIMATED_PACKAGE_MS,
    currentTask: PACKAGE_TASKS[Math.min(state.taskIndex, PACKAGE_TASKS.length - 1)]!,
    setSelected,
    toggleItem,
    toggleFormat,
    setInfo,
    start,
    reset,
    download,
    duplicatePackage,
    removePackage,
  };
}
