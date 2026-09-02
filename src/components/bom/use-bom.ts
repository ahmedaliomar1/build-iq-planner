import { useCallback, useEffect, useMemo, useRef } from "react";
import type { OptimizedRfDesign } from "@/lib/rf-optimization";
import {
  BOM_STAGES,
  TOTAL_BOM_TASKS,
  applyOptimizations,
  buildBomItems,
  buildCostOptimizations,
  buildEngineeringBom,
  compareVendors,
  computeCables,
  computeCost,
  computeLabor,
  computePower,
  computeRack,
  detectEquipment,
  estimatedStageMs,
  laborFactor,
  laborTotal,
  money,
  procurementOverview,
  saveBomState,
  useBomState,
  validateProcurement,
  vendorById,
  type BomLogEntry,
  type BomVersionRecord,
  type OptimizationId,
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
      applied: [],
      undone: [],
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
      const entry: BomLogEntry = {
        at: Date.now(),
        text: `Vendor selected: ${v.name} (${v.availability})`,
        kind: "ok",
      };
      saveBomState(projectId, {
        vendor: id,
        status: "running",
        log: [...readBomLog(projectId), entry].slice(-140),
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

  /* ---------------- Part 2: optimized items & procurement ---------------- */

  /** effective BOM = generated items re-priced by the applied recommendations */
  const items = useMemo(
    () => (state.applied.length ? applyOptimizations(state.items, state.applied, vendor) : state.items),
    [state.items, state.applied, vendor],
  );

  const laborRows = useMemo(
    () =>
      detection
        ? computeLabor(detection.antennas).map((r) => ({
            ...r,
            total: Math.round(r.total * laborFactor(state.applied)),
          }))
        : [],
    [detection, state.applied],
  );
  const labor = useMemo(() => laborTotal(laborRows), [laborRows]);

  const comparison = useMemo(
    () => (design && detection ? compareVendors(design, detection) : []),
    [design, detection],
  );

  const overview = useMemo(() => procurementOverview(vendor), [vendor]);

  const optimizations = useMemo(
    () => buildCostOptimizations(state.items, laborTotal(computeLabor(detection?.antennas ?? 0)), vendor),
    [state.items, detection, vendor],
  );

  const validation = useMemo(() => {
    if (!detection) return { checks: [], passed: false };
    return validateProcurement({
      items,
      vendorId: state.vendor,
      labor,
      power: computePower(detection),
      rack: computeRack(detection),
      cables: computeCables(detection),
      cost: computeCost(items),
    });
  }, [items, detection, labor, state.vendor]);

  const bom = useMemo(
    () =>
      design && state.status === "done" && items.length
        ? buildEngineeringBom(design, vendor, items, {
            applied: state.applied,
            versionNumber: Math.max(1, state.savedVersion || 1),
          })
        : null,
    [design, state.status, items, vendor, state.applied, state.savedVersion],
  );

  const preview = useMemo(() => {
    if (!detection) return null;
    const cost = computeCost(items);
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
  }, [detection, items, labor]);

  /* ---------------- Part 2 actions ---------------- */

  const applyOptimization = useCallback(
    (id: OptimizationId) => {
      const current = readBomState(projectId);
      if (current.applied.includes(id)) return;
      const rec = buildCostOptimizations(current.items, labor, vendor).find((r) => r.id === id);
      saveBomState(projectId, {
        applied: [...current.applied, id],
        undone: [],
        log: [
          ...current.log,
          {
            at: Date.now(),
            text: `AI cost optimization applied: ${rec?.title ?? id} — saving ${money(rec?.saving ?? 0)}`,
            kind: "calc" as const,
          },
        ].slice(-140),
      });
    },
    [projectId, labor, vendor],
  );

  const undoOptimization = useCallback(() => {
    const current = readBomState(projectId);
    if (!current.applied.length) return;
    const last = current.applied[current.applied.length - 1]!;
    saveBomState(projectId, {
      applied: current.applied.slice(0, -1),
      undone: [...current.undone, last],
    });
  }, [projectId]);

  const redoOptimization = useCallback(() => {
    const current = readBomState(projectId);
    if (!current.undone.length) return;
    const last = current.undone[current.undone.length - 1]!;
    saveBomState(projectId, {
      applied: [...current.applied, last],
      undone: current.undone.slice(0, -1),
    });
  }, [projectId]);

  const saveVersion = useCallback(
    (grandTotal: number, label = "Approved Engineering BOM") => {
      const current = readBomState(projectId);
      const version = (current.savedVersion || 0) + 1;
      const record: BomVersionRecord = {
        version,
        at: Date.now(),
        vendor: vendorById(current.vendor).name,
        items: items.length,
        grandTotal,
        optimizations: current.applied,
        label,
      };
      saveBomState(projectId, {
        savedAt: Date.now(),
        savedVersion: version,
        versions: [record, ...current.versions].slice(0, 20),
        log: [
          ...current.log,
          { at: Date.now(), text: `Engineering BOM saved — version ${version}`, kind: "ok" as const },
        ].slice(-140),
      });
      return record;
    },
    [projectId, items.length],
  );

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
    items,
    laborRows,
    labor,
    comparison,
    overview,
    optimizations,
    validation,
    applyOptimization,
    undoOptimization,
    redoOptimization,
    saveVersion,
  };
}

/** non-reactive read of the persisted BOM state for use inside callbacks */
function readBomState(projectId: string) {
  const empty = {
    items: [] as ReturnType<typeof buildBomItems>,
    applied: [] as OptimizationId[],
    undone: [] as OptimizationId[],
    versions: [] as BomVersionRecord[],
    savedVersion: 0,
    vendor: null as string | null,
    log: [] as BomLogEntry[],
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem("apcp.bom.v1");
    if (!raw) return empty;
    const all = JSON.parse(raw) as Record<string, Partial<typeof empty>>;
    return { ...empty, ...(all[projectId] ?? {}) };
  } catch {
    return empty;
  }
}

/** non-reactive read used only for log appending inside callbacks */
function readBomLog(projectId: string): BomLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("apcp.bom.v1");
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, { log?: BomLogEntry[] }>;
    return all[projectId]?.log ?? [];
  } catch {
    return [];
  }
}
