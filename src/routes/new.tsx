import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileUp,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Scene } from "@/components/editor/scene";
import { GridDefs, useViewport } from "@/components/editor/viewport";
import {
  BUILDING_TYPES,
  COUNTRIES,
  type BuildingModel,
  type UploadedFile,
} from "@/lib/building-model";
import { generateAiModel } from "@/lib/geometry";
import { createProject, saveModel, updateProject } from "@/lib/project-store";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "New Project Wizard — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Five-step wizard: project information, drawing upload, AI analysis, review and digital twin handoff.",
      },
      { property: "og:title", content: "New Project Wizard — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Upload a floor plan and let AI generate a validated building model.",
      },
    ],
  }),
  component: WizardPage,
});

const STEPS = [
  "Project Information",
  "Upload Drawing",
  "AI Analysis",
  "Review",
  "Ready",
];

interface UploadItem extends UploadedFile {
  id: string;
  progress: number;
  failed: boolean;
}

function WizardPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [network, setNetwork] = useState<"lte" | "5g" | "auto">("auto");
  const [country, setCountry] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [model, setModel] = useState<BuildingModel | null>(null);
  const [touched, setTouched] = useState(false);

  const step1Valid = name.trim().length > 0 && country && buildingType;
  const uploadsDone =
    files.length > 0 && files.every((f) => f.progress === 100 && !f.failed);

  const startAnalysis = () => {
    const p = createProject({
      name: name.trim(),
      network,
      country,
      buildingType,
      files: files.map(({ name: n, size, type }) => ({ name: n, size, type })),
    });
    setProjectId(p.id);
    updateProject(p.id, { status: "analyzing" });
    setStep(2);
  };

  return (
    <AppShell breadcrumb={["Workspace", "Projects", "New Project"]}>
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <StepIndicator step={step} />

        <div className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-lift md:p-8">
          {step === 0 && (
            <StepInfo
              {...{
                name,
                setName,
                network,
                setNetwork,
                country,
                setCountry,
                buildingType,
                setBuildingType,
                touched,
              }}
            />
          )}
          {step === 1 && <StepUpload files={files} setFiles={setFiles} />}
          {step === 2 && (
            <StepAnalysis
              buildingType={buildingType}
              onDone={(m) => {
                setModel(m);
                if (projectId) {
                  saveModel(projectId, m, "AI generated model");
                  updateProject(projectId, { status: "review" });
                }
                setStep(3);
              }}
            />
          )}
          {step === 3 && model && (
            <StepReview
              model={model}
              onAccept={() => {
                if (projectId) updateProject(projectId, { status: "ready" });
                setStep(4);
              }}
              projectId={projectId}
            />
          )}
          {step === 4 && <StepReady projectId={projectId} />}

          {step < 2 && (
            <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
              <button
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
              <button
                onClick={() => {
                  if (step === 0) {
                    setTouched(true);
                    if (step1Valid) {
                      setStep(1);
                      setTouched(false);
                    }
                  } else if (uploadsDone) {
                    startAnalysis();
                  }
                }}
                disabled={step === 1 && !uploadsDone}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {step === 1 ? "Start AI Analysis" : "Next"}
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex min-w-fit flex-1 items-center gap-2">
            <div
              className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 transition-smooth ${
                active
                  ? "border-primary bg-primary-soft"
                  : done
                    ? "border-success/30 bg-success-soft"
                    : "border-border bg-card"
              }`}
            >
              <span
                className={`num grid size-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-success text-success-foreground"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={`whitespace-nowrap text-xs font-semibold ${
                  active ? "text-primary" : done ? "text-success" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="hidden h-px flex-1 bg-border md:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Step 1 ---------------- */

function StepInfo(props: {
  name: string;
  setName: (v: string) => void;
  network: "lte" | "5g" | "auto";
  setNetwork: (v: "lte" | "5g" | "auto") => void;
  country: string;
  setCountry: (v: string) => void;
  buildingType: string;
  setBuildingType: (v: string) => void;
  touched: boolean;
}) {
  const {
    name,
    setName,
    network,
    setNetwork,
    country,
    setCountry,
    buildingType,
    setBuildingType,
    touched,
  } = props;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const list = useMemo(
    () => COUNTRIES.filter((c) => c.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const err = (bad: boolean, msg: string) =>
    touched && bad ? (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
        <AlertTriangle className="size-3.5" /> {msg}
      </p>
    ) : null;

  return (
    <div className="animate-rise space-y-7">
      <Header
        title="Project Information"
        sub="Describe the site so the planner can pick the right RF assumptions."
      />

      <div>
        <Label>Project Name *</Label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Factory A"
          className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none transition-smooth focus:border-primary focus:ring-3 focus:ring-primary/20"
        />
        {err(!name.trim(), "Project name is required")}
      </div>

      <div>
        <Label>Project Type</Label>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["lte", "Private LTE", "Band 48 / CBRS, mature devices"],
              ["5g", "Private 5G", "URLLC, network slicing, low latency"],
              ["auto", "Auto Recommendation", "Let AI select from building profile"],
            ] as const
          ).map(([id, title, sub]) => (
            <button
              key={id}
              onClick={() => setNetwork(id)}
              className={`rounded-2xl border p-4 text-left transition-smooth ${
                network === id
                  ? "border-primary bg-primary-soft shadow-soft"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`grid size-4 place-items-center rounded-full border-2 ${
                    network === id ? "border-primary" : "border-border"
                  }`}
                >
                  {network === id && (
                    <span className="size-2 rounded-full bg-primary" />
                  )}
                </span>
                <span className="text-sm font-semibold">{title}</span>
              </span>
              <span className="mt-1.5 block text-xs text-muted-foreground">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Label>Country *</Label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={open ? query : country}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              setQuery("");
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search country…"
            className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm outline-none transition-smooth focus:border-primary focus:ring-3 focus:ring-primary/20"
          />
        </div>
        {open && (
          <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-border bg-popover p-1.5 shadow-panel">
            {list.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
            )}
            {list.map((c) => (
              <li key={c}>
                <button
                  onMouseDown={() => {
                    setCountry(c);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-smooth hover:bg-accent hover:text-accent-foreground"
                >
                  {c}
                  {country === c && <Check className="size-4 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        {err(!country, "Country is required")}
      </div>

      <div>
        <Label>Building Type *</Label>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BUILDING_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setBuildingType(t)}
              className={`flex flex-col items-start gap-3 rounded-2xl border p-4 transition-smooth ${
                buildingType === t
                  ? "border-primary bg-primary-soft shadow-soft"
                  : "border-border hover:border-primary/40 hover:-translate-y-0.5"
              }`}
            >
              <Building2
                className={`size-5 ${buildingType === t ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={1.7}
              />
              <span className="text-sm font-semibold">{t}</span>
            </button>
          ))}
        </div>
        {err(!buildingType, "Building type is required")}
      </div>
    </div>
  );
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

/* ---------------- Step 2 ---------------- */

const FORMATS = ["PDF", "DWG", "DXF", "PNG", "JPG"];

function StepUpload({
  files,
  setFiles,
}: {
  files: UploadItem[];
  setFiles: React.Dispatch<React.SetStateAction<UploadItem[]>>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);

  const runUpload = (id: string) => {
    const tick = () => {
      setFiles((prev) => {
        const target = prev.find((f) => f.id === id);
        if (!target || target.failed) return prev;
        const next = Math.min(100, target.progress + Math.random() * 18 + 6);
        return prev.map((f) => (f.id === id ? { ...f, progress: next } : f));
      });
    };
    const timer = setInterval(() => {
      tick();
      setFiles((prev) => {
        const t = prev.find((f) => f.id === id);
        if (!t || t.progress >= 100) clearInterval(timer);
        return prev;
      });
    }, 220);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const items: UploadItem[] = Array.from(list).map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      type: f.type || f.name.split(".").pop() || "file",
      progress: 0,
      failed: false,
    }));
    setFiles((prev) => [...prev, ...items]);
    items.forEach((i) => runUpload(i.id));
  };

  return (
    <div className="animate-rise space-y-6">
      <Header
        title="Upload Drawing"
        sub="Architectural floor plans in vector or raster format. Multiple files supported."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-smooth ${
          drag ? "border-primary bg-primary-soft" : "border-border bg-background"
        }`}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <FileUp className="size-6" />
        </span>
        <p className="mt-4 font-semibold">Drag & drop your drawing here</p>
        <p className="mt-1 text-sm text-muted-foreground">or browse from your computer</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
        >
          Browse Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {FORMATS.map((f) => (
            <span
              key={f}
              className="num rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {files.length > 0 && (
        <ul className="space-y-3">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  f.failed
                    ? "bg-danger-soft text-danger"
                    : f.progress >= 100
                      ? "bg-success-soft text-success"
                      : "bg-primary-soft text-primary"
                }`}
              >
                {f.failed ? (
                  <AlertTriangle className="size-5" />
                ) : f.progress >= 100 ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Loader2 className="size-5 animate-spin" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold">{f.name}</p>
                  <p className="num shrink-0 text-xs text-muted-foreground">
                    {(f.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                    {f.failed ? "Failed" : `${Math.round(f.progress)}%`}
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-smooth ${
                      f.failed ? "bg-danger" : f.progress >= 100 ? "bg-success" : "bg-primary"
                    }`}
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              </div>
              {f.failed ? (
                <button
                  onClick={() => {
                    setFiles((p) =>
                      p.map((x) => (x.id === f.id ? { ...x, failed: false, progress: 0 } : x)),
                    );
                    runUpload(f.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
                >
                  <RefreshCw className="size-3.5" /> Retry
                </button>
              ) : (
                <button
                  onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))}
                  aria-label="Remove file"
                  className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-smooth hover:border-danger hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Step 3 ---------------- */

const TASKS = [
  "Detect Walls",
  "Detect Doors",
  "Detect Windows",
  "Detect Columns",
  "Detect Rooms",
  "Detect Labels",
  "Scale Detection",
  "Generate Digital Model",
];

function StepAnalysis({
  buildingType,
  onDone,
}: {
  buildingType: string;
  onDone: (m: BuildingModel) => void;
}) {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + Math.random() * 4 + 1.4);
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          clearInterval(timer);
          setTimeout(() => onDone(generateAiModel(buildingType || "Factory")), 700);
        }
        return next;
      });
    }, 160);
    return () => clearInterval(timer);
  }, [buildingType, onDone]);

  const perTask = 100 / TASKS.length;
  const currentIndex = Math.min(TASKS.length - 1, Math.floor(progress / perTask));
  const remaining = Math.max(0, Math.round(((100 - progress) / 100) * 26));
  const R = 76;
  const C = 2 * Math.PI * R;

  return (
    <div className="animate-rise">
      <Header
        title="AI Analysis"
        sub="Extracting building geometry, openings and semantics from your drawing."
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[260px_1fr] lg:items-center">
        <div className="mx-auto grid size-[200px] place-items-center">
          <svg viewBox="0 0 200 200" className="size-[200px] -rotate-90">
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="var(--secondary)"
              strokeWidth="14"
            />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress / 100)}
              style={{ transition: "stroke-dashoffset 300ms cubic-bezier(.22,1,.36,1)" }}
            />
            <circle
              cx="100"
              cy="100"
              r={R + 16}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeDasharray="4 10"
              opacity="0.5"
              className="animate-dash-spin"
              style={{ transformOrigin: "100px 100px" }}
            />
          </svg>
          <div className="pointer-events-none absolute text-center">
            <p className="num text-4xl font-bold tracking-tight">
              {Math.round(progress)}%
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {remaining}s remaining
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {TASKS.map((t, i) => {
            const complete = progress >= (i + 1) * perTask;
            const active = !complete && i === currentIndex;
            return (
              <li
                key={t}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-smooth ${
                  active
                    ? "border-primary bg-primary-soft"
                    : complete
                      ? "border-success/25 bg-success-soft/60"
                      : "border-border opacity-60"
                }`}
              >
                {complete ? (
                  <CheckCircle2 className="size-4.5 shrink-0 text-success" />
                ) : active ? (
                  <Sparkles className="size-4.5 shrink-0 animate-pulse text-primary" />
                ) : (
                  <span className="size-4.5 shrink-0 rounded-full border-2 border-border" />
                )}
                <span
                  className={`text-sm ${complete || active ? "font-semibold" : "text-muted-foreground"}`}
                >
                  {t}
                </span>
                {active && (
                  <span className="num ml-auto text-[11px] text-primary">processing…</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Step 4 ---------------- */

function StepReview({
  model,
  onAccept,
  projectId,
}: {
  model: BuildingModel;
  onAccept: () => void;
  projectId: string | null;
}) {
  const [opacity, setOpacity] = useState(100);
  const left = useViewport();
  const right = useViewport();

  useEffect(() => {
    left.fit();
    right.fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // synchronise both canvases
  useEffect(() => {
    right.setView(left.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left.view]);

  const sync = (v: typeof left.view) => {
    left.setView(v);
    right.setView(v);
  };

  const counts = useMemo(() => {
    const c = { wall: 0, door: 0, window: 0, column: 0, room: 0 } as Record<string, number>;
    model.objects.forEach((o) => (c[o.kind] = (c[o.kind] ?? 0) + 1));
    return c;
  }, [model]);

  return (
    <div className="animate-rise space-y-5">
      <Header
        title="Review — Original vs AI Result"
        sub="Both views are synchronised. Zoom and pan on either side to compare."
      />

      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([k, v]) => (
          <span
            key={k}
            className="num rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
          >
            {v} {k}s
          </span>
        ))}
        <span
          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
            model.scaleDetected
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning"
          }`}
        >
          {model.scaleDetected ? "Scale Detected Successfully" : "Scale Not Detected"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ComparePane label="Original Drawing" vp={left} onView={sync}>
          <Scene
            model={{ ...model, objects: model.objects.filter((o) => o.kind === "wall") }}
            showDimensions={false}
          />
        </ComparePane>
        <ComparePane label="AI Result" vp={right} onView={sync} opacity={opacity / 100}>
          <Scene model={model} />
        </ComparePane>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          AI overlay opacity
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        />
        <span className="num w-12 text-right text-xs">{opacity}%</span>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        {projectId && (
          <Link
            to="/editor/$projectId"
            params={{ projectId }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
          >
            <Pencil className="size-4" /> Edit Result
          </Link>
        )}
        <button
          onClick={onAccept}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
        >
          <Check className="size-4" /> Accept AI Result
        </button>
      </div>
    </div>
  );
}

function ComparePane({
  label,
  vp,
  onView,
  opacity = 1,
  children,
}: {
  label: string;
  vp: ReturnType<typeof useViewport>;
  onView: (v: ReturnType<typeof useViewport>["view"]) => void;
  opacity?: number;
  children: React.ReactNode;
}) {
  useEffect(() => {
    onView(vp.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.view]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-canvas">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
        <span className="num text-[11px] text-muted-foreground">
          {Math.round(vp.view.z * 8)}%
        </span>
      </div>
      <div
        ref={vp.ref}
        onPointerDown={vp.startPan}
        onPointerMove={vp.movePan}
        onPointerUp={vp.endPan}
        className="relative h-[340px] touch-none select-none"
        style={{ cursor: "grab" }}
      >
        <svg className="absolute inset-0 size-full">
          <GridDefs z={vp.view.z} view={vp.view} />
          <g
            transform={`translate(${vp.view.x} ${vp.view.y}) scale(${vp.view.z})`}
            opacity={opacity}
          >
            {children}
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ---------------- Step 5 ---------------- */

function StepReady({ projectId }: { projectId: string | null }) {
  const navigate = useNavigate();
  return (
    <div className="animate-rise flex flex-col items-center py-10 text-center">
      <span className="animate-pop-check grid size-24 place-items-center rounded-full bg-success-soft">
        <span className="grid size-16 place-items-center rounded-full bg-success text-success-foreground">
          <Check className="size-8" strokeWidth={3} />
        </span>
      </span>
      <h2 className="mt-6 text-2xl font-bold tracking-tight">
        Building Digital Twin Created Successfully
      </h2>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
        <Check className="size-3.5" /> Ready
      </span>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        Your building is ready for RF Planning.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() =>
            projectId
              ? navigate({ to: "/ready/$projectId", params: { projectId } })
              : navigate({ to: "/" })
          }
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
        >
          Start RF Planning
        </button>
        <button
          onClick={() => navigate({ to: "/" })}
          className="rounded-xl border border-border px-6 py-3 text-sm font-semibold transition-smooth hover:bg-accent"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export { X };
