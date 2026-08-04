import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProject } from "@/lib/project-store";
import type { WallObj } from "@/lib/building-model";
import {
  CapacityStep,
  CeilingStep,
  CoverageStep,
  DevicesStep,
  GoalsStep,
  PurposeStep,
  ServicesStep,
  TechnologyStep,
  VendorStep,
  WallReviewStep,
} from "@/components/rf/steps";
import { CriticalAreasStep, RestrictedAreasStep } from "@/components/rf/plan-steps";
import { RfSummary } from "@/components/rf/summary";
import {
  buildRequirementsPackage,
  saveRfConfig,
  totalDevices,
  useRfConfig,
  type RfConfig,
} from "@/lib/rf-config";

export const Route = createFileRoute("/rf/$projectId/config")({
  head: () => ({
    meta: [
      { title: "RF Configuration Wizard — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Twelve-step RF design configuration: technology, services, devices, coverage objectives, critical areas, restrictions, ceilings and design goals.",
      },
      {
        property: "og:title",
        content: "RF Configuration Wizard — AI Private Cellular Planner",
      },
      {
        property: "og:description",
        content:
          "Capture every requirement and constraint needed for AI-driven indoor RF planning.",
      },
    ],
  }),
  component: RfWizard,
});

const STEP_TITLES = [
  "Network Technology",
  "Deployment Purpose",
  "Required Services",
  "Connected Devices",
  "Coverage Objectives",
  "Capacity Priority",
  "Critical Areas",
  "Installation Restrictions",
  "Ceiling Information",
  "Wall Material Review",
  "Preferred Vendor",
  "Design Goals",
  "Review & Generate",
];

function RfWizard() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const cfg = useRfConfig(projectId);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (restored) return;
    setRestored(true);
    if (cfg.step) setStep(Math.min(cfg.step, STEP_TITLES.length - 1));
  }, [restored, cfg.step]);

  const update = (p: Partial<RfConfig>) => saveRfConfig(projectId, p);

  const walls = useMemo(
    () => (project?.model.objects.filter((o): o is WallObj => o.kind === "wall") ?? []),
    [project],
  );

  const error = useMemo(() => {
    switch (step) {
      case 0:
        return cfg.technology ? null : "Select a network technology to continue.";
      case 1:
        return cfg.purpose ? null : "Select a deployment purpose.";
      case 2:
        return cfg.services.length ? null : "Select at least one required service.";
      case 3:
        return totalDevices(cfg.devices) > 0 ? null : "Enter expected device counts.";
      case 5:
        return cfg.capacity ? null : "Select a capacity requirement.";
      case 10:
        return cfg.vendor ? null : "Select a preferred vendor (or Auto Selection).";
      default:
        return null;
    }
  }, [step, cfg]);

  const goto = (next: number) => {
    const n = Math.max(0, Math.min(STEP_TITLES.length - 1, next));
    setStep(n);
    const completed = Array.from(new Set([...cfg.completed, step])).sort((a, b) => a - b);
    saveRfConfig(projectId, { step: n, completed });
    setSavedAt(Date.now());
  };

  const next = () => {
    if (error) return;
    goto(step + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.altKey && e.key === "ArrowRight") next();
      if (e.altKey && e.key === "ArrowLeft") goto(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!project) {
    return (
      <AppShell breadcrumb={["Workspace", "RF Design"]}>
        <div className="mx-auto max-w-md p-10 text-center">
          <p className="text-sm text-muted-foreground">Project not found.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
            Back to Dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const progress = ((step + 1) / STEP_TITLES.length) * 100;

  return (
    <AppShell
      breadcrumb={["Workspace", "Projects", project.name, "RF Design Configuration"]}
    >
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <header className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight">RF Design Configuration</h1>
              <p className="num text-xs text-muted-foreground">
                Step {step + 1} of {STEP_TITLES.length} · {STEP_TITLES[step]}
              </p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              <Save className="size-3.5" />
              {savedAt ? "Progress autosaved" : "Autosave enabled"}
            </span>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="mt-4 flex flex-wrap gap-1.5">
            {STEP_TITLES.map((t, i) => {
              const done = cfg.completed.includes(i) && i !== step;
              return (
                <li key={t}>
                  <button
                    onClick={() => goto(i)}
                    className={`num flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-smooth ${
                      i === step
                        ? "border-primary bg-primary-soft text-primary"
                        : done
                          ? "border-success/40 bg-success-soft text-success"
                          : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                    title={t}
                  >
                    {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                    <span className="hidden lg:inline">{t}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </header>

        <section className="rounded-3xl border border-border bg-background p-4 md:p-6">
          {step === 0 && <TechnologyStep cfg={cfg} update={update} />}
          {step === 1 && <PurposeStep cfg={cfg} update={update} />}
          {step === 2 && <ServicesStep cfg={cfg} update={update} />}
          {step === 3 && <DevicesStep cfg={cfg} update={update} />}
          {step === 4 && <CoverageStep cfg={cfg} update={update} />}
          {step === 5 && <CapacityStep cfg={cfg} update={update} />}
          {step === 6 && (
            <div className="animate-rise space-y-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                  Critical Areas
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click rooms on the digital twin to assign coverage priority.
                </p>
              </div>
              <CriticalAreasStep
                model={project.model}
                value={cfg.roomPriorities}
                onChange={(roomPriorities) => update({ roomPriorities })}
              />
            </div>
          )}
          {step === 7 && (
            <div className="animate-rise space-y-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                  Installation Restrictions
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Draw zones where antennas or installation work are not permitted.
                </p>
              </div>
              <RestrictedAreasStep
                model={project.model}
                value={cfg.restricted}
                onChange={(restricted) => update({ restricted })}
              />
            </div>
          )}
          {step === 8 && <CeilingStep cfg={cfg} update={update} />}
          {step === 9 && <WallReviewStep walls={walls} cfg={cfg} update={update} />}
          {step === 10 && <VendorStep cfg={cfg} update={update} />}
          {step === 11 && <GoalsStep cfg={cfg} update={update} />}
          {step === 12 && (
            <RfSummary project={project} cfg={cfg} onEditStep={(i) => goto(i)} />
          )}
        </section>

        <footer className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-card/95 p-4 backdrop-blur">
          <button
            onClick={() => goto(step - 1)}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-smooth hover:bg-accent disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> Previous
          </button>

          {error && (
            <span className="text-xs font-semibold text-warning">{error}</span>
          )}

          {step < STEP_TITLES.length - 1 ? (
            <button
              onClick={next}
              disabled={!!error}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 disabled:opacity-40"
            >
              Next <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                const pkg = buildRequirementsPackage(project, cfg);
                saveRfConfig(projectId, {
                  generatedAt: pkg.timestamp,
                  completed: Array.from(
                    { length: STEP_TITLES.length },
                    (_unused, i: number) => i,
                  ),
                });
                navigate({ to: "/rf/$projectId/ready", params: { projectId } });
              }}
              className="mx-auto inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lift transition-smooth hover:brightness-110 active:scale-[0.99]"
            >
              Generate Initial RF Design Requirements
            </button>
          )}
        </footer>
      </div>
    </AppShell>
  );
}
