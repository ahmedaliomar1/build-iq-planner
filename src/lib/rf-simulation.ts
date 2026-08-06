import { useSyncExternalStore } from "react";
import type { BuildingModel, ColumnObj, Project, RoomObj, WallObj } from "./building-model";
import { materialById } from "./building-model";
import { polygonArea, polygonCentroid, wallLength } from "./geometry";
import { buildingStats, totalDevices, type RfConfig } from "./rf-config";
import {
  BANDS,
  buildRfProfileObject,
  materialDistribution,
  type RfProfileConfig,
} from "./rf-profile";

/* ==================================================================
 * Module 4 — RF Simulation & Planning Engine
 * Version 1: complete pipeline + data structures.
 * All computational methods live behind RfSimulationService so a real
 * propagation engine can replace them without touching UI or storage.
 * ================================================================== */

/* -------------------- pipeline definition -------------------- */

export interface SimTask {
  id: string;
  label: string;
}

export interface SimStage {
  id: string;
  title: string;
  tasks: SimTask[];
  /** milliseconds per task in the version-1 placeholder engine */
  pace: number;
  /** stage pauses for user acknowledgement when true */
  gate?: boolean;
}

const t = (id: string, label: string): SimTask => ({ id, label });

export const SIM_STAGES: SimStage[] = [
  {
    id: "building",
    title: "Building Processing",
    pace: 320,
    tasks: [
      t("geometry", "Reading Building Geometry"),
      t("floors", "Reading Floors"),
      t("rooms", "Reading Rooms"),
      t("walls", "Reading Walls"),
      t("materials", "Reading Materials"),
      t("restrictions", "Reading Building Restrictions"),
      t("env", "Generating Digital RF Environment"),
    ],
  },
  {
    id: "environment",
    title: "Creating RF Environment",
    pace: 380,
    tasks: [
      t("loss", "Generating Material Loss Map"),
      t("reflection", "Generating Reflection Map"),
      t("penetration", "Generating Penetration Map"),
      t("obstacle", "Generating Obstacle Map"),
      t("floor", "Generating Floor Model"),
    ],
  },
  {
    id: "candidates",
    title: "Searching Candidate Locations",
    pace: 400,
    gate: true,
    tasks: [
      t("ceiling", "Checking Ceiling Areas"),
      t("wall", "Checking Wall Mount Areas"),
      t("restricted", "Ignoring Restricted Areas"),
      t("critical", "Checking Critical Rooms"),
      t("find", "Finding Candidate Locations"),
      t("db", "Building Candidate Database"),
    ],
  },
  {
    id: "calculations",
    title: "RF Calculations",
    pace: 300,
    tasks: [
      t("link", "Calculating Link Budget"),
      t("path", "Calculating Path Loss"),
      t("material", "Calculating Material Loss"),
      t("cable", "Calculating Cable Loss"),
      t("sensitivity", "Calculating Receiver Sensitivity"),
      t("gain", "Calculating Antenna Gain"),
      t("noise", "Calculating Noise Margin"),
    ],
  },
  {
    id: "coverage",
    title: "Coverage Simulation",
    pace: 420,
    tasks: [
      t("f1", "Running Floor 1"),
      t("f2", "Running Floor 2"),
      t("f3", "Running Floor 3"),
      t("signal", "Calculating Signal Strength"),
      t("grid", "Generating Coverage Grid"),
      t("combine", "Combining Multi-floor Results"),
    ],
  },
  {
    id: "capacity",
    title: "Capacity Simulation",
    pace: 320,
    tasks: [
      t("users", "Calculating User Density"),
      t("iot", "Calculating IoT Load"),
      t("traffic", "Calculating Traffic Load"),
      t("sector", "Calculating Sector Capacity"),
      t("congestion", "Detecting Congestion"),
      t("score", "Calculating Capacity Score"),
    ],
  },
  {
    id: "optimization",
    title: "Optimization Engine",
    pace: 120,
    tasks: [
      t("position", "Optimizing Antenna Position"),
      t("height", "Optimizing Antenna Height"),
      t("power", "Optimizing Transmit Power"),
      t("interference", "Reducing Interference"),
      t("coverage", "Checking Coverage"),
      t("capacity", "Checking Capacity"),
    ],
  },
  {
    id: "layers",
    title: "Generating RF Layers",
    pace: 260,
    tasks: [
      t("coverage", "Coverage Layer"),
      t("capacity", "Capacity Layer"),
      t("sinr", "SINR Layer"),
      t("rsrp", "RSRP Layer"),
      t("rsrq", "RSRQ Layer"),
      t("interference", "Interference Layer"),
      t("antenna", "Antenna Layer"),
      t("critical", "Critical Areas Layer"),
    ],
  },
];

export const OPTIMIZATION_ITERATIONS = 10;

export const totalStageTasks = (s: SimStage) =>
  s.id === "optimization" ? s.tasks.length * OPTIMIZATION_ITERATIONS : s.tasks.length;

export const TOTAL_TASKS = SIM_STAGES.reduce((n, s) => n + totalStageTasks(s), 0);

export function estimatedStageMs(s: SimStage) {
  return totalStageTasks(s) * s.pace;
}

export const ESTIMATED_TOTAL_MS = SIM_STAGES.reduce((n, s) => n + estimatedStageMs(s), 0);

/* -------------------- engineering data structures -------------------- */

export type RfLayerId =
  | "coverage"
  | "capacity"
  | "sinr"
  | "rsrp"
  | "rsrq"
  | "interference"
  | "critical";

export interface RfCell {
  x: number;
  y: number;
  v: number; // normalised 0..1 quality
  raw: number; // layer native unit
}

export interface RfLayer {
  id: RfLayerId;
  label: string;
  unit: string;
  cellSize: number;
  cells: RfCell[];
  min: number;
  max: number;
}

export interface CandidateLocation {
  id: string;
  x: number;
  y: number;
  mount: "ceiling" | "wall";
  roomId: string | null;
  roomName: string;
  score: number;
  selected: boolean;
}

export interface AntennaPlacement {
  id: string;
  label: string;
  x: number;
  y: number;
  category: string;
  height: number;
  txPower: number; // dBm
  gain: number; // dBi
  radius: number; // m
  azimuth: number;
  roomName: string;
  status: "Optimal" | "Acceptable" | "Review";
  servedUsers: number;
}

export interface RfKpis {
  coverage: number;
  capacity: number;
  deadZones: number;
  avgSinr: number;
  avgRsrp: number;
  avgRsrq: number;
  antennas: number;
  simulationSeconds: number;
}

export interface RfWarning {
  id: string;
  severity: "critical" | "high" | "medium";
  title: string;
  location: string;
  description: string;
  x: number;
  y: number;
}

export interface RfRecommendation {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  improvement: string;
  area: string;
  x: number;
  y: number;
}

export interface SimulationResults {
  processedGeometry: { walls: number; rooms: number; columns: number; openings: number };
  environment: { materialLossDb: number; reflectionIndex: number; penetrationIndex: number };
  linkBudget: {
    txPowerDbm: number;
    antennaGainDbi: number;
    cableLossDb: number;
    materialLossDb: number;
    pathLossDb: number;
    receiverSensitivityDbm: number;
    noiseMarginDb: number;
  };
  coverage: { gridCells: number; coveredPct: number; floors: number };
  capacity: { users: number; iot: number; trafficMbps: number; sectorCapacityMbps: number; congestedCells: number };
  optimization: { iterations: number; startScore: number; bestScore: number; history: number[] };
}

export interface InitialRfDesign {
  objectType: "InitialRfDesign";
  designVersion: number;
  configurationVersion: number;
  timestamp: number;
  projectInformation: {
    id: string;
    name: string;
    buildingType: string;
    country: string;
    technology: string;
    band: string | null;
  };
  digitalBuildingReference: string;
  rfProfileReference: string;
  rfDesignRequirementsReference: string;
  candidateAntennaLocations: CandidateLocation[];
  selectedAntennaLayout: AntennaPlacement[];
  layers: Record<RfLayerId, RfLayer>;
  simulationResults: SimulationResults;
  kpis: RfKpis;
  warnings: RfWarning[];
  recommendations: RfRecommendation[];
  simulationMetadata: {
    engine: string;
    engineVersion: string;
    mode: "placeholder";
    stages: string[];
    startedAt: number;
    finishedAt: number;
  };
  simulationDurationSeconds: number;
}

/* -------------------- deterministic helpers -------------------- */

function seededRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function modelBounds(model: BuildingModel) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const o of model.objects) {
    if (o.kind === "wall") {
      add(o.x1, o.y1);
      add(o.x2, o.y2);
    } else if (o.kind === "room") {
      o.points.forEach((p) => add(p.x, p.y));
    } else if ("x" in o && "y" in o) {
      add(o.x, o.y);
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 60, maxY: 38, w: 60, h: 38 };
  return { minX, minY, maxX, maxY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

function pointInPolygon(px: number, py: number, pts: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!;
    const b = pts[j]!;
    if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/* -------------------- simulation service interface -------------------- */

export interface SimulationContext {
  project: Project;
  config: RfConfig;
  profile: RfProfileConfig;
  seed: number;
}

/**
 * Modular RF simulation service. Version 1 ships a placeholder engine.
 * A real propagation engine only has to implement this interface —
 * UI, workflow, storage and layer rendering stay unchanged.
 */
export interface RfSimulationService {
  readonly name: string;
  readonly version: string;
  processBuilding(ctx: SimulationContext): SimulationResults["processedGeometry"];
  generateEnvironment(ctx: SimulationContext): SimulationResults["environment"];
  generateCandidates(ctx: SimulationContext): CandidateLocation[];
  calculateLinkBudget(ctx: SimulationContext): SimulationResults["linkBudget"];
  selectAntennas(ctx: SimulationContext, candidates: CandidateLocation[]): AntennaPlacement[];
  simulateCoverage(
    ctx: SimulationContext,
    antennas: AntennaPlacement[],
  ): { layer: RfLayer; stats: SimulationResults["coverage"] };
  simulateCapacity(
    ctx: SimulationContext,
    antennas: AntennaPlacement[],
  ): { layer: RfLayer; stats: SimulationResults["capacity"] };
  optimize(
    ctx: SimulationContext,
    antennas: AntennaPlacement[],
    iterations: number,
  ): { antennas: AntennaPlacement[]; optimization: SimulationResults["optimization"] };
  generateLayers(ctx: SimulationContext, antennas: AntennaPlacement[]): Record<RfLayerId, RfLayer>;
  deriveKpis(
    ctx: SimulationContext,
    antennas: AntennaPlacement[],
    layers: Record<RfLayerId, RfLayer>,
    durationSeconds: number,
  ): RfKpis;
  deriveWarnings(
    ctx: SimulationContext,
    antennas: AntennaPlacement[],
    layers: Record<RfLayerId, RfLayer>,
  ): RfWarning[];
  deriveRecommendations(
    ctx: SimulationContext,
    antennas: AntennaPlacement[],
    warnings: RfWarning[],
  ): RfRecommendation[];
}

/* -------------------- placeholder engine -------------------- */

const CELL = 1.6;

function rooms(model: BuildingModel) {
  return model.objects.filter((o): o is RoomObj => o.kind === "room");
}

function bandOf(profile: RfProfileConfig) {
  return BANDS.find((b) => b.id === profile.band) ?? BANDS[2]!;
}

function baseRadius(profile: RfProfileConfig) {
  const f = bandOf(profile).freq;
  if (f < 1000) return 46;
  if (f < 2000) return 38;
  if (f < 3000) return 33;
  if (f < 5000) return 28;
  return 14;
}

function buildLayer(
  id: RfLayerId,
  label: string,
  unit: string,
  b: ReturnType<typeof modelBounds>,
  value: (x: number, y: number) => number,
): RfLayer {
  const cells: RfCell[] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let y = b.minY; y < b.maxY; y += CELL) {
    for (let x = b.minX; x < b.maxX; x += CELL) {
      const raw = value(x + CELL / 2, y + CELL / 2);
      min = Math.min(min, raw);
      max = Math.max(max, raw);
      cells.push({ x, y, v: 0, raw });
    }
  }
  const span = max - min || 1;
  for (const c of cells) c.v = (c.raw - min) / span;
  return { id, label, unit, cellSize: CELL, cells, min, max };
}

function nearestAntenna(antennas: AntennaPlacement[], x: number, y: number) {
  let best: AntennaPlacement | null = null;
  let bestD = Infinity;
  for (const a of antennas) {
    const d = Math.hypot(a.x - x, a.y - y);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return { antenna: best, distance: bestD };
}

function rsrpAt(antennas: AntennaPlacement[], x: number, y: number) {
  const { antenna, distance } = nearestAntenna(antennas, x, y);
  if (!antenna) return -125;
  const d = Math.max(1, distance);
  const loss = 38 + 22 * Math.log10(d);
  return Math.max(-125, antenna.txPower + antenna.gain - loss);
}

function interferenceAt(antennas: AntennaPlacement[], x: number, y: number) {
  const sorted = antennas
    .map((a) => ({ a, d: Math.max(1, Math.hypot(a.x - x, a.y - y)) }))
    .sort((p, q) => p.d - q.d);
  const second = sorted[1];
  const first = sorted[0];
  if (!first || !second) return -20;
  return Math.max(-20, 12 - (second.d - first.d));
}

export const placeholderRfEngine: RfSimulationService = {
  name: "APCP Placeholder Simulation Engine",
  version: "1.0.0-placeholder",

  processBuilding({ project }) {
    const m = project.model;
    const s = buildingStats(m);
    return {
      walls: s.walls,
      rooms: s.rooms,
      columns: m.objects.filter((o) => o.kind === "column").length,
      openings: s.doors + s.windows,
    };
  },

  generateEnvironment({ project, profile }) {
    const dist = materialDistribution(project.model, profile.materialOverrides);
    const weighted = dist.reduce(
      (sum, d) => sum + materialById(d.id).wallLoss * (d.pct / 100),
      0,
    );
    return {
      materialLossDb: Number(weighted.toFixed(2)),
      reflectionIndex: Number(Math.min(1, weighted / 22).toFixed(2)),
      penetrationIndex: Number(Math.max(0.05, 1 - weighted / 30).toFixed(2)),
    };
  },

  generateCandidates(ctx) {
    const { project, config, profile } = ctx;
    const rnd = seededRandom(ctx.seed);
    const b = modelBounds(project.model);
    const rs = rooms(project.model);
    const step = Math.max(6, baseRadius(profile) * 0.55);
    const out: CandidateLocation[] = [];
    let i = 0;
    for (let y = b.minY + step / 2; y < b.maxY; y += step) {
      for (let x = b.minX + step / 2; x < b.maxX; x += step) {
        const room = rs.find((r) => pointInPolygon(x, y, r.points)) ?? null;
        const blocked = config.restricted.some(
          (a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h,
        );
        if (blocked) continue;
        const priority = room ? config.roomPriorities[room.id] : undefined;
        const boost =
          priority === "critical" ? 22 : priority === "high" ? 14 : priority === "medium" ? 7 : 0;
        i++;
        out.push({
          id: `cand-${i.toString().padStart(3, "0")}`,
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          mount: room ? "ceiling" : "wall",
          roomId: room?.id ?? null,
          roomName: room?.name ?? "Open Area",
          score: Number((55 + boost + rnd() * 22).toFixed(1)),
          selected: false,
        });
      }
    }
    return out;
  },

  calculateLinkBudget(ctx) {
    const env = placeholderRfEngine.generateEnvironment(ctx);
    const band = bandOf(ctx.profile);
    const pathLoss = Number((32.4 + 20 * Math.log10(band.freq / 1000) + 22 * Math.log10(30)).toFixed(2));
    return {
      txPowerDbm: 20,
      antennaGainDbi: ctx.profile.antennaCategory === "industrial" ? 8 : 5,
      cableLossDb: 1.5,
      materialLossDb: env.materialLossDb,
      pathLossDb: pathLoss,
      receiverSensitivityDbm: -100,
      noiseMarginDb: Number(
        (20 + 5 - 1.5 - env.materialLossDb - pathLoss + 100).toFixed(2),
      ),
    };
  },

  selectAntennas(ctx, candidates) {
    const { profile, config } = ctx;
    const radius = baseRadius(profile);
    const spacing = radius * 0.95;
    const chosen: CandidateLocation[] = [];
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    for (const c of sorted) {
      if (chosen.every((k) => Math.hypot(k.x - c.x, k.y - c.y) >= spacing)) chosen.push(c);
    }
    const capacityBoost =
      config.capacity === "very-high" ? 3 : config.capacity === "high" ? 2 : config.capacity === "medium" ? 1 : 0;
    for (const c of sorted) {
      if (chosen.length >= chosen.length + capacityBoost) break;
      if (!chosen.includes(c) && chosen.length < sorted.length) {
        chosen.push(c);
        if (chosen.length % 4 === 0) break;
      }
    }
    const users = Math.max(1, totalDevices(config.devices));
    const cat = profile.antennaCategory ?? "indoor-ceiling";
    const height = profile.floors[0]?.height ?? 4.5;
    return chosen
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((c, idx) => ({
        id: `ant-${(idx + 1).toString().padStart(2, "0")}`,
        label: `Antenna ${(idx + 1).toString().padStart(2, "0")}`,
        x: c.x,
        y: c.y,
        category: cat,
        height: Number((c.mount === "wall" ? Math.min(3, height) : height - 0.3).toFixed(1)),
        txPower: c.mount === "wall" ? 18 : 20,
        gain: cat === "industrial" ? 8 : c.mount === "wall" ? 6 : 5,
        radius: Number((radius * (c.mount === "wall" ? 0.8 : 1)).toFixed(1)),
        azimuth: c.mount === "wall" ? 90 : 0,
        roomName: c.roomName,
        status: c.score > 72 ? "Optimal" : c.score > 62 ? "Acceptable" : "Review",
        servedUsers: Math.round(users / Math.max(1, chosen.length)),
      }));
  },

  simulateCoverage(ctx, antennas) {
    const b = modelBounds(ctx.project.model);
    const layer = buildLayer("coverage", "Coverage", "dBm", b, (x, y) => rsrpAt(antennas, x, y));
    const covered = layer.cells.filter((c) => c.raw >= -95).length;
    return {
      layer,
      stats: {
        gridCells: layer.cells.length,
        coveredPct: Number(((covered / Math.max(1, layer.cells.length)) * 100).toFixed(1)),
        floors: ctx.profile.floors.length,
      },
    };
  },

  simulateCapacity(ctx, antennas) {
    const b = modelBounds(ctx.project.model);
    const users = totalDevices(ctx.config.devices);
    const layer = buildLayer("capacity", "Capacity", "Mbps", b, (x, y) => {
      const { distance } = nearestAntenna(antennas, x, y);
      return Math.max(2, 320 - distance * 6);
    });
    const congested = layer.cells.filter((c) => c.raw < 40).length;
    return {
      layer,
      stats: {
        users: Math.round(users * 0.7),
        iot: Math.round(users * 0.3),
        trafficMbps: Number((users * 1.8).toFixed(1)),
        sectorCapacityMbps: Number((antennas.length * 320).toFixed(0)),
        congestedCells: congested,
      },
    };
  },

  optimize(ctx, antennas, iterations) {
    const rnd = seededRandom(ctx.seed + 77);
    const history: number[] = [];
    let current = antennas.map((a) => ({ ...a }));
    const startScore = Number((62 + rnd() * 6).toFixed(1));
    let best = startScore;
    for (let i = 0; i < iterations; i++) {
      const gain = (95 - best) * (0.16 + rnd() * 0.1);
      best = Number(Math.min(97.5, best + gain).toFixed(1));
      history.push(best);
      current = current.map((a, idx) => ({
        ...a,
        x: Number((a.x + (rnd() - 0.5) * 0.4).toFixed(2)),
        y: Number((a.y + (rnd() - 0.5) * 0.4).toFixed(2)),
        txPower: idx % 5 === 0 ? Math.max(15, a.txPower - 1) : a.txPower,
      }));
    }
    return {
      antennas: current,
      optimization: { iterations, startScore, bestScore: best, history },
    };
  },

  generateLayers(ctx, antennas) {
    const b = modelBounds(ctx.project.model);
    const rs = rooms(ctx.project.model);
    const cov = placeholderRfEngine.simulateCoverage(ctx, antennas).layer;
    const cap = placeholderRfEngine.simulateCapacity(ctx, antennas).layer;
    return {
      coverage: cov,
      capacity: cap,
      rsrp: buildLayer("rsrp", "RSRP", "dBm", b, (x, y) => rsrpAt(antennas, x, y)),
      sinr: buildLayer("sinr", "SINR", "dB", b, (x, y) => {
        const rsrp = rsrpAt(antennas, x, y);
        return Number((rsrp + 108 - Math.max(0, interferenceAt(antennas, x, y))).toFixed(1));
      }),
      rsrq: buildLayer("rsrq", "RSRQ", "dB", b, (x, y) => {
        const rsrp = rsrpAt(antennas, x, y);
        return Number((-3 + (rsrp + 100) * 0.35).toFixed(1));
      }),
      interference: buildLayer("interference", "Interference", "dB", b, (x, y) =>
        Number((-interferenceAt(antennas, x, y)).toFixed(1)),
      ),
      critical: buildLayer("critical", "Critical Areas", "priority", b, (x, y) => {
        const room = rs.find((r) => pointInPolygon(x, y, r.points));
        const p = room ? ctx.config.roomPriorities[room.id] : undefined;
        return p === "critical" ? 4 : p === "high" ? 3 : p === "medium" ? 2 : p === "low" ? 1 : 0;
      }),
    };
  },

  deriveKpis(ctx, antennas, layers, durationSeconds) {
    const cov = layers.coverage.cells;
    const covered = cov.filter((c) => c.raw >= -95).length;
    const dead = cov.filter((c) => c.raw < -105).length;
    const avg = (arr: RfCell[]) => arr.reduce((s, c) => s + c.raw, 0) / Math.max(1, arr.length);
    const capCells = layers.capacity.cells;
    return {
      coverage: Number(((covered / Math.max(1, cov.length)) * 100).toFixed(1)),
      capacity: Number(
        ((capCells.filter((c) => c.raw >= 40).length / Math.max(1, capCells.length)) * 100).toFixed(1),
      ),
      deadZones: Math.round(dead / 6),
      avgSinr: Number(avg(layers.sinr.cells).toFixed(1)),
      avgRsrp: Number(avg(layers.rsrp.cells).toFixed(1)),
      avgRsrq: Number(avg(layers.rsrq.cells).toFixed(1)),
      antennas: antennas.length,
      simulationSeconds: Number(durationSeconds.toFixed(0)),
    };
  },

  deriveWarnings(ctx, antennas, layers) {
    const out: RfWarning[] = [];
    const weak = [...layers.coverage.cells].sort((a, b) => a.raw - b.raw)[0];
    if (weak && weak.raw < -98) {
      const b = modelBounds(ctx.project.model);
      const vertical = weak.y < (b.minY + b.maxY) / 2 ? "North" : "South";
      const horizontal = weak.x < (b.minX + b.maxX) / 2 ? "West" : "East";
      out.push({
        id: "warn-coverage",
        severity: "high",
        title: "Weak Coverage",
        location: `${vertical} ${horizontal} Corner`,
        description: `Predicted RSRP of ${weak.raw.toFixed(1)} dBm falls below the −95 dBm service threshold.`,
        x: weak.x,
        y: weak.y,
      });
    }
    for (let i = 0; i < antennas.length - 1; i++) {
      const a = antennas[i]!;
      const b = antennas[i + 1]!;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < a.radius * 0.6) {
        out.push({
          id: `warn-interference-${a.id}`,
          severity: "medium",
          title: "High Interference",
          location: `Between ${a.label} and ${b.label}`,
          description: `Cell separation of ${d.toFixed(1)} m produces overlapping dominance and reduced SINR.`,
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        });
        break;
      }
    }
    const rs = rooms(ctx.project.model);
    const dense = rs
      .map((r) => ({ r, area: polygonArea(r.points) }))
      .sort((p, q) => q.area - p.area)[0];
    const users = totalDevices(ctx.config.devices);
    if (dense && users / Math.max(1, antennas.length) > 60) {
      const c = polygonCentroid(dense.r.points);
      out.push({
        id: "warn-density",
        severity: "critical",
        title: "High User Density",
        location: `${dense.r.name} Area`,
        description: `${Math.round(users / Math.max(1, antennas.length))} devices per cell exceeds the recommended sector load.`,
        x: c.x,
        y: c.y,
      });
    }
    return out;
  },

  deriveRecommendations(ctx, antennas, warnings) {
    const out: RfRecommendation[] = [];
    const first = antennas[0];
    const mid = antennas[Math.floor(antennas.length / 2)];
    if (warnings.some((w) => w.id === "warn-coverage") && first) {
      const w = warnings.find((x) => x.id === "warn-coverage")!;
      out.push({
        id: "rec-add",
        priority: "high",
        title: "Add One Antenna",
        improvement: "+2.4% coverage, removes 2 dead zones",
        area: w.location,
        x: w.x,
        y: w.y,
      });
      out.push({
        id: "rec-height",
        priority: "medium",
        title: `Increase ${first.label} Height`,
        improvement: "+1.1 dB average RSRP in adjacent rooms",
        area: first.roomName,
        x: first.x,
        y: first.y,
      });
    }
    if (mid) {
      out.push({
        id: "rec-move",
        priority: "medium",
        title: `Move ${mid.label}`,
        improvement: "+1.8 dB SINR at the cell edge",
        area: mid.roomName,
        x: mid.x,
        y: mid.y,
      });
      out.push({
        id: "rec-power",
        priority: "low",
        title: `Reduce ${mid.label} Transmit Power`,
        improvement: "−2.3 dB co-channel interference",
        area: mid.roomName,
        x: mid.x,
        y: mid.y,
      });
    }
    if (ctx.profile.antennaCategory !== "industrial" && ctx.project.buildingType === "Factory" && first) {
      out.push({
        id: "rec-category",
        priority: "high",
        title: "Change Antenna Category to Industrial",
        improvement: "Better resilience to metal clutter, +3 dBi gain",
        area: "Production zones",
        x: first.x,
        y: first.y,
      });
    }
    return out;
  },
};

/* -------------------- pipeline runner (pure) -------------------- */

export function runSimulation(
  ctx: SimulationContext,
  durationSeconds: number,
  engine: RfSimulationService = placeholderRfEngine,
): InitialRfDesign {
  const started = Date.now();
  const processedGeometry = engine.processBuilding(ctx);
  const environment = engine.generateEnvironment(ctx);
  const candidates = engine.generateCandidates(ctx);
  const linkBudget = engine.calculateLinkBudget(ctx);
  const initial = engine.selectAntennas(ctx, candidates);
  const coverage = engine.simulateCoverage(ctx, initial);
  const capacity = engine.simulateCapacity(ctx, initial);
  const { antennas, optimization } = engine.optimize(ctx, initial, OPTIMIZATION_ITERATIONS);
  const layers = engine.generateLayers(ctx, antennas);
  const kpis = engine.deriveKpis(ctx, antennas, layers, durationSeconds);
  const warnings = engine.deriveWarnings(ctx, antennas, layers);
  const recommendations = engine.deriveRecommendations(ctx, antennas, warnings);
  const chosen = new Set(antennas.map((a) => `${a.roomName}`));
  const band = BANDS.find((b) => b.id === ctx.profile.band) ?? null;

  return {
    objectType: "InitialRfDesign",
    designVersion: 1,
    configurationVersion: ctx.profile.version,
    timestamp: Date.now(),
    projectInformation: {
      id: ctx.project.id,
      name: ctx.project.name,
      buildingType: ctx.project.buildingType,
      country: ctx.project.country,
      technology: ctx.config.technology === "lte" ? "Private LTE" : "Private 5G",
      band: band?.label ?? null,
    },
    digitalBuildingReference: ctx.project.id,
    rfProfileReference: `${ctx.project.id}:rf-profile:v${ctx.profile.version}`,
    rfDesignRequirementsReference: `${ctx.project.id}:rf-requirements:v${ctx.config.version}`,
    candidateAntennaLocations: candidates.map((c) => ({
      ...c,
      selected: chosen.has(c.roomName),
    })),
    selectedAntennaLayout: antennas,
    layers,
    simulationResults: {
      processedGeometry,
      environment,
      linkBudget,
      coverage: coverage.stats,
      capacity: capacity.stats,
      optimization,
    },
    kpis,
    warnings,
    recommendations,
    simulationMetadata: {
      engine: engine.name,
      engineVersion: engine.version,
      mode: "placeholder",
      stages: SIM_STAGES.map((s) => s.title),
      startedAt: started,
      finishedAt: Date.now(),
    },
    simulationDurationSeconds: Number(durationSeconds.toFixed(1)),
  };
}

export function simulationSeed(project: Project) {
  return hashString(`${project.id}:${project.model.objects.length}`);
}

/* -------------------- persisted simulation state -------------------- */

export interface SimLogEntry {
  at: number;
  level: "info" | "ok" | "warn";
  text: string;
}

export interface DesignVersion {
  at: number;
  label: string;
  antennas: number;
  coverage: number;
}

export interface SimState {
  status: "idle" | "running" | "paused" | "cancelled" | "complete";
  stage: number;
  task: number;
  iteration: number;
  elapsedMs: number;
  log: SimLogEntry[];
  design: InitialRfDesign | null;
  savedAt: number | null;
  versions: DesignVersion[];
  activeLayer: RfLayerId | null;
  updatedAt: number;
}

export const emptySimState = (): SimState => ({
  status: "idle",
  stage: 0,
  task: 0,
  iteration: 1,
  elapsedMs: 0,
  log: [],
  design: null,
  savedAt: null,
  versions: [],
  activeLayer: "coverage",
  updatedAt: Date.now(),
});

const KEY = "apcp.rfsim.v1";
let cache: Record<string, SimState> | null = null;
const listeners = new Set<() => void>();

function readAll(): Record<string, SimState> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, SimState>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function writeAll(next: Record<string, SimState>) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* payload too large for storage — keep in-memory state */
    }
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const EMPTY: Record<string, SimState> = {};

export function useSimState(projectId: string): SimState {
  const all = useSyncExternalStore(
    subscribe,
    () => readAll(),
    () => EMPTY,
  );
  return all[projectId] ?? emptySimState();
}

export function saveSimState(projectId: string, patch: Partial<SimState>) {
  const all = readAll();
  const current = all[projectId] ?? emptySimState();
  writeAll({ ...all, [projectId]: { ...current, ...patch, updatedAt: Date.now() } });
}

export function resetSimState(projectId: string) {
  const all = readAll();
  writeAll({ ...all, [projectId]: emptySimState() });
}

/* -------------------- export helpers -------------------- */

export function designToCsv(design: InitialRfDesign) {
  const head = "id,label,room,category,x,y,height_m,tx_power_dbm,gain_dbi,radius_m,status,served_users";
  const rows = design.selectedAntennaLayout.map((a) =>
    [a.id, a.label, a.roomName, a.category, a.x, a.y, a.height, a.txPower, a.gain, a.radius, a.status, a.servedUsers].join(","),
  );
  const kpi = [
    "",
    "kpi,value",
    `coverage_pct,${design.kpis.coverage}`,
    `capacity_pct,${design.kpis.capacity}`,
    `dead_zones,${design.kpis.deadZones}`,
    `avg_sinr_db,${design.kpis.avgSinr}`,
    `avg_rsrp_dbm,${design.kpis.avgRsrp}`,
    `antennas,${design.kpis.antennas}`,
    `simulation_seconds,${design.kpis.simulationSeconds}`,
  ];
  return [head, ...rows, ...kpi].join("\n");
}

export function designToReport(design: InitialRfDesign) {
  const k = design.kpis;
  return [
    "INITIAL RF DESIGN — ENGINEERING REPORT (placeholder)",
    "====================================================",
    `Project            : ${design.projectInformation.name}`,
    `Building Type      : ${design.projectInformation.buildingType}`,
    `Country            : ${design.projectInformation.country}`,
    `Technology / Band  : ${design.projectInformation.technology} / ${design.projectInformation.band ?? "—"}`,
    `Generated          : ${new Date(design.timestamp).toLocaleString()}`,
    `Engine             : ${design.simulationMetadata.engine} v${design.simulationMetadata.engineVersion}`,
    "",
    "KEY PERFORMANCE INDICATORS",
    "--------------------------",
    `Coverage           : ${k.coverage}%`,
    `Capacity           : ${k.capacity}%`,
    `Dead Zones         : ${k.deadZones}`,
    `Average SINR       : ${k.avgSinr} dB`,
    `Average RSRP       : ${k.avgRsrp} dBm`,
    `Average RSRQ       : ${k.avgRsrq} dB`,
    `Estimated Antennas : ${k.antennas}`,
    `Simulation Time    : ${k.simulationSeconds} s`,
    "",
    "ANTENNA LAYOUT",
    "--------------",
    ...design.selectedAntennaLayout.map(
      (a) =>
        `${a.label.padEnd(12)} ${a.roomName.padEnd(18)} h=${a.height}m  Tx=${a.txPower}dBm  G=${a.gain}dBi  r=${a.radius}m  ${a.status}`,
    ),
    "",
    "WARNINGS",
    "--------",
    ...(design.warnings.length
      ? design.warnings.map((w) => `[${w.severity.toUpperCase()}] ${w.title} — ${w.location}: ${w.description}`)
      : ["None detected."]),
    "",
    "RECOMMENDATIONS",
    "---------------",
    ...design.recommendations.map(
      (r) => `[${r.priority.toUpperCase()}] ${r.title} — ${r.area} (${r.improvement})`,
    ),
    "",
    "Version 1 uses placeholder computational methods behind the RfSimulationService interface.",
  ].join("\n");
}

export function downloadFile(name: string, content: string, type: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------- misc helpers for UI -------------------- */

export function buildingObstacleCount(model: BuildingModel) {
  const walls = model.objects.filter((o): o is WallObj => o.kind === "wall");
  const columns = model.objects.filter((o): o is ColumnObj => o.kind === "column");
  return {
    walls: walls.length,
    columns: columns.length,
    wallLengthM: Number(walls.reduce((s, w) => s + wallLength(w), 0).toFixed(1)),
  };
}

export function profileSummary(project: Project, cfg: RfConfig, prof: RfProfileConfig) {
  return buildRfProfileObject(project, cfg, prof);
}
