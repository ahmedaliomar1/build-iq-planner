import { useSyncExternalStore } from "react";
import {
  CHAPTER_ORDER,
  MAP_DEFS,
  REPORT_DEFS,
  buildReportDocument,
  documentToExcelXml,
  documentToHtml,
  documentToText,
  reportDate,
  type ReportContext,
  type ReportId,
  type ReportsState,
} from "./reports";

/* ==================================================================
 * Module 7 Part 2 — Export Center / Package Generation
 * This module never recalculates engineering data. It only selects,
 * packages and validates artefacts produced by Modules 1–7 Part 1.
 * ================================================================== */

/* -------------------- export content catalogue -------------------- */

export type ExportItemKind = "report" | "map" | "data";

export interface ExportItem {
  id: string;
  label: string;
  group: "Documents" | "Engineering Maps" | "Project Data";
  kind: ExportItemKind;
  /** approximate contribution to the package size, in kilobytes */
  sizeKb: number;
  reportId?: ReportId;
  mapId?: string;
}

export const EXPORT_ITEMS: ExportItem[] = [
  ...REPORT_DEFS.map((d) => ({
    id: `report:${d.id}`,
    label: d.title,
    group: "Documents" as const,
    kind: "report" as const,
    sizeKb: 1400,
    reportId: d.id,
  })),
  ...MAP_DEFS.filter((m) => m.id !== "critical" && m.id !== "antenna").map((m) => ({
    id: `map:${m.id}`,
    label: `${m.title}s`.replace("Maps", "Maps"),
    group: "Engineering Maps" as const,
    kind: "map" as const,
    sizeKb: 900,
    mapId: m.id,
  })),
  {
    id: "data:metadata",
    label: "Project Metadata",
    group: "Project Data",
    kind: "data",
    sizeKb: 60,
  },
  {
    id: "data:configuration",
    label: "Engineering Configuration",
    group: "Project Data",
    kind: "data",
    sizeKb: 140,
  },
];

export const DEFAULT_SELECTION = EXPORT_ITEMS.map((i) => i.id);

export const EXPORT_GROUPS: ExportItem["group"][] = [
  "Documents",
  "Engineering Maps",
  "Project Data",
];

/* -------------------- export formats -------------------- */

export type ExportFormatId = "pdf" | "excel" | "png" | "zip" | "json";

export interface ExportFormat {
  id: ExportFormatId;
  label: string;
  note: string;
  extension: string;
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { id: "pdf", label: "PDF", note: "Print-ready engineering documents", extension: ".pdf" },
  { id: "excel", label: "Excel", note: "Bill of materials and cost tables", extension: ".xls" },
  { id: "png", label: "PNG Images", note: "Engineering maps as images", extension: ".png" },
  { id: "zip", label: "ZIP Package", note: "All selected files in one package", extension: ".zip" },
  { id: "json", label: "JSON", note: "Machine-readable engineering objects", extension: ".json" },
];

export const FUTURE_FORMATS = [
  { id: "docx", label: "DOCX", note: "Editable Word deliverables" },
  { id: "dwg", label: "DWG", note: "CAD antenna layout" },
  { id: "dxf", label: "DXF", note: "CAD interchange" },
  { id: "gis", label: "GIS Package", note: "GeoTIFF and shapefiles" },
  { id: "cloud", label: "Cloud Share", note: "Share link with the customer" },
];

/* -------------------- package information -------------------- */

export interface PackageInfo {
  name: string;
  version: string;
  author: string;
  company: string;
  description: string;
  notes: string;
}

const slug = (s: string) =>
  s
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Project";

export function defaultPackageName(projectName: string, technology: string) {
  return `${slug(projectName)}_${slug(technology)}_RF_Design`;
}

export const defaultPackageInfo = (projectName: string, technology: string): PackageInfo => ({
  name: defaultPackageName(projectName, technology),
  version: "v1.0",
  author: "Current User",
  company: "",
  description: "",
  notes: "",
});

/* -------------------- packaging workflow -------------------- */

export interface PackageTask {
  id: string;
  label: string;
}

export const PACKAGE_TASKS: PackageTask[] = [
  { id: "documents", label: "Collecting Documents" },
  { id: "reports", label: "Collecting Engineering Reports" },
  { id: "maps", label: "Collecting Engineering Maps" },
  { id: "bom", label: "Collecting Bill of Materials" },
  { id: "cost", label: "Collecting Cost Estimation" },
  { id: "pdf", label: "Generating PDF Files" },
  { id: "excel", label: "Generating Excel Files" },
  { id: "images", label: "Preparing Images" },
  { id: "json", label: "Generating JSON Metadata" },
  { id: "zip", label: "Creating ZIP Package" },
  { id: "manifest", label: "Building Package Manifest" },
  { id: "validation", label: "Final Validation" },
];

export const PACKAGE_PACE = 320;
export const ESTIMATED_PACKAGE_MS = PACKAGE_TASKS.length * PACKAGE_PACE;

/* -------------------- size and time estimates -------------------- */

export function packageSizeKb(selected: string[], formats: ExportFormatId[]) {
  const base = EXPORT_ITEMS.filter((i) => selected.includes(i.id)).reduce(
    (n, i) => n + i.sizeKb,
    0,
  );
  const factor =
    1 +
    (formats.includes("excel") ? 0.12 : 0) +
    (formats.includes("json") ? 0.05 : 0) +
    (formats.includes("png") ? 0.2 : 0);
  return Math.round(base * factor);
}

export const formatSize = (kb: number) =>
  kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

export function estimatedExportMs(selected: string[]) {
  return ESTIMATED_PACKAGE_MS + selected.length * 120;
}

/* -------------------- final validation -------------------- */

export interface PackageCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  resolution: string;
  reportId?: ReportId;
}

export function validatePackage(
  ctx: ReportContext,
  reports: ReportsState,
  selected: string[],
): { checks: PackageCheck[]; passed: boolean } {
  const ok = (id: string, label: string, passed: boolean, detail: string, resolution: string, reportId?: ReportId): PackageCheck => ({
    id,
    label,
    passed,
    detail,
    resolution,
    ...(reportId ? { reportId } : {}),
  });

  const checks: PackageCheck[] = [
    ok(
      "building",
      "Digital Building",
      ctx.project.model.objects.length > 0,
      `${ctx.project.model.objects.length} building objects referenced`,
      "Open the building editor and complete the digital twin.",
    ),
    ok(
      "requirements",
      "RF Requirements",
      Boolean(ctx.config.technology),
      "RF design requirements package linked",
      "Complete the RF Design Configuration wizard.",
    ),
    ok(
      "profile",
      "RF Profile",
      Boolean(ctx.profile.band),
      `Band ${ctx.profile.band ?? "—"} configured`,
      "Complete the RF Parameter Configuration wizard.",
    ),
    ok(
      "initial",
      "Initial RF Design",
      ctx.initial.antennaLayout.length > 0,
      `${ctx.initial.antennaLayout.length} simulated antennas`,
      "Run the RF simulation engine again.",
    ),
    ok(
      "optimized",
      "Optimized RF Design",
      ctx.optimized.optimizedAntennaLayout.length > 0,
      `${ctx.optimized.optimizedAntennaLayout.length} approved antennas`,
      "Approve the optimized design in the optimization workspace.",
    ),
    ok(
      "bom",
      "Engineering BOM",
      ctx.bom.items.length > 0,
      `${ctx.bom.items.length} procurement line items`,
      "Save the Engineering BOM in Module 6.",
    ),
    ok(
      "reports",
      "Engineering Reports",
      reports.reports.length >= REPORT_DEFS.length,
      `${reports.reports.length} of ${REPORT_DEFS.length} documents generated`,
      "Regenerate the missing report from the report library.",
    ),
    ok(
      "maps",
      "Engineering Maps",
      reports.mapsDone.length >= MAP_DEFS.length,
      `${reports.mapsDone.length} of ${MAP_DEFS.length} engineering maps rendered`,
      "Regenerate reports to rebuild the engineering maps.",
    ),
    ok(
      "integrity",
      "Package Integrity",
      selected.length > 0,
      `${selected.length} items selected for export`,
      "Select at least one document or map for the package.",
    ),
    ok(
      "metadata",
      "Project Metadata",
      reports.chaptersDone.length >= CHAPTER_ORDER.length,
      `${reports.chaptersDone.length} of ${CHAPTER_ORDER.length} chapters completed`,
      "Regenerate the report chapters.",
    ),
    ok(
      "files",
      "Export Files",
      selected.some((s) => s.startsWith("report:")),
      "Generated files ready for packaging",
      "Include at least one engineering report in the package.",
    ),
  ];

  return { checks, passed: checks.every((c) => c.passed) };
}

/* -------------------- generated files + manifest -------------------- */

export interface GeneratedFile {
  path: string;
  kind: ExportItemKind | "manifest";
  format: ExportFormatId;
  sizeKb: number;
  content: string;
}

export function buildPackageFiles(
  ctx: ReportContext,
  reports: ReportsState,
  selected: string[],
  formats: ExportFormatId[],
  info: PackageInfo,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const kb = (s: string) => Math.max(1, Math.round(s.length / 1024));

  for (const item of EXPORT_ITEMS) {
    if (!selected.includes(item.id)) continue;

    if (item.kind === "report" && item.reportId) {
      const rec = reports.reports.find((r) => r.reportId === item.reportId);
      const doc = buildReportDocument(
        item.reportId,
        ctx,
        rec?.version ?? info.version,
        rec?.generatedAt ?? Date.now(),
      );
      if (formats.includes("pdf")) {
        const content = documentToHtml(doc);
        files.push({
          path: `documents/${item.reportId}.pdf.html`,
          kind: "report",
          format: "pdf",
          sizeKb: kb(content),
          content,
        });
      }
      if (formats.includes("excel") && item.reportId === "engineering-bom") {
        const content = documentToExcelXml(doc);
        files.push({
          path: `documents/${item.reportId}.xls`,
          kind: "report",
          format: "excel",
          sizeKb: kb(content),
          content,
        });
      }
      if (!formats.includes("pdf")) {
        const content = documentToText(doc);
        files.push({
          path: `documents/${item.reportId}.txt`,
          kind: "report",
          format: "pdf",
          sizeKb: kb(content),
          content,
        });
      }
    }

    if (item.kind === "map" && item.mapId) {
      const def = MAP_DEFS.find((m) => m.id === item.mapId);
      const layer = ctx.optimized.layers?.[item.mapId as keyof typeof ctx.optimized.layers];
      const content = JSON.stringify(
        {
          map: def?.title ?? item.mapId,
          description: def?.description ?? "",
          project: ctx.project.name,
          renderedAt: Date.now(),
          layer: layer
            ? { label: (layer as { label?: string }).label, min: (layer as { min?: number }).min, max: (layer as { max?: number }).max }
            : null,
        },
        null,
        2,
      );
      files.push({
        path: `maps/${item.mapId}-map.json`,
        kind: "map",
        format: formats.includes("png") ? "png" : "json",
        sizeKb: item.sizeKb,
        content,
      });
    }

    if (item.kind === "data") {
      const content =
        item.id === "data:metadata"
          ? JSON.stringify(projectMetadata(ctx, info), null, 2)
          : JSON.stringify(engineeringConfiguration(ctx), null, 2);
      files.push({
        path: `data/${item.id.split(":")[1]}.json`,
        kind: "data",
        format: "json",
        sizeKb: kb(content),
        content,
      });
    }
  }

  return files;
}

export function projectMetadata(ctx: ReportContext, info: PackageInfo) {
  return {
    projectId: ctx.project.id,
    projectName: ctx.project.name,
    buildingType: ctx.project.buildingType,
    country: ctx.project.country,
    technology: ctx.optimized.projectInformation.technology,
    packageName: info.name,
    packageVersion: info.version,
    author: info.author,
    company: info.company || null,
    description: info.description || null,
    notes: info.notes || null,
    softwareVersion: SOFTWARE_VERSION,
    creationDate: new Date().toISOString(),
  };
}

export function engineeringConfiguration(ctx: ReportContext) {
  return {
    requirements: ctx.config,
    profile: ctx.profile,
    vendor: ctx.bom.vendor,
    financialSummary: ctx.bom.financialSummary,
  };
}

export const SOFTWARE_VERSION = "AI Private Cellular Planner v1.0";

export interface PackageManifest {
  packageName: string;
  packageVersion: string;
  projectId: string;
  softwareVersion: string;
  createdAt: number;
  generationTimeMs: number;
  author: string;
  company: string | null;
  formats: ExportFormatId[];
  files: { path: string; format: ExportFormatId; sizeKb: number }[];
  totalFiles: number;
  totalSizeKb: number;
}

export function buildManifest(
  ctx: ReportContext,
  info: PackageInfo,
  formats: ExportFormatId[],
  files: GeneratedFile[],
  generationTimeMs: number,
): PackageManifest {
  return {
    packageName: `${info.name}.zip`,
    packageVersion: info.version,
    projectId: ctx.project.id,
    softwareVersion: SOFTWARE_VERSION,
    createdAt: Date.now(),
    generationTimeMs,
    author: info.author,
    company: info.company || null,
    formats,
    files: files.map((f) => ({ path: f.path, format: f.format, sizeKb: f.sizeKb })),
    totalFiles: files.length,
    totalSizeKb: files.reduce((n, f) => n + f.sizeKb, 0),
  };
}

/* -------------------- final RF design package object -------------------- */

export interface FinalRfDesignPackage {
  objectType: "FinalRfDesignPackage";
  timestamp: number;
  version: string;
  projectInformation: ReportContext["optimized"]["projectInformation"];
  projectMetadata: ReturnType<typeof projectMetadata>;
  references: {
    digitalBuilding: string;
    rfDesignRequirements: string;
    rfProfile: string;
    initialRfDesign: string;
    optimizedRfDesign: string;
    engineeringBom: string;
  };
  documents: { reportId: ReportId; title: string; version: string; pages: number }[];
  maps: { id: string; title: string }[];
  engineeringValidation: { checks: PackageCheck[]; passed: boolean };
  exportMetadata: {
    formats: ExportFormatId[];
    selectedItems: string[];
    author: string;
    company: string | null;
    generatedFiles: number;
  };
  manifest: PackageManifest;
  zipPackage: { name: string; sizeKb: number; files: number };
  kpis: {
    coverage: number;
    capacity: number;
    antennas: number;
    vendor: string;
    estimatedCost: number;
  };
}

export function buildFinalPackage(
  ctx: ReportContext,
  reports: ReportsState,
  selected: string[],
  formats: ExportFormatId[],
  info: PackageInfo,
  files: GeneratedFile[],
  manifest: PackageManifest,
  validation: { checks: PackageCheck[]; passed: boolean },
): FinalRfDesignPackage {
  const pid = ctx.project.id;
  return {
    objectType: "FinalRfDesignPackage",
    timestamp: Date.now(),
    version: info.version,
    projectInformation: ctx.optimized.projectInformation,
    projectMetadata: projectMetadata(ctx, info),
    references: {
      digitalBuilding: `${pid}:digital-building`,
      rfDesignRequirements: `${pid}:rf-requirements`,
      rfProfile: `${pid}:rf-profile`,
      initialRfDesign: `${pid}:initial-rf-design`,
      optimizedRfDesign: `${pid}:optimized-rf-design`,
      engineeringBom: `${pid}:engineering-bom`,
    },
    documents: reports.reports.map((r) => ({
      reportId: r.reportId,
      title: r.name,
      version: r.version,
      pages: r.pages,
    })),
    maps: MAP_DEFS.map((m) => ({ id: m.id, title: m.title })),
    engineeringValidation: validation,
    exportMetadata: {
      formats,
      selectedItems: selected,
      author: info.author,
      company: info.company || null,
      generatedFiles: files.length,
    },
    manifest,
    zipPackage: {
      name: `${info.name}.zip`,
      sizeKb: manifest.totalSizeKb,
      files: files.length,
    },
    kpis: {
      coverage: ctx.optimized.kpis.coverage,
      capacity: ctx.optimized.kpis.capacity,
      antennas: ctx.optimized.optimizedAntennaLayout.length,
      vendor: ctx.bom.vendor.name,
      estimatedCost: ctx.bom.financialSummary.grandTotal,
    },
  };
}

/* -------------------- export history + state -------------------- */

export interface PackageRecord {
  key: string;
  name: string;
  version: string;
  exportedAt: number;
  sizeKb: number;
  formats: ExportFormatId[];
  status: "Ready" | "Archived";
  files: number;
}

export interface ExportState {
  status: "idle" | "running" | "done";
  taskIndex: number;
  startedAt: number | null;
  finishedAt: number | null;
  selected: string[];
  formats: ExportFormatId[];
  info: PackageInfo | null;
  log: { at: number; text: string; kind: "info" | "ok" | "calc" }[];
  history: PackageRecord[];
  finalPackage: FinalRfDesignPackage | null;
  updatedAt: number;
}

export const emptyExportState = (): ExportState => ({
  status: "idle",
  taskIndex: 0,
  startedAt: null,
  finishedAt: null,
  selected: DEFAULT_SELECTION,
  formats: ["pdf", "excel", "png", "zip", "json"],
  info: null,
  log: [],
  history: [],
  finalPackage: null,
  updatedAt: Date.now(),
});

const KEY = "apcp.export.v1";

let cache: Record<string, ExportState> | null = null;
const listeners = new Set<() => void>();

function readAll(): Record<string, ExportState> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ExportState>) : {};
    cache = Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, { ...emptyExportState(), ...v }]),
    );
  } catch {
    cache = {};
  }
  return cache;
}

function writeAll(next: Record<string, ExportState>) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* in-memory state stays authoritative */
    }
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const EMPTY: Record<string, ExportState> = {};

export function useExportState(projectId: string): ExportState {
  const all = useSyncExternalStore(
    subscribe,
    () => readAll(),
    () => EMPTY,
  );
  return all[projectId] ?? emptyExportState();
}

export function saveExportState(projectId: string, patch: Partial<ExportState>) {
  const all = readAll();
  const current = all[projectId] ?? emptyExportState();
  writeAll({ ...all, [projectId]: { ...current, ...patch, updatedAt: Date.now() } });
}

export function resetExportState(projectId: string) {
  const all = readAll();
  const current = all[projectId] ?? emptyExportState();
  writeAll({
    ...all,
    [projectId]: {
      ...emptyExportState(),
      selected: current.selected,
      formats: current.formats,
      info: current.info,
      history: current.history,
    },
  });
}

/** Read-only accessor used by the dashboard and archive views. */
export function readExportState(projectId: string): ExportState | null {
  return readAll()[projectId] ?? null;
}

/* -------------------- ZIP writer (store-only, no deps) -------------------- */

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Builds an uncompressed (stored) ZIP archive from text entries. */
export function buildZip(entries: { path: string; content: string }[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u32 = (v: number) => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]);
  const u16 = (v: number) => new Uint8Array([v & 255, (v >> 8) & 255]);
  const concat = (parts: Uint8Array[]) => {
    const size = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(size);
    let i = 0;
    for (const p of parts) {
      out.set(p, i);
      i += p.length;
    }
    return out;
  };

  for (const entry of entries) {
    const name = enc.encode(entry.path);
    const data = enc.encode(entry.content);
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    chunks.push(local);
    central.push(
      concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }

  const centralBytes = concat(central);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralBytes.length),
    u32(offset),
    u16(0),
  ]);

  return new Blob([concat(chunks), centralBytes, end], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPackage(
  info: PackageInfo,
  files: GeneratedFile[],
  manifest: PackageManifest,
  finalPackage: FinalRfDesignPackage,
) {
  const entries = [
    ...files.map((f) => ({ path: f.path, content: f.content })),
    { path: "manifest.json", content: JSON.stringify(manifest, null, 2) },
    { path: "final-rf-design-package.json", content: JSON.stringify(finalPackage, null, 2) },
    {
      path: "README.txt",
      content: [
        `${info.name} — ${info.version}`,
        `Generated ${reportDate(manifest.createdAt)} by ${info.author}`,
        info.company ? `Company: ${info.company}` : "",
        info.description,
        info.notes,
        "",
        `${manifest.totalFiles} files included.`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  downloadBlob(buildZip(entries), `${info.name}.zip`);
}
