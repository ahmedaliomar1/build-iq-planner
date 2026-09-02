import { useSyncExternalStore } from "react";
import type { OptAntenna, OptimizedRfDesign } from "./rf-optimization";

/* ==================================================================
 * Module 6 — Engineering BOM & Cost Estimation Engine (Part 1)
 * Version 1: complete procurement pipeline + engineering data model.
 * Every computation lives behind BomEngine / PricingDatabase so live
 * vendor catalogs, ERP pricing APIs and regional labor profiles can
 * replace the placeholders without touching the UI.
 * ================================================================== */

/* -------------------- workflow definition -------------------- */

export interface BomTask {
  id: string;
  label: string;
}

export interface BomStage {
  id: string;
  title: string;
  pace: number;
  tasks: BomTask[];
  /** stage pauses for user input (vendor selection) */
  gate?: boolean;
}

const t = (id: string, label: string): BomTask => ({ id, label });

export const BOM_STAGES: BomStage[] = [
  {
    id: "detection",
    title: "Equipment Detection",
    pace: 300,
    tasks: [
      t("design", "Reading Optimized RF Design"),
      t("antennas", "Reading Antenna Layout"),
      t("cables", "Reading Cable Routes"),
      t("heights", "Reading Installation Heights"),
      t("floors", "Reading Building Floors"),
      t("rooms", "Reading Equipment Rooms"),
      t("fiber", "Reading Fiber Backbone"),
      t("power", "Reading Power Requirements"),
      t("network", "Reading Network Infrastructure"),
    ],
  },
  {
    id: "bom",
    title: "Generating Bill of Materials",
    pace: 300,
    tasks: [
      t("radio", "Detecting Radio Equipment"),
      t("antenna", "Detecting Antenna Equipment"),
      t("net", "Detecting Network Equipment"),
      t("trans", "Detecting Transmission Equipment"),
      t("install", "Detecting Installation Materials"),
      t("acc", "Detecting Accessories"),
      t("expansion", "Reserving Future Expansion Units"),
    ],
  },
  {
    id: "vendor",
    title: "Vendor Selection",
    pace: 260,
    gate: true,
    tasks: [
      t("catalog", "Loading Supported Vendor Catalogs"),
      t("availability", "Checking Equipment Availability"),
      t("compat", "Checking Engineering Compatibility"),
    ],
  },
  {
    id: "pricing",
    title: "Loading Pricing Database",
    pace: 300,
    tasks: [
      t("equipment", "Loading Equipment Prices"),
      t("cable", "Loading Cable Prices"),
      t("materials", "Loading Installation Materials"),
      t("accessories", "Loading Accessories"),
      t("power", "Loading Power Equipment"),
      t("network", "Loading Network Equipment"),
    ],
  },
  {
    id: "cost",
    title: "Cost Calculation",
    pace: 280,
    tasks: [
      t("equipment", "Calculating Equipment Cost"),
      t("cable", "Calculating Cable Cost"),
      t("materials", "Calculating Installation Materials"),
      t("accessories", "Calculating Accessories"),
      t("network", "Calculating Network Equipment"),
      t("power", "Calculating Power Equipment"),
      t("subtotal", "Calculating Subtotal"),
    ],
  },
  {
    id: "labor",
    title: "Labor Estimation",
    pace: 260,
    tasks: [
      t("install", "Estimating Installation Effort"),
      t("rf", "Estimating RF Technician Effort"),
      t("commissioning", "Estimating Commissioning Effort"),
      t("pm", "Estimating Project Management"),
    ],
  },
  {
    id: "power",
    title: "Power Consumption Estimation",
    pace: 240,
    tasks: [
      t("radios", "Calculating Radio Power"),
      t("switches", "Calculating Network Power"),
      t("core", "Calculating Core Power"),
      t("total", "Calculating Total Consumption"),
    ],
  },
  {
    id: "rack",
    title: "Rack Space Estimation",
    pace: 240,
    tasks: [
      t("units", "Calculating Rack Units"),
      t("cabinets", "Checking Cabinet Utilization"),
      t("reserve", "Reserving Expansion Space"),
    ],
  },
  {
    id: "cable",
    title: "Cable Routing Summary",
    pace: 240,
    tasks: [
      t("fiber", "Summarizing Fiber Runs"),
      t("copper", "Summarizing Copper Runs"),
      t("power", "Summarizing Power Cable"),
      t("ground", "Summarizing Ground Cable"),
      t("complexity", "Estimating Routing Complexity"),
    ],
  },
];

export const totalBomTasks = (s: BomStage) => s.tasks.length;
export const TOTAL_BOM_TASKS = BOM_STAGES.reduce((n, s) => n + s.tasks.length, 0);
export const estimatedStageMs = (s: BomStage) => s.tasks.length * s.pace;
export const ESTIMATED_BOM_MS = BOM_STAGES.reduce((n, s) => n + estimatedStageMs(s), 0);

/* -------------------- catalog taxonomy -------------------- */

export type BomCategoryId =
  | "radio"
  | "antenna"
  | "network"
  | "transmission"
  | "installation"
  | "accessories";

export const BOM_CATEGORIES: { id: BomCategoryId; label: string; note: string }[] = [
  { id: "radio", label: "Radio Equipment", note: "Radios, RRUs, AAUs, DU / CU" },
  { id: "antenna", label: "Antenna Equipment", note: "Indoor, wall, industrial, small cells" },
  { id: "network", label: "Network Equipment", note: "Core, switches, routers, cabinets" },
  { id: "transmission", label: "Transmission Equipment", note: "Fiber, copper, patch cords" },
  { id: "installation", label: "Installation Materials", note: "Mounts, brackets, grounding" },
  { id: "accessories", label: "Accessories", note: "Labels, trays, ties, connectors" },
];

export const categoryMeta = (id: BomCategoryId) =>
  BOM_CATEGORIES.find((c) => c.id === id) ?? BOM_CATEGORIES[0]!;

/* -------------------- vendors -------------------- */

export interface BomVendor {
  id: string;
  name: string;
  availability: "In Stock" | "Limited" | "On Request";
  note: string;
  /** multiplier applied to the reference pricing database */
  factor: number;
  leadWeeks: number;
  warranty: string;
}

export const BOM_VENDORS: BomVendor[] = [
  {
    id: "ericsson",
    name: "Ericsson",
    availability: "In Stock",
    note: "Full private 5G portfolio, strong indoor radio dot systems.",
    factor: 1.08,
    leadWeeks: 6,
    warranty: "36 months",
  },
  {
    id: "nokia",
    name: "Nokia",
    availability: "In Stock",
    note: "DAC platform, industrial-grade indoor coverage units.",
    factor: 1.04,
    leadWeeks: 5,
    warranty: "36 months",
  },
  {
    id: "huawei",
    name: "Huawei",
    availability: "Limited",
    note: "LampSite family, competitive pricing, regional restrictions apply.",
    factor: 0.88,
    leadWeeks: 8,
    warranty: "24 months",
  },
  {
    id: "cisco",
    name: "Cisco",
    availability: "In Stock",
    note: "Strong transport and network layer, partner radio ecosystem.",
    factor: 1.12,
    leadWeeks: 4,
    warranty: "36 months",
  },
  {
    id: "samsung",
    name: "Samsung",
    availability: "Limited",
    note: "Compact indoor radios, vRAN-ready core integration.",
    factor: 0.97,
    leadWeeks: 7,
    warranty: "24 months",
  },
  {
    id: "mavenir",
    name: "Mavenir",
    availability: "On Request",
    note: "Open RAN software-centric stack, mixed hardware sourcing.",
    factor: 0.92,
    leadWeeks: 9,
    warranty: "24 months",
  },
  {
    id: "auto",
    name: "Auto",
    availability: "In Stock",
    note: "Automatically compare supported vendors and use the best reference price.",
    factor: 0.95,
    leadWeeks: 6,
    warranty: "Vendor dependent",
  },
  {
    id: "custom",
    name: "Custom",
    availability: "On Request",
    note: "Neutral reference pricing — manual unit prices can be applied later.",
    factor: 1,
    leadWeeks: 0,
    warranty: "Manual",
  },
];

export const vendorById = (id: string | null) =>
  BOM_VENDORS.find((v) => v.id === id) ?? BOM_VENDORS.find((v) => v.id === "auto")!;

/* -------------------- pricing database -------------------- */

export interface PriceRecord {
  sku: string;
  name: string;
  category: BomCategoryId;
  unit: string;
  unitPrice: number;
  currency: "USD";
  version: string;
  availability: string;
  leadTime: string;
  warranty: string;
}

export interface PricingDatabase {
  readonly name: string;
  readonly version: string;
  readonly currency: "USD";
  price(sku: string, vendor: BomVendor): PriceRecord;
}

/** reference (vendor-neutral) unit prices — placeholder catalog */
const REFERENCE: Record<string, Omit<PriceRecord, "sku" | "availability" | "leadTime" | "warranty" | "version">> = {
  "radio-indoor": { name: "Indoor Radio Unit", category: "radio", unit: "pcs", unitPrice: 3200, currency: "USD" },
  "radio-rru": { name: "Remote Radio Unit (RRU)", category: "radio", unit: "pcs", unitPrice: 4100, currency: "USD" },
  "radio-du": { name: "Distributed Unit (DU)", category: "radio", unit: "pcs", unitPrice: 6800, currency: "USD" },
  "radio-cu": { name: "Central Unit (CU)", category: "radio", unit: "pcs", unitPrice: 7400, currency: "USD" },
  "radio-expansion": { name: "Future Expansion Radio Slot", category: "radio", unit: "pcs", unitPrice: 2900, currency: "USD" },
  "ant-ceiling": { name: "Indoor Ceiling Antenna", category: "antenna", unit: "pcs", unitPrice: 145, currency: "USD" },
  "ant-wall": { name: "Wall Mount Antenna", category: "antenna", unit: "pcs", unitPrice: 165, currency: "USD" },
  "ant-industrial": { name: "Industrial Antenna", category: "antenna", unit: "pcs", unitPrice: 420, currency: "USD" },
  "ant-smallcell": { name: "Small Cell Unit", category: "antenna", unit: "pcs", unitPrice: 980, currency: "USD" },
  "ant-directional": { name: "Directional Antenna", category: "antenna", unit: "pcs", unitPrice: 260, currency: "USD" },
  "net-core": { name: "Private Core (Compact)", category: "network", unit: "pcs", unitPrice: 21000, currency: "USD" },
  "net-edge": { name: "Edge Switch (24-port PoE+)", category: "network", unit: "pcs", unitPrice: 3400, currency: "USD" },
  "net-agg": { name: "Aggregation Switch", category: "network", unit: "pcs", unitPrice: 5600, currency: "USD" },
  "net-router": { name: "Enterprise Router", category: "network", unit: "pcs", unitPrice: 4200, currency: "USD" },
  "net-firewall": { name: "Network Firewall", category: "network", unit: "pcs", unitPrice: 3800, currency: "USD" },
  "net-cabinet": { name: "Network Cabinet 42U", category: "network", unit: "pcs", unitPrice: 1250, currency: "USD" },
  "net-patch": { name: "Patch Panel 24-port", category: "network", unit: "pcs", unitPrice: 160, currency: "USD" },
  "tx-fiber": { name: "Fiber Cable (OS2)", category: "transmission", unit: "m", unitPrice: 3.4, currency: "USD" },
  "tx-cat6": { name: "CAT6 Cable", category: "transmission", unit: "m", unitPrice: 1.15, currency: "USD" },
  "tx-cat6a": { name: "CAT6A Cable", category: "transmission", unit: "m", unitPrice: 1.85, currency: "USD" },
  "tx-cat7": { name: "CAT7 Cable", category: "transmission", unit: "m", unitPrice: 2.6, currency: "USD" },
  "tx-patchcord": { name: "Fiber Patch Cord", category: "transmission", unit: "pcs", unitPrice: 22, currency: "USD" },
  "tx-termbox": { name: "Fiber Termination Box", category: "transmission", unit: "pcs", unitPrice: 180, currency: "USD" },
  "tx-media": { name: "Media Converter", category: "transmission", unit: "pcs", unitPrice: 140, currency: "USD" },
  "inst-mount": { name: "Antenna Mount Kit", category: "installation", unit: "pcs", unitPrice: 48, currency: "USD" },
  "inst-wallbracket": { name: "Wall Bracket", category: "installation", unit: "pcs", unitPrice: 36, currency: "USD" },
  "inst-ceilbracket": { name: "Ceiling Bracket", category: "installation", unit: "pcs", unitPrice: 32, currency: "USD" },
  "inst-psu": { name: "Power Supply Unit", category: "installation", unit: "pcs", unitPrice: 180, currency: "USD" },
  "inst-ground": { name: "Grounding Kit", category: "installation", unit: "pcs", unitPrice: 65, currency: "USD" },
  "inst-powercable": { name: "Power Cable", category: "installation", unit: "m", unitPrice: 2.1, currency: "USD" },
  "inst-groundcable": { name: "Ground Cable", category: "installation", unit: "m", unitPrice: 1.6, currency: "USD" },
  "acc-connector": { name: "RF / RJ45 Connectors", category: "accessories", unit: "pcs", unitPrice: 9, currency: "USD" },
  "acc-tray": { name: "Cable Tray", category: "accessories", unit: "m", unitPrice: 14, currency: "USD" },
  "acc-tie": { name: "Cable Ties (pack of 100)", category: "accessories", unit: "pack", unitPrice: 12, currency: "USD" },
  "acc-label": { name: "Labeling Kit", category: "accessories", unit: "set", unitPrice: 45, currency: "USD" },
};

export const placeholderPricingDatabase: PricingDatabase = {
  name: "APCP Reference Pricing Database",
  version: "1.0.0-placeholder",
  currency: "USD",
  price(sku, vendor) {
    const ref = REFERENCE[sku];
    const base = ref ?? { name: sku, category: "accessories" as BomCategoryId, unit: "pcs", unitPrice: 0, currency: "USD" as const };
    return {
      sku,
      name: base.name,
      category: base.category,
      unit: base.unit,
      unitPrice: Number((base.unitPrice * vendor.factor).toFixed(2)),
      currency: "USD",
      version: "2026.Q1",
      availability: vendor.availability,
      leadTime: vendor.leadWeeks ? `${vendor.leadWeeks} weeks` : "Manual",
      warranty: vendor.warranty,
    };
  },
};

/* -------------------- BOM items -------------------- */

export interface BomItem {
  id: string;
  sku: string;
  name: string;
  category: BomCategoryId;
  subcategory: string;
  quantity: number;
  unit: string;
  source: string;
  futureSupport: boolean;
  unitPrice: number;
  totalPrice: number;
  currency: "USD";
  vendor: string;
  availability: string;
  leadTime: string;
  warranty: string;
  status: "Planned" | "Reserved" | "Optional";
}

export interface EquipmentDetection {
  antennas: number;
  byCategory: Record<string, number>;
  floors: number;
  equipmentRooms: number;
  cat6Meters: number;
  fiberMeters: number;
  powerCableMeters: number;
  groundCableMeters: number;
  cabinets: number;
  switches: number;
  aggregation: number;
}

const round5 = (n: number) => Math.round(n / 5) * 5;

export function detectEquipment(design: OptimizedRfDesign): EquipmentDetection {
  const antennas = design.optimizedAntennaLayout;
  const byCategory: Record<string, number> = {};
  for (const a of antennas) byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
  const n = antennas.length || 1;
  const floors = Math.max(1, Math.ceil(n / 6));
  const equipmentRooms = Math.max(1, Math.ceil(floors / 2));
  const avgRun = 38 + (n % 5);
  return {
    antennas: antennas.length,
    byCategory,
    floors,
    equipmentRooms,
    cat6Meters: round5(n * avgRun),
    fiberMeters: round5(floors * 42 + equipmentRooms * 12),
    powerCableMeters: round5(n * 8 + 20),
    groundCableMeters: round5(n * 4 + 16),
    cabinets: Math.max(1, Math.ceil(n / 4)),
    switches: Math.max(1, Math.ceil(n / 8)) + 1,
    aggregation: Math.max(1, Math.ceil(n / 16)),
  };
}

interface Spec {
  sku: string;
  subcategory: string;
  quantity: number;
  source: string;
  futureSupport?: boolean;
  status?: BomItem["status"];
}

const CATEGORY_SKU: Record<string, string> = {
  "indoor-ceiling": "ant-ceiling",
  "indoor-wall": "ant-wall",
  industrial: "ant-industrial",
  "small-cell": "ant-smallcell",
  directional: "ant-directional",
};

export function buildBomItems(
  design: OptimizedRfDesign,
  detection: EquipmentDetection,
  vendor: BomVendor,
  db: PricingDatabase = placeholderPricingDatabase,
): BomItem[] {
  const d = detection;
  const n = Math.max(1, d.antennas);
  const specs: Spec[] = [
    { sku: "radio-indoor", subcategory: "Indoor Radios", quantity: n, source: "One radio per optimized antenna position" },
    { sku: "radio-rru", subcategory: "RRUs", quantity: Math.max(1, Math.ceil(n / 6)), source: "Sector aggregation per floor" },
    { sku: "radio-du", subcategory: "Distributed Units", quantity: Math.max(1, Math.ceil(n / 8)), source: "Distributed unit per radio cluster" },
    { sku: "radio-cu", subcategory: "Central Units", quantity: 1, source: "Single central unit for the site" },
    { sku: "radio-expansion", subcategory: "Future Expansion Units", quantity: Math.max(1, Math.round(n * 0.15)), source: "15% expansion reserve", futureSupport: true, status: "Optional" },
  ];

  for (const [cat, qty] of Object.entries(d.byCategory)) {
    specs.push({
      sku: CATEGORY_SKU[cat] ?? "ant-ceiling",
      subcategory: "Antennas",
      quantity: qty,
      source: `Optimized RF Design — ${qty} × ${cat} placements`,
    });
  }

  specs.push(
    { sku: "net-core", subcategory: "Core", quantity: 1, source: "Private core for the deployment" },
    { sku: "net-edge", subcategory: "Edge Switches", quantity: d.switches, source: `PoE+ ports for ${n} radios` },
    { sku: "net-agg", subcategory: "Aggregation Switches", quantity: d.aggregation, source: "Aggregation per equipment room" },
    { sku: "net-router", subcategory: "Routers", quantity: 1, source: "Enterprise uplink router" },
    { sku: "net-firewall", subcategory: "Firewalls", quantity: 1, source: "Perimeter security" },
    { sku: "net-cabinet", subcategory: "Network Cabinets", quantity: d.cabinets, source: `Cabinet per ${4} radio cluster` },
    { sku: "net-patch", subcategory: "Patch Panels", quantity: d.cabinets * 2, source: "Two panels per cabinet" },

    { sku: "tx-fiber", subcategory: "Fiber Cables", quantity: d.fiberMeters, source: "Fiber backbone between equipment rooms" },
    { sku: "tx-cat6", subcategory: "CAT6", quantity: d.cat6Meters, source: "Radio feeder runs from cable routes" },
    { sku: "tx-cat6a", subcategory: "CAT6A", quantity: round5(d.cat6Meters * 0.25), source: "High-throughput sectors" },
    { sku: "tx-cat7", subcategory: "CAT7", quantity: round5(d.cat6Meters * 0.1), source: "Critical area feeders", futureSupport: true, status: "Optional" },
    { sku: "tx-patchcord", subcategory: "Fiber Patch Cords", quantity: d.cabinets * 4, source: "Four cords per cabinet" },
    { sku: "tx-termbox", subcategory: "Fiber Termination Boxes", quantity: d.equipmentRooms, source: "One box per equipment room" },
    { sku: "tx-media", subcategory: "Media Converters", quantity: d.equipmentRooms, source: "Copper / fiber conversion" },

    { sku: "inst-mount", subcategory: "Mount Kits", quantity: n, source: "One mount kit per antenna" },
    { sku: "inst-wallbracket", subcategory: "Wall Brackets", quantity: d.byCategory["indoor-wall"] ?? Math.ceil(n * 0.2), source: "Wall-mounted placements" },
    { sku: "inst-ceilbracket", subcategory: "Ceiling Brackets", quantity: d.byCategory["indoor-ceiling"] ?? Math.ceil(n * 0.6), source: "Ceiling placements at installation height" },
    { sku: "inst-psu", subcategory: "Power Supplies", quantity: d.cabinets * 2, source: "Redundant PSU per cabinet" },
    { sku: "inst-ground", subcategory: "Grounding Kits", quantity: d.cabinets + d.equipmentRooms, source: "Grounding per cabinet and room" },
    { sku: "inst-powercable", subcategory: "Power Cable", quantity: d.powerCableMeters, source: "Power distribution runs" },
    { sku: "inst-groundcable", subcategory: "Ground Cable", quantity: d.groundCableMeters, source: "Ground bonding runs" },

    { sku: "acc-connector", subcategory: "Connectors", quantity: n * 3 + 3, source: "Three connectors per radio plus spares" },
    { sku: "acc-tray", subcategory: "Cable Trays", quantity: round5(d.cat6Meters * 0.35), source: "Tray coverage on main routes" },
    { sku: "acc-tie", subcategory: "Cable Ties", quantity: Math.max(2, Math.ceil(n / 3)), source: "Cable management packs" },
    { sku: "acc-label", subcategory: "Labels", quantity: d.equipmentRooms, source: "Labeling kit per equipment room" },
  );

  return specs
    .filter((s) => s.quantity > 0)
    .map((s, i) => {
      const p = db.price(s.sku, vendor);
      return {
        id: `bom-${i + 1}`,
        sku: s.sku,
        name: p.name,
        category: p.category,
        subcategory: s.subcategory,
        quantity: Number(s.quantity.toFixed(2)),
        unit: p.unit,
        source: s.source,
        futureSupport: Boolean(s.futureSupport),
        unitPrice: p.unitPrice,
        totalPrice: Number((p.unitPrice * s.quantity).toFixed(2)),
        currency: "USD" as const,
        vendor: vendor.name,
        availability: p.availability,
        leadTime: p.leadTime,
        warranty: p.warranty,
        status: s.status ?? "Planned",
      };
    });
}

/* -------------------- cost model -------------------- */

export interface CostBreakdown {
  equipment: number;
  installation: number;
  cable: number;
  accessories: number;
  power: number;
  network: number;
  subtotal: number;
}

export function computeCost(items: BomItem[]): CostBreakdown {
  const sum = (f: (i: BomItem) => boolean) =>
    Number(items.filter(f).reduce((s, i) => s + i.totalPrice, 0).toFixed(2));
  const equipment = sum((i) => i.category === "radio" || i.category === "antenna");
  const network = sum((i) => i.category === "network");
  const cable = sum((i) => i.category === "transmission");
  const power = sum((i) => i.sku === "inst-psu" || i.sku === "inst-powercable");
  const installation = sum((i) => i.category === "installation") - power;
  const accessories = sum((i) => i.category === "accessories");
  const subtotal = Number(
    (equipment + network + cable + power + installation + accessories).toFixed(2),
  );
  return {
    equipment,
    installation: Number(installation.toFixed(2)),
    cable,
    accessories,
    power,
    network,
    subtotal,
  };
}

/* -------------------- labor -------------------- */

export interface LaborRole {
  id: string;
  role: string;
  people: number;
  days: number;
  dailyCost: number;
  total: number;
}

export function computeLabor(antennas: number): LaborRole[] {
  const days = Math.max(3, Math.ceil(antennas / 2.5));
  const rows: Omit<LaborRole, "total">[] = [
    { id: "install", role: "Installation Engineers", people: Math.max(2, Math.ceil(antennas / 6)), days, dailyCost: 220 },
    { id: "rf", role: "RF Technicians", people: Math.max(2, Math.ceil(antennas / 3)), days, dailyCost: 120 },
    { id: "commissioning", role: "Commissioning Engineer", people: 1, days: Math.max(2, Math.round(days * 0.6)), dailyCost: 350 },
    { id: "pm", role: "Project Manager", people: 1, days, dailyCost: 400 },
  ];
  return rows.map((r) => ({ ...r, total: r.people * r.days * r.dailyCost }));
}

export const laborTotal = (rows: LaborRole[]) => rows.reduce((s, r) => s + r.total, 0);

/* -------------------- power -------------------- */

export interface PowerLine {
  id: string;
  label: string;
  quantity: number;
  watts: number;
  total: number;
}

export interface PowerEstimate {
  lines: PowerLine[];
  totalWatts: number;
  dailyKwh: number;
  monthlyKwh: number;
  monthlyCost: number;
  carbonKgMonth: number;
}

export function computePower(detection: EquipmentDetection): PowerEstimate {
  const lines: Omit<PowerLine, "total">[] = [
    { id: "radios", label: "Indoor Radios", quantity: Math.max(1, detection.antennas), watts: 35 },
    { id: "switches", label: "Network Switches", quantity: detection.switches, watts: 180 },
    { id: "core", label: "Private Core", quantity: 1, watts: 420 },
  ];
  const full = lines.map((l) => ({ ...l, total: l.quantity * l.watts }));
  const totalWatts = full.reduce((s, l) => s + l.total, 0);
  const dailyKwh = Number(((totalWatts * 24) / 1000).toFixed(2));
  const monthlyKwh = Number((dailyKwh * 30).toFixed(1));
  return {
    lines: full,
    totalWatts,
    dailyKwh,
    monthlyKwh,
    monthlyCost: Number((monthlyKwh * 0.14).toFixed(0)),
    carbonKgMonth: Number((monthlyKwh * 0.4).toFixed(0)),
  };
}

/* -------------------- rack -------------------- */

export interface RackEstimate {
  cabinetSize: number;
  cabinets: number;
  used: number;
  remaining: number;
  utilization: number;
  lines: { label: string; units: number }[];
}

export function computeRack(detection: EquipmentDetection): RackEstimate {
  const lines = [
    { label: "Private Core", units: 4 },
    { label: "Central Unit", units: 2 },
    { label: `Distributed Units × ${Math.max(1, Math.ceil(detection.antennas / 8))}`, units: Math.max(1, Math.ceil(detection.antennas / 8)) * 2 },
    { label: `Edge Switches × ${detection.switches}`, units: detection.switches },
    { label: `Aggregation × ${detection.aggregation}`, units: detection.aggregation * 2 },
    { label: `Patch Panels × ${detection.cabinets * 2}`, units: detection.cabinets * 2 },
    { label: "Power / PDU", units: 4 },
    { label: "Cable Management", units: 3 },
  ];
  const cabinetSize = 42;
  const used = Math.min(cabinetSize, lines.reduce((s, l) => s + l.units, 0));
  return {
    cabinetSize,
    cabinets: detection.cabinets,
    used,
    remaining: cabinetSize - used,
    utilization: Math.round((used / cabinetSize) * 100),
    lines,
  };
}

/* -------------------- cable summary -------------------- */

export interface CableSummary {
  fiber: number;
  cat6: number;
  power: number;
  ground: number;
  totalMeters: number;
  complexity: "Low" | "Medium" | "High";
}

export function computeCables(detection: EquipmentDetection): CableSummary {
  const total =
    detection.fiberMeters + detection.cat6Meters + detection.powerCableMeters + detection.groundCableMeters;
  const complexity = total > 900 ? "High" : total > 450 ? "Medium" : "Low";
  return {
    fiber: detection.fiberMeters,
    cat6: detection.cat6Meters,
    power: detection.powerCableMeters,
    ground: detection.groundCableMeters,
    totalMeters: total,
    complexity,
  };
}

/* -------------------- engineering BOM object -------------------- */

export interface EngineeringBom {
  objectType: "EngineeringBom";
  timestamp: number;
  version: string;
  versionNumber: number;
  projectInformation: OptimizedRfDesign["projectInformation"];
  references: {
    digitalBuilding: string;
    rfDesignRequirements: string;
    rfProfile: string;
    initialRfDesign: string;
    optimizedRfDesign: string;
  };
  optimizedRfDesignReference: string;
  vendor: { id: string; name: string; availability: string; leadTime: string; warranty: string };
  vendorComparison: {
    vendorId: string;
    vendor: string;
    estimatedCost: number;
    availability: string;
    leadTimeDays: number;
    warranty: string;
    note: string;
  }[];
  detection: EquipmentDetection;
  items: BomItem[];
  equipmentList: Record<BomCategoryId, BomItem[]>;
  cableList: CableSummary;
  fiberList: { meters: number; terminationBoxes: number; patchCords: number };
  cost: CostBreakdown;
  financialSummary: FinancialSummary;
  labor: { rows: LaborRole[]; total: number };
  power: PowerEstimate;
  rack: RackEstimate;
  cables: CableSummary;
  aiCostOptimization: {
    applied: OptimizationId[];
    totalSaving: number;
    recommendations: CostOptimization[];
  };
  procurementSummary: {
    equipmentItems: number;
    totalQuantity: number;
    estimatedEquipmentCost: number;
    estimatedLaborCost: number;
    estimatedProjectCost: number;
    grandTotal: number;
    readiness: number;
    vendorStatus: string;
    overview: ProcurementOverview;
  };
  validation: { checks: BomCheck[]; passed: boolean };
  pricingMetadata: {
    database: string;
    databaseVersion: string;
    currency: "USD";
    mode: "placeholder";
    engine: string;
  };
}

export function buildEngineeringBom(
  design: OptimizedRfDesign,
  vendor: BomVendor,
  items: BomItem[],
  extra: { applied?: OptimizationId[]; versionNumber?: number } = {},
): EngineeringBom {
  const applied = extra.applied ?? [];
  const detection = detectEquipment(design);
  const cost = computeCost(items);
  const laborRows = computeLabor(detection.antennas).map((r) => ({
    ...r,
    total: Math.round(r.total * laborFactor(applied)),
  }));
  const labor = laborTotal(laborRows);
  const power = computePower(detection);
  const rack = computeRack(detection);
  const cables = computeCables(detection);
  const finance = financialSummary(cost, labor);
  const overview = procurementOverview(vendor);
  const comparison = compareVendors(design, detection);
  const recommendations = buildCostOptimizations(items, labor, vendor);
  const totalQuantity = Number(items.reduce((s, i) => s + i.quantity, 0).toFixed(1));
  const pid = design.projectInformation.id;
  const equipmentList = Object.fromEntries(
    BOM_CATEGORIES.map((c) => [c.id, items.filter((i) => i.category === c.id)]),
  ) as Record<BomCategoryId, BomItem[]>;

  return {
    objectType: "EngineeringBom",
    timestamp: Date.now(),
    version: "1.1.0",
    versionNumber: extra.versionNumber ?? 1,
    projectInformation: design.projectInformation,
    references: {
      digitalBuilding: `${pid}:digital-building`,
      rfDesignRequirements: `${pid}:rf-design-requirements`,
      rfProfile: `${pid}:rf-profile`,
      initialRfDesign: `${pid}:initial-rf-design`,
      optimizedRfDesign: `${pid}:optimized-rf-design:v${design.versionNumber}`,
    },
    optimizedRfDesignReference: `${pid}:optimized-rf-design:v${design.versionNumber}`,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      availability: vendor.availability,
      leadTime: vendor.leadWeeks ? `${vendor.leadWeeks} weeks` : "Manual",
      warranty: vendor.warranty,
    },
    vendorComparison: comparison.map((r) => ({
      vendorId: r.vendorId,
      vendor: r.vendor.name,
      estimatedCost: r.estimatedCost,
      availability: r.availability,
      leadTimeDays: r.leadTimeDays,
      warranty: r.warranty,
      note: r.note,
    })),
    detection,
    items,
    equipmentList,
    cableList: cables,
    fiberList: {
      meters: detection.fiberMeters,
      terminationBoxes: detection.equipmentRooms,
      patchCords: detection.cabinets * 4,
    },
    cost,
    financialSummary: finance,
    labor: { rows: laborRows, total: labor },
    power,
    rack,
    cables,
    aiCostOptimization: {
      applied,
      totalSaving: recommendations
        .filter((r) => applied.includes(r.id))
        .reduce((s, r) => s + r.saving, 0),
      recommendations,
    },
    procurementSummary: {
      equipmentItems: items.length,
      totalQuantity,
      estimatedEquipmentCost: cost.equipment + cost.network,
      estimatedLaborCost: labor,
      estimatedProjectCost: Number((cost.subtotal + labor).toFixed(2)),
      grandTotal: finance.grandTotal,
      readiness: vendor.id === "custom" ? 80 : overview.readiness,
      vendorStatus: vendor.availability,
      overview,
    },
    validation: validateProcurement({
      items,
      vendorId: vendor.id,
      labor,
      power,
      rack,
      cables,
      cost,
    }),
    pricingMetadata: {
      database: placeholderPricingDatabase.name,
      databaseVersion: placeholderPricingDatabase.version,
      currency: "USD",
      mode: "placeholder",
      engine: "APCP BOM & Cost Estimation Engine v1.1.0-placeholder",
    },
  };
}

/* -------------------- formatting -------------------- */

export const money = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

export const money2 = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* -------------------- persisted state -------------------- */

export interface BomLogEntry {
  at: number;
  text: string;
  kind: "info" | "ok" | "calc";
}

export interface BomState {
  status: "idle" | "running" | "gate" | "done";
  stageIndex: number;
  taskIndex: number;
  vendor: string | null;
  items: BomItem[];
  /** items exactly as generated before any AI cost optimization */
  baseItems: BomItem[];
  applied: OptimizationId[];
  undone: OptimizationId[];
  versions: BomVersionRecord[];
  savedVersion: number;
  startedAt: number | null;
  finishedAt: number | null;
  savedAt: number | null;
  log: BomLogEntry[];
  updatedAt: number;
}

export const emptyBomState = (): BomState => ({
  status: "idle",
  stageIndex: 0,
  taskIndex: 0,
  vendor: null,
  items: [],
  baseItems: [],
  applied: [],
  undone: [],
  versions: [],
  savedVersion: 0,
  startedAt: null,
  finishedAt: null,
  savedAt: null,
  log: [],
  updatedAt: Date.now(),
});

const KEY = "apcp.bom.v1";

let cache: Record<string, BomState> | null = null;
const listeners = new Set<() => void>();

function readAll(): Record<string, BomState> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, BomState>) : {};
    cache = Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, { ...emptyBomState(), ...v }]),
    );
  } catch {
    cache = {};
  }
  return cache;
}

function writeAll(next: Record<string, BomState>) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
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

const EMPTY_MAP: Record<string, BomState> = {};

export function useBomState(projectId: string): BomState {
  const all = useSyncExternalStore(
    subscribe,
    () => readAll(),
    () => EMPTY_MAP,
  );
  return all[projectId] ?? emptyBomState();
}

export function saveBomState(projectId: string, patch: Partial<BomState>) {
  const all = readAll();
  const current = all[projectId] ?? emptyBomState();
  writeAll({ ...all, [projectId]: { ...current, ...patch, updatedAt: Date.now() } });
}

export function resetBomState(projectId: string) {
  const all = readAll();
  writeAll({ ...all, [projectId]: emptyBomState() });
}

/* -------------------- export helpers -------------------- */

export function bomToCsv(bom: EngineeringBom) {
  const head =
    "item,category,subcategory,quantity,unit,unit_price_usd,total_price_usd,vendor,availability,lead_time,warranty,status,engineering_source";
  const rows = bom.items.map((i) =>
    [
      i.name,
      categoryMeta(i.category).label,
      i.subcategory,
      i.quantity,
      i.unit,
      i.unitPrice,
      i.totalPrice,
      i.vendor,
      i.availability,
      i.leadTime,
      i.warranty,
      i.status,
      `"${i.source}"`,
    ].join(","),
  );
  return [head, ...rows].join("\n");
}

export const antennaMix = (antennas: OptAntenna[]) => {
  const out: Record<string, number> = {};
  for (const a of antennas) out[a.category] = (out[a.category] ?? 0) + 1;
  return out;
};

/* ==================================================================
 * Module 6 — Part 2
 * Vendor comparison, AI cost optimization, financial summary,
 * procurement validation and the versioned Engineering BOM object.
 * All numbers stay behind pure functions so vendor APIs, ERP systems
 * and live pricing services can replace them without UI changes.
 * ================================================================== */

/* -------------------- vendor catalog details -------------------- */

export interface VendorCatalog {
  vendorId: string;
  productFamily: string;
  bands: string[];
  antennas: string[];
  radioUnits: string[];
  advantages: string[];
  notes: string;
  compatibility: string;
}

const CATALOGS: Record<string, VendorCatalog> = {
  ericsson: {
    vendorId: "ericsson",
    productFamily: "Radio Dot System / Enterprise 5G",
    bands: ["n28", "n41", "n78", "B3", "B7"],
    antennas: ["Indoor Radio Dot 4479", "Indoor Dot 6499", "Wall Mount Dot"],
    radioUnits: ["IRU 8848", "Radio 4408", "Baseband 6631"],
    advantages: ["Premium reliability", "5-year warranty option", "Mature indoor portfolio"],
    notes: "Best-in-class indoor coverage engineering, highest total cost of the shortlist.",
    compatibility: "Full compatibility with the optimized antenna layout.",
  },
  nokia: {
    vendorId: "nokia",
    productFamily: "Digital Automation Cloud (DAC)",
    bands: ["n28", "n41", "n78", "B1", "B3"],
    antennas: ["ASiR pCELL", "Indoor Omni 4x4", "Industrial Panel"],
    radioUnits: ["AirScale Indoor Radio", "ASiR-pRRH", "AirScale BBU"],
    advantages: ["Balanced cost / performance", "Fast delivery", "Industrial certified"],
    notes: "Strong balance of lead time and price for private industrial deployments.",
    compatibility: "Full compatibility with the optimized antenna layout.",
  },
  huawei: {
    vendorId: "huawei",
    productFamily: "LampSite / LampSite EE",
    bands: ["n28", "n41", "n78", "n258"],
    antennas: ["pRRU 5963", "pRRU 5961", "LampSite Panel"],
    radioUnits: ["rHUB 5963", "BBU 5900", "pRRU EE"],
    advantages: ["Lowest equipment cost", "High port density", "Wide band support"],
    notes: "Lowest cost option; verify regional import and regulatory restrictions.",
    compatibility: "Full compatibility; mmWave n258 available for future expansion.",
  },
  cisco: {
    vendorId: "cisco",
    productFamily: "Private 5G / Catalyst Transport",
    bands: ["n48 CBRS", "n78", "B48"],
    antennas: ["Partner indoor omni", "Partner directional"],
    radioUnits: ["Ultra-Reliable Wireless Backhaul", "Partner RU ecosystem"],
    advantages: ["Best transport layer", "Shortest lead time", "Enterprise IT integration"],
    notes: "Transport and network layer strength; radio units sourced from partner ecosystem.",
    compatibility: "Radio compatibility depends on the selected partner RU family.",
  },
  samsung: {
    vendorId: "samsung",
    productFamily: "Compact Indoor / vRAN",
    bands: ["n41", "n78", "n258"],
    antennas: ["Indoor Compact Radio", "Link Cell"],
    radioUnits: ["Compact Macro", "vRAN 3.0 DU"],
    advantages: ["Compact form factor", "vRAN ready", "Competitive pricing"],
    notes: "Good fit where ceiling space and rack units are constrained.",
    compatibility: "Full compatibility with ceiling and wall placements.",
  },
  mavenir: {
    vendorId: "mavenir",
    productFamily: "Open RAN Software Suite",
    bands: ["n48 CBRS", "n78", "B3"],
    antennas: ["Open RAN indoor radio", "Third-party O-RU"],
    radioUnits: ["OpenBeam O-RU", "Containerized DU / CU"],
    advantages: ["Open architecture", "No vendor lock-in", "Software-centric upgrades"],
    notes: "Open RAN stack with mixed hardware sourcing; integration effort is higher.",
    compatibility: "O-RAN compliant; validate O-RU interoperability before ordering.",
  },
  auto: {
    vendorId: "auto",
    productFamily: "Best-price multi-vendor mix",
    bands: ["n28", "n41", "n78", "n258"],
    antennas: ["Selected per lowest compliant price"],
    radioUnits: ["Selected per lowest compliant price"],
    advantages: ["Lowest blended cost", "Automatic comparison"],
    notes: "Reference engine picks the cheapest compliant unit per line item.",
    compatibility: "Compatibility verified per line item at ordering time.",
  },
  custom: {
    vendorId: "custom",
    productFamily: "Manual / customer supplied",
    bands: ["Manual"],
    antennas: ["Manual entry"],
    radioUnits: ["Manual entry"],
    advantages: ["Full control of unit prices"],
    notes: "Neutral reference pricing — replace unit prices with negotiated contract prices.",
    compatibility: "Manual verification required.",
  },
};

export const vendorCatalog = (id: string): VendorCatalog => CATALOGS[id] ?? CATALOGS["custom"]!;

/* -------------------- vendor comparison -------------------- */

export interface VendorComparisonRow {
  vendorId: string;
  vendor: BomVendor;
  catalog: VendorCatalog;
  estimatedCost: number;
  equipment: string;
  availability: string;
  leadTimeDays: number;
  warranty: string;
  note: string;
  cheapest: boolean;
  fastest: boolean;
}

const COMPARISON_IDS = ["huawei", "nokia", "ericsson", "samsung", "mavenir", "cisco"];

/** Re-prices the generated BOM against every supported vendor catalog. */
export function compareVendors(
  design: OptimizedRfDesign,
  detection: EquipmentDetection,
  db: PricingDatabase = placeholderPricingDatabase,
): VendorComparisonRow[] {
  const rows = COMPARISON_IDS.map((id) => {
    const vendor = vendorById(id);
    const items = buildBomItems(design, detection, vendor, db);
    const cost = computeCost(items);
    const catalog = vendorCatalog(id);
    return {
      vendorId: id,
      vendor,
      catalog,
      estimatedCost: Number(cost.subtotal.toFixed(0)),
      equipment:
        id === "mavenir" ? "Open RAN" : `${detection.antennas} Antennas`,
      availability: vendor.availability,
      leadTimeDays: vendor.leadWeeks * 7,
      warranty: vendor.warranty,
      note: catalog.advantages[0] ?? vendor.note,
      cheapest: false,
      fastest: false,
    };
  }).sort((a, b) => a.estimatedCost - b.estimatedCost);

  const minCost = Math.min(...rows.map((r) => r.estimatedCost));
  const minLead = Math.min(...rows.map((r) => r.leadTimeDays));
  return rows.map((r) => ({
    ...r,
    cheapest: r.estimatedCost === minCost,
    fastest: r.leadTimeDays === minLead,
  }));
}

/* -------------------- procurement summary -------------------- */

export interface ProcurementOverview {
  vendorName: string;
  availabilityPercent: number;
  leadTimeDays: number;
  warranty: string;
  estimatedDelivery: string;
  status: "Ready" | "Pending Vendor" | "On Request";
  readiness: number;
}

const AVAILABILITY_PERCENT: Record<BomVendor["availability"], number> = {
  "In Stock": 95,
  Limited: 78,
  "On Request": 60,
};

export function procurementOverview(vendor: BomVendor, from = Date.now()): ProcurementOverview {
  const leadTimeDays = vendor.leadWeeks * 7;
  const delivery = new Date(from + leadTimeDays * 86_400_000);
  return {
    vendorName: vendor.name,
    availabilityPercent: AVAILABILITY_PERCENT[vendor.availability],
    leadTimeDays,
    warranty: vendor.warranty,
    estimatedDelivery: delivery.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    status:
      vendor.availability === "In Stock"
        ? "Ready"
        : vendor.availability === "Limited"
          ? "Pending Vendor"
          : "On Request",
    readiness: AVAILABILITY_PERCENT[vendor.availability],
  };
}

/* -------------------- AI cost optimization -------------------- */

export type OptimizationId = "antenna-category" | "cable-length" | "alt-vendor" | "install-complexity";

export interface CostOptimization {
  id: OptimizationId;
  title: string;
  description: string;
  saving: number;
  impact: string;
  difficulty: "Low" | "Medium" | "High";
  performanceChange: string;
}

const cheapestVendorId = "huawei";

/** Never mutates the approved RF design — it only re-prices the BOM. */
export function buildCostOptimizations(
  items: BomItem[],
  laborCost: number,
  vendor: BomVendor,
): CostOptimization[] {
  const catSum = (c: BomCategoryId) =>
    items.filter((i) => i.category === c).reduce((s, i) => s + i.totalPrice, 0);
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const alt = vendorById(cheapestVendorId);
  const vendorSaving =
    vendor.id === cheapestVendorId ? 0 : Math.max(0, subtotal * (1 - alt.factor / vendor.factor));
  return [
    {
      id: "antenna-category",
      title: "Replace Antenna Category",
      description:
        "Swap over-specified industrial antennas for indoor ceiling units in non-harsh zones.",
      saving: Math.round(catSum("antenna") * 0.18),
      impact: "No Coverage Loss",
      difficulty: "Low",
      performanceChange: "Coverage unchanged · SINR −0.1 dB",
    },
    {
      id: "cable-length",
      title: "Reduce Cable Length",
      description: "Re-route feeders through the shortest tray path between equipment rooms.",
      saving: Math.round(catSum("transmission") * 0.12),
      impact: "Minimal",
      difficulty: "Medium",
      performanceChange: "Insertion loss −0.2 dB",
    },
    {
      id: "alt-vendor",
      title: "Alternative Vendor",
      description: `Re-price the approved BOM against the ${alt.name} catalog.`,
      saving: Math.round(vendorSaving),
      impact: "Equivalent Performance",
      difficulty: "Medium",
      performanceChange: "No KPI change · lead time +2 weeks",
    },
    {
      id: "install-complexity",
      title: "Reduce Installation Complexity",
      description: "Group installations per floor to cut crew days and mobilisation overhead.",
      saving: Math.round(laborCost * 0.15),
      impact: "No KPI Change",
      difficulty: "Low",
      performanceChange: "No KPI change",
    },
  ];
}

/**
 * Local recalculation service (Module 5 architecture) applied to procurement:
 * only the line items affected by a recommendation are re-priced.
 */
export function applyOptimizations(
  items: BomItem[],
  applied: OptimizationId[],
  currentVendor: BomVendor,
): BomItem[] {
  let out = items;
  const reprice = (i: BomItem, unitPrice: number, quantity: number): BomItem => ({
    ...i,
    unitPrice: Number(unitPrice.toFixed(2)),
    quantity: Number(quantity.toFixed(2)),
    totalPrice: Number((unitPrice * quantity).toFixed(2)),
  });

  if (applied.includes("antenna-category")) {
    out = out.map((i) =>
      i.category === "antenna" ? reprice(i, i.unitPrice * 0.82, i.quantity) : i,
    );
  }
  if (applied.includes("cable-length")) {
    out = out.map((i) =>
      i.category === "transmission" && i.unit === "m"
        ? reprice(i, i.unitPrice, Math.round(i.quantity * 0.88))
        : i,
    );
  }
  if (applied.includes("alt-vendor")) {
    const alt = vendorById(cheapestVendorId);
    out = out.map((i) => ({
      ...reprice(i, (i.unitPrice / currentVendor.factor) * alt.factor, i.quantity),
      vendor: alt.name,
      availability: alt.availability,
      leadTime: `${alt.leadWeeks} weeks`,
      warranty: alt.warranty,
    }));
  }
  return out;
}

export const laborFactor = (applied: OptimizationId[]) =>
  applied.includes("install-complexity") ? 0.85 : 1;

/* -------------------- financial summary -------------------- */

export const TAX_RATE = 0.07;
export const CONTINGENCY_RATE = 0.03;

export interface FinancialSummary {
  equipment: number;
  network: number;
  installationMaterials: number;
  cable: number;
  labor: number;
  power: number;
  accessories: number;
  subtotal: number;
  tax: number;
  contingency: number;
  grandTotal: number;
}

export function financialSummary(cost: CostBreakdown, labor: number): FinancialSummary {
  const subtotal = cost.subtotal + labor;
  const tax = Number((subtotal * TAX_RATE).toFixed(0));
  const contingency = Number((subtotal * CONTINGENCY_RATE).toFixed(0));
  return {
    equipment: cost.equipment,
    network: cost.network,
    installationMaterials: cost.installation,
    cable: cost.cable,
    labor,
    power: cost.power,
    accessories: cost.accessories,
    subtotal: Number(subtotal.toFixed(2)),
    tax,
    contingency,
    grandTotal: Number((subtotal + tax + contingency).toFixed(0)),
  };
}

/* -------------------- engineering validation -------------------- */

export interface BomCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export function validateProcurement(input: {
  items: BomItem[];
  vendorId: string | null;
  labor: number;
  power: PowerEstimate;
  rack: RackEstimate;
  cables: CableSummary;
  cost: CostBreakdown;
}): { checks: BomCheck[]; passed: boolean } {
  const checks: BomCheck[] = [
    {
      id: "bom",
      label: "Engineering BOM",
      ok: input.items.length > 0,
      detail: input.items.length ? `${input.items.length} line items generated` : "No line items",
    },
    {
      id: "vendor",
      label: "Vendor",
      ok: Boolean(input.vendorId),
      detail: input.vendorId ? `${vendorById(input.vendorId).name} approved` : "No vendor selected",
    },
    {
      id: "prices",
      label: "Equipment Prices",
      ok: input.items.every((i) => i.unitPrice > 0),
      detail: "All unit prices resolved from the pricing database",
    },
    {
      id: "labor",
      label: "Labor Estimation",
      ok: input.labor > 0,
      detail: `${money(input.labor)} estimated`,
    },
    {
      id: "power",
      label: "Power Estimation",
      ok: input.power.totalWatts > 0,
      detail: `${input.power.totalWatts} W total load`,
    },
    {
      id: "rack",
      label: "Rack Space",
      ok: input.rack.utilization <= 95,
      detail: `${input.rack.used}U of ${input.rack.cabinetSize}U used`,
    },
    {
      id: "cable",
      label: "Cable Summary",
      ok: input.cables.totalMeters > 0,
      detail: `${input.cables.totalMeters} m · ${input.cables.complexity} complexity`,
    },
    {
      id: "cost",
      label: "Cost Estimation",
      ok: input.cost.subtotal > 0,
      detail: `${money(input.cost.subtotal)} equipment subtotal`,
    },
  ];
  return { checks, passed: checks.every((c) => c.ok) };
}

/* -------------------- BOM versions -------------------- */

export interface BomVersionRecord {
  version: number;
  at: number;
  vendor: string;
  items: number;
  grandTotal: number;
  optimizations: OptimizationId[];
  label: string;
}
