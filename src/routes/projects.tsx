import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "./index";
import { useProjects } from "@/lib/project-store";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — AI Private Cellular Planner" },
      {
        name: "description",
        content: "All Private LTE and Private 5G indoor planning projects in your workspace.",
      },
      { property: "og:title", content: "Projects — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Browse building digital twins and continue planning where you left off.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = useProjects();
  return (
    <AppShell breadcrumb={["Workspace", "Projects"]}>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every building digital twin in this workspace.
        </p>
        <div className="mt-6">
          {projects.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full overflow-hidden rounded-2xl border border-border bg-card text-sm">
              <thead className="bg-background text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Project</th>
                  <th className="hidden px-4 py-3 font-bold sm:table-cell">Building</th>
                  <th className="hidden px-4 py-3 font-bold md:table-cell">Country</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {p.buildingType}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {p.country}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.status}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/editor/$projectId"
                        params={{ projectId: p.id }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
