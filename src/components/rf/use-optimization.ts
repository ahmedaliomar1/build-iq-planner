import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/building-model";
import type { RfConfig } from "@/lib/rf-config";
import type { RfProfileConfig } from "@/lib/rf-profile";
import {
  placeholderRfEngine,
  simulationSeed,
  type InitialRfDesign,
  type RfLayer,
  type RfLayerId,
  type SimulationContext,
} from "@/lib/rf-simulation";
import {
  RF_LAYER_LABELS,
  buildSuggestions,
  costLabel,
  placeholderRecalculationService,
  saveOptState,
  toOptAntenna,
  useOptState,
  validateOptimization,
  type OptAntenna,
  type OptChange,
  type OptVersion,
} from "@/lib/rf-optimization";

const STEP_MS = 420;

interface Snapshot {
  antennas: OptAntenna[];
  label: string;
}

export function useOptimization(
  project: Project | undefined,
  config: RfConfig,
  profile: RfProfileConfig,
  initial: InitialRfDesign | null,
) {
  const projectId = project?.id ?? "";
  const state = useOptState(projectId);

  const ctx: SimulationContext | null = useMemo(
    () => (project ? { project, config, profile, seed: simulationSeed(project) } : null),
    [project, config, profile],
  );

  /* layers are not persisted (too large) — rebuild lazily */
  const [layers, setLayers] = useState<Record<RfLayerId, RfLayer> | null>(null);
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

  /* recalculation progress */
  const [recalc, setRecalc] = useState<{ steps: RfLayerId[]; index: number; label: string } | null>(
    null,
  );
  const pending = useRef<{ antennas: OptAntenna[]; change: OptChange; affected: RfLayerId[] } | null>(
    null,
  );

  /* ---------- bootstrap from the Initial RF Design ---------- */
  useEffect(() => {
    if (!initial || !projectId) return;
    if (!state.initialized) {
      const antennas = initial.selectedAntennaLayout.map(toOptAntenna);
      const v: OptVersion = {
        id: `v-${Date.now()}`,
        name: "Version 1",
        at: Date.now(),
        note: "Imported from Initial RF Design",
        antennas,
        kpis: initial.kpis,
        cost: costLabel(antennas),
      };
      saveOptState(projectId, {
        initialized: true,
        antennas,
        kpis: initial.kpis,
        warnings: initial.warnings,
        suggestions: buildSuggestions(antennas, initial.kpis, initial.warnings),
        versions: [v],
        currentVersionId: v.id,
      });
    }
    setLayers((l) => l ?? initial.layers);
  }, [initial, projectId, state.initialized]);

  /* ---------- step the recalculation animation ---------- */
  useEffect(() => {
    if (!recalc || !ctx) return;
    const p = pending.current;
    if (!p) return;
    if (recalc.index >= recalc.steps.length) {
      const result = placeholderRecalculationService.recalculate(
        ctx,
        p.antennas,
        layers ?? initial?.layers ?? ({} as Record<RfLayerId, RfLayer>),
        p.affected,
      );
      setLayers(result.layers);
      const version: OptVersion = {
        id: `v-${Date.now()}`,
        name: `Version ${state.versions.length + 1}`,
        at: Date.now(),
        note: p.change.label,
        antennas: p.antennas,
        kpis: { ...result.kpis, simulationSeconds: state.kpis.simulationSeconds },
        cost: costLabel(p.antennas),
      };
      saveOptState(projectId, {
        antennas: p.antennas,
        kpis: { ...result.kpis, simulationSeconds: state.kpis.simulationSeconds },
        warnings: result.warnings,
        suggestions: result.suggestions,
        versions: [...state.versions, version],
        currentVersionId: version.id,
        modifications: state.modifications + 1,
        completed: false,
      });
      pending.current = null;
      setRecalc(null);
      return;
    }
    const t = setTimeout(
      () =>
        setRecalc((r) =>
          r ? { ...r, index: r.index + 1, label: RF_LAYER_LABELS[r.steps[r.index]!] } : r,
        ),
      STEP_MS,
    );
    return () => clearTimeout(t);
  }, [recalc, ctx, layers, initial, projectId, state.versions, state.modifications, state.kpis.simulationSeconds]);

  /* ---------- editing operations ---------- */

  const applyChange = useCallback(
    (next: OptAntenna[], change: OptChange) => {
      if (!ctx) return;
      undoStack.current.push({ antennas: state.antennas, label: change.label });
      redoStack.current = [];
      setHistoryTick((t) => t + 1);
      const affected = placeholderRecalculationService.affectedLayers(change);
      if (!affected.length) {
        saveOptState(projectId, { antennas: next, modifications: state.modifications + 1 });
        return;
      }
      pending.current = { antennas: next, change, affected };
      setRecalc({ steps: affected, index: 0, label: RF_LAYER_LABELS[affected[0]!] });
    },
    [ctx, projectId, state.antennas, state.modifications],
  );

  /** silent update that never triggers recalculation (lock, rename, tilt) */
  const setAntennas = useCallback(
    (next: OptAntenna[], label: string) => {
      undoStack.current.push({ antennas: state.antennas, label });
      redoStack.current = [];
      setHistoryTick((t) => t + 1);
      saveOptState(projectId, { antennas: next });
    },
    [projectId, state.antennas],
  );

  const recomputeFor = useCallback(
    (antennas: OptAntenna[]) => {
      if (!ctx) return;
      const result = placeholderRecalculationService.recalculate(
        ctx,
        antennas,
        layers ?? initial?.layers ?? ({} as Record<RfLayerId, RfLayer>),
        placeholderRecalculationService.affectedLayers({ kind: "move", label: "", antennaIds: [] }),
      );
      setLayers(result.layers);
      saveOptState(projectId, {
        antennas,
        kpis: { ...result.kpis, simulationSeconds: state.kpis.simulationSeconds },
        warnings: result.warnings,
        suggestions: result.suggestions,
      });
    },
    [ctx, layers, initial, projectId, state.kpis.simulationSeconds],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ antennas: state.antennas, label: prev.label });
    setHistoryTick((t) => t + 1);
    recomputeFor(prev.antennas);
  }, [recomputeFor, state.antennas]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ antennas: state.antennas, label: next.label });
    setHistoryTick((t) => t + 1);
    recomputeFor(next.antennas);
  }, [recomputeFor, state.antennas]);

  const restoreVersion = useCallback(
    (id: string) => {
      const v = state.versions.find((x) => x.id === id);
      if (!v) return;
      undoStack.current.push({ antennas: state.antennas, label: `Restore ${v.name}` });
      redoStack.current = [];
      setHistoryTick((t) => t + 1);
      saveOptState(projectId, { currentVersionId: v.id });
      recomputeFor(v.antennas);
    },
    [projectId, recomputeFor, state.versions, state.antennas],
  );

  const duplicateVersion = useCallback(
    (id: string) => {
      const v = state.versions.find((x) => x.id === id);
      if (!v) return;
      const copy: OptVersion = {
        ...v,
        id: `v-${Date.now()}`,
        name: `${v.name} (copy)`,
        at: Date.now(),
        note: `Duplicated from ${v.name}`,
      };
      saveOptState(projectId, { versions: [...state.versions, copy] });
    },
    [projectId, state.versions],
  );

  const renameVersion = useCallback(
    (id: string, name: string) => {
      saveOptState(projectId, {
        versions: state.versions.map((v) => (v.id === id ? { ...v, name } : v)),
      });
    },
    [projectId, state.versions],
  );

  const criticalRooms = useMemo(
    () => Object.values(config.roomPriorities).filter((p) => p === "critical").length,
    [config.roomPriorities],
  );

  const validation = useMemo(
    () => validateOptimization(state.antennas, state.kpis, state.warnings, criticalRooms),
    [state.antennas, state.kpis, state.warnings, criticalRooms],
  );

  const nextAntennaId = useCallback(() => {
    const used = state.antennas
      .map((a) => Number(a.id.replace("ant-", "")))
      .filter((n) => Number.isFinite(n));
    const n = (used.length ? Math.max(...used) : 0) + 1;
    return { id: `ant-${String(n).padStart(2, "0")}`, label: `Antenna ${String(n).padStart(2, "0")}` };
  }, [state.antennas]);

  const roomNameAt = useCallback(
    (x: number, y: number) => {
      if (!ctx) return "Open Area";
      const cands = placeholderRfEngine.generateCandidates(ctx);
      let best = "Open Area";
      let bestD = Infinity;
      for (const c of cands) {
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bestD) {
          bestD = d;
          best = c.roomName;
        }
      }
      return best;
    },
    [ctx],
  );

  return {
    state,
    layers: layers ?? initial?.layers ?? null,
    recalc,
    applyChange,
    setAntennas,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    historyTick,
    restoreVersion,
    duplicateVersion,
    renameVersion,
    validation,
    nextAntennaId,
    roomNameAt,
  };
}
