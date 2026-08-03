import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Private Cellular Planner" },
      {
        name: "description",
        content: "Workspace preferences: units, autosave interval, AI analysis and validation defaults.",
      },
      { property: "og:title", content: "Settings — AI Private Cellular Planner" },
      {
        property: "og:description",
        content: "Configure units, autosave and validation behaviour for your planning workspace.",
      },
    ],
  }),
  component: SettingsPage,
});

const ROWS = [
  { label: "Measurement units", value: "Metric (meters)" },
  { label: "Autosave interval", value: "Every 30 seconds" },
  { label: "AI analysis quality", value: "High accuracy" },
  { label: "Validation on save", value: "Enabled" },
  { label: "Default network", value: "Auto recommendation" },
];

function SettingsPage() {
  return (
    <AppShell breadcrumb={["Workspace", "Settings"]}>
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defaults applied to new projects and the building editor.
        </p>
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {ROWS.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="text-sm font-semibold">{r.label}</span>
              <span className="num text-sm text-muted-foreground">{r.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
