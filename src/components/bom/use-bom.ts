import { useCallback, useEffect, useMemo, useRef } from "react";
import type { OptimizedRfDesign } from "@/lib/rf-optimization";
import {
  BOM_STAGES,
  TOTAL_BOM_TASKS,
  buildBomItems,
  buildEngineeringBom,
  computeCables,
  computeCost,
  computeLabor,
  computePower,
  computeRack,
  detectEquipment,
  estimatedStageMs,
  laborTotal,
  saveBomState,
  useBomState,
  vendorById,
  type BomLogEntry,
} from "@/lib/bom";

/**
 * Module 6 workflow runner. Drives the staged BOM generation pipeline,
 * pauses on the vendor-selection gate and keeps the live procurement
 * dashboard in sync as each stage completes.
 */
export function useBomGeneration(projectId: string, design: OptimizedRfDesign | null) {
  const state = useBomState(projectId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detection = useMemo(() => (design ? detectEquipment(design) : null), [design]);
  const vendor = useMemo(() => vendorById(state.vendor), [state.vendor]);

  const completedTasks = useMemo(() => {
    let n = 0;
    for (let i = 0; i < state.stageIndex; i++) n += BOM_STAGES[i]!.tasks.length;
    return n + state.taskIndex;
  }, [state.stageIndex, state.taskIndex]);

  const progress = Math.min(100, Math.round((completedTasks / TOTAL_BOM_TASKS) * 100));

  const remainingMs = useMemo(() => {
    let ms = 0;
    for (let i = state.stageIndex; i < BOM_STAGES.length; i++) {
      const s = BOM_STAGES[i]!;
      const done = i === state.stageIndex ? state.taskIndex : 0;
      ms += (s.tasks.length - done) * s.pace;
    }
    return ms;
  }, [state.stageIndex, state.taskIndex]);

  const pushLog = useCallback(
    (text: string, kind: BomLogEntry["kind"], log: BomLogEntry[]) =>
      [...log, { at: Date.now(), text, kind }].slice(-140),
    [],
  );

  const start = useCallback(() => {
    saveBomState(projectId, {
      status: "running",
      stageIndex: 0,
      taskIndex: 0,
      items: [],
      startedAt: Date.now(),
      finishedAt: null,
      log: [
        { at: Date.now(), text: "Engineering BOM & Cost Estimation Engine started", kind: "info" },
        { at: Date.now(), text: "Input: Optimized RF Design", kind: "info" },
      ],
    });
  }, [projectId]);

  const chooseVendor = useCallback(
    (id: string) => {
      const v = vendorById(id);
      saveBomState(projectId, {
        vendor: id,
        status: "running",
        log: [
          ...(useBomStateSnapshot(projectId)?.log ?? []),
          { at: Date.now(), text: `Vendor selected: ${v.name} (${v.availability})`, kind: "ok" },
        ].slice(-140),
      });
    },
    [projectId],
  );

  /* ---------------- ticking engine ---------------- */
  useEffect(() => {
    if (!design || !detection) return;
    if (state.status !== "running") return;
    const stage = BOM_STAGES[state.stageIndex];
    if (!stage) return;

    if (state.taskIndex >= stage.tasks.length) {
      /* stage finished */
      const isLast = state.stageIndex === BOM_STAGES.length - 1;
      let log = pushLog(`${stage.title} — completed`, "ok", state.log);
      let items = state.items;

      if (stage.id === "bom") {
        items = buildBomItems(design, detection, vendorById("custom"));
        log = pushLog(
          `Bill of Materials generated — ${items.length} line items`,
          "calc",
          log,
        );
      }
      if (stage.id === "pricing") {
        items = buildBomItems(design, detection, vendor);
        log = pushLog(
          `Pricing applied from ${vendor.name} catalog (${items.length} items)`,
          "calc",
          log,
        );
      }
      if (stage.id === "cost") {
        const cost = computeCost(items);
        log = pushLog(`Subtotal: $${Math.round(cost.subtotal).toLocaleString()}`, "calc", log);
      }
      if (stage.id === "labor") {
        log = pushLog(
          `Estimated labor cost: $${laborTotal(computeLabor(detection.antennas)).toLocaleString()}`,
          "calc",
          log,
        );
      }
      if (stage.id === "power") {
        log = pushLog(`Estimated total power: ${computePower(detection).totalWatts} W`, "calc", log);
      }
      if (stage.id === "rack") {
        const r = computeRack(detection);
        log = pushLog(`Rack utilization: ${r.used}U of ${r.cabinetSize}U`, "calc", log);
      }
      if (stage.id === "cable") {
        const c = computeCables(detection);
        log = pushLog(`Cable summary: ${c.totalMeters} m — ${c.complexity} complexity`, "calc", log);
      }

      timer.current = setTimeout(() => {
        saveBomState(projectId, {
          items,
          log,
          ...(isLast
            ? { status: "done" as const, finishedAt: Date.now() }
            : { stageIndex: state.stageIndex + 1, taskIndex: 0 }),
        });
      }, 260);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }

    /* vendor gate — pause until a vendor is chosen */
    if (stage.gate && state.taskIndex === 0 && !state.vendor) {
      saveBomState(projectId, {
        status: "gate",
        log: pushLog("Awaiting vendor selection", "info", state.log),
      });
      return;
    }

    const task = stage.tasks[state.taskIndex]!;
    timer.current = setTimeout(() => {
      saveBomState(projectId, {
        taskIndex: state.taskIndex + 1,
        log: pushLog(task.label, "ok", state.log),
      });
    }, stage.pace);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, design, detection, vendor, projectId, pushLog]);

  const bom = useMemo(
    () => (design && state.status === "done" && state.items.length ? buildEngineeringBom(design, vendor, state.items) : null),
    [design, state.status, state.items, vendor],
  );

  const preview = useMemo(() => {
    if (!detection) return null;
    const items = state.items;
    const cost = computeCost(items);
    const labor = laborTotal(computeLabor(detection.antennas));
    return {
      detection,
      items,
      cost,
      labor,
      power: computePower(detection),
      rack: computeRack(detection),
      cables: computeCables(detection),
      projectCost: cost.subtotal + labor,
    };
  }, [detection, state.items]);

  return {
    state,
    vendor,
    detection,
    progress,
    remainingMs,
    estimatedStageMs,
    completedTasks,
    start,
    chooseVendor,
    bom,
    preview,
  };
}

/** non-reactive read used only for log appending inside callbacks */
function useBomStateSnapshot(projectId: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("apcp.bom.v1");
    if (!raw) return null;
    return (JSON.parse(raw) as Record<string, { log: BomLogEntry[] }>)[projectId] ?? null;
  } catch {
    return null;
  }
}
