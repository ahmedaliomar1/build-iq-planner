import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Radio } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProject } from "@/lib/project-store";
import { useRfConfig } from "@/lib/rf-config";
import { BANDS, buildRfProfileObject, useRfProfile } from "@/lib/rf-profile";

export const Route = createFileRoute("/rf/$projectId/profile-ready")({
  head: () => ({
    meta: [
      { title: "RF Profile Saved — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "The engineering RF Profile is generated and stored, ready for the link budget engine.",
      },
      { property: "og:title", content: "RF Profile Saved — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Frequency, bandwidth, propagation, materials and regulations captured in one RF Profile.",
      },
    ],
  }),
  component: RfProfileReady,
});

function RfProfileReady() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  const cfg = useRfConfig(projectId);
  const prof = useRfProfile(projectId);
  const navigate = useNavigate();
  const obj = project ? buildRfProfileObject(project, cfg, prof) : null;
  const band = BANDS.find((b) => b.id === prof.band);

  return (
    <AppShell breadcrumb={["Workspace", "Projects", project?.name ?? "Project", "RF Profile"]}>
      <div className="mx-auto max-w-3xl p-4 md:p-10">
        <div className="animate-rise flex flex-col items-center rounded-3xl border border-border bg-card p-8 text-center shadow-lift md:p-12">
          <span className="animate-pop-check grid size-24 place-items-center rounded-full bg-success-soft">
            <span className="grid size-16 place-items-center rounded-full bg-success text-success-foreground">
              <Check className="size-8" strokeWidth={3} />
            </span>
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight md:text-3xl">
            RF Profile Saved Successfully
          </h1>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
            <Check className="size-3.5" /> RF Profile Ready
          </span>

          {obj && (
            <>
              <dl className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Technology", obj.selectedTechnology],
                  ["Band", band?.label ?? "—"],
                  ["Bandwidth", obj.channelBandwidth],
                  ["Environment", obj.propagationEnvironment?.label ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl border border-border bg-background p-4">
                    <dd className="num text-base font-bold">{v}</dd>
                    <dt className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {k}
                    </dt>
                  </div>
                ))}
              </dl>

              <details className="mt-6 w-full rounded-2xl border border-border bg-background p-4 text-left">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  RF Profile Object
                </summary>
                <pre className="num mt-3 max-h-72 overflow-auto text-[11px] leading-relaxed text-muted-foreground">
                  {JSON.stringify(obj, null, 2)}
                </pre>
              </details>
            </>
          )}

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              onClick={() => navigate({ to: "/rf/$projectId/profile", params: { projectId } })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:brightness-110 active:scale-[0.98]"
            >
              <Radio className="size-4" /> Continue to Link Budget Engine
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold transition-smooth hover:bg-accent"
            >
              <ArrowLeft className="size-4" /> Back
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
