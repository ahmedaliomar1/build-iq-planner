import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Radio } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProject } from "@/lib/project-store";

export const Route = createFileRoute("/ready/$projectId")({
  head: () => ({
    meta: [
      { title: "Digital Twin Ready — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "The building digital twin is validated and stored with geometry, materials, rooms, layers and scale — ready for RF planning.",
      },
      { property: "og:title", content: "Digital Twin Ready — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Your building model is validated and ready for indoor RF planning.",
      },
    ],
  }),
  component: ReadyPage,
});

function ReadyPage() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const navigate = useNavigate();
  const counts = project
    ? project.model.objects.reduce<Record<string, number>>((acc, o) => {
        acc[o.kind] = (acc[o.kind] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <AppShell breadcrumb={["Workspace", "Projects", project?.name ?? "Project", "Ready"]}>
      <div className="mx-auto max-w-3xl p-4 md:p-10">
        <div className="animate-rise flex flex-col items-center rounded-3xl border border-border bg-card p-8 text-center shadow-lift md:p-12">
          <span className="animate-pop-check grid size-24 place-items-center rounded-full bg-success-soft">
            <span className="grid size-16 place-items-center rounded-full bg-success text-success-foreground">
              <Check className="size-8" strokeWidth={3} />
            </span>
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight md:text-3xl">
            Building Digital Twin Created Successfully
          </h1>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
            <Check className="size-3.5" /> Ready
          </span>
          <p className="mt-3 text-sm text-muted-foreground">
            Your building is ready for RF Planning.
          </p>

          <dl className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            {["wall", "room", "door", "window"].map((k) => (
              <div key={k} className="rounded-2xl border border-border bg-background p-4">
                <dd className="num text-xl font-bold">{counts[k] ?? 0}</dd>
                <dt className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {k}s
                </dt>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              onClick={() => navigate({ to: "/rf/$projectId", params: { projectId } })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
            >
              <Radio className="size-4" /> Continue to RF Planning
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold transition-smooth hover:bg-accent"
            >
              <ArrowLeft className="size-4" /> Back to Dashboard
            </Link>
          </div>

          <p className="mt-6 text-[11px] text-muted-foreground">
            Stored as a digital building model: geometry, objects, materials, measurements,
            rooms, layers, metadata, AI labels, scale and version history.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
