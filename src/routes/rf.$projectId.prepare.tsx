import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProject } from "@/lib/project-store";
import { PREPARE_TASKS, saveRfProfile } from "@/lib/rf-profile";

export const Route = createFileRoute("/rf/$projectId/prepare")({
  head: () => ({
    meta: [
      { title: "Preparing RF Environment — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Loading the RF knowledge base, material library, frequency profiles, propagation models and country regulations.",
      },
      { property: "og:title", content: "Preparing RF Environment — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Engineering resources are being prepared for indoor RF planning.",
      },
    ],
  }),
  component: PrepareRf,
});

function PrepareRf() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const navigate = useNavigate();
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= PREPARE_TASKS.length) {
      saveRfProfile(projectId, { prepared: true });
      return;
    }
    const t = setTimeout(() => setDone((n) => n + 1), 620);
    return () => clearTimeout(t);
  }, [done, projectId]);

  const complete = done >= PREPARE_TASKS.length;
  const pct = Math.round((done / PREPARE_TASKS.length) * 100);
  const remaining = Math.max(0, PREPARE_TASKS.length - done) * 0.62;

  return (
    <AppShell breadcrumb={["Workspace", "Projects", project?.name ?? "Project", "RF Environment"]}>
      <div className="mx-auto max-w-2xl p-4 md:p-10">
        <div className="animate-rise rounded-3xl border border-border bg-card p-8 shadow-lift md:p-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Preparing RF Environment
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Preparing engineering resources for RF planning...
            </p>
          </div>

          <div className="mt-8 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="num mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{pct}% complete</span>
            <span>
              {complete ? "Finished" : `~${remaining.toFixed(0)}s remaining`}
            </span>
          </div>

          <ol className="mt-7 space-y-2.5">
            {PREPARE_TASKS.map((t, i) => {
              const finished = i < done;
              const active = i === done;
              return (
                <li
                  key={t}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-smooth ${
                    finished
                      ? "border-success/40 bg-success-soft"
                      : active
                        ? "border-primary/40 bg-primary-soft"
                        : "border-border bg-background opacity-60"
                  }`}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-lg ${
                      finished
                        ? "bg-success text-success-foreground"
                        : active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {finished ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : active ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <span className="num text-[11px] font-bold">{i + 1}</span>
                    )}
                  </span>
                  <span className="text-sm font-semibold">{t}</span>
                </li>
              );
            })}
          </ol>

          <button
            disabled={!complete}
            onClick={() => navigate({ to: "/rf/$projectId/overview", params: { projectId } })}
            className="mt-8 w-full rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lift transition-smooth hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    </AppShell>
  );
}
