import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  Settings,
  Signal,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  breadcrumb,
  children,
}: {
  breadcrumb: string[];
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card/90 px-4 backdrop-blur md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Signal className="size-5" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-bold tracking-tight">
              AI Private Cellular Planner
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Indoor LTE / 5G network design
            </span>
          </span>
        </Link>

        <nav
          aria-label="Breadcrumb"
          className="mx-auto hidden items-center gap-1.5 text-sm text-muted-foreground lg:flex"
        >
          {breadcrumb.map((c, i) => (
            <span key={c} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3.5 opacity-60" />}
              <span
                className={
                  i === breadcrumb.length - 1 ? "font-semibold text-foreground" : ""
                }
              >
                {c}
              </span>
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="relative grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-smooth hover:bg-accent hover:text-accent-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" />
          </button>
          <Link
            to="/settings"
            className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition-smooth hover:bg-accent hover:text-accent-foreground"
            aria-label="Settings"
          >
            <Settings className="size-4" />
          </Link>
          <button className="flex items-center gap-2 rounded-xl border border-border py-1 pl-1 pr-3 transition-smooth hover:bg-accent">
            <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-xs font-bold text-primary">
              MK
            </span>
            <span className="hidden text-xs font-semibold sm:block">RF Engineer</span>
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-border bg-sidebar p-3 md:block">
          <ul className="space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4.5" strokeWidth={1.8} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 rounded-2xl border border-border bg-primary-soft/60 p-4">
            <p className="text-xs font-semibold text-primary">Phase 1</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Build a validated Digital Twin before RF planning starts.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="sticky bottom-0 z-40 flex border-t border-border bg-card md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-smooth ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-4.5" strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
