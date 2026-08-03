import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BUILDING_TYPES } from "@/lib/building-model";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — AI Private Cellular Planner" },
      {
        name: "description",
        content:
          "Start from pre-configured building templates with typical materials, room usage and RF assumptions.",
      },
      { property: "og:title", content: "Templates — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Pre-configured building profiles for faster digital twin creation.",
      },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  return (
    <AppShell breadcrumb={["Workspace", "Templates"]}>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Building profiles with pre-set materials, room usage and coverage targets.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {BUILDING_TYPES.map((t) => (
            <li
              key={t}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-smooth hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Building2 className="size-5" strokeWidth={1.8} />
              </span>
              <h2 className="mt-4 font-semibold">{t} Template</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Typical wall build-up, room usage set and indoor coverage target for {t.toLowerCase()} sites.
              </p>
              <Link
                to="/new"
                className="mt-4 inline-block text-xs font-semibold text-primary hover:underline"
              >
                Use template →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
