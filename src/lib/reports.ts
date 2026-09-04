/* ==================================================================
 * Module 7 — Final Reports & Export Center (Part 1)
 *
 * This module performs NO RF or cost engineering. It only collects the
 * engineering objects produced by Modules 1–6 and transforms them into
 * professional documents: chapters, reports, engineering maps and the
 * report library. All content generation is pure so future report
 * templates can be added without touching the workflow.
 * ================================================================== */

import { useSyncExternalStore } from "react";
import type { Project } from "./building-model";
import type { RfConfig } from "./rf-config";
import type { RfProfileConfig } from "./rf-profile";
import type { InitialRfDesign, RfLayerId } from "./rf-simulation";
import type { OptimizedRfDesign } from "./rf-optimization";
import { money, money2, categoryMeta, TAX_RATE, CONTINGENCY_RATE, type EngineeringBom } from "./bom";

/* -------------------- workflow stages -------------------- */

export interface ReportTask {
  id: string;
  label: string;
}

export interface ReportStage {
  id: "collect" | "chapters" | "builder";
  title: string;
  note: string;
  pace: number;
  tasks: ReportTask[];
}

export const REPORT_STAGES: ReportStage[] = [
  {
    id: "collect",
    title: "Collecting Engineering Data",
    note: "Reading every engineering object created across the project lifecycle",
    pace: 260,
    tasks: [
      { id: "project", label: "Reading Project Information" },
      { id: "building", label: "Reading Digital Building" },
      { id: "requirements", label: "Reading RF Requirements" },
      { id: "profile", label: "Reading RF Profile" },
      { id: "initial", label: "Reading Initial RF Design" },
      { id: "optimized", label: "Reading Optimized RF Design" },
      { id: "bom", label: "Reading Engineering BOM" },
      { id: "cost", label: "Reading Cost Estimation" },
      { id: "metadata", label: "Reading Engineering Metadata" },
    ],
  },
  {
    id: "chapters",
    title: "Generating Report Chapters",
    note: "Each chapter is generated independently so templates can reuse it",
    pace: 330,
    tasks: [
      { id: "executive", label: "Generating Executive Summary" },
      { id: "project", label: "Generating Project Overview" },
      { id: "building", label: "Generating Building Information" },
      { id: "rf", label: "Generating RF Engineering Chapter" },
      { id: "simulation", label: "Generating Simulation Chapter" },
      { id: "optimization", label: "Generating Optimization Chapter" },
      { id: "cost", label: "Generating Cost Estimation Chapter" },
      { id: "bom", label: "Generating Bill of Materials Chapter" },
      { id: "installation", label: "Generating Installation Summary" },
      { id: "metadata", label: "Generating Project Metadata" },
    ],
  },
  {
    id: "builder",
    title: "Report Builder Engine",
    note: "Assembling all chapters into one engineering document set",
    pace: 300,
    tasks: [
      { id: "structure", label: "Building Report Structure" },
      { id: "toc", label: "Creating Table of Contents" },
      { id: "cover", label: "Generating Cover Page" },
      { id: "chapters", label: "Building Chapters" },
      { id: "figures", label: "Generating Figures" },
      { id: "tables", label: "Generating Tables" },
      { id: "appendices", label: "Creating Appendices" },
    ],
  },
];

export const TOTAL_REPORT_TASKS = REPORT_STAGES.reduce((n, s) => n + s.tasks.length, 0);
export const estimatedReportStageMs = (s: ReportStage) => s.tasks.length * s.pace;
export const ESTIMATED_REPORT_MS = REPORT_STAGES.reduce(
  (n, s) => n + estimatedReportStageMs(s),
  0,
);

/* -------------------- engineering context -------------------- */

export interface ReportContext {
  project: Project;
  config: RfConfig;
  profile: RfProfileConfig;
  initial: InitialRfDesign;
  optimized: OptimizedRfDesign;
  bom: EngineeringBom;
}

const pct = (n: number) => `${n.toFixed(1)}%`;
const num = (n: number) => n.toLocaleString("en-US");
export const reportDate = (t: number) =>
  new Date(t).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

/* -------------------- chapters -------------------- */

export type ChapterId =
  | "executive"
  | "project"
  | "building"
  | "requirements"
  | "profile"
  | "simulation"
  | "optimization"
  | "bom"
  | "cost"
  | "installation"
  | "metadata";

export interface ChapterSection {
  heading: string;
  text?: string;
  rows?: [string, string][];
  table?: { head: string[]; rows: string[][] };
  bullets?: string[];
}

export interface ReportChapter {
  id: ChapterId;
  title: string;
  summary: string;
  sections: ChapterSection[];
}

export const CHAPTER_ORDER: ChapterId[] = [
  "executive",
  "project",
  "building",
  "requirements",
  "profile",
  "simulation",
  "optimization",
  "bom",
  "cost",
  "installation",
  "metadata",
];

export const CHAPTER_LABELS: Record<ChapterId, string> = {
  executive: "Executive Summary",
  project: "Project Information",
  building: "Building Information",
  requirements: "RF Requirements",
  profile: "RF Profile",
  simulation: "Simulation Results",
  optimization: "Optimization Results",
  bom: "Engineering BOM",
  cost: "Cost Estimation",
  installation: "Installation Summary",
  metadata: "Project Metadata",
};

function techLabel(ctx: ReportContext) {
  return ctx.optimized.projectInformation.technology || (ctx.config.technology === "5g" ? "Private 5G" : "Private LTE");
}

export function buildChapter(id: ChapterId, ctx: ReportContext): ReportChapter {
  const { project, config, profile, initial, optimized, bom } = ctx;
  const k = optimized.kpis;
  const fin = bom.financialSummary;
  const model = project.model;
  const rooms = model.objects.filter((o) => o.kind === "room").length;
  const walls = model.objects.filter((o) => o.kind === "wall").length;

  const make = (title: string, summary: string, sections: ChapterSection[]): ReportChapter => ({
    id,
    title,
    summary,
    sections,
  });

  switch (id) {
    case "executive":
      return make("Executive Summary", "High-level overview for customers and executives", [
        {
          heading: "Project Overview",
          rows: [
            ["Project", project.name],
            ["Technology", techLabel(ctx)],
            ["Deployment", config.purpose ? config.purpose : "Indoor"],
            ["Building type", project.buildingType],
            ["Country", project.country],
          ],
        },
        {
          heading: "Coverage Summary",
          rows: [
            ["Coverage achieved", pct(k.coverage)],
            ["Dead zones", num(k.deadZones)],
            ["Average RSRP", `${k.avgRsrp.toFixed(1)} dBm`],
          ],
        },
        {
          heading: "Capacity Summary",
          rows: [
            ["Capacity headroom", pct(k.capacity)],
            ["Antennas deployed", num(k.antennas)],
            ["Average SINR", `${k.avgSinr.toFixed(1)} dB`],
          ],
        },
        {
          heading: "Estimated Cost",
          rows: [
            ["Equipment & materials", money(fin.subtotal)],
            ["Tax", money(fin.tax)],
            ["Contingency", money(fin.contingency)],
            ["Grand total", money(fin.grandTotal)],
          ],
        },
        {
          heading: "Project KPIs",
          table: {
            head: ["KPI", "Value", "Target", "Status"],
            rows: [
              ["Coverage", pct(k.coverage), "95.0%", k.coverage >= 95 ? "Pass" : "Review"],
              ["Capacity", pct(k.capacity), "90.0%", k.capacity >= 90 ? "Pass" : "Review"],
              ["Dead zones", num(k.deadZones), "0", k.deadZones === 0 ? "Pass" : "Review"],
              ["BOM validation", bom.validation.passed ? "Passed" : "Open items", "Passed", bom.validation.passed ? "Pass" : "Review"],
            ],
          },
        },
        {
          heading: "Recommendations",
          bullets: optimized.engineeringRecommendations.length
            ? optimized.engineeringRecommendations.slice(0, 6).map((r) => `${r.title} — ${r.improvement} (${r.area})`)
            : ["No outstanding engineering recommendations. Design is ready for deployment."],
        },
        {
          heading: "Engineering Status",
          rows: [
            ["Digital Twin", "Validated"],
            ["RF Requirements", "Approved"],
            ["RF Profile", "Approved"],
            ["Optimized RF Design", optimized.validationReport.passed ? "Approved" : "Under review"],
            ["Engineering BOM", `Version ${bom.version}`],
          ],
        },
      ]);

    case "project":
      return make("Project Overview", "Project identity, ownership and lifecycle", [
        {
          heading: "Project Information",
          rows: [
            ["Project name", project.name],
            ["Project ID", project.id],
            ["Building type", project.buildingType],
            ["Country", project.country],
            ["Network", project.network.toUpperCase()],
            ["Created", reportDate(project.createdAt)],
            ["Last updated", reportDate(project.updatedAt)],
          ],
        },
        {
          heading: "Source Documents",
          table: {
            head: ["File", "Type", "Status"],
            rows: project.files.length
              ? project.files.map((f) => [f.name, f.type || "—", "Imported"])
              : [["—", "—", "No source files attached"]],
          },
        },
      ]);

    case "building":
      return make("Building Information", "Digital Twin geometry and materials", [
        {
          heading: "Geometry",
          rows: [
            ["Rooms", num(rooms)],
            ["Walls", num(walls)],
            ["Columns", num(model.objects.filter((o) => o.kind === "column").length)],
            ["Openings", num(model.objects.filter((o) => o.kind === "door" || o.kind === "window").length)],
            ["Scale", `${model.scale} px/m`],
          ],
        },
        {
          heading: "Processed Geometry",
          rows: [
            ["Processed walls", num(initial.simulationResults.processedGeometry.walls)],
            ["Processed rooms", num(initial.simulationResults.processedGeometry.rooms)],
            ["Material loss", `${initial.simulationResults.environment.materialLossDb.toFixed(1)} dB`],
            ["Penetration index", initial.simulationResults.environment.penetrationIndex.toFixed(2)],
          ],
        },
      ]);

    case "requirements":
      return make("RF Requirements", "Module 2 RF Design Requirements Package", [
        {
          heading: "Design Requirements",
          rows: [
            ["Technology", techLabel(ctx)],
            ["Deployment purpose", config.purpose || "—"],
            ["Services", config.services.join(", ") || "—"],
            ["Coverage vs cost", `${config.coverageBias}/100`],
            ["Capacity priority", config.capacity ?? "—"],
            ["Preferred vendor", bom.vendor.name],
          ],
        },
        {
          heading: "Critical & Restricted Areas",
          rows: [
            ["Critical areas", num(Object.keys(config.roomPriorities ?? {}).length)],
            ["Restricted zones", num(config.restricted?.length ?? 0)],
            ["Design goals", (config.goals ?? []).join(", ") || "—"],
          ],
        },
      ]);

    case "profile":
      return make("RF Profile", "Module 3 RF parameter configuration", [
        {
          heading: "Frequency Profile",
          rows: [
            ["Band", profile.band ?? "—"],
            ["Channel bandwidth", profile.bandwidth && profile.bandwidth !== "auto" ? `${profile.bandwidth} MHz` : "Auto"],
            ["Antenna category", profile.antennaCategory ?? "—"],
            ["Propagation environment", profile.propagation ?? "—"],
            ["Ceiling height", `${config.ceiling.height} m`],
            ["Floors", num(profile.floors.length)],
          ],
        },
        {
          heading: "Link Budget",
          rows: Object.entries(initial.simulationResults.linkBudget).map(([key, value]) => [
            key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
            String(value),
          ]) as [string, string][],
        },
      ]);

    case "simulation":
      return make("Simulation Results", "Module 4 initial RF simulation output", [
        {
          heading: "Coverage Results",
          rows: [
            ["Grid cells", num(initial.simulationResults.coverage.gridCells)],
            ["Covered", pct(initial.simulationResults.coverage.coveredPct)],
            ["Floors simulated", num(initial.simulationResults.coverage.floors)],
          ],
        },
        {
          heading: "Capacity Results",
          rows: [
            ["Users", num(initial.simulationResults.capacity.users)],
            ["IoT devices", num(initial.simulationResults.capacity.iot)],
            ["Traffic", `${initial.simulationResults.capacity.trafficMbps} Mbps`],
            ["Sector capacity", `${initial.simulationResults.capacity.sectorCapacityMbps} Mbps`],
            ["Congested cells", num(initial.simulationResults.capacity.congestedCells)],
          ],
        },
        {
          heading: "Signal Analysis",
          table: {
            head: ["Metric", "Initial design", "Optimized design", "Delta"],
            rows: [
              ["SINR (dB)", initial.kpis.avgSinr.toFixed(1), k.avgSinr.toFixed(1), (k.avgSinr - initial.kpis.avgSinr).toFixed(1)],
              ["RSRP (dBm)", initial.kpis.avgRsrp.toFixed(1), k.avgRsrp.toFixed(1), (k.avgRsrp - initial.kpis.avgRsrp).toFixed(1)],
              ["RSRQ (dB)", initial.kpis.avgRsrq.toFixed(1), k.avgRsrq.toFixed(1), (k.avgRsrq - initial.kpis.avgRsrq).toFixed(1)],
              ["Coverage (%)", initial.kpis.coverage.toFixed(1), k.coverage.toFixed(1), (k.coverage - initial.kpis.coverage).toFixed(1)],
            ],
          },
        },
        {
          heading: "Engineering KPIs",
          rows: [
            ["Simulation engine", initial.simulationMetadata.engine],
            ["Engine version", initial.simulationMetadata.engineVersion],
            ["Simulation duration", `${initial.simulationDurationSeconds.toFixed(1)} s`],
            ["Optimization iterations", num(initial.simulationResults.optimization.iterations)],
          ],
        },
      ]);

    case "optimization":
      return make("Optimization Results", "Module 5 interactive optimization output", [
        {
          heading: "Optimization Summary",
          rows: [
            ["Modifications", num(optimized.optimizationResults.modifications)],
            ["Coverage delta", `${optimized.optimizationResults.coverageDelta} %`],
            ["Capacity delta", `${optimized.optimizationResults.capacityDelta} %`],
            ["Antenna delta", String(optimized.optimizationResults.antennaDelta)],
            ["Cost index", optimized.optimizationResults.estimatedCost],
            ["Version", optimized.versionInformation.current],
          ],
        },
        {
          heading: "Engineering Validation",
          table: {
            head: ["Check", "Status", "Detail"],
            rows: optimized.validationReport.items.map((i) => [i.label, i.pass ? "Pass" : "Review", i.detail]),
          },
        },
        {
          heading: "Warnings",
          table: {
            head: ["Severity", "Title", "Location"],
            rows: optimized.warnings.length
              ? optimized.warnings.map((w) => [w.severity, w.title, w.location])
              : [["—", "No open warnings", "—"]],
          },
        },
      ]);

    case "bom":
      return make("Engineering Bill of Materials", "Module 6 procurement package", [
        {
          heading: "Equipment Quantities",
          table: {
            head: ["Item", "Category", "Qty", "Unit price", "Total"],
            rows: bom.items.map((i) => [
              i.name,
              categoryMeta(i.category).label,
              `${i.quantity} ${i.unit}`,
              money2(i.unitPrice),
              money2(i.totalPrice),
            ]),
          },
        },
        {
          heading: "Cable Summary",
          rows: [
            ["Ethernet (Cat6)", `${bom.cables.cat6} m`],
            ["Fiber", `${bom.cables.fiber} m`],
            ["Power cable", `${bom.cables.power} m`],
            ["Ground cable", `${bom.cables.ground} m`],
            ["Cabling complexity", bom.cables.complexity],
          ],
        },
        {
          heading: "Rack Information",
          rows: [
            ["Cabinets", num(bom.rack.cabinets)],
            ["Used units", `${bom.rack.used} U`],
            ["Spare units", `${bom.rack.remaining} U`],
            ["Utilization", `${bom.rack.utilization}%`],
          ],
        },
      ]);

    case "cost":
      return make("Cost Estimation", "Financial summary and procurement position", [
        {
          heading: "Cost Breakdown",
          table: {
            head: ["Cost element", "Amount"],
            rows: [
              ["Radio equipment", money2(bom.cost.equipment)],
              ["Network equipment", money2(bom.cost.network)],
              ["Power equipment", money2(bom.cost.power)],
              ["Cable & materials", money2(bom.cost.cable)],
              ["Accessories", money2(bom.cost.accessories)],
              ["Installation labor", money2(bom.labor.total)],
              ["Subtotal", money2(fin.subtotal)],
              [`Tax (${(TAX_RATE * 100).toFixed(0)}%)`, money2(fin.tax)],
              [`Contingency (${(CONTINGENCY_RATE * 100).toFixed(0)}%)`, money2(fin.contingency)],
              ["Grand total", money2(fin.grandTotal)],
            ],
          },
        },
        {
          heading: "Vendor Information",
          rows: [
            ["Vendor", bom.vendor.name],
            ["Availability", bom.vendor.availability],
            ["Lead time", bom.vendor.leadTime],
            ["Warranty", bom.vendor.warranty],
          ],
        },
        {
          heading: "Procurement Summary",
          rows: [
            ["Line items", num(bom.procurementSummary.equipmentItems)],
            ["Total quantity", num(bom.procurementSummary.totalQuantity)],
            ["Project cost", money(bom.procurementSummary.estimatedProjectCost)],
            ["Readiness", `${bom.procurementSummary.readiness}%`],
            ["AI savings applied", money(bom.aiCostOptimization.totalSaving)],
          ],
        },
      ]);

    case "installation":
      return make("Installation Summary", "Deployment-ready installation documentation", [
        {
          heading: "Installation Sequence",
          bullets: [
            "Site survey and access confirmation",
            "Rack and power infrastructure installation",
            "Cable tray, fiber and ethernet routing",
            "Antenna mounting per layout coordinates",
            "Radio unit commissioning and integration",
            "Coverage acceptance walk test",
          ],
        },
        {
          heading: "Equipment Locations",
          table: {
            head: ["Antenna", "Area", "X (m)", "Y (m)", "Height (m)", "Tx (dBm)"],
            rows: optimized.optimizedAntennaLayout.map((a) => [
              a.label,
              a.roomName,
              a.x.toFixed(1),
              a.y.toFixed(1),
              a.height.toFixed(1),
              a.txPower.toFixed(0),
            ]),
          },
        },
        {
          heading: "Required Materials",
          rows: [
            ["Mounting kits", num(optimized.optimizedAntennaLayout.length)],
            ["Ethernet (Cat6)", `${bom.cables.cat6} m`],
            ["Fiber", `${bom.cables.fiber} m`],
            ["Cabinets", num(bom.rack.cabinets)],
          ],
        },
        {
          heading: "Safety Notes",
          bullets: [
            "Verify RF exposure limits before powering radios in occupied areas.",
            "Respect all restricted zones defined in the RF requirements package.",
            "Use certified lifting equipment for ceiling-mounted installations.",
            "Confirm electrical isolation before power equipment installation.",
          ],
        },
        {
          heading: "Installation Checklist",
          table: {
            head: ["Step", "Owner", "Status"],
            rows: [
              ["Site access approved", "Project manager", "Pending"],
              ["Materials delivered", "Procurement", "Pending"],
              ["Antennas mounted", "Installation team", "Pending"],
              ["Commissioning complete", "RF engineer", "Pending"],
              ["Acceptance test signed", "Customer", "Pending"],
            ],
          },
        },
      ]);

    case "metadata":
    default:
      return make("Project Metadata", "Engineering traceability record", [
        {
          heading: "Engineering Objects",
          rows: [
            ["Digital Building", bom.references.digitalBuilding],
            ["RF Requirements", bom.references.rfDesignRequirements],
            ["RF Profile", bom.references.rfProfile],
            ["Initial RF Design", bom.references.initialRfDesign],
            ["Optimized RF Design", bom.references.optimizedRfDesign],
            ["Engineering BOM", `${project.id}:engineering-bom:${bom.version}`],
          ],
        },
        {
          heading: "Engines",
          rows: [
            ["Simulation engine", `${initial.simulationMetadata.engine} ${initial.simulationMetadata.engineVersion}`],
            ["Recalculation service", optimized.simulationMetadata.recalculationService],
            ["Pricing database", `${bom.pricingMetadata.database} ${bom.pricingMetadata.databaseVersion}`],
            ["Currency", bom.pricingMetadata.currency],
          ],
        },
      ]);
  }
}

export function buildAllChapters(ctx: ReportContext): ReportChapter[] {
  return CHAPTER_ORDER.map((id) => buildChapter(id, ctx));
}

/* -------------------- report definitions -------------------- */

export type ReportId =
  | "executive-summary"
  | "rf-engineering"
  | "cost-estimation"
  | "engineering-bom"
  | "installation-guide"
  | "simulation-results";

export interface ReportDefinition {
  id: ReportId;
  title: string;
  type: string;
  description: string;
  purpose: string;
  chapters: ChapterId[];
  formats: ("pdf" | "excel")[];
}

export const REPORT_DEFS: ReportDefinition[] = [
  {
    id: "executive-summary",
    title: "Executive Summary",
    type: "Customer deliverable",
    description: "High-level overview for customers, executives and project managers.",
    purpose: "Communicate scope, performance and investment in one document.",
    chapters: ["executive", "project", "building"],
    formats: ["pdf"],
  },
  {
    id: "rf-engineering",
    title: "RF Engineering Report",
    type: "Engineering document",
    description: "Complete RF engineering documentation of the approved design.",
    purpose: "Full technical record of the radio design and its validation.",
    chapters: ["requirements", "profile", "simulation", "optimization"],
    formats: ["pdf"],
  },
  {
    id: "cost-estimation",
    title: "Cost Estimation Report",
    type: "Financial document",
    description: "Dedicated financial report with tax, contingency and grand total.",
    purpose: "Budget approval and procurement negotiation.",
    chapters: ["cost", "project"],
    formats: ["pdf"],
  },
  {
    id: "engineering-bom",
    title: "Engineering Bill of Materials",
    type: "Procurement document",
    description: "Professional procurement report with quantities and pricing.",
    purpose: "Issue purchase orders directly from the engineering package.",
    chapters: ["bom", "cost"],
    formats: ["pdf", "excel"],
  },
  {
    id: "installation-guide",
    title: "Installation Guide",
    type: "Field document",
    description: "Deployment-ready installation document for the field team.",
    purpose: "Guide installation teams through a compliant deployment.",
    chapters: ["installation", "building"],
    formats: ["pdf"],
  },
  {
    id: "simulation-results",
    title: "Simulation Results",
    type: "Engineering document",
    description: "Engineering simulation report with coverage and capacity analysis.",
    purpose: "Evidence of predicted network performance.",
    chapters: ["simulation", "optimization"],
    formats: ["pdf"],
  },
];

export const reportDef = (id: ReportId) =>
  REPORT_DEFS.find((r) => r.id === id) ?? REPORT_DEFS[0]!;

/* -------------------- report documents -------------------- */

export interface ReportPage {
  index: number;
  title: string;
  sections: ChapterSection[];
}

export interface ReportDocument {
  id: ReportId;
  title: string;
  subtitle: string;
  cover: { project: string; technology: string; version: string; generatedAt: number; author: string };
  toc: { title: string; page: number }[];
  pages: ReportPage[];
  figures: number;
  tables: number;
}

const SECTION_PAGE_SIZE = 3;

export function buildReportDocument(
  id: ReportId,
  ctx: ReportContext,
  version = "v1.0",
  generatedAt = Date.now(),
): ReportDocument {
  const def = reportDef(id);
  const chapters = def.chapters.map((c) => buildChapter(c, ctx));
  const pages: ReportPage[] = [];

  for (const chapter of chapters) {
    for (let i = 0; i < chapter.sections.length; i += SECTION_PAGE_SIZE) {
      const slice = chapter.sections.slice(i, i + SECTION_PAGE_SIZE);
      pages.push({
        index: pages.length + 1,
        title: i === 0 ? chapter.title : `${chapter.title} (cont.)`,
        sections: slice,
      });
    }
  }

  const appendix: ReportPage = {
    index: pages.length + 1,
    title: "Appendix — Engineering References",
    sections: [
      {
        heading: "Referenced Engineering Objects",
        rows: [
          ["Digital Building", ctx.bom.references.digitalBuilding],
          ["RF Requirements", ctx.bom.references.rfDesignRequirements],
          ["RF Profile", ctx.bom.references.rfProfile],
          ["Initial RF Design", ctx.bom.references.initialRfDesign],
          ["Optimized RF Design", ctx.bom.references.optimizedRfDesign],
        ],
      },
    ],
  };
  pages.push(appendix);

  const tables = pages.reduce(
    (n, p) => n + p.sections.filter((s) => s.table || s.rows).length,
    0,
  );

  return {
    id,
    title: def.title,
    subtitle: def.description,
    cover: {
      project: ctx.project.name,
      technology: techLabel(ctx),
      version,
      generatedAt,
      author: "AI Private Cellular Planner",
    },
    toc: pages.map((p) => ({ title: p.title, page: p.index })),
    pages,
    figures: MAP_DEFS.length,
    tables,
  };
}

/* -------------------- engineering maps -------------------- */

export interface MapDefinition {
  id: string;
  title: string;
  description: string;
  layer: RfLayerId | null;
}

export const MAP_DEFS: MapDefinition[] = [
  { id: "coverage", title: "Coverage Map", description: "Predicted signal coverage footprint", layer: "coverage" },
  { id: "capacity", title: "Capacity Map", description: "Throughput distribution per grid cell", layer: "capacity" },
  { id: "sinr", title: "SINR Map", description: "Signal to interference and noise ratio", layer: "sinr" },
  { id: "rsrp", title: "RSRP Map", description: "Reference signal received power", layer: "rsrp" },
  { id: "rsrq", title: "RSRQ Map", description: "Reference signal received quality", layer: "rsrq" },
  { id: "interference", title: "Interference Map", description: "Cell overlap and interference risk", layer: "interference" },
  { id: "critical", title: "Critical Areas Map", description: "Priority areas defined in RF requirements", layer: "critical" },
  { id: "antenna", title: "Antenna Layout Map", description: "Approved antenna positions and coverage radii", layer: null },
];

/* -------------------- report library state -------------------- */

export interface ReportRecord {
  key: string;
  reportId: ReportId;
  name: string;
  type: string;
  version: string;
  generatedAt: number;
  status: "Ready" | "Regenerating" | "Draft";
  pages: number;
  chapters: ChapterId[];
}

export interface ReportLogEntry {
  at: number;
  text: string;
  kind: "info" | "ok" | "calc";
}

export interface ReportsState {
  status: "idle" | "running" | "done";
  stageIndex: number;
  taskIndex: number;
  startedAt: number | null;
  finishedAt: number | null;
  chaptersDone: ChapterId[];
  mapsDone: string[];
  reports: ReportRecord[];
  log: ReportLogEntry[];
  updatedAt: number;
}

export const emptyReportsState = (): ReportsState => ({
  status: "idle",
  stageIndex: 0,
  taskIndex: 0,
  startedAt: null,
  finishedAt: null,
  chaptersDone: [],
  mapsDone: [],
  reports: [],
  log: [],
  updatedAt: Date.now(),
});

const KEY = "apcp.reports.v1";

let cache: Record<string, ReportsState> | null = null;
const listeners = new Set<() => void>();

function readAll(): Record<string, ReportsState> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ReportsState>) : {};
    cache = Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, { ...emptyReportsState(), ...v }]),
    );
  } catch {
    cache = {};
  }
  return cache;
}

function writeAll(next: Record<string, ReportsState>) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* keep in-memory state authoritative */
    }
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const EMPTY: Record<string, ReportsState> = {};

export function useReportsState(projectId: string): ReportsState {
  const all = useSyncExternalStore(
    subscribe,
    () => readAll(),
    () => EMPTY,
  );
  return all[projectId] ?? emptyReportsState();
}

export function saveReportsState(projectId: string, patch: Partial<ReportsState>) {
  const all = readAll();
  const current = all[projectId] ?? emptyReportsState();
  writeAll({ ...all, [projectId]: { ...current, ...patch, updatedAt: Date.now() } });
}

export function resetReportsState(projectId: string) {
  const all = readAll();
  writeAll({ ...all, [projectId]: emptyReportsState() });
}

/* -------------------- document rendering / export -------------------- */

function sectionToText(s: ChapterSection): string[] {
  const out: string[] = [`  ${s.heading}`, `  ${"-".repeat(s.heading.length)}`];
  if (s.text) out.push(`  ${s.text}`);
  for (const [k, v] of s.rows ?? []) out.push(`    ${k.padEnd(28, ".")} ${v}`);
  for (const b of s.bullets ?? []) out.push(`    • ${b}`);
  if (s.table) {
    out.push(`    ${s.table.head.join(" | ")}`);
    for (const r of s.table.rows) out.push(`    ${r.join(" | ")}`);
  }
  out.push("");
  return out;
}

export function documentToText(doc: ReportDocument) {
  const lines: string[] = [
    "=".repeat(72),
    doc.title.toUpperCase(),
    doc.subtitle,
    "=".repeat(72),
    `Project      : ${doc.cover.project}`,
    `Technology   : ${doc.cover.technology}`,
    `Version      : ${doc.cover.version}`,
    `Generated    : ${reportDate(doc.cover.generatedAt)}`,
    `Generated by : ${doc.cover.author}`,
    "",
    "TABLE OF CONTENTS",
    ...doc.toc.map((t) => `  ${String(t.page).padStart(2, "0")}  ${t.title}`),
    "",
  ];
  for (const page of doc.pages) {
    lines.push("-".repeat(72), `PAGE ${page.index} — ${page.title}`, "-".repeat(72));
    for (const s of page.sections) lines.push(...sectionToText(s));
  }
  return lines.join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function documentToHtml(doc: ReportDocument) {
  const body = doc.pages
    .map(
      (p) => `<section class="page"><h2>${esc(p.title)}</h2>${p.sections
        .map((s) => {
          const rows = s.rows
            ? `<table>${s.rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>`
            : "";
          const bullets = s.bullets ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
          const table = s.table
            ? `<table><thead><tr>${s.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows
                .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
                .join("")}</tbody></table>`
            : "";
          return `<h3>${esc(s.heading)}</h3>${s.text ? `<p>${esc(s.text)}</p>` : ""}${rows}${bullets}${table}`;
        })
        .join("")}<footer>${esc(doc.title)} · ${esc(doc.cover.project)} · Page ${p.index}</footer></section>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
<style>
body{font-family:"Plus Jakarta Sans",Arial,sans-serif;color:#111827;margin:0;padding:32px;background:#f8fafc}
.cover{border:1px solid #e2e8f0;border-radius:16px;padding:48px;background:#fff;margin-bottom:24px}
.cover h1{font-size:32px;margin:0 0 8px}
.page{border:1px solid #e2e8f0;border-radius:16px;padding:32px;background:#fff;margin-bottom:20px;page-break-after:always}
h2{font-size:20px;margin:0 0 16px}h3{font-size:14px;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.04em;color:#475569}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}th{background:#f1f5f9}
footer{margin-top:24px;font-size:11px;color:#94a3b8}
</style></head><body>
<div class="cover"><h1>${esc(doc.title)}</h1><p>${esc(doc.subtitle)}</p>
<p><strong>Project:</strong> ${esc(doc.cover.project)} &middot; <strong>Technology:</strong> ${esc(doc.cover.technology)}</p>
<p><strong>Version:</strong> ${esc(doc.cover.version)} &middot; <strong>Generated:</strong> ${esc(reportDate(doc.cover.generatedAt))}</p>
<h3>Table of Contents</h3><ol>${doc.toc.map((t) => `<li>${esc(t.title)} — page ${t.page}</li>`).join("")}</ol></div>
${body}</body></html>`;
}

export function documentToExcelXml(doc: ReportDocument) {
  const tables = doc.pages
    .flatMap((p) => p.sections)
    .map((s) => {
      if (s.table)
        return `<tr><td colspan="${s.table.head.length}"><b>${esc(s.heading)}</b></td></tr><tr>${s.table.head
          .map((h) => `<th>${esc(h)}</th>`)
          .join("")}</tr>${s.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}`;
      if (s.rows)
        return `<tr><td colspan="2"><b>${esc(s.heading)}</b></td></tr>${s.rows
          .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
          .join("")}`;
      return "";
    })
    .join("<tr></tr>");
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table>${tables}</table></body></html>`;
}

export function printDocument(doc: ReportDocument) {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(documentToHtml(doc));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

/* -------------------- live KPIs -------------------- */

export interface ReportKpis {
  reportsGenerated: number;
  chaptersCompleted: number;
  mapsGenerated: number;
  documentsReady: number;
  packageStatus: string;
  projectCompletion: number;
}

export function reportKpis(state: ReportsState): ReportKpis {
  const ready = state.reports.filter((r) => r.status === "Ready").length;
  const completion = Math.round(
    ((state.chaptersDone.length / CHAPTER_ORDER.length) * 0.4 +
      (state.mapsDone.length / MAP_DEFS.length) * 0.2 +
      (state.reports.length / REPORT_DEFS.length) * 0.4) *
      100,
  );
  return {
    reportsGenerated: state.reports.length,
    chaptersCompleted: state.chaptersDone.length,
    mapsGenerated: state.mapsDone.length,
    documentsReady: ready,
    packageStatus: state.status === "done" ? "Ready to export" : state.status === "running" ? "Generating" : "Not generated",
    projectCompletion: Math.min(100, completion),
  };
}
