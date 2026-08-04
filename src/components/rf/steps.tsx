import { useState, type ReactNode } from "react";
import { Check, Loader2, Sparkles, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { MATERIALS, type MaterialId, type WallObj } from "@/lib/building-model";
import {
  AI_QUESTIONS,
  CAPACITY_CARDS,
  PURPOSES,
  SERVICES,
  VENDORS,
  coverageLabel,
  recommendTech,
  serviceImpact,
  totalDevices,
  type DeviceCounts,
  type NetworkTech,
  type RfConfig,
} from "@/lib/rf-config";

export function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="animate-rise space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function SelectCard({
  selected,
  onClick,
  title,
  note,
  badge,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  note?: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative w-full rounded-2xl border p-4 text-left transition-smooth ${
        selected
          ? "border-primary bg-primary-soft/50 shadow-soft"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold">{title}</span>
        <span
          className={`grid size-5 shrink-0 place-items-center rounded-full border ${
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
          }`}
        >
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
      </div>
      {badge && (
        <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {badge}
        </span>
      )}
      {note && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{note}</p>}
      {children}
    </button>
  );
}

/* ---------------- Step 1 ---------------- */

export function TechnologyStep({
  cfg,
  update,
}: {
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  const [thinking, setThinking] = useState(false);
  const auto = cfg.technologyMode === "auto";
  const answered = AI_QUESTIONS.every((q) => cfg.aiAnswers[q.id]);

  const run = () => {
    setThinking(true);
    setTimeout(() => {
      update({ aiRecommendation: recommendTech(cfg.aiAnswers) });
      setThinking(false);
    }, 1400);
  };

  return (
    <StepShell
      title="Choose Network Technology"
      subtitle="Select the radio technology for this private network, or let the assistant recommend one."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectCard
          selected={!auto && cfg.technology === "lte"}
          onClick={() => update({ technologyMode: "manual", technology: "lte" })}
          title="Private LTE"
          note="Mature ecosystem, wide device support, excellent coverage per node."
        />
        <SelectCard
          selected={!auto && cfg.technology === "5g"}
          onClick={() => update({ technologyMode: "manual", technology: "5g" })}
          title="Private 5G"
          note="High capacity, URLLC low latency, network slicing and massive IoT."
        />
        <SelectCard
          selected={auto}
          onClick={() => update({ technologyMode: "auto" })}
          title="Auto Recommendation"
          badge="AI Assistant"
          note="Answer engineering questions and let the AI recommend the technology."
        />
      </div>

      {auto && (
        <div className="animate-rise space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" /> AI Recommendation Assistant
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {AI_QUESTIONS.map((q) => (
              <div key={q.id}>
                <p className="text-xs font-semibold text-muted-foreground">{q.q}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {q.options.map((o) => (
                    <button
                      key={o.value}
                      onClick={() =>
                        update({
                          aiAnswers: { ...cfg.aiAnswers, [q.id]: o.value },
                          aiRecommendation: null,
                        })
                      }
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-smooth ${
                        cfg.aiAnswers[q.id] === o.value
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            disabled={!answered || thinking}
            onClick={run}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-smooth hover:brightness-110 disabled:opacity-40"
          >
            {thinking ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {thinking ? "Analyzing requirements…" : "Run AI Recommendation"}
          </button>

          {thinking && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>Weighting latency, mobility and automation constraints…</li>
              <li>Estimating device density and spectral efficiency…</li>
              <li>Comparing LTE and 5G NR deployment profiles…</li>
            </ul>
          )}

          {cfg.aiRecommendation && !thinking && (
            <div className="animate-rise rounded-2xl border border-primary/40 bg-primary-soft/40 p-4">
              <p className="text-sm font-bold text-primary">
                Recommended: {cfg.aiRecommendation.tech === "5g" ? "Private 5G" : "Private LTE"}
              </p>
              <p className="num mt-1 text-xs text-muted-foreground">
                Confidence {cfg.aiRecommendation.confidence}%
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${cfg.aiRecommendation.confidence}%` }}
                />
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {cfg.aiRecommendation.reasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => update({ technology: cfg.aiRecommendation!.tech })}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-smooth hover:brightness-110"
                >
                  Accept Recommendation
                </button>
                {(["lte", "5g"] as NetworkTech[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => update({ technology: t })}
                    className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-smooth ${
                      cfg.technology === t ? "border-primary text-primary" : "border-border hover:bg-accent"
                    }`}
                  >
                    Override: {t === "5g" ? "Private 5G" : "Private LTE"}
                  </button>
                ))}
              </div>
              {cfg.technology && (
                <p className="mt-3 text-xs font-semibold text-success">
                  Selected: {cfg.technology === "5g" ? "Private 5G" : "Private LTE"}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </StepShell>
  );
}

/* ---------------- Step 2 ---------------- */

export function PurposeStep({
  cfg,
  update,
}: {
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  return (
    <StepShell
      title="Why are you deploying this network?"
      subtitle="The deployment purpose shapes default traffic models and service assumptions."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PURPOSES.map((p) => (
          <SelectCard
            key={p.id}
            selected={cfg.purpose === p.id}
            onClick={() => update({ purpose: p.id })}
            title={p.label}
            note={p.note}
          />
        ))}
      </div>
    </StepShell>
  );
}

/* ---------------- Step 3 ---------------- */

export function ServicesStep({
  cfg,
  update,
}: {
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  const impact = serviceImpact(cfg.services);
  const toggle = (id: string) =>
    update({
      services: cfg.services.includes(id)
        ? cfg.services.filter((s) => s !== id)
        : [...cfg.services, id],
    });

  return (
    <StepShell
      title="Select Required Services"
      subtitle="Choose every service the network must carry. Multiple selections allowed."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <SelectCard
            key={s.id}
            selected={cfg.services.includes(s.id)}
            onClick={() => toggle(s.id)}
            title={s.label}
            note={s.note}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Live requirement summary
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-4">
          <Stat label="Services" value={String(cfg.services.length)} />
          <Stat label="Latency target" value={impact.latency} />
          <Stat label="Traffic pattern" value={impact.uplink} />
          <Stat label="Suggested profile" value={impact.profile} />
        </dl>
      </div>
    </StepShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dd className="text-sm font-bold">{value}</dd>
      <dt className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
    </div>
  );
}

/* ---------------- Step 4 ---------------- */

const DEVICE_FIELDS: { key: keyof DeviceCounts; label: string }[] = [
  { key: "employees", label: "Employees" },
  { key: "visitors", label: "Visitors" },
  { key: "iot", label: "IoT Devices" },
  { key: "robots", label: "Robots" },
  { key: "cameras", label: "Cameras" },
  { key: "agvs", label: "AGVs" },
  { key: "handhelds", label: "Handheld Devices" },
];

export function DevicesStep({
  cfg,
  update,
}: {
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  const total = totalDevices(cfg.devices);
  return (
    <StepShell
      title="Expected Connected Devices"
      subtitle="Estimate peak simultaneous devices per category. Values must be zero or positive."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DEVICE_FIELDS.map((f) => {
          const v = cfg.devices[f.key];
          return (
            <label key={f.key} className="rounded-2xl border border-border bg-card p-4">
              <span className="text-xs font-semibold text-muted-foreground">{f.label}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={Number.isFinite(v) ? v : 0}
                onChange={(e) => {
                  const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                  update({ devices: { ...cfg.devices, [f.key]: n } });
                }}
                className="num mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-lg font-bold"
              />
            </label>
          );
        })}
        <div className="grid place-items-center rounded-2xl border border-primary/40 bg-primary-soft/50 p-4 text-center">
          <div>
            <p className="num text-2xl font-bold text-primary">{total.toLocaleString()}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Total devices
            </p>
          </div>
        </div>
      </div>
      {total === 0 && (
        <p className="text-xs font-semibold text-warning">
          Enter at least one device count to continue.
        </p>
      )}
    </StepShell>
  );
}

/* ---------------- Step 5 ---------------- */

export function CoverageStep({
  cfg,
  update,
}: {
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  const c = coverageLabel(cfg.coverageBias);
  return (
    <StepShell
      title="Coverage vs Cost Optimization"
      subtitle="This weighting will drive the AI node-count and placement optimizer."
    >
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Lowest Cost</span>
          <span>Maximum Coverage</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={cfg.coverageBias}
          onChange={(e) => update({ coverageBias: Number(e.target.value) })}
          aria-label="Coverage versus cost optimization"
          className="mt-3 w-full accent-[var(--primary)]"
        />
        <div className="mt-5 rounded-2xl bg-primary-soft/50 p-4">
          <p className="num text-xs font-semibold text-primary">{cfg.coverageBias} / 100</p>
          <p className="mt-1 text-base font-bold">{c.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>
        </div>
      </div>
    </StepShell>
  );
}

/* ---------------- Step 6 ---------------- */

export function CapacityStep({
  cfg,
  update,
}: {
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  return (
    <StepShell
      title="Capacity Requirement"
      subtitle="Set the expected aggregate demand for the covered area."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAPACITY_CARDS.map((c) => (
          <SelectCard
            key={c.id}
            selected={cfg.capacity === c.id}
            onClick={() => update({ capacity: c.id })}
            title={c.label}
          >
            <dl className="mt-3 space-y-2 text-xs">
              <div>
                <dt className="font-semibold text-muted-foreground">Expected traffic</dt>
                <dd>{c.traffic}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted-foreground">Typical applications</dt>
                <dd>{c.apps}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted-foreground">Deployment profile</dt>
                <dd>{c.profile}</dd>
              </div>
            </dl>
          </SelectCard>
        ))}
      </div>
    </StepShell>
  );
}

/* ---------------- Step 9 ---------------- */

export function CeilingStep({
  cfg,
  update,
}: {
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  const materials = ["concrete", "gypsum", "metal", "other"] as const;
  return (
    <StepShell
      title="Ceiling Information"
      subtitle="Building-wide defaults. Individual rooms can be overridden later in the editor."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <label className="rounded-2xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground">
            Default ceiling height (m)
          </span>
          <input
            type="number"
            min={1.5}
            step={0.1}
            value={cfg.ceiling.height}
            onChange={(e) =>
              update({
                ceiling: { ...cfg.ceiling, height: Math.max(1.5, Number(e.target.value) || 0) },
              })
            }
            className="num mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-lg font-bold"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground">False ceiling</span>
          <div className="mt-2 flex gap-2">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                onClick={() => update({ ceiling: { ...cfg.ceiling, falseCeiling: v } })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-smooth ${
                  cfg.ceiling.falseCeiling === v
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground">Ceiling material</span>
          <select
            value={cfg.ceiling.material}
            onChange={(e) =>
              update({
                ceiling: {
                  ...cfg.ceiling,
                  material: e.target.value as RfConfig["ceiling"]["material"],
                },
              })
            }
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold capitalize"
          >
            {materials.map((m) => (
              <option key={m} value={m} className="capitalize">
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
    </StepShell>
  );
}

/* ---------------- Step 10 ---------------- */

const REVIEW_MATERIALS: MaterialId[] = [
  "concrete",
  "brick",
  "glass",
  "metal",
  "gypsum",
  "wood",
];

export function WallReviewStep({
  walls,
  cfg,
  update,
}: {
  walls: WallObj[];
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  // Low-confidence heuristic: thin non-structural walls the AI could not classify well.
  const uncertain = walls.filter((_, i) => i % 7 === 3);
  const setMat = (id: string, m: MaterialId) =>
    update({ wallMaterials: { ...cfg.wallMaterials, [id]: m } });

  return (
    <StepShell
      title="Wall Material Review"
      subtitle="Only walls where AI material detection had low confidence are shown."
    >
      {uncertain.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          All detected wall materials are high confidence. Nothing to review.
        </p>
      ) : (
        <div className="space-y-2">
          {uncertain.map((w, i) => {
            const suggested = w.material;
            const current = cfg.wallMaterials[w.id];
            return (
              <div
                key={w.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="text-sm font-bold">Wall #{i + 1}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    current ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                  }`}
                >
                  {current
                    ? MATERIALS.find((m) => m.id === current)?.name
                    : "Unknown — low confidence"}
                </span>
                <select
                  value={current ?? ""}
                  onChange={(e) => setMat(w.id, e.target.value as MaterialId)}
                  className="ml-auto rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select material…</option>
                  {REVIEW_MATERIALS.map((m) => (
                    <option key={m} value={m}>
                      {MATERIALS.find((x) => x.id === m)?.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setMat(w.id, suggested)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
                >
                  Accept AI Suggestion
                </button>
                <button
                  onClick={() => {
                    const m = current ?? suggested;
                    const next = { ...cfg.wallMaterials };
                    uncertain
                      .filter((o) => Math.abs(o.thickness - w.thickness) < 0.02)
                      .forEach((o) => (next[o.id] = m));
                    update({ wallMaterials: next });
                  }}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
                >
                  Apply to Similar Walls
                </button>
              </div>
            );
          })}
        </div>
      )}
    </StepShell>
  );
}

/* ---------------- Step 11 ---------------- */

export function VendorStep({
  cfg,
  update,
}: {
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  return (
    <StepShell
      title="Preferred Infrastructure Vendor"
      subtitle="Stored as a preference only — equipment selection and BOM happen in later modules."
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {VENDORS.map((v) => (
          <SelectCard
            key={v}
            selected={cfg.vendor === v}
            onClick={() => update({ vendor: v })}
            title={v}
            note={
              v === "Auto Selection"
                ? "Let the AI pick the best fit during equipment selection."
                : undefined
            }
          />
        ))}
      </div>
    </StepShell>
  );
}

/* ---------------- Step 12 ---------------- */

export function GoalsStep({
  cfg,
  update,
}: {
  cfg: RfConfig;
  update: (p: Partial<RfConfig>) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= cfg.goals.length || from === to) return;
    const next = [...cfg.goals];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    update({ goals: next });
  };

  return (
    <StepShell
      title="Rank Your Design Priorities"
      subtitle="Drag to reorder — rank 1 has the strongest influence on AI optimization."
    >
      <ul className="space-y-2">
        {cfg.goals.map((g, i) => (
          <li
            key={g}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
            }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-smooth hover:border-primary/40"
          >
            <GripVertical className="size-4 cursor-grab text-muted-foreground" />
            <span className="num grid size-7 place-items-center rounded-lg bg-primary-soft text-xs font-bold text-primary">
              {i + 1}
            </span>
            <span className="text-sm font-semibold">{g}</span>
            <div className="ml-auto flex gap-1">
              <button
                aria-label={`Move ${g} up`}
                onClick={() => move(i, i - 1)}
                className="grid size-8 place-items-center rounded-lg border border-border transition-smooth hover:bg-accent"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                aria-label={`Move ${g} down`}
                onClick={() => move(i, i + 1)}
                className="grid size-8 place-items-center rounded-lg border border-border transition-smooth hover:bg-accent"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </StepShell>
  );
}
