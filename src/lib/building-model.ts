export type MaterialId =
  | "concrete"
  | "brick"
  | "glass"
  | "wood"
  | "gypsum"
  | "metal"
  | "custom";

export type LayerId =
  | "walls"
  | "doors"
  | "windows"
  | "columns"
  | "furniture"
  | "labels"
  | "electrical"
  | "hvac";

export interface Material {
  id: MaterialId;
  name: string;
  category: string;
  density: number; // kg/m3
  wallLoss: number; // dB @ 3.5GHz
  thickness: number; // m
  thermal: number; // W/mK
  color: string;
}

export interface WallObj {
  id: string;
  kind: "wall";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  height: number;
  thickness: number;
  material: MaterialId;
}

export interface OpeningObj {
  id: string;
  kind: "door" | "window";
  wallId: string | null;
  t: number; // position along wall 0..1
  x: number;
  y: number;
  width: number;
  height: number;
  material: MaterialId;
  glassType?: string;
  frameType?: string;
  opening?: "inward-left" | "inward-right" | "outward-left" | "outward-right";
}

export interface ColumnObj {
  id: string;
  kind: "column";
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  material: MaterialId;
}

export interface RoomObj {
  id: string;
  kind: "room";
  name: string;
  points: { x: number; y: number }[];
  usage: string;
  color: string;
}

export type BuildingObject = WallObj | OpeningObj | ColumnObj | RoomObj;

export interface LayerState {
  id: LayerId;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export interface BuildingModel {
  objects: BuildingObject[];
  layers: LayerState[];
  scale: number; // pixels(model units) per meter
  scaleDetected: boolean;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export interface ProjectVersion {
  at: number;
  label: string;
  objectCount: number;
}

export interface Project {
  id: string;
  name: string;
  network: "lte" | "5g" | "auto";
  country: string;
  buildingType: string;
  files: UploadedFile[];
  createdAt: number;
  updatedAt: number;
  status: "draft" | "analyzing" | "review" | "editing" | "ready";
  model: BuildingModel;
  versions: ProjectVersion[];
}

export const MATERIALS: Material[] = [
  {
    id: "concrete",
    name: "Reinforced Concrete",
    category: "Concrete",
    density: 2400,
    wallLoss: 18.5,
    thickness: 0.25,
    thermal: 1.7,
    color: "#94a3b8",
  },
  {
    id: "brick",
    name: "Solid Brick",
    category: "Brick",
    density: 1900,
    wallLoss: 12.4,
    thickness: 0.2,
    thermal: 0.72,
    color: "#c2734a",
  },
  {
    id: "glass",
    name: "Double Glazing",
    category: "Glass",
    density: 2500,
    wallLoss: 6.8,
    thickness: 0.024,
    thermal: 1.05,
    color: "#7dd3fc",
  },
  {
    id: "wood",
    name: "Solid Wood",
    category: "Wood",
    density: 700,
    wallLoss: 4.2,
    thickness: 0.05,
    thermal: 0.15,
    color: "#b98b57",
  },
  {
    id: "gypsum",
    name: "Gypsum Board",
    category: "Gypsum",
    density: 800,
    wallLoss: 3.1,
    thickness: 0.12,
    thermal: 0.25,
    color: "#e2e8f0",
  },
  {
    id: "metal",
    name: "Steel Panel",
    category: "Metal",
    density: 7850,
    wallLoss: 26.9,
    thickness: 0.02,
    thermal: 50,
    color: "#64748b",
  },
  {
    id: "custom",
    name: "Custom Material",
    category: "Custom",
    density: 1000,
    wallLoss: 8,
    thickness: 0.15,
    thermal: 0.5,
    color: "#a78bfa",
  },
];

export const materialById = (id: MaterialId) =>
  MATERIALS.find((m) => m.id === id) ?? MATERIALS[0]!;

export const ROOM_USAGES = [
  "Office",
  "Meeting Room",
  "Warehouse",
  "Electrical Room",
  "Server Room",
  "Production",
  "Storage",
  "Hall",
];

export const BUILDING_TYPES = [
  "Factory",
  "Office",
  "Hospital",
  "Airport",
  "Warehouse",
  "University",
  "Mall",
];

export const COUNTRIES = [
  "Egypt",
  "Saudi Arabia",
  "United Arab Emirates",
  "Qatar",
  "Kuwait",
  "Germany",
  "France",
  "United Kingdom",
  "Netherlands",
  "Spain",
  "United States",
  "Canada",
  "Brazil",
  "India",
  "Japan",
  "South Korea",
  "Singapore",
  "Australia",
  "South Africa",
  "Nigeria",
];

export const DEFAULT_LAYERS: LayerState[] = [
  { id: "walls", name: "Walls", visible: true, locked: false, opacity: 1 },
  { id: "doors", name: "Doors", visible: true, locked: false, opacity: 1 },
  { id: "windows", name: "Windows", visible: true, locked: false, opacity: 1 },
  { id: "columns", name: "Columns", visible: true, locked: false, opacity: 1 },
  { id: "furniture", name: "Furniture", visible: false, locked: false, opacity: 0.6 },
  { id: "labels", name: "Labels", visible: true, locked: false, opacity: 1 },
  { id: "electrical", name: "Electrical", visible: false, locked: true, opacity: 0.5 },
  { id: "hvac", name: "HVAC", visible: false, locked: true, opacity: 0.5 },
];
