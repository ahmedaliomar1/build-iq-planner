import { useSyncExternalStore } from "react";
import type { BuildingModel, MaterialId, Project } from "./building-model";
import { polygonArea } from "./geometry";

export type NetworkTech = "lte" | "5g";
export type Priority = "critical" | "high" | "medium" | "low";

export interface RestrictedArea {
  id: string;
  name: string;
  type: string;
  reason: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DeviceCounts {
  employees: number;
  visitors: number;
  iot: number;
  robots: number;
  cameras: number;
  agvs: number;
  handhelds: number;
}

export interface RfConfig {
  version: number;
  updatedAt: number;
  step: number;
  completed: number[];
  technology: NetworkTech | null;
  technologyMode: "manual" | "auto";
  aiAnswers: Record<string, string>;
  aiRecommendation: { tech: NetworkTech; confidence: number; reasons: string[] } | null;
  purpose: string | null;
  services: string[];
  devices: DeviceCounts;
  coverageBias: number; // 0 = lowest cost, 100 = max coverage
  capacity: "low" | "medium" | "high" | "very-high" | null;
  roomPriorities: Record<string, Priority>;
  restricted: RestrictedArea[];
  ceiling: {
    height: number;
    falseCeiling: boolean;
    material: "concrete" | "gypsum" | "metal" | "other";
  };
  wallMaterials: Record<string, MaterialId>;
  vendor: string | null;
  goals: string[];
  generatedAt: number | null;
}

export const DESIGN_GOALS = [
  "Coverage",
  "Capacity",
  "Cost",
  "Future Expansion",
  "Power Consumption",
];

export const SERVICES: { id: string; label: string; note: string; load: number }[] = [
  { id: "data", label: "Data", note: "General broadband connectivity", load: 1 },
  { id: "voice", label: "Voice", note: "Push-to-talk and VoNR/VoLTE", load: 1 },
  { id: "cctv", label: "CCTV", note: "Continuous uplink video streams", load: 3 },
  { id: "iot", label: "IoT Sensors", note: "Massive low-throughput telemetry", load: 1 },
  { id: "agv", label: "AGVs", note: "Mobility + seamless handover", load: 3 },
  { id: "robots", label: "Industrial Robots", note: "Low latency control loops", load: 4 },
  { id: "aicam", label: "AI Cameras", note: "High uplink + edge inference", load: 4 },
  { id: "arvr", label: "AR / VR", note: "High downlink, very low latency", load: 4 },
  {
    id: "control",
    label: "Industrial Control",
    note: "URLLC, deterministic latency",
    load: 5,
  },
];

export const PURPOSES: { id: string; label: string; note: string }[] = [
  { id: "smart-factory", label: "Smart Factory", note: "Automation, AGVs, robotics, deterministic control." },
  { id: "smart-hospital", label: "Smart Hospital", note: "Clinical mobility, imaging transfer, staff safety." },
  { id: "smart-warehouse", label: "Smart Warehouse", note: "Scanners, AGVs, dense racking coverage." },
  { id: "office", label: "Office", note: "Employee data and voice with high density." },
  { id: "airport", label: "Airport", note: "Wide areas, mission-critical ops, roaming." },
  { id: "port", label: "Port", note: "Cranes, remote control, outdoor-indoor mix." },
  { id: "mining", label: "Mining", note: "Harsh environments, remote machinery." },
  { id: "oil-gas", label: "Oil & Gas", note: "Hazardous zones, ATEX constraints." },
  { id: "university", label: "University", note: "Campus density, student mobility." },
  { id: "other", label: "Other", note: "Custom deployment goals." },
];

export const VENDORS = [
  "Ericsson",
  "Nokia",
  "Huawei",
  "Cisco",
  "Samsung",
  "Mavenir",
  "Auto Selection",
];

export const RESTRICTION_TYPES = [
  "No Antennas",
  "Glass Ceiling",
  "Hazard Zone",
  "Drilling Prohibited",
  "Radiation Sensitive Area",
  "Maintenance Access",
];

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#ef4444" },
  high: { label: "High", color: "#f59e0b" },
  medium: { label: "Medium", color: "#3b82f6" },
  low: { label: "Low", color: "#94a3b8" },
};

export const CAPACITY_CARDS = [
  {
    id: "low" as const,
    label: "Low",
    traffic: "< 100 Mbps aggregate",
    apps: "Voice, telemetry, basic data",
    profile: "Sparse macro-style indoor cells",
  },
  {
    id: "medium" as const,
    label: "Medium",
    traffic: "100 – 500 Mbps aggregate",
    apps: "Data, CCTV, handhelds",
    profile: "Balanced small-cell grid",
  },
  {
    id: "high" as const,
    label: "High",
    traffic: "500 Mbps – 2 Gbps aggregate",
    apps: "AI cameras, AGVs, dense IoT",
    profile: "Dense small cells, carrier aggregation",
  },
  {
    id: "very-high" as const,
    label: "Very High",
    traffic: "> 2 Gbps aggregate",
    apps: "AR/VR, robotics, URLLC control",
    profile: "Ultra-dense cells + MEC edge nodes",
  },
];

export const AI_QUESTIONS: {
  id: string;
  q: string;
  options: { value: string; label: string; score: number }[];
}[] = [
  {
    id: "environment",
    q: "Deployment environment",
    options: [
      { value: "office", label: "Office / Campus", score: 0 },
      { value: "industrial", label: "Industrial / Factory", score: 2 },
      { value: "harsh", label: "Harsh / Hazardous", score: 1 },
    ],
  },
  {
    id: "latency",
    q: "Latency requirements",
    options: [
      { value: "relaxed", label: "Relaxed (> 50 ms)", score: 0 },
      { value: "moderate", label: "Moderate (20 – 50 ms)", score: 1 },
      { value: "ultra", label: "Ultra low (< 10 ms)", score: 3 },
    ],
  },
  {
    id: "mobility",
    q: "Expected mobility",
    options: [
      { value: "static", label: "Mostly static", score: 0 },
      { value: "pedestrian", label: "Pedestrian", score: 1 },
      { value: "vehicular", label: "Vehicles / AGVs", score: 2 },
    ],
  },
  {
    id: "bandwidth",
    q: "Bandwidth demand",
    options: [
      { value: "low", label: "Low", score: 0 },
      { value: "medium", label: "Medium", score: 1 },
      { value: "high", label: "Very high", score: 3 },
    ],
  },
  {
    id: "critical",
    q: "Mission-critical services",
    options: [
      { value: "no", label: "Not required", score: 0 },
      { value: "some", label: "Some services", score: 1 },
      { value: "yes", label: "Core requirement", score: 2 },
    ],
  },
  {
    id: "automation",
    q: "Industrial automation requirements",
    options: [
      { value: "none", label: "None", score: 0 },
      { value: "partial", label: "Partial automation", score: 1 },
      { value: "full", label: "Fully automated lines", score: 3 },
    ],
  },
  {
    id: "devices",
    q: "Number of connected devices",
    options: [
      { value: "s", label: "< 500", score: 0 },
      { value: "m", label: "500 – 2,000", score: 1 },
      { value: "l", label: "> 2,000", score: 2 },
    ],
  },
  {
    id: "scalability",
    q: "Future scalability",
    options: [
      { value: "stable", label: "Stable footprint", score: 0 },
      { value: "growth", label: "Moderate growth", score: 1 },
      { value: "aggressive", label: "Aggressive expansion", score: 2 },
    ],
  },
];

export function recommendTech(answers: Record<string, string>) {
  let score = 0;
  let max = 0;
  const reasons: string[] = [];
  for (const q of AI_QUESTIONS) {
    const best = Math.max(...q.options.map((o) => o.score));
    max += best;
    const chosen = q.options.find((o) => o.value === answers[q.id]);
    if (!chosen) continue;
    score += chosen.score;
    if (chosen.score >= 2) reasons.push(`${q.q}: "${chosen.label}" favours 5G NR.`);
    if (chosen.score === 0) reasons.push(`${q.q}: "${chosen.label}" is well served by LTE.`);
  }
  const ratio = max ? score / max : 0;
  const tech: NetworkTech = ratio >= 0.45 ? "5g" : "lte";
  const confidence = Math.round(
    Math.min(97, 62 + Math.abs(ratio - 0.45) * 100 * 0.8 + reasons.length * 1.5),
  );
  return { tech, confidence, reasons: reasons.slice(0, 5) };
}

export const emptyConfig = (): RfConfig => ({
  version: 1,
  updatedAt: Date.now(),
  step: 0,
  completed: [],
  technology: null,
  technologyMode: "manual",
  aiAnswers: {},
  aiRecommendation: null,
  purpose: null,
  services: [],
  devices: {
    employees: 0,
    visitors: 0,
    iot: 0,
    robots: 0,
    cameras: 0,
    agvs: 0,
    handhelds: 0,
  },
  coverageBias: 50,
  capacity: null,
  roomPriorities: {},
  restricted: [],
  ceiling: { height: 3.2, falseCeiling: true, material: "gypsum" },
  wallMaterials: {},
  vendor: null,
  goals: DESIGN_GOALS,
  generatedAt: null,
});

/* -------------------- store -------------------- */

const KEY = "apcp.rfconfig.v1";
let cache: Record<string, RfConfig> | null = null;
const listeners = new Set<() => void>();

function readAll(): Record<string, RfConfig> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, RfConfig>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function writeAll(next: Record<string, RfConfig>) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const EMPTY: Record<string, RfConfig> = {};

export function useRfConfig(projectId: string): RfConfig {
  const all = useSyncExternalStore(
    subscribe,
    () => readAll(),
    () => EMPTY,
  );
  return all[projectId] ?? emptyConfig();
}

export function saveRfConfig(projectId: string, patch: Partial<RfConfig>) {
  const all = readAll();
  const current = all[projectId] ?? emptyConfig();
  writeAll({
    ...all,
    [projectId]: { ...current, ...patch, updatedAt: Date.now() },
  });
}

/* -------------------- derived -------------------- */

export function buildingStats(model: BuildingModel) {
  const count = (k: string) => model.objects.filter((o) => o.kind === k).length;
  const area = model.objects
    .filter((o) => o.kind === "room")
    .reduce((s, o) => s + polygonArea((o as { points: { x: number; y: number }[] }).points), 0);
  return {
    rooms: count("room"),
    walls: count("wall"),
    doors: count("door"),
    windows: count("window"),
    columns: count("column"),
    floors: 1,
    area,
  };
}

export function totalDevices(d: DeviceCounts) {
  return Object.values(d).reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
}

export function serviceImpact(services: string[]) {
  const chosen = SERVICES.filter((s) => services.includes(s.id));
  const load = chosen.reduce((s, c) => s + c.load, 0);
  const latency = chosen.some((c) => c.load >= 4) ? "Ultra-low (< 10 ms)" : chosen.length ? "Moderate (20 – 50 ms)" : "—";
  const uplink = chosen.some((c) => ["cctv", "aicam"].includes(c.id)) ? "Uplink heavy" : "Balanced";
  const profile = load >= 12 ? "Dense capacity layer" : load >= 6 ? "Balanced layer" : "Coverage layer";
  return { load, latency, uplink, profile };
}

export function coverageLabel(v: number) {
  if (v < 34)
    return {
      label: "Cost Optimized",
      note: "Fewest radio nodes. Accepts coverage holes in low-priority areas and thinner edge SINR margins.",
    };
  if (v < 67)
    return {
      label: "Balanced",
      note: "Balances node count against coverage quality. Recommended for most enterprise deployments.",
    };
  return {
    label: "Coverage Optimized",
    note: "Maximum overlap and redundancy. Higher node count and CAPEX for near-uniform signal quality.",
  };
}

export interface RfRequirementsPackage {
  configurationVersion: number;
  timestamp: number;
  project: { id: string; name: string; country: string; buildingType: string; network: string };
  digitalTwin: {
    reference: string;
    scale: number;
    scaleDetected: boolean;
    validationStatus: string;
    geometry: ReturnType<typeof buildingStats>;
    rooms: { id: string; name: string; usage: string; area: number }[];
    wallMaterials: Record<string, string>;
  };
  network: { technology: NetworkTech | null; selectionMode: string; aiRecommendation: RfConfig["aiRecommendation"] };
  deploymentPurpose: string | null;
  services: string[];
  connectedDevices: DeviceCounts & { total: number };
  capacityRequirement: RfConfig["capacity"];
  coverageObjective: { bias: number; label: string };
  optimizationPriorities: string[];
  criticalAreas: { roomId: string; name: string; priority: Priority }[];
  installationRestrictions: RestrictedArea[];
  ceiling: RfConfig["ceiling"];
  preferredVendor: string | null;
}

export function buildRequirementsPackage(
  project: Project,
  cfg: RfConfig,
): RfRequirementsPackage {
  const stats = buildingStats(project.model);
  const rooms = project.model.objects.filter((o) => o.kind === "room") as {
    id: string;
    name: string;
    usage: string;
    points: { x: number; y: number }[];
  }[];
  const walls = project.model.objects.filter((o) => o.kind === "wall") as {
    id: string;
    material: string;
  }[];
  return {
    configurationVersion: cfg.version,
    timestamp: Date.now(),
    project: {
      id: project.id,
      name: project.name,
      country: project.country,
      buildingType: project.buildingType,
      network: project.network,
    },
    digitalTwin: {
      reference: project.id,
      scale: project.model.scale,
      scaleDetected: project.model.scaleDetected,
      validationStatus: project.status === "ready" ? "validated" : project.status,
      geometry: stats,
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        usage: r.usage,
        area: Number(polygonArea(r.points).toFixed(2)),
      })),
      wallMaterials: Object.fromEntries(
        walls.map((w) => [w.id, cfg.wallMaterials[w.id] ?? w.material]),
      ),
    },
    network: {
      technology: cfg.technology,
      selectionMode: cfg.technologyMode,
      aiRecommendation: cfg.aiRecommendation,
    },
    deploymentPurpose: cfg.purpose,
    services: cfg.services,
    connectedDevices: { ...cfg.devices, total: totalDevices(cfg.devices) },
    capacityRequirement: cfg.capacity,
    coverageObjective: { bias: cfg.coverageBias, label: coverageLabel(cfg.coverageBias).label },
    optimizationPriorities: cfg.goals,
    criticalAreas: rooms
      .filter((r) => cfg.roomPriorities[r.id])
      .map((r) => ({ roomId: r.id, name: r.name, priority: cfg.roomPriorities[r.id]! })),
    installationRestrictions: cfg.restricted,
    ceiling: cfg.ceiling,
    preferredVendor: cfg.vendor,
  };
}
