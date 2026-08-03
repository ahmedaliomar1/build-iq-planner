import {
  DEFAULT_LAYERS,
  type BuildingModel,
  type BuildingObject,
  type ColumnObj,
  type OpeningObj,
  type RoomObj,
  type WallObj,
} from "./building-model";

export const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x2 - x1, y2 - y1);

export const wallLength = (w: WallObj) => dist(w.x1, w.y1, w.x2, w.y2);

export function polygonArea(points: { x: number; y: number }[]) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a / 2);
}

export function polygonPerimeter(points: { x: number; y: number }[]) {
  let p = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    p += dist(a.x, a.y, b.x, b.y);
  }
  return p;
}

export function polygonCentroid(points: { x: number; y: number }[]) {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length;
  const y = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x, y };
}

function rectWalls(
  x: number,
  y: number,
  w: number,
  h: number,
  thickness: number,
  material: WallObj["material"],
): WallObj[] {
  const pts: [number, number][] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  return pts.map((p, i) => {
    const n = pts[(i + 1) % pts.length]!;
    return {
      id: uid("wall"),
      kind: "wall" as const,
      x1: p[0],
      y1: p[1],
      x2: n[0],
      y2: n[1],
      height: 4,
      thickness,
      material,
    };
  });
}

function rectRoom(
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  usage: string,
  color: string,
): RoomObj {
  return {
    id: uid("room"),
    kind: "room",
    name,
    usage,
    color,
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
  };
}

/** Deterministic-ish synthetic "AI extracted" building model. */
export function generateAiModel(buildingType: string): BuildingModel {
  const objects: BuildingObject[] = [];

  const W = 60;
  const H = 38;

  objects.push(...rectWalls(0, 0, W, H, 0.3, "concrete"));

  // internal partitions
  const partitions: WallObj[] = [
    { x1: 22, y1: 0, x2: 22, y2: 22 },
    { x1: 22, y1: 22, x2: 60, y2: 22 },
    { x1: 40, y1: 0, x2: 40, y2: 22 },
    { x1: 0, y1: 26, x2: 22, y2: 26 },
    { x1: 11, y1: 26, x2: 11, y2: 38 },
  ].map((p) => ({
    id: uid("wall"),
    kind: "wall" as const,
    ...p,
    height: 3.2,
    thickness: 0.15,
    material: "gypsum" as const,
  }));
  objects.push(...partitions);

  // rooms
  const rooms: RoomObj[] = [
    rectRoom(
      buildingType === "Factory" ? "Production Hall" : "Main Hall",
      22,
      22,
      38,
      16,
      buildingType === "Factory" ? "Production" : "Hall",
      "#2563EB",
    ),
    rectRoom("Office 01", 0, 0, 22, 22, "Office", "#16A34A"),
    rectRoom("Meeting Room", 22, 0, 18, 22, "Meeting Room", "#F59E0B"),
    rectRoom("Server Room", 40, 0, 20, 22, "Server Room", "#DC2626"),
    rectRoom("Storage", 0, 26, 11, 12, "Storage", "#6B7280"),
    rectRoom("Electrical Room", 11, 26, 11, 12, "Electrical Room", "#7c3aed"),
  ];
  objects.push(...rooms);

  // columns grid
  const columns: ColumnObj[] = [];
  for (let cx = 28; cx <= 54; cx += 13) {
    for (let cy = 27; cy <= 34; cy += 7) {
      columns.push({
        id: uid("col"),
        kind: "column",
        x: cx,
        y: cy,
        width: 0.6,
        depth: 0.6,
        height: 4,
        material: "concrete",
      });
    }
  }
  objects.push(...columns);

  // doors + windows attached to walls
  const walls = objects.filter((o): o is WallObj => o.kind === "wall");
  const openings: OpeningObj[] = [];
  const attach = (
    wall: WallObj,
    t: number,
    kind: "door" | "window",
  ): OpeningObj => {
    const base: OpeningObj = {
      id: uid(kind),
      kind,
      wallId: wall.id,
      t,
      x: wall.x1 + (wall.x2 - wall.x1) * t,
      y: wall.y1 + (wall.y2 - wall.y1) * t,
      width: kind === "door" ? 1.1 : 1.8,
      height: kind === "door" ? 2.1 : 1.4,
      material: kind === "door" ? "metal" : "glass",
    };
    if (kind === "window") {
      base.glassType = "Double Glazed Low-E";
      base.frameType = "Aluminium";
    } else {
      base.opening = "inward-left";
    }
    return base;
  };

  openings.push(attach(walls[0]!, 0.35, "door"));
  openings.push(attach(walls[2]!, 0.5, "door"));
  openings.push(attach(partitions[0]!, 0.3, "door"));
  openings.push(attach(partitions[1]!, 0.25, "door"));
  openings.push(attach(partitions[3]!, 0.6, "door"));
  openings.push(attach(walls[1]!, 0.25, "window"));
  openings.push(attach(walls[1]!, 0.6, "window"));
  openings.push(attach(walls[3]!, 0.35, "window"));
  openings.push(attach(walls[0]!, 0.7, "window"));
  openings.push(attach(walls[2]!, 0.8, "window"));
  objects.push(...openings);

  // one intentionally floating door so the validation engine has work to do
  objects.push({
    id: uid("door"),
    kind: "door",
    wallId: null,
    t: 0,
    x: 48,
    y: 30,
    width: 1,
    height: 2.1,
    material: "wood",
    opening: "inward-right",
  } as OpeningObj);

  return {
    objects,
    layers: DEFAULT_LAYERS.map((l) => ({ ...l })),
    scale: 1,
    scaleDetected: Math.random() > 0.35,
  };
}

export interface ValidationIssue {
  id: string;
  code: string;
  title: string;
  detail: string;
  suggestion: string;
  severity: "error" | "warning";
  target: { x: number; y: number };
  objectId?: string;
}

export function validateModel(model: BuildingModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const walls = model.objects.filter((o): o is WallObj => o.kind === "wall");
  const rooms = model.objects.filter((o): o is RoomObj => o.kind === "room");
  const openings = model.objects.filter(
    (o): o is OpeningObj => o.kind === "door" || o.kind === "window",
  );
  const columns = model.objects.filter((o): o is ColumnObj => o.kind === "column");

  if (walls.length < 4) {
    issues.push({
      id: "missing-wall",
      code: "MISSING_WALL",
      title: "Missing Wall",
      detail: "The building envelope is incomplete.",
      suggestion: "Draw the remaining perimeter walls with the Add Wall tool.",
      severity: "error",
      target: { x: 0, y: 0 },
    });
  }

  // floating openings
  for (const o of openings) {
    const host = walls.find((w) => w.id === o.wallId);
    if (!host) {
      issues.push({
        id: `floating-${o.id}`,
        code: o.kind === "door" ? "FLOATING_DOOR" : "WINDOW_OUTSIDE_WALL",
        title: o.kind === "door" ? "Floating Door" : "Window Outside Wall",
        detail: `${o.kind === "door" ? "Door" : "Window"} ${o.id} is not hosted by any wall.`,
        suggestion: "Delete it or drag it onto a wall to re-host the opening.",
        severity: "error",
        target: { x: o.x, y: o.y },
        objectId: o.id,
      });
    } else if (o.width > wallLength(host)) {
      issues.push({
        id: `oversize-${o.id}`,
        code: "WINDOW_OUTSIDE_WALL",
        title: "Opening Larger Than Wall",
        detail: `Opening ${o.id} is wider than its host wall.`,
        suggestion: "Reduce the opening width in the properties panel.",
        severity: "warning",
        target: { x: o.x, y: o.y },
        objectId: o.id,
      });
    }
  }

  // duplicate walls
  const seen = new Map<string, WallObj>();
  for (const w of walls) {
    const key = [w.x1, w.y1, w.x2, w.y2]
      .map((n) => n.toFixed(2))
      .sort()
      .join("|");
    if (seen.has(key)) {
      issues.push({
        id: `dup-${w.id}`,
        code: "DUPLICATE_WALL",
        title: "Duplicate Wall",
        detail: `Wall ${w.id} overlaps an identical wall segment.`,
        suggestion: "Delete the duplicated wall to keep the RF model clean.",
        severity: "warning",
        target: { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 },
        objectId: w.id,
      });
    } else {
      seen.set(key, w);
    }
  }

  // zero-length walls
  for (const w of walls) {
    if (wallLength(w) < 0.05) {
      issues.push({
        id: `zero-${w.id}`,
        code: "MISSING_WALL",
        title: "Degenerate Wall",
        detail: `Wall ${w.id} has near-zero length.`,
        suggestion: "Delete this wall segment.",
        severity: "error",
        target: { x: w.x1, y: w.y1 },
        objectId: w.id,
      });
    }
  }

  // open rooms: room with no door on its boundary
  for (const r of rooms) {
    const c = polygonCentroid(r.points);
    const hasDoor = openings.some(
      (o) => o.kind === "door" && Math.hypot(o.x - c.x, o.y - c.y) < 22,
    );
    if (!hasDoor) {
      issues.push({
        id: `open-${r.id}`,
        code: "OPEN_ROOM",
        title: "Open Room",
        detail: `${r.name} has no access door detected on its boundary.`,
        suggestion: "Add a door on one of the room's walls.",
        severity: "warning",
        target: c,
        objectId: r.id,
      });
    }
    if (polygonArea(r.points) < 1) {
      issues.push({
        id: `disc-${r.id}`,
        code: "DISCONNECTED_ROOM",
        title: "Disconnected Room",
        detail: `${r.name} has an invalid boundary.`,
        suggestion: "Redraw the room polygon.",
        severity: "error",
        target: c,
        objectId: r.id,
      });
    }
  }

  // overlapping columns
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const ci = columns[i]!;
      const cj = columns[j]!;
      if (Math.hypot(ci.x - cj.x, ci.y - cj.y) < 0.3) {
        issues.push({
          id: `ovl-${cj.id}`,
          code: "OVERLAPPING_OBJECTS",
          title: "Overlapping Objects",
          detail: "Two columns occupy the same position.",
          suggestion: "Delete or move one of the columns.",
          severity: "warning",
          target: { x: cj.x, y: cj.y },
          objectId: cj.id,
        });
      }
    }
  }

  if (!model.scaleDetected || model.scale <= 0) {
    issues.push({
      id: "scale",
      code: "INVALID_SCALE",
      title: "Invalid Scale",
      detail: "Drawing scale has not been confirmed.",
      suggestion: "Run the manual scale wizard to calibrate real-world distances.",
      severity: "error",
      target: { x: 0, y: 0 },
    });
  }

  return issues;
}

export const VALIDATION_CHECKS = [
  { code: "MISSING_WALL", label: "Missing Wall" },
  { code: "OPEN_ROOM", label: "Open Room" },
  { code: "FLOATING_DOOR", label: "Floating Door" },
  { code: "WINDOW_OUTSIDE_WALL", label: "Window Outside Wall" },
  { code: "OVERLAPPING_OBJECTS", label: "Overlapping Objects" },
  { code: "DISCONNECTED_ROOM", label: "Disconnected Room" },
  { code: "DUPLICATE_WALL", label: "Duplicate Wall" },
  { code: "INVALID_SCALE", label: "Invalid Scale" },
];
