import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProjectCard } from "@/components/project-card";
import { useProjects } from "@/services/projectService";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Project Archive — AI Private Cellular Planner" },
      { name: "description", content: "Archived and completed Private 5G / LTE RF design projects." },
      { property: "og:title", content: "Project Archive — AI Private Cellular Planner" },
      { property: "og:description", content: "Review, reopen, duplicate or restore archived RF design projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const archived = useProjects().filter((p) => p.archived);
  return (
    <AppShell breadcrumb={["Workspace", "Archive"]}>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Project Archive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Archived projects keep every design stage and their final package. Restore one to bring it back to the dashboard.
        </p>
        {archived.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No archived projects yet. Use the archive button on a project card.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
