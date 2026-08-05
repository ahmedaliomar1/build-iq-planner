import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProject } from "@/lib/project-store";
import { useRfConfig } from "@/lib/rf-config";
import {
  AntennaStep,
  BandwidthStep,
  FloorsStep,
  FrequencyStep,
  KnowledgeBaseStep,
  ObstaclesStep,
  PropagationStep,
  RegulationsStep,
  RfProfileSummary,
  StandardsStep,
  ValidationStep,
} from "@/components/rf/profile-steps";
import {
  buildRfProfileObject,
  saveRfProfile,
  validateRfProfile,
  type RfProfileConfig,
} from "@/lib/rf-profile";

export const Route = createFileRoute("/rf/$projectId/profile")({
  head: () => ({
    meta: [
      { title: "RF Parameter Configuration — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Configure the RF knowledge base, frequency band, bandwidth, antenna category, propagation model, floors, obstacles, regulations and standards.",
      },
      { property: "og:title", content: "RF Parameter Configuration — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Build the engineering RF Profile that powers later link budget and planning modules.",
      },
    ],
  }),
  component: RfProfileWizard,
});

const STEPS = [
  "RF Knowledge Base",
  "Frequency Profile",
  "Channel Bandwidth",
  "Antenna Category",
  "Propagation Environment",
  "Floor Information",
  "Building Obstacles",
  "Country Regulations",
  "RF Standards",
  "RF Validation",
  "RF Profile Summary",
];

function RfProfileWizard() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const cfg = useRfConfig(projectId);
  const prof = useRfProfile(projectId);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (restored) return;
    setRestored(true);
    if (prof.step) setStep(Math.min(prof.step, STEPS.length - 1));
  }, [restored, prof.step]);

  const update = useCallback(
    (p: Partial<RfProfileConfig>) => saveRfProfile(projectId, p),
    [projectId],
  );

  const goto = (next: number) => {
    const n = Math.max(0, Math.min(STEPS.length - 1, next));
    setStep(n);
    saveRfProfile(projectId, {
      step: n,
      completed: Array.from(new Set([...prof.completed, step])).sort((a, b) => a - b),
    });
    setSavedAt(Date.now());
  };

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

  const validation = validateRfProfile(project, cfg, prof);
  const blocked = validation.some((v) => v.status === "fail");

  const error =
    step === 3 && !prof.antennaCategory
      ? "Select an antenna deployment category."
      : step === 9 && blocked
        ? "Resolve all blocking validation issues to continue."
        : null;

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <AppShell breadcrumb={["Workspace", "Projects", project.name, "RF Parameter Configuration"]}>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <header className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight">RF Parameter Configuration</h1>
              <p className="num text-xs text-muted-foreground">
                Step {step + 1} of {STEPS.length} · {STEPS[step]}
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
            {STEPS.map((t, i) => {
              const done = prof.completed.includes(i) && i !== step;
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
          {step === 0 && <KnowledgeBaseStep project={project} prof={prof} update={update} />}
          {step === 1 && (
            <FrequencyStep project={project} cfg={cfg} prof={prof} update={update} />
          )}
          {step === 2 && <BandwidthStep prof={prof} update={update} />}
          {step === 3 && <AntennaStep prof={prof} update={update} />}
          {step === 4 && (
            <PropagationStep project={project} cfg={cfg} prof={prof} update={update} />
          )}
          {step === 5 && <FloorsStep prof={prof} update={update} />}
          {step === 6 && <ObstaclesStep project={project} prof={prof} update={update} />}
          {step === 7 && <RegulationsStep project={project} prof={prof} update={update} />}
          {step === 8 && <StandardsStep />}
          {step === 9 && (
            <ValidationStep project={project} cfg={cfg} prof={prof} onFix={(s) => goto(s)} />
          )}
          {step === 10 && (
            <RfProfileSummary project={project} cfg={cfg} prof={prof} onEditStep={(s) => goto(s)} />
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

          {error && <span className="text-xs font-semibold text-warning">{error}</span>}

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => !error && goto(step + 1)}
              disabled={!!error}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 disabled:opacity-40"
            >
              Next <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              disabled={blocked}
              onClick={() => {
                const obj = buildRfProfileObject(project, cfg, prof);
                saveRfProfile(projectId, {
                  validatedAt: Date.now(),
                  savedAt: obj.configurationTimestamp,
                  completed: Array.from({ length: STEPS.length }, (_u, i: number) => i),
                });
                navigate({ to: "/rf/$projectId/profile-ready", params: { projectId } });
              }}
              className="mx-auto inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lift transition-smooth hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
            >
              Generate RF Profile
            </button>
          )}
        </footer>
      </div>
    </AppShell>
  );
}

import { useRfProfile } from "@/lib/rf-profile";
