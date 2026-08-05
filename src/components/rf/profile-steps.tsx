import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Radio,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { MaterialId, Project, WallObj } from "@/lib/building-model";
import { materialById } from "@/lib/building-model";
import { Scene } from "@/components/editor/scene";
import { GridDefs, useViewport } from "@/components/editor/viewport";
import type { RfConfig } from "@/lib/rf-config";
import {
  ANTENNA_CATEGORIES,
  BANDS,
  BANDWIDTHS,
  KB_LIBRARIES,
  MATERIAL_CHOICES,
  PROPAGATION_ENVIRONMENTS,
  RF_STANDARDS,
  analyzeObstacles,
  materialDistribution,
  recommendBand,
  recommendPropagation,
  regulationFor,
  saveRfProfile,
  suggestMaterial,
  unknownWalls,
  validateRfProfile,
  wallConfidence,
  type RfProfileConfig,
} from "@/lib/rf-profile";

type Update = (p: Partial<RfProfileConfig>) => void;

export function StepHead({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

const cardCls = (active: boolean) =>
  `rounded-2xl border p-4 text-left transition-smooth ${
    active
      ? "border-primary bg-primary-soft shadow-soft"
      : "border-border bg-card hover:border-primary/40 hover:bg-accent"
  }`;

/* ---------------- Step 1 — Knowledge Base + Materials ---------------- */

export function KnowledgeBaseStep({
  project,
  prof,
  update,
}: {
  project: Project;
  prof: RfProfileConfig;
  update: Update;
}) {
  const [loaded, setLoaded] = useState(prof.kbLoaded ? KB_LIBRARIES.length : 0);
  const [review, setReview] = useState(false);

  useEffect(() => {
    if (prof.kbLoaded) return;
    if (loaded >= KB_LIBRARIES.length) {
      update({ kbLoaded: true });
      return;
    }
    const t = setTimeout(() => setLoaded((n) => n + 1), 420);
    return () => clearTimeout(t);
  }, [loaded, prof.kbLoaded, update]);

  const dist = useMemo(
    () => materialDistribution(project.model, prof.materialOverrides),
    [project.model, prof.materialOverrides],
  );
  const unknown = useMemo(
    () => unknownWalls(project.model, prof.materialOverrides),
    [project.model, prof.materialOverrides],
  );

  return (
    <div className="animate-rise space-y-5">
      <StepHead
        title="RF Knowledge Base"
        note="Engineering libraries load automatically. No manual input is required here."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KB_LIBRARIES.map((lib, i) => {
          const done = prof.kbLoaded || i < loaded;
          return (
            <div
              key={lib.id}
              className={`flex items-start gap-3 rounded-2xl border p-4 transition-smooth ${
                done ? "border-success/40 bg-success-soft" : "border-border bg-card"
              }`}
            >
              <span
                className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${
                  done ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  <Loader2 className="size-4 animate-spin" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold">{lib.label}</p>
                <p className="text-xs text-muted-foreground">{lib.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {prof.kbLoaded && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
          <Check className="size-3.5" strokeWidth={3} /> RF Knowledge Base Ready
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-primary" />
          <h3 className="text-sm font-bold">Material Library Review</h3>
          <span className="num ml-auto text-xs text-muted-foreground">
            {project.model.objects.filter((o) => o.kind === "wall").length} walls analysed
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {dist.map((d) => (
            <div key={d.id} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs font-semibold">{materialById(d.id).category}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${d.pct}%`, background: d.color }}
                />
              </div>
              <span className="num w-10 shrink-0 text-right text-xs font-bold">{d.pct}%</span>
            </div>
          ))}
          {!dist.length && (
            <p className="text-sm text-muted-foreground">No walls detected in the digital building.</p>
          )}
        </div>

        {unknown.length > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-4">
            <AlertTriangle className="size-5 text-warning" />
            <div>
              <p className="text-sm font-bold text-warning">Unknown Materials</p>
              <p className="num text-xs text-muted-foreground">
                {unknown.length} wall{unknown.length === 1 ? "" : "s"} need engineering review
              </p>
            </div>
            <button
              onClick={() => setReview(true)}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110"
            >
              Review <ChevronRight className="size-4" />
            </button>
          </div>
        ) : (
          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
            <Check className="size-3.5" strokeWidth={3} /> All materials validated
          </div>
        )}
      </div>

      {review && (
        <UnknownMaterialReview
          walls={unknown}
          allWalls={project.model.objects.filter((o): o is WallObj => o.kind === "wall")}
          prof={prof}
          update={update}
          onClose={() => setReview(false)}
        />
      )}
    </div>
  );
}

function UnknownMaterialReview({
  walls,
  allWalls,
  prof,
  update,
  onClose,
}: {
  walls: WallObj[];
  allWalls: WallObj[];
  prof: RfProfileConfig;
  update: Update;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, MaterialId>>({});
  const [applySimilar, setApplySimilar] = useState(true);
  const [bulk, setBulk] = useState<MaterialId>("concrete");

  const set = (id: string, m: MaterialId) => setDraft((d) => ({ ...d, [id]: m }));

  const save = () => {
    const next: Record<string, MaterialId> = { ...prof.materialOverrides };
    for (const w of walls) {
      const m = draft[w.id] ?? suggestMaterial(w);
      next[w.id] = m;
      if (applySimilar) {
        for (const o of allWalls) {
          if (o.id !== w.id && Math.abs(o.thickness - w.thickness) < 0.02 && o.material === w.material) {
            next[o.id] = m;
          }
        }
      }
    }
    update({ materialOverrides: next, materialsSaved: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="animate-rise flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h3 className="text-sm font-bold">Unknown Material Review</h3>
          <span className="num text-xs text-muted-foreground">{walls.length} walls</span>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 hover:bg-accent">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-5 py-3">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={applySimilar}
              onChange={(e) => setApplySimilar(e.target.checked)}
              className="size-4 accent-[oklch(var(--primary))]"
            />
            Apply to similar walls
          </label>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={bulk}
              onChange={(e) => setBulk(e.target.value as MaterialId)}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold"
            >
              {MATERIAL_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {materialById(m).name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setDraft(Object.fromEntries(walls.map((w) => [w.id, bulk])))}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-smooth hover:bg-accent"
            >
              Bulk Update
            </button>
            <button
              onClick={() =>
                setDraft(Object.fromEntries(walls.map((w) => [w.id, suggestMaterial(w)])))
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary transition-smooth hover:brightness-105"
            >
              <Sparkles className="size-3.5" /> Accept AI Suggestion
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-background text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-bold">Wall ID</th>
                <th className="px-3 py-2 font-bold">Current Material</th>
                <th className="px-3 py-2 font-bold">Confidence</th>
                <th className="px-3 py-2 font-bold">Suggested</th>
                <th className="px-5 py-2 font-bold">Manual Selection</th>
              </tr>
            </thead>
            <tbody>
              {walls.map((w) => {
                const conf = wallConfidence(w);
                const sug = suggestMaterial(w);
                return (
                  <tr key={w.id} className="border-t border-border">
                    <td className="num px-5 py-2.5 text-xs font-semibold">{w.id}</td>
                    <td className="px-3 py-2.5 text-xs">{materialById(w.material).name}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`num rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          conf < 62 ? "bg-warning-soft text-warning" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {conf}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {materialById(sug).name}
                    </td>
                    <td className="px-5 py-2.5">
                      <select
                        value={draft[w.id] ?? sug}
                        onChange={(e) => set(w.id, e.target.value as MaterialId)}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold"
                      >
                        {MATERIAL_CHOICES.map((m) => (
                          <option key={m} value={m}>
                            {materialById(m).name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center gap-3 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110"
          >
            <Check className="size-4" /> Save Materials
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Step 2 — Frequency Profile ---------------- */

export function FrequencyStep({
  project,
  cfg,
  prof,
  update,
}: {
  project: Project;
  cfg: RfConfig;
  prof: RfProfileConfig;
  update: Update;
}) {
  const rec = useMemo(() => recommendBand(cfg, project.country), [cfg, project.country]);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(prof.band ?? rec.id);

  useEffect(() => {
    if (!prof.band) update({ band: rec.id, bandMode: "auto" });
  }, [prof.band, rec.id, update]);

  const band = BANDS.find((b) => b.id === prof.band) ?? rec;
  const reg = regulationFor(project.country);

  return (
    <div className="animate-rise space-y-5">
      <StepHead
        title="Frequency Profile"
        note="The recommended band is derived from technology, capacity target and national spectrum rules."
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Selected Technology
            </dt>
            <dd className="mt-1 text-lg font-bold">
              {cfg.technology === "lte" ? "Private LTE" : "Private 5G"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recommended Band
            </dt>
            <dd className="num mt-1 text-lg font-bold text-primary">{band.label}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Frequency
            </dt>
            <dd className="num mt-1 text-lg font-bold">
              {band.freq >= 1000 && band.freq % 1000 === 0 && band.freq >= 10000
                ? `${band.freq / 1000} GHz`
                : `${band.freq} MHz`}
            </dd>
          </div>
        </dl>
        <p className="mt-4 rounded-xl bg-primary-soft p-3 text-sm text-primary">
          <strong className="font-bold">Reason: </strong>
          Best balance between coverage and capacity for this deployment profile
          {reg.allowed.includes(band.id) ? `, and permitted by ${reg.regulator}.` : "."}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => {
              setPick(prof.band ?? rec.id);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110"
          >
            <Radio className="size-4" /> Change Band
          </button>
          <span className="text-xs font-semibold text-muted-foreground">
            Selection mode: {prof.bandMode === "auto" ? "AI recommended" : "Manual override"}
          </span>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-rise flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
            <header className="flex items-center gap-3 border-b border-border px-5 py-4">
              <h3 className="text-sm font-bold">Select Frequency Band</h3>
              <button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1.5 hover:bg-accent">
                <X className="size-4" />
              </button>
            </header>
            <div className="grid flex-1 gap-3 overflow-auto p-5 sm:grid-cols-2">
              {BANDS.filter((b) => b.tech === (cfg.technology === "lte" ? "lte" : "5g")).map((b) => {
                const blocked = reg.restricted.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => !blocked && setPick(b.id)}
                    className={`${cardCls(pick === b.id)} ${blocked ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="num text-base font-bold">{b.label}</span>
                      <span className="num text-xs text-muted-foreground">
                        {b.freq >= 10000 ? `${b.freq / 1000} GHz` : `${b.freq} MHz`}
                      </span>
                      {blocked && (
                        <span className="ml-auto rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                          Restricted
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div>
                        <dt className="inline font-semibold text-foreground">Coverage: </dt>
                        <dd className="inline">{b.coverage}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-foreground">Capacity: </dt>
                        <dd className="inline">{b.capacity}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-foreground">Use cases: </dt>
                        <dd className="inline">{b.useCases}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-foreground">Compatibility: </dt>
                        <dd className="inline">{b.compatibility}</dd>
                      </div>
                    </dl>
                  </button>
                );
              })}
            </div>
            <footer className="flex items-center gap-3 border-t border-border px-5 py-4">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  update({ band: pick, bandMode: pick === rec.id ? "auto" : "manual" });
                  setOpen(false);
                }}
                className="ml-auto rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110"
              >
                Apply
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Step 3 — Channel Bandwidth ---------------- */

export function BandwidthStep({ prof, update }: { prof: RfProfileConfig; update: Update }) {
  return (
    <div className="animate-rise space-y-5">
      <StepHead
        title="Channel Bandwidth"
        note="Channel width drives peak throughput and cell-edge performance."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BANDWIDTHS.map((b) => (
          <button
            key={b.id}
            onClick={() => update({ bandwidth: b.id })}
            className={cardCls(prof.bandwidth === b.id)}
          >
            <div className="flex items-center gap-2">
              <span className="num text-base font-bold">{b.label}</span>
              {prof.bandwidth === b.id && <Check className="ml-auto size-4 text-primary" strokeWidth={3} />}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{b.note}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Step 4 — Antenna Category ---------------- */

export function AntennaStep({ prof, update }: { prof: RfProfileConfig; update: Update }) {
  return (
    <div className="animate-rise space-y-5">
      <StepHead
        title="Antenna Category"
        note="Select the deployment category only. Hardware models are chosen in a later module."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ANTENNA_CATEGORIES.map((a) => (
          <button
            key={a.id}
            onClick={() => update({ antennaCategory: a.id })}
            className={cardCls(prof.antennaCategory === a.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{a.label}</span>
              {prof.antennaCategory === a.id && (
                <Check className="ml-auto size-4 text-primary" strokeWidth={3} />
              )}
            </div>
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div>
                <dt className="inline font-semibold text-foreground">Installation: </dt>
                <dd className="inline">{a.install}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-foreground">Coverage: </dt>
                <dd className="inline">{a.coverage}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-foreground">Environments: </dt>
                <dd className="inline">{a.environments}</dd>
              </div>
            </dl>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Step 5 — Propagation Environment ---------------- */

export function PropagationStep({
  project,
  cfg,
  prof,
  update,
}: {
  project: Project;
  cfg: RfConfig;
  prof: RfProfileConfig;
  update: Update;
}) {
  const rec = useMemo(() => recommendPropagation(project, cfg), [project, cfg]);

  useEffect(() => {
    if (!prof.propagation) update({ propagation: rec.id, propagationMode: "auto" });
  }, [prof.propagation, rec.id, update]);

  return (
    <div className="animate-rise space-y-5">
      <StepHead
        title="Propagation Environment"
        note="Derived from the validated digital building. You can override the recommendation."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROPAGATION_ENVIRONMENTS.map((e) => (
          <button
            key={e.id}
            onClick={() =>
              update({ propagation: e.id, propagationMode: e.id === rec.id ? "auto" : "manual" })
            }
            className={cardCls(prof.propagation === e.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{e.label}</span>
              {e.id === rec.id && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                  <Sparkles className="size-3" /> AI Recommendation
                </span>
              )}
              {prof.propagation === e.id && (
                <Check className="ml-auto size-4 text-primary" strokeWidth={3} />
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{e.note}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Step 6 — Floor Information ---------------- */

export function FloorsStep({ prof, update }: { prof: RfProfileConfig; update: Update }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");

  const commit = (id: string) => {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 2 && n <= 30) {
      update({ floors: prof.floors.map((f) => (f.id === id ? { ...f, height: n } : f)) });
    }
    setEditing(null);
  };

  return (
    <div className="animate-rise space-y-5">
      <StepHead title="Floor Information" note="Only floor height is editable. Values must be between 2 and 30 m." />
      <div className="space-y-3">
        {prof.floors.map((f) => {
          const invalid = editing === f.id && (!Number.isFinite(Number(value)) || Number(value) < 2 || Number(value) > 30);
          return (
            <div
              key={f.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="text-sm font-bold">{f.name}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Height
              </span>
              {editing === f.id ? (
                <>
                  <input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commit(f.id)}
                    className={`num w-24 rounded-lg border bg-background px-2 py-1.5 text-sm font-semibold ${
                      invalid ? "border-destructive" : "border-border"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">m</span>
                  <button
                    onClick={() => commit(f.id)}
                    disabled={invalid}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    Save
                  </button>
                  {invalid && (
                    <span className="text-xs font-semibold text-destructive">
                      Enter a height between 2 and 30 m.
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="num text-sm font-bold">{f.height.toFixed(1)} m</span>
                  <button
                    onClick={() => {
                      setEditing(f.id);
                      setValue(String(f.height));
                    }}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-smooth hover:bg-accent"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Step 7 — Building Obstacles ---------------- */

export function ObstaclesStep({
  project,
  prof,
  update,
}: {
  project: Project;
  prof: RfProfileConfig;
  update: Update;
}) {
  const groups = useMemo(
    () => analyzeObstacles(project.model, prof.materialOverrides),
    [project.model, prof.materialOverrides],
  );
  const visible = groups.filter((g) => !prof.deletedObstacles.includes(g.id));
  const [open, setOpen] = useState<string | null>(null);
  const active = visible.find((g) => g.id === open) ?? null;

  const vp = useViewport();
  const highlight = new Set(active?.items.map((i) => i.id) ?? []);

  return (
    <div className="animate-rise space-y-5">
      <StepHead
        title="Building Obstacles"
        note="Objects that attenuate or reflect RF energy, extracted from the digital twin."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((g) => {
          const ignored = prof.ignoredObstacles.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => setOpen(g.id)}
              className={`${cardCls(open === g.id)} ${ignored ? "opacity-55" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{g.label}</span>
                <span className="num ml-auto text-lg font-bold">
                  {g.count > 0 ? g.count : "Detected"}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{g.detail}</p>
              {ignored && (
                <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  Ignored
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-canvas">
          <div
            ref={vp.ref}
            className="relative h-[360px] touch-none"
            onPointerDown={vp.startPan}
            onPointerMove={vp.movePan}
            onPointerUp={vp.endPan}
          >
            <svg className="size-full">
              <GridDefs z={vp.view.z} view={vp.view} />
              <g transform={`translate(${vp.view.x} ${vp.view.y}) scale(${vp.view.z})`}>
                <Scene model={project.model} showDimensions={false} />
                {project.model.objects
                  .filter((o): o is WallObj => o.kind === "wall" && highlight.has(o.id))
                  .map((w) => (
                    <line
                      key={w.id}
                      x1={w.x1}
                      y1={w.y1}
                      x2={w.x2}
                      y2={w.y2}
                      stroke="#ef4444"
                      strokeWidth={0.35}
                      strokeLinecap="round"
                      opacity={0.85}
                    />
                  ))}
              </g>
            </svg>
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-4">
          {active ? (
            <>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{active.label}</h3>
                <span className="num ml-auto text-xs text-muted-foreground">
                  {active.items.length} objects
                </span>
              </div>
              <ul className="mt-3 max-h-52 space-y-1.5 overflow-auto">
                {active.items.map((i) => (
                  <li key={i.id} className="rounded-lg border border-border bg-background px-3 py-2">
                    <p className="num text-xs font-semibold">{i.label}</p>
                    <p className="text-[11px] text-muted-foreground">{i.note}</p>
                  </li>
                ))}
                {!active.items.length && (
                  <li className="text-xs text-muted-foreground">No individual objects listed.</li>
                )}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setOpen(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-smooth hover:bg-accent"
                >
                  <Pencil className="size-3.5" /> Edit
                </button>
                <button
                  onClick={() =>
                    update({
                      ignoredObstacles: prof.ignoredObstacles.includes(active.id)
                        ? prof.ignoredObstacles.filter((x) => x !== active.id)
                        : [...prof.ignoredObstacles, active.id],
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-smooth hover:bg-accent"
                >
                  {prof.ignoredObstacles.includes(active.id) ? (
                    <>
                      <Eye className="size-3.5" /> Include
                    </>
                  ) : (
                    <>
                      <EyeOff className="size-3.5" /> Ignore
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    update({ deletedObstacles: [...prof.deletedObstacles, active.id] });
                    setOpen(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition-smooth hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select an obstacle card to inspect the detected objects and highlight them in the
              digital twin.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ---------------- Step 8 — Country Regulations ---------------- */

export function RegulationsStep({
  project,
  prof,
  update,
}: {
  project: Project;
  prof: RfProfileConfig;
  update: Update;
}) {
  const reg = regulationFor(project.country);
  const [loading, setLoading] = useState(prof.regulationsCountry !== project.country);

  useEffect(() => {
    if (prof.regulationsCountry === project.country) return;
    setLoading(true);
    const t = setTimeout(() => {
      update({ regulationsCountry: project.country });
      setLoading(false);
    }, 900);
    return () => clearTimeout(t);
  }, [prof.regulationsCountry, project.country, update]);

  return (
    <div className="animate-rise space-y-5">
      <StepHead
        title="Country Regulations"
        note="Spectrum rules reload automatically whenever the project country changes."
      />
      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm font-semibold">Loading regulation profile for {project.country}…</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <ShieldCheck className="size-5 text-success" />
            <div>
              <p className="text-sm font-bold">{project.country}</p>
              <p className="text-xs text-muted-foreground">Regulator: {reg.regulator}</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
              <Check className="size-3.5" strokeWidth={3} /> Regulations loaded
            </span>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Allowed Bands
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {reg.allowed.map((b) => (
                  <span
                    key={b}
                    className="num inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success"
                  >
                    <Check className="size-3" strokeWidth={3} /> {b}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Restricted Bands
              </dt>
              <dd className="num mt-1.5 flex flex-wrap gap-1.5 text-xs font-bold">
                {reg.restricted.length ? (
                  reg.restricted.map((b) => (
                    <span
                      key={b}
                      className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-destructive"
                    >
                      {b}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Max EIRP
              </dt>
              <dd className="num mt-1.5 text-sm font-bold">{reg.maxEirp}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

/* ---------------- Step 9 — RF Standards ---------------- */

export function StandardsStep() {
  const rows = [
    ["3GPP Release", RF_STANDARDS.release.replace("3GPP Release ", "")],
    ["Deployment Mode", RF_STANDARDS.deploymentMode],
    ["Indoor RF Profile", RF_STANDARDS.indoorProfile],
    ["Network Type", RF_STANDARDS.networkType],
    ["Duplex Mode", RF_STANDARDS.duplex],
  ];
  return (
    <div className="animate-rise space-y-5">
      <StepHead
        title="RF Standards"
        note="Engineering standards applied to this profile. Read-only in version 1."
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0"
          >
            <span className="text-sm font-semibold text-muted-foreground">{k}</span>
            <span className="num ml-auto text-sm font-bold">{v}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Future versions will allow editing the release and deployment mode per project.
      </p>
    </div>
  );
}

/* ---------------- Step 10 — RF Validation ---------------- */

export function ValidationStep({
  project,
  cfg,
  prof,
  onFix,
}: {
  project: Project;
  cfg: RfConfig;
  prof: RfProfileConfig;
  onFix: (step: number) => void;
}) {
  const items = validateRfProfile(project, cfg, prof);
  const failed = items.filter((i) => i.status === "fail");

  return (
    <div className="animate-rise space-y-5">
      <StepHead
        title="RF Validation"
        note="A complete engineering validation runs before the RF Profile can be generated."
      />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((i) => (
          <div
            key={i.id}
            className={`flex items-center gap-3 rounded-2xl border p-4 ${
              i.status === "pass"
                ? "border-success/40 bg-success-soft"
                : "border-destructive/40 bg-destructive/10"
            }`}
          >
            <span
              className={`grid size-7 place-items-center rounded-lg ${
                i.status === "pass"
                  ? "bg-success text-success-foreground"
                  : "bg-destructive text-destructive-foreground"
              }`}
            >
              {i.status === "pass" ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" />}
            </span>
            <span className="text-sm font-semibold">{i.label}</span>
            <span
              className={`ml-auto text-xs font-bold ${
                i.status === "pass" ? "text-success" : "text-destructive"
              }`}
            >
              {i.status === "pass" ? "Passed" : "Review Required"}
            </span>
          </div>
        ))}
      </div>

      {failed.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-sm font-bold text-destructive">
            {failed.length} blocking issue{failed.length === 1 ? "" : "s"}
          </h3>
          {failed.map((i) => (
            <div
              key={i.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <AlertTriangle className="size-5 text-warning" />
              <div>
                <p className="text-sm font-bold">{i.issue}</p>
                <p className="text-xs text-muted-foreground">{i.hint ?? "Status: Review Required"}</p>
              </div>
              <button
                onClick={() => onFix(i.target ?? 0)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-smooth hover:bg-accent"
              >
                Fix now <ChevronRight className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- RF Profile Summary ---------------- */

export function RfProfileSummary({
  project,
  cfg,
  prof,
  onEditStep,
}: {
  project: Project;
  cfg: RfConfig;
  prof: RfProfileConfig;
  onEditStep: (step: number) => void;
}) {
  const band = BANDS.find((b) => b.id === prof.band);
  const env = PROPAGATION_ENVIRONMENTS.find((e) => e.id === prof.propagation);
  const unknown = unknownWalls(project.model, prof.materialOverrides);
  const ok = validateRfProfile(project, cfg, prof).every((v) => v.status === "pass");

  const rows: [string, string, number][] = [
    ["Technology", cfg.technology === "lte" ? "Private LTE" : "Private 5G", 1],
    ["Band", band ? `${band.label} · ${band.freq >= 10000 ? `${band.freq / 1000} GHz` : `${band.freq} MHz`}` : "—", 1],
    ["Bandwidth", prof.bandwidth === "auto" ? "Auto" : `${prof.bandwidth} MHz`, 2],
    ["Antenna Category", ANTENNA_CATEGORIES.find((a) => a.id === prof.antennaCategory)?.label ?? "—", 3],
    ["Propagation Model", env ? `${env.label} Indoor` : "—", 4],
    ["Building Materials", unknown.length ? `${unknown.length} pending` : "Validated", 0],
    ["Building Geometry", "Validated", 5],
    ["Country Regulations", `${project.country} · Loaded`, 7],
    ["RF Standards", RF_STANDARDS.release, 8],
    ["Vendor Preference", cfg.vendor ?? "—", 0],
  ];

  return (
    <div className="animate-rise space-y-5">
      <StepHead title="RF Profile Summary" note="Review the engineering profile before saving it to the project." />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {rows.map(([k, v, step]) => (
          <div key={k} className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-0">
            <span className="text-sm font-semibold text-muted-foreground">{k}</span>
            <span className="num ml-auto text-sm font-bold">{v}</span>
            <button
              onClick={() => onEditStep(step)}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold transition-smooth hover:bg-accent"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
          ok ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
        }`}
      >
        {ok ? <Check className="size-3.5" strokeWidth={3} /> : <AlertTriangle className="size-3.5" />}
        {ok ? "RF Profile Ready" : "Validation issues must be resolved"}
      </div>
    </div>
  );
}

export { saveRfProfile };
