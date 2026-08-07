import { useSyncExternalStore } from "react";
import { ANTENNA_CATEGORIES } from "./rf-profile";
import {
  placeholderRfEngine,
  type AntennaPlacement,
  type InitialRfDesign,
  type RfKpis,
  type RfLayer,
  type RfLayerId,
  type RfRecommendation,
  type RfWarning,
  type SimulationContext,
} from "./rf-simulation";

/* ==================================================================
 * Module 5 — Interactive RF Optimization
 * Version 1: complete interactive workspace + engineering data model.
 * All recalculation runs through LocalRecalculationService so a real
 * optimization engine can replace it without touching the UI.
 * ================================================================== */

export const RF_LAYER_IDS: RfLayerId[] = [
  "coverage",
  "capacity",
  "sinr",
  "rsrp",
  "rsrq",
  "interference",
  "critical",
];

export const RF_LAYER_LABELS: Record<RfLayerId, string> = {
  coverage: "Coverage",
  capacity: "Capacity",
  sinr: "SINR",
  rsrp: "RSRP",
  rsrq: "RSRQ",
  interference: "Interference",
  critical: "Critical Areas",
};

export type BaseLayerId = "walls" | "rooms" | "materials" | "antennas";

export const BASE_LAYERS: { id: BaseLayerId; label: string }[] = [
  { id: "walls", label: "Walls" },
  { id: "rooms", label: "Rooms" },
  { id: "materials", label: "Materials" },
  { id: "antennas", label: "Antennas" },
];

export interface LayerSettings {
  visible: boolean;
  opacity: number;
  locked: boolean;
}

export const defaultLayerSettings = (): Record<string, LayerSettings> => {
  const out: Record<string, LayerSettings> = {};
  for (const b of BASE_LAYERS) out[b.id] = { visible: true, opacity: 1, locked: false };
  for (const id of RF_LAYER_IDS) out[id] = { visible: true, opacity: 0.5, locked: false };
  return out;
};

/* -------------------- editable antenna -------------------- */

export interface OptAntenna extends AntennaPlacement {
  tilt: number;
  locked: boolean;
}

export const toOptAntenna = (a: AntennaPlacement): OptAntenna => ({
  ...a,
  tilt: 0,
  locked: false,
});

export const CATEGORY_OPTIONS = ANTENNA_CATEGORIES.filter((c) =>
  ["indoor-ceiling", "indoor-wall", "industrial", "small-cell"].includes(c.id),
);

export const categoryLabel = (id: string) =>
  ANTENNA_CATEGORIES.find((c) => c.id === id)?.label ?? id;

export function categoryDefaults(id: string) {
  switch (id) {
    case "indoor-wall":
      return { gain: 6, height: 3, txPower: 18, radiusFactor: 0.8 };
    case "industrial":
      return { gain: 8, height: 6, txPower: 24, radiusFactor: 1.15 };
    case "small-cell":
      return { gain: 3, height: 3.5, txPower: 14, radiusFactor: 0.6 };
    default:
      return { gain: 5, height: 4.5, txPower: 20, radiusFactor: 1 };
  }
}

export const TX_POWER_MIN = 10;
export const TX_POWER_MAX = 30;
export const HEIGHT_MIN = 3;
export const HEIGHT_MAX = 6;

/* -------------------- change descriptor -------------------- */

export type OptChangeKind =
  | "move"
  | "add"
  | "delete"
  | "replace"
  | "power"
  | "height"
  | "lock"
  | "recommendation";

export interface OptChange {
  kind: OptChangeKind;
  label: string;
  antennaIds: string[];
}

/**
 * Modular local recalculation service. Version 1 reuses the placeholder
 * propagation engine but recomputes ONLY the layers a change can affect —
 * the complete RF Simulation Engine is never re-run.
 */
export interface LocalRecalculationService {
  readonly name: string;
  readonly version: string;
  affectedLayers(change: OptChange): RfLayerId[];
  recalculate(
    ctx: SimulationContext,
    antennas: OptAntenna[],
    previous: Record<RfLayerId, RfLayer>,
    affected: RfLayerId[],
  ): {
    layers: Record<RfLayerId, RfLayer>;
    kpis: RfKpis;
    warnings: RfWarning[];
    suggestions: AiSuggestion[];
  };
}

const AFFECTED: Record<OptChangeKind, RfLayerId[]> = {
  move: ["coverage", "capacity", "sinr", "rsrp", "interference"],
  add: ["coverage", "capacity", "sinr", "rsrp", "rsrq", "interference"],
  delete: ["coverage", "capacity", "sinr", "rsrp", "rsrq", "interference"],
  replace: ["coverage", "capacity", "sinr", "rsrp", "interference"],
  power: ["coverage", "sinr", "rsrp", "rsrq", "interference"],
  height: ["coverage", "sinr", "rsrp"],
  lock: [],
  recommendation: ["coverage", "capacity", "sinr", "rsrp", "rsrq", "interference"],
};

export const placeholderRecalculationService: LocalRecalculationService = {
  name: "APCP Local Recalculation Service",
  version: "1.0.0-placeholder",

  affectedLayers(change) {
    return AFFECTED[change.kind] ?? [];
  },

  recalculate(ctx, antennas, previous, affected) {
    const fresh = placeholderRfEngine.generateLayers(ctx, antennas);
    const layers = { ...previous } as Record<RfLayerId, RfLayer>;
    for (const id of affected) layers[id] = fresh[id];
    const seconds = ctx.project ? 0 : 0;
    const kpis = placeholderRfEngine.deriveKpis(ctx, antennas, layers, seconds);
    const warnings = placeholderRfEngine.deriveWarnings(ctx, antennas, layers);
    return {
      layers,
      kpis,
      warnings,
      suggestions: buildSuggestions(antennas, kpis, warnings),
    };
  },
};

/* -------------------- AI suggestions -------------------- */

export interface AiSuggestion {
  id: string;
  action: "height" | "move" | "replace" | "add" | "power";
  title: string;
  priority: "high" | "medium" | "low";
  area: string;
  improvement: string;
  antennaId: string | null;
  x: number;
  y: number;
  payload?: { category?: string; dx?: number; dy?: number; dh?: number; dp?: number };
}

export function buildSuggestions(
  antennas: OptAntenna[],
  kpis: RfKpis,
  warnings: RfWarning[],
): AiSuggestion[] {
  const out: AiSuggestion[] = [];
  const low = [...antennas].sort((a, b) => a.height - b.height)[0];
  const weak = warnings.find((w) => w.title === "Weak Coverage");
  const interference = warnings.find((w) => w.title.includes("Interference"));
  const busiest = [...antennas].sort((a, b) => b.servedUsers - a.servedUsers)[0];

  if (low && low.height < HEIGHT_MAX - 0.4) {
    out.push({
      id: "sug-height",
      action: "height",
      title: `Increase ${low.label} Height`,
      priority: "medium",
      area: low.roomName,
      improvement: "Improve SINR by ~1.4 dB in adjacent rooms",
      antennaId: low.id,
      x: low.x,
      y: low.y,
      payload: { dh: 0.5 },
    });
  }
  if (interference) {
    const target = antennas.find((a) => a.id === interference.id.replace("warn-int-", "")) ?? antennas[1] ?? antennas[0];
    if (target) {
      out.push({
        id: "sug-move",
        action: "move",
        title: `Move ${target.label}`,
        priority: "high",
        area: target.roomName,
        improvement: "Reduce co-channel interference by ~2.1 dB",
        antennaId: target.id,
        x: target.x,
        y: target.y,
        payload: { dx: 2.5, dy: 1.5 },
      });
    }
  }
  if (busiest && busiest.category !== "industrial") {
    out.push({
      id: "sug-replace",
      action: "replace",
      title: `Replace ${busiest.label} with Industrial`,
      priority: "medium",
      area: busiest.roomName,
      improvement: "Increase sector capacity by ~12%",
      antennaId: busiest.id,
      x: busiest.x,
      y: busiest.y,
      payload: { category: "industrial" },
    });
  }
  if (weak && kpis.coverage < 99) {
    out.push({
      id: "sug-add",
      action: "add",
      title: "Add One Antenna",
      priority: "high",
      area: weak.location,
      improvement: `Improve coverage to ~${Math.min(99.6, kpis.coverage + 1.8).toFixed(1)}%`,
      antennaId: null,
      x: weak.x,
      y: weak.y,
    });
  }
  const hot = [...antennas].sort((a, b) => b.txPower - a.txPower)[0];
  if (hot && hot.txPower > TX_POWER_MIN + 6) {
    out.push({
      id: "sug-power",
      action: "power",
      title: `Reduce ${hot.label} Transmit Power`,
      priority: "low",
      area: hot.roomName,
      improvement: "Lower overlap interference by ~1.6 dB",
      antennaId: hot.id,
      x: hot.x,
      y: hot.y,
      payload: { dp: -2 },
    });
  }
  return out;
}

/* -------------------- cost model -------------------- */

const UNIT_COST: Record<string, number> = {
  "indoor-ceiling": 1,
  "indoor-wall": 1.1,
  industrial: 1.9,
  "small-cell": 1.5,
};

export function costIndex(antennas: OptAntenna[]) {
  return antennas.reduce((s, a) => s + (UNIT_COST[a.category] ?? 1), 0);
}

export function costLabel(antennas: OptAntenna[]): "Low" | "Medium" | "High" {
  const c = costIndex(antennas);
  if (c <= 8) return "Low";
  if (c <= 16) return "Medium";
  return "High";
}

/* -------------------- validation -------------------- */

export interface ValidationItem {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  x?: number;
  y?: number;
}

export interface ValidationReport {
  items: ValidationItem[];
  passed: boolean;
  criticalWarnings: number;
  at: number;
}

export function validateOptimization(
  antennas: OptAntenna[],
  kpis: RfKpis,
  warnings: RfWarning[],
  criticalRooms: number,
): ValidationReport {
  const critical = warnings.filter((w) => w.severity === "critical");
  const weak = warnings.find((w) => w.title === "Weak Coverage");
  const items: ValidationItem[] = [
    {
      id: "coverage",
      label: "Coverage",
      pass: kpis.coverage >= 95,
      detail: `${kpis.coverage}% of the grid at or above −95 dBm (target ≥ 95%).`,
      x: weak?.x,
      y: weak?.y,
    },
    {
      id: "capacity",
      label: "Capacity",
      pass: kpis.capacity >= 90,
      detail: `${kpis.capacity}% of cells meet the sector throughput target (≥ 90%).`,
    },
    {
      id: "critical",
      label: "Critical Areas",
      pass: criticalRooms === 0 || antennas.length >= criticalRooms,
      detail:
        criticalRooms === 0
          ? "No critical priority rooms declared in the RF requirements."
          : `${antennas.length} antennas serving ${criticalRooms} critical rooms.`,
    },
    {
      id: "interference",
      label: "Interference",
      pass: !warnings.some((w) => w.title.includes("Interference") && w.severity !== "medium"),
      detail: "No high-severity co-channel interference detected between neighbouring cells.",
    },
    {
      id: "warnings",
      label: "Warnings",
      pass: critical.length === 0,
      detail: `${critical.length} critical warning${critical.length === 1 ? "" : "s"} open.`,
      x: critical[0]?.x,
      y: critical[0]?.y,
    },
  ];
  return {
    items,
    passed: items.every((i) => i.pass),
    criticalWarnings: critical.length,
    at: Date.now(),
  };
}

/* -------------------- versions -------------------- */

export interface OptVersion {
  id: string;
  name: string;
  at: number;
  note: string;
  antennas: OptAntenna[];
  kpis: RfKpis;
  cost: "Low" | "Medium" | "High";
}

/* -------------------- optimized design object -------------------- */

export interface OptimizedRfDesign {
  objectType: "OptimizedRfDesign";
  timestamp: number;
  versionNumber: number;
  projectInformation: InitialRfDesign["projectInformation"];
  digitalBuildingReference: string;
  rfProfileReference: string;
  rfDesignRequirementsReference: string;
  initialRfDesignReference: string;
  optimizedAntennaLayout: OptAntenna[];
  layers: Record<RfLayerId, RfLayer>;
  aiSuggestions: AiSuggestion[];
  engineeringRecommendations: RfRecommendation[];
  designHistory: { id: string; name: string; at: number; note: string; kpis: RfKpis }[];
  versionInformation: { current: string; total: number };
  optimizationResults: {
    modifications: number;
    coverageDelta: number;
    capacityDelta: number;
    antennaDelta: number;
    estimatedCost: string;
  };
  validationReport: ValidationReport;
  kpis: RfKpis;
  warnings: RfWarning[];
  simulationMetadata: {
    engine: string;
    engineVersion: string;
    mode: "placeholder";
    recalculationService: string;
    basedOn: string;
  };
}

export function buildOptimizedDesign(
  initial: InitialRfDesign,
  state: OptState,
  validation: ValidationReport,
): OptimizedRfDesign {
  const current = state.versions.find((v) => v.id === state.currentVersionId);
  return {
    objectType: "OptimizedRfDesign",
    timestamp: Date.now(),
    versionNumber: state.versions.length,
    projectInformation: initial.projectInformation,
    digitalBuildingReference: initial.digitalBuildingReference,
    rfProfileReference: initial.rfProfileReference,
    rfDesignRequirementsReference: initial.rfDesignRequirementsReference,
    initialRfDesignReference: `${initial.projectInformation.id}:initial-rf-design:v${initial.designVersion}`,
    optimizedAntennaLayout: state.antennas,
    layers: state.layers ?? initial.layers,
    aiSuggestions: state.suggestions,
    engineeringRecommendations: initial.recommendations,
    designHistory: state.versions.map((v) => ({
      id: v.id,
      name: v.name,
      at: v.at,
      note: v.note,
      kpis: v.kpis,
    })),
    versionInformation: {
      current: current?.name ?? "Version 1",
      total: state.versions.length,
    },
    optimizationResults: {
      modifications: state.modifications,
      coverageDelta: Number((state.kpis.coverage - initial.kpis.coverage).toFixed(1)),
      capacityDelta: Number((state.kpis.capacity - initial.kpis.capacity).toFixed(1)),
      antennaDelta: state.antennas.length - initial.selectedAntennaLayout.length,
      estimatedCost: costLabel(state.antennas),
    },
    validationReport: validation,
    kpis: state.kpis,
    warnings: state.warnings,
    simulationMetadata: {
      engine: initial.simulationMetadata.engine,
      engineVersion: initial.simulationMetadata.engineVersion,
      mode: "placeholder",
      recalculationService: `${placeholderRecalculationService.name} v${placeholderRecalculationService.version}`,
      basedOn: new Date(initial.timestamp).toISOString(),
    },
  };
}

/* -------------------- persisted state -------------------- */

export interface OptState {
  initialized: boolean;
  antennas: OptAntenna[];
  layers: Record<RfLayerId, RfLayer> | null;
  kpis: RfKpis;
  warnings: RfWarning[];
  suggestions: AiSuggestion[];
  versions: OptVersion[];
  currentVersionId: string;
  modifications: number;
  activeLayer: RfLayerId | null;
  layerSettings: Record<string, LayerSettings>;
  grid: boolean;
  snap: boolean;
  savedAt: number | null;
  completed: boolean;
  updatedAt: number;
}

const EMPTY_KPIS: RfKpis = {
  coverage: 0,
  capacity: 0,
  deadZones: 0,
  avgSinr: 0,
  avgRsrp: 0,
  avgRsrq: 0,
  antennas: 0,
  simulationSeconds: 0,
};

export const emptyOptState = (): OptState => ({
  initialized: false,
  antennas: [],
  layers: null,
  kpis: EMPTY_KPIS,
  warnings: [],
  suggestions: [],
  versions: [],
  currentVersionId: "",
  modifications: 0,
  activeLayer: "coverage",
  layerSettings: defaultLayerSettings(),
  grid: true,
  snap: true,
  savedAt: null,
  completed: false,
  updatedAt: Date.now(),
});

const KEY = "apcp.rfopt.v1";

/** layers are large — persist everything except the raw layer grids */
type Persisted = Omit<OptState, "layers">;

let cache: Record<string, OptState> | null = null;
const listeners = new Set<() => void>();

function readAll(): Record<string, OptState> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Persisted>) : {};
    cache = Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, { ...emptyOptState(), ...v, layers: null }]),
    );
  } catch {
    cache = {};
  }
  return cache;
}

function writeAll(next: Record<string, OptState>) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      const slim = Object.fromEntries(
        Object.entries(next).map(([k, v]) => {
          const { layers: _layers, ...rest } = v;
          return [k, rest];
        }),
      );
      window.localStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      /* storage full — in-memory state remains authoritative */
    }
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const EMPTY_MAP: Record<string, OptState> = {};

export function useOptState(projectId: string): OptState {
  const all = useSyncExternalStore(
    subscribe,
    () => readAll(),
    () => EMPTY_MAP,
  );
  return all[projectId] ?? emptyOptState();
}

export function saveOptState(projectId: string, patch: Partial<OptState>) {
  const all = readAll();
  const current = all[projectId] ?? emptyOptState();
  writeAll({ ...all, [projectId]: { ...current, ...patch, updatedAt: Date.now() } });
}

export function resetOptState(projectId: string) {
  const all = readAll();
  writeAll({ ...all, [projectId]: emptyOptState() });
}

/* -------------------- export helpers -------------------- */

export function optimizedToCsv(design: OptimizedRfDesign) {
  const head =
    "id,label,room,category,x,y,height_m,tx_power_dbm,gain_dbi,azimuth_deg,tilt_deg,radius_m,locked,status";
  const rows = design.optimizedAntennaLayout.map((a) =>
    [
      a.id,
      a.label,
      a.roomName,
      a.category,
      a.x,
      a.y,
      a.height,
      a.txPower,
      a.gain,
      a.azimuth,
      a.tilt,
      a.radius,
      a.locked,
      a.status,
    ].join(","),
  );
  return [head, ...rows].join("\n");
}

export function optimizedToReport(design: OptimizedRfDesign) {
  const k = design.kpis;
  const r = design.optimizationResults;
  return [
    "OPTIMIZED RF DESIGN — ENGINEERING SNAPSHOT (placeholder)",
    "========================================================",
    `Project            : ${design.projectInformation.name}`,
    `Technology / Band  : ${design.projectInformation.technology} / ${design.projectInformation.band ?? "—"}`,
    `Version            : ${design.versionInformation.current} of ${design.versionInformation.total}`,
    `Generated          : ${new Date(design.timestamp).toLocaleString()}`,
    "",
    "OPTIMIZED KPIS",
    "--------------",
    `Coverage           : ${k.coverage}%  (${r.coverageDelta >= 0 ? "+" : ""}${r.coverageDelta})`,
    `Capacity           : ${k.capacity}%  (${r.capacityDelta >= 0 ? "+" : ""}${r.capacityDelta})`,
    `Average SINR       : ${k.avgSinr} dB`,
    `Average RSRP       : ${k.avgRsrp} dBm`,
    `Average RSRQ       : ${k.avgRsrq} dB`,
    `Total Antennas     : ${k.antennas} (${r.antennaDelta >= 0 ? "+" : ""}${r.antennaDelta})`,
    `Estimated Cost     : ${r.estimatedCost}`,
    `Modifications      : ${r.modifications}`,
    "",
    "ANTENNA LAYOUT",
    "--------------",
    ...design.optimizedAntennaLayout.map(
      (a) =>
        `${a.label.padEnd(12)} ${categoryLabel(a.category).padEnd(16)} h=${a.height}m  Tx=${a.txPower}dBm  G=${a.gain}dBi${a.locked ? "  [locked]" : ""}`,
    ),
    "",
    "VALIDATION",
    "----------",
    ...design.validationReport.items.map((i) => `${i.pass ? "PASS" : "FAIL"}  ${i.label} — ${i.detail}`),
    "",
    "DESIGN HISTORY",
    "--------------",
    ...design.designHistory.map(
      (v) => `${v.name.padEnd(12)} ${new Date(v.at).toLocaleString()}  ${v.note}`,
    ),
    "",
    "Version 1 uses the placeholder Local Recalculation Service.",
  ].join("\n");
}
