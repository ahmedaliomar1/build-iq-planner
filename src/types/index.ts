/**
 * Centralized data models. Engineering types live next to their domain
 * logic in src/lib and are re-exported here under backend-facing names so
 * components, hooks and services share one vocabulary.
 */
export type {
  Project,
  BuildingModel as DigitalBuilding,
  WallObj as Wall,
  RoomObj as Room,
  Material,
  UploadedFile,
} from "@/lib/building-model";
import type { OpeningObj } from "@/lib/building-model";
export type Door = OpeningObj & { kind: "door" };
export type Window = OpeningObj & { kind: "window" };

export type { RfConfig as RFRequirements } from "@/lib/rf-config";
export type { RfProfileConfig as RFProfile } from "@/lib/rf-profile";
export type { InitialRfDesign as InitialRFDesign, AntennaPlacement as Antenna } from "@/lib/rf-simulation";
export type { OptimizedRfDesign as OptimizedRFDesign } from "@/lib/rf-optimization";
export type { EngineeringBom as EngineeringBOM } from "@/lib/bom";
export type { ReportRecord as Report, ReportDocument } from "@/lib/reports";
export type {
  FinalRfDesignPackage as FinalRFDesignPackage,
  PackageRecord as ExportPackage,
} from "@/lib/export-package";

/** Lifecycle of every asynchronous operation in the UI. */
export type AsyncStatus = "idle" | "loading" | "processing" | "success" | "error" | "cancelled";

/** Workflow status shown on the dashboard. */
export type ProjectWorkflowStatus =
  | "Draft"
  | "Building Analysis"
  | "Building Validated"
  | "RF Configuration"
  | "RF Profile Ready"
  | "Simulation Running"
  | "Simulation Completed"
  | "Optimization"
  | "Optimization Completed"
  | "BOM Ready"
  | "Reports Ready"
  | "Export Ready"
  | "Completed";

export interface APIError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export interface APIResponse<T> {
  data: T;
  error: APIError | null;
}

export interface FileUploadResponse {
  fileId: string;
  name: string;
  size: number;
  uploadedAt: number;
}

export interface SimulationResponse {
  projectId: string;
  status: AsyncStatus;
  progress: number;
}
