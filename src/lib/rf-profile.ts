import { useSyncExternalStore } from "react";
import type { BuildingModel, MaterialId, Project, WallObj } from "./building-model";
import { materialById } from "./building-model";
import { polygonArea } from "./geometry";
import {
  buildRequirementsPackage,
  buildingStats,
  totalDevices,
  type RfConfig,
} from "./rf-config";

/* -------------------- knowledge base -------------------- */

export interface BandOption {
  id: string;
  tech: "lte" | "5g";
  label: string;
  freq: number; // MHz
  coverage: string;
  capacity: string;
  useCases: string;
  compatibility: string;
}

export const BANDS: BandOption[] = [
  {
    id: "n28",
    tech: "5g",
    label: "n28",
    freq: 700,
    coverage: "Excellent — deep indoor penetration, large cells",
    capacity: "Limited — narrow channel bandwidths",
    useCases: "Wide-area IoT, basement and tunnel coverage",
    compatibility: "Broad device support, FDD",
  },
  {
    id: "n41",
    tech: "5g",
    label: "n41",
    freq: 2500,
    coverage: "Good — balanced indoor propagation",
    capacity: "High — up to 100 MHz TDD",
    useCases: "Mixed enterprise, warehouse, campus",
    compatibility: "Widely supported TDD band",
  },
  {
    id: "n78",
    tech: "5g",
    label: "n78",
    freq: 3500,
    coverage: "Moderate — typical indoor small-cell radius",
    capacity: "Very high — 100 MHz TDD, massive MIMO",
    useCases: "Private 5G factories, hospitals, ports",
    compatibility: "Global private-network default band",
  },
  {
    id: "n258",
    tech: "5g",
    label: "n258",
    freq: 26000,
    coverage: "Very limited — line of sight only",
    capacity: "Extreme — multi-gigabit",
    useCases: "Hotspots, AR/VR zones, fixed wireless",
    compatibility: "mmWave capable devices only",
  },
  {
    id: "b3",
    tech: "lte",
    label: "B3",
    freq: 1800,
    coverage: "Good — proven indoor LTE propagation",
    capacity: "Moderate — up to 20 MHz FDD",
    useCases: "Private LTE voice and data",
    compatibility: "Near-universal device support",
  },
  {
    id: "b48",
    tech: "lte",
    label: "B48 (CBRS)",
    freq: 3600,
    coverage: "Moderate — small-cell radius",
    capacity: "High — shared spectrum",
    useCases: "US private LTE deployments",
    compatibility: "CBRS certified equipment",
  },
];

export const BANDWIDTHS: { id: string; label: string; note: string }[] = [
  { id: "auto", label: "Auto", note: "Let the planning engine size the channel from capacity targets." },
  { id: "20", label: "20 MHz", note: "Coverage-first. Lowest noise floor per RB, best cell edge." },
  { id: "40", label: "40 MHz", note: "Balanced throughput and cell-edge performance." },
  { id: "50", label: "50 MHz", note: "Common TDD allocation for private 5G licences." },
  { id: "80", label: "80 MHz", note: "High capacity, reduced edge SINR margin." },
  { id: "100", label: "100 MHz", note: "Maximum single-carrier capacity for n78/n41 deployments." },
];

export const ANTENNA_CATEGORIES: {
  id: string;
  label: string;
  install: string;
  coverage: string;
  environments: string;
}[] = [
  {
    id: "indoor-ceiling",
    label: "Indoor Ceiling",
    install: "Flush or surface mounted on false ceiling grid",
    coverage: "Omni-directional, downward hemispherical pattern",
    environments: "Offices, hospitals, retail, corridors",
  },
  {
    id: "indoor-wall",
    label: "Indoor Wall",
    install: "Wall mounted at 2.5 – 3 m, directional tilt",
    coverage: "Sector pattern, good corridor and hall reach",
    environments: "Halls, atriums, long corridors, parking",
  },
  {
    id: "industrial",
    label: "Industrial",
    install: "IP65+ ruggedised mounts on structure or gantry",
    coverage: "High-gain directional, resilient to metal clutter",
    environments: "Factories, production lines, harsh zones",
  },
  {
    id: "small-cell",
    label: "Small Cell",
    install: "Integrated radio + antenna, PoE fed",
    coverage: "Compact dense cells, low output power",
    environments: "High-density offices, campuses, venues",
  },
  {
    id: "outdoor",
    label: "Outdoor",
    install: "Pole or facade mounted, weather sealed",
    coverage: "Wide-area sectors, outdoor-to-indoor spill",
    environments: "Yards, ports, logistics areas, car parks",
  },
];

export const PROPAGATION_ENVIRONMENTS: {
  id: string;
  label: string;
  note: string;
  buildingTypes: string[];
}[] = [
  { id: "factory", label: "Factory", note: "Dense metal clutter, high ceilings, strong multipath.", buildingTypes: ["Factory"] },
  { id: "office", label: "Office", note: "Gypsum partitions, regular room grid, moderate loss.", buildingTypes: ["Office", "University"] },
  { id: "hospital", label: "Hospital", note: "Shielded rooms, dense concrete cores, corridors.", buildingTypes: ["Hospital"] },
  { id: "warehouse", label: "Warehouse", note: "Open volumes with high racking obstruction.", buildingTypes: ["Warehouse"] },
  { id: "airport", label: "Airport", note: "Very large open halls with glass facades.", buildingTypes: ["Airport", "Mall"] },
  { id: "mixed", label: "Mixed Environment", note: "Combination of open and partitioned areas.", buildingTypes: [] },
];

export const REGULATIONS: Record<
  string,
  { regulator: string; allowed: string[]; restricted: string[]; maxEirp: string }
> = {
  "Saudi Arabia": { regulator: "CST", allowed: ["n78", "n41", "n28"], restricted: [], maxEirp: "33 dBm/20 MHz indoor" },
  Egypt: { regulator: "NTRA", allowed: ["n78", "b3"], restricted: ["n258"], maxEirp: "30 dBm/20 MHz indoor" },
  "United Arab Emirates": { regulator: "TDRA", allowed: ["n78", "n41"], restricted: [], maxEirp: "33 dBm/20 MHz indoor" },
  Qatar: { regulator: "CRA", allowed: ["n78", "n41"], restricted: ["n258"], maxEirp: "30 dBm/20 MHz indoor" },
  Kuwait: { regulator: "CITRA", allowed: ["n78"], restricted: ["n258"], maxEirp: "30 dBm/20 MHz indoor" },
  Germany: { regulator: "BNetzA", allowed: ["n78", "n258"], restricted: [], maxEirp: "36 dBm/50 MHz indoor" },
  France: { regulator: "ARCEP", allowed: ["n78"], restricted: [], maxEirp: "33 dBm/20 MHz indoor" },
  "United Kingdom": { regulator: "Ofcom", allowed: ["n77", "n78", "n258"], restricted: [], maxEirp: "36 dBm/20 MHz indoor" },
  "United States": { regulator: "FCC", allowed: ["b48", "n48", "n258"], restricted: ["n78"], maxEirp: "30 dBm/10 MHz (CBRS GAA)" },
  Japan: { regulator: "MIC", allowed: ["n79", "n257"], restricted: [], maxEirp: "24 dBm indoor" },
};

export const DEFAULT_REGULATION = {
  regulator: "National Regulator",
  allowed: ["n78", "n41"],
  restricted: [],
  maxEirp: "30 dBm/20 MHz indoor",
};

export const regulationFor = (country: string) => REGULATIONS[country] ?? DEFAULT_REGULATION;

export const RF_STANDARDS = {
  release: "3GPP Release 18",
  deploymentMode: "Standalone (SA)",
  indoorProfile: "Enabled",
  networkType: "Non-Public Network (SNPN)",
  duplex: "TDD",
};

export const KB_LIBRARIES = [
  { id: "materials", label: "Material Database", detail: "412 building materials with RF loss models" },
  { id: "frequency", label: "Frequency Database", detail: "3GPP FR1 / FR2 band definitions" },
  { id: "antenna", label: "Antenna Database", detail: "Category patterns and gain envelopes" },
  { id: "propagation", label: "Propagation Models", detail: "ITU-R P.1238, 3GPP InF / InH" },
  { id: "regulations", label: "Country Regulations", detail: "Spectrum and EIRP limits by country" },
  { id: "standards", label: "RF Standards", detail: "Release 18 indoor deployment profiles" },
  { id: "vendor", label: "Vendor Catalog", detail: "Radio product families by vendor" },
];

export const PREPARE_TASKS = [
  "Loading Digital Building",
  "Loading RF Knowledge Base",
  "Loading Material Library",
  "Loading Frequency Profiles",
  "Loading Propagation Models",
  "Loading Country Regulations",
  "Building RF Profile",
];

export const MATERIAL_CHOICES: MaterialId[] = [
  "concrete",
  "brick",
  "glass",
  "metal",
  "gypsum",
  "wood",
  "custom",
];

/* -------------------- derived analysis -------------------- */

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function wallConfidence(w: WallObj) {
  return 55 + (hash(w.id) % 45);
}

export function materialDistribution(model: BuildingModel, overrides: Record<string, MaterialId>) {
  const walls = model.objects.filter((o): o is WallObj => o.kind === "wall");
  const counts = new Map<MaterialId, number>();
  for (const w of walls) {
    const m = overrides[w.id] ?? w.material;
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  const total = walls.length || 1;
  return Array.from(counts.entries())
    .map(([id, n]) => ({
      id,
      name: materialById(id).name,
      color: materialById(id).color,
      count: n,
      pct: Math.round((n / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function unknownWalls(model: BuildingModel, overrides: Record<string, MaterialId>) {
  return model.objects
    .filter((o): o is WallObj => o.kind === "wall")
    .filter((w) => !overrides[w.id] && (w.material === "custom" || wallConfidence(w) < 62));
}

export function suggestMaterial(w: WallObj): MaterialId {
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
  if (w.thickness >= 0.22 || len > 14) return "concrete";
  if (w.thickness <= 0.06) return "glass";
  return "gypsum";
}

export interface ObstacleGroup {
  id: string;
  label: string;
  count: number;
  detail: string;
  items: { id: string; label: string; note: string }[];
}

export function analyzeObstacles(
  model: BuildingModel,
  overrides: Record<string, MaterialId>,
): ObstacleGroup[] {
  const walls = model.objects.filter((o): o is WallObj => o.kind === "wall");
  const mat = (w: WallObj) => overrides[w.id] ?? w.material;
  const byMat = (ids: MaterialId[]) => walls.filter((w) => ids.includes(mat(w)));
  const rooms = model.objects.filter((o) => o.kind === "room") as {
    id: string;
    name: string;
    usage: string;
  }[];
  const columns = model.objects.filter((o) => o.kind === "column");
  const roomsWith = (kw: string[]) =>
    rooms.filter((r) => kw.some((k) => `${r.name} ${r.usage}`.toLowerCase().includes(k)));

  const group = (
    id: string,
    label: string,
    items: { id: string; label: string; note: string }[],
    detail: string,
  ): ObstacleGroup => ({ id, label, count: items.length, detail, items });

  return [
    group(
      "concrete",
      "Concrete Walls",
      byMat(["concrete", "brick"]).map((w) => ({
        id: w.id,
        label: w.id,
        note: `${materialById(mat(w)).name} · ${materialById(mat(w)).wallLoss} dB · ${w.thickness.toFixed(2)} m`,
      })),
      "High penetration loss — primary coverage barrier",
    ),
    group(
      "glass",
      "Glass Walls",
      byMat(["glass"]).map((w) => ({
        id: w.id,
        label: w.id,
        note: `Double glazing · ${materialById("glass").wallLoss} dB`,
      })),
      "Low loss, but coated glass can reflect strongly",
    ),
    group(
      "metal",
      "Metal Areas",
      byMat(["metal"]).map((w) => ({
        id: w.id,
        label: w.id,
        note: `Steel panel · ${materialById("metal").wallLoss} dB · reflective`,
      })),
      "Severe attenuation and multipath reflection",
    ),
    group(
      "columns",
      "Structural Columns",
      columns.map((c) => ({ id: c.id, label: c.id, note: "Structural column — local shadowing" })),
      "Localised shadowing near the column footprint",
    ),
    group(
      "machinery",
      "Machinery Areas",
      roomsWith(["production", "machine", "workshop", "assembly"]).map((r) => ({
        id: r.id,
        label: r.name,
        note: `${r.usage} — dense metallic clutter`,
      })),
      "Dense clutter, dynamic obstruction",
    ),
    group(
      "server",
      "Server Rooms",
      roomsWith(["server", "electrical", "data"]).map((r) => ({
        id: r.id,
        label: r.name,
        note: `${r.usage} — shielded enclosure`,
      })),
      "Shielded racks and cabinets, RF isolation",
    ),
  ];
}

/* -------------------- profile state -------------------- */

export interface FloorInfo {
  id: string;
  name: string;
  height: number;
}

export interface RfProfileConfig {
  version: number;
  updatedAt: number;
  prepared: boolean;
  step: number;
  completed: number[];
  kbLoaded: boolean;
  materialOverrides: Record<string, MaterialId>;
  materialsSaved: boolean;
  band: string | null;
  bandMode: "auto" | "manual";
  bandwidth: string;
  antennaCategory: string | null;
  propagation: string | null;
  propagationMode: "auto" | "manual";
  floors: FloorInfo[];
  ignoredObstacles: string[];
  deletedObstacles: string[];
  regulationsCountry: string | null;
  validatedAt: number | null;
  savedAt: number | null;
}

export const emptyProfile = (): RfProfileConfig => ({
  version: 1,
  updatedAt: Date.now(),
  prepared: false,
  step: 0,
  completed: [],
  kbLoaded: false,
  materialOverrides: {},
  materialsSaved: false,
  band: null,
  bandMode: "auto",
  bandwidth: "auto",
  antennaCategory: null,
  propagation: null,
  propagationMode: "auto",
  floors: [
    { id: "f1", name: "Floor 1", height: 4.5 },
    { id: "f2", name: "Floor 2", height: 4.5 },
    { id: "f3", name: "Floor 3", height: 5.2 },
  ],
  ignoredObstacles: [],
  deletedObstacles: [],
  regulationsCountry: null,
  validatedAt: null,
  savedAt: null,
});

const KEY = "apcp.rfprofile.v1";
let cache: Record<string, RfProfileConfig> | null = null;
const listeners = new Set<() => void>();

function readAll(): Record<string, RfProfileConfig> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, RfProfileConfig>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function writeAll(next: Record<string, RfProfileConfig>) {
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

const EMPTY: Record<string, RfProfileConfig> = {};

export function useRfProfile(projectId: string): RfProfileConfig {
  const all = useSyncExternalStore(
    subscribe,
    () => readAll(),
    () => EMPTY,
  );
  return all[projectId] ?? emptyProfile();
}

export function saveRfProfile(projectId: string, patch: Partial<RfProfileConfig>) {
  const all = readAll();
  const current = all[projectId] ?? emptyProfile();
  writeAll({
    ...all,
    [projectId]: { ...current, ...patch, updatedAt: Date.now() },
  });
}

/* -------------------- recommendations -------------------- */

export function recommendBand(cfg: RfConfig, country: string): BandOption {
  const reg = regulationFor(country);
  const tech = cfg.technology === "lte" ? "lte" : "5g";
  const pool = BANDS.filter((b) => b.tech === tech);
  const allowed = pool.filter((b) => reg.allowed.includes(b.id) && !reg.restricted.includes(b.id));
  const list = allowed.length ? allowed : pool;
  if (cfg.coverageBias >= 75) {
    return list.find((b) => b.freq < 1000) ?? list[0]!;
  }
  if (cfg.capacity === "very-high") {
    return list.find((b) => b.id === "n78") ?? list[list.length - 1]!;
  }
  return list.find((b) => b.id === "n78") ?? list[0]!;
}

export function recommendPropagation(project: Project, cfg: RfConfig) {
  const byType = PROPAGATION_ENVIRONMENTS.find((e) =>
    e.buildingTypes.includes(project.buildingType),
  );
  if (byType) return byType;
  const byPurpose = PROPAGATION_ENVIRONMENTS.find((e) => cfg.purpose?.includes(e.id));
  return byPurpose ?? PROPAGATION_ENVIRONMENTS[5]!;
}

/* -------------------- validation -------------------- */

export interface ValidationItem {
  id: string;
  label: string;
  status: "pass" | "fail";
  issue?: string;
  target?: number; // wizard step to jump to
  hint?: string;
}

export function validateRfProfile(
  project: Project,
  cfg: RfConfig,
  prof: RfProfileConfig,
): ValidationItem[] {
  const stats = buildingStats(project.model);
  const unknown = unknownWalls(project.model, prof.materialOverrides);
  const badFloor = prof.floors.find((f) => !Number.isFinite(f.height) || f.height <= 1.5);
  const reg = regulationFor(project.country);
  const bandOk = prof.band ? !reg.restricted.includes(prof.band) : false;
  return [
    {
      id: "model",
      label: "Digital Model",
      status: project.model.objects.length > 0 ? "pass" : "fail",
      issue: "Digital building is empty",
      target: 0,
      hint: "Return to the building editor and complete the digital twin.",
    },
    {
      id: "materials",
      label: "Materials",
      status: unknown.length === 0 ? "pass" : "fail",
      issue: `${unknown.length} unknown material${unknown.length === 1 ? "" : "s"}`,
      target: 0,
      hint: "Review the unknown walls in the Material Library step.",
    },
    {
      id: "scale",
      label: "Scale",
      status: project.model.scale > 0 ? "pass" : "fail",
      issue: "Model scale is not defined",
      target: 0,
    },
    {
      id: "technology",
      label: "Technology",
      status: cfg.technology ? "pass" : "fail",
      issue: "No network technology selected",
      target: 1,
    },
    {
      id: "band",
      label: "Frequency Band",
      status: prof.band && bandOk ? "pass" : "fail",
      issue: prof.band ? "Selected band is restricted in this country" : "No band selected",
      target: 1,
      hint: "Select an allowed band for the project country.",
    },
    {
      id: "coverage",
      label: "Coverage Requirements",
      status: cfg.capacity && totalDevices(cfg.devices) > 0 ? "pass" : "fail",
      issue: "Capacity or device counts are missing",
      target: 1,
    },
    {
      id: "geometry",
      label: "Building Geometry",
      status: stats.rooms > 0 && stats.walls > 0 && !badFloor ? "pass" : "fail",
      issue: badFloor ? `${badFloor.name} height is invalid` : "Building geometry incomplete",
      target: 5,
    },
    {
      id: "restrictions",
      label: "Installation Restrictions",
      status: "pass",
      target: 7,
    },
  ];
}

/* -------------------- output object -------------------- */

export function buildRfProfileObject(
  project: Project,
  cfg: RfConfig,
  prof: RfProfileConfig,
) {
  const pkg = buildRequirementsPackage(project, cfg);
  const band = BANDS.find((b) => b.id === prof.band) ?? null;
  const reg = regulationFor(project.country);
  const env = PROPAGATION_ENVIRONMENTS.find((e) => e.id === prof.propagation) ?? null;
  const dist = materialDistribution(project.model, prof.materialOverrides);
  const obstacles = analyzeObstacles(project.model, prof.materialOverrides)
    .filter((g) => !prof.deletedObstacles.includes(g.id))
    .map((g) => ({
      id: g.id,
      label: g.label,
      count: g.count,
      ignored: prof.ignoredObstacles.includes(g.id),
    }));
  const rooms = project.model.objects.filter((o) => o.kind === "room") as {
    id: string;
    points: { x: number; y: number }[];
  }[];
  const validation = validateRfProfile(project, cfg, prof);
  return {
    profileVersion: prof.version,
    configurationTimestamp: Date.now(),
    projectInformation: pkg.project,
    digitalBuildingReference: {
      reference: project.id,
      scale: project.model.scale,
      geometry: pkg.digitalTwin.geometry,
      totalArea: Number(rooms.reduce((s, r) => s + polygonArea(r.points), 0).toFixed(2)),
      floors: prof.floors,
    },
    rfDesignRequirements: pkg,
    selectedTechnology: cfg.technology === "lte" ? "Private LTE" : "Private 5G",
    selectedFrequencyBand: band && { band: band.label, frequencyMhz: band.freq, mode: prof.bandMode },
    channelBandwidth: prof.bandwidth === "auto" ? "Auto" : `${prof.bandwidth} MHz`,
    propagationEnvironment: env && { id: env.id, label: env.label, mode: prof.propagationMode },
    antennaCategory: prof.antennaCategory,
    materialLibrary: dist.map((d) => ({ material: d.id, name: d.name, walls: d.count, percent: d.pct })),
    obstacleLibrary: obstacles,
    countryRegulations: { country: project.country, ...reg },
    rfStandards: RF_STANDARDS,
    vendorPreference: cfg.vendor,
    coverageTargets: pkg.coverageObjective,
    capacityTargets: { requirement: cfg.capacity, devices: pkg.connectedDevices },
    installationRestrictions: pkg.installationRestrictions,
    priorityMatrix: pkg.criticalAreas,
    validationStatus: validation.every((v) => v.status === "pass") ? "passed" : "blocked",
  };
}

export type RfProfileObject = ReturnType<typeof buildRfProfileObject>;
