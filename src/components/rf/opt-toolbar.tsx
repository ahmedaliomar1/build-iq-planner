import {
  Grid3x3,
  Magnet,
  Minus,
  MousePointer2,
  Move,
  PlusCircle,
  Redo2,
  Replace,
  Ruler,
  Save,
  SquareDashed,
  Trash2,
  Undo2,
  GitCompare,
  Lock,
  LockOpen,
} from "lucide-react";
import type { OptTool } from "./opt-canvas";

const TOOLS: { id: OptTool; label: string; icon: typeof Move }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "move", label: "Move", icon: Move },
  { id: "add", label: "Add Antenna", icon: PlusCircle },
  { id: "delete", label: "Delete Antenna", icon: Trash2 },
  { id: "replace", label: "Replace Antenna", icon: Replace },
  { id: "measure", label: "Measure", icon: Ruler },
  { id: "box", label: "Box Selection", icon: SquareDashed },
];

export function OptToolbar({
  tool,
  onTool,
  grid,
  snap,
  onGrid,
  onSnap,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onCompare,
  onLock,
  onUnlock,
  hasSelection,
}: {
  tool: OptTool;
  onTool: (t: OptTool) => void;
  grid: boolean;
  snap: boolean;
  onGrid: () => void;
  onSnap: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onCompare: () => void;
  onLock: () => void;
  onUnlock: () => void;
  hasSelection: boolean;
}) {
  const btn =
    "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-smooth";
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-2 shadow-soft">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => onTool(t.id)}
          title={t.label}
          className={`${btn} ${
            tool === t.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-accent"
          }`}
        >
          <t.icon className="size-3.5" />
          <span className="hidden xl:inline">{t.label}</span>
        </button>
      ))}

      <span className="mx-1 h-6 w-px bg-border" />

      <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className={`${btn} border-border hover:bg-accent disabled:opacity-40`}>
        <Undo2 className="size-3.5" />
      </button>
      <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className={`${btn} border-border hover:bg-accent disabled:opacity-40`}>
        <Redo2 className="size-3.5" />
      </button>
      <button onClick={onSave} title="Save (Ctrl+S)" className={`${btn} border-border hover:bg-accent`}>
        <Save className="size-3.5" />
        <span className="hidden xl:inline">Save</span>
      </button>

      <span className="mx-1 h-6 w-px bg-border" />

      <button onClick={onLock} disabled={!hasSelection} title="Lock selection" className={`${btn} border-border hover:bg-accent disabled:opacity-40`}>
        <Lock className="size-3.5" />
      </button>
      <button onClick={onUnlock} disabled={!hasSelection} title="Unlock selection" className={`${btn} border-border hover:bg-accent disabled:opacity-40`}>
        <LockOpen className="size-3.5" />
      </button>
      <button
        onClick={onSnap}
        title="Snap to grid"
        className={`${btn} ${snap ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-accent"}`}
      >
        <Magnet className="size-3.5" />
        <span className="hidden xl:inline">Snap</span>
      </button>
      <button
        onClick={onGrid}
        title="Grid"
        className={`${btn} ${grid ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-accent"}`}
      >
        <Grid3x3 className="size-3.5" />
        <span className="hidden xl:inline">Grid</span>
      </button>

      <button onClick={onCompare} className={`${btn} ml-auto border-border hover:bg-accent`}>
        <GitCompare className="size-3.5" /> Compare Designs
      </button>
      <span className="hidden items-center gap-1 text-[10px] text-muted-foreground 2xl:flex">
        <Minus className="size-3" /> Ctrl+Z / Ctrl+Y / Del / Ctrl+S / Esc
      </span>
    </div>
  );
}
