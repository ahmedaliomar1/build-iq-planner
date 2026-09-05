import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Maximize2,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { BuildingModel } from "@/lib/building-model";
import type { OptAntenna } from "@/lib/rf-optimization";
import type { RfLayer, RfLayerId } from "@/lib/rf-simulation";
import {
  CHAPTER_LABELS,
  MAP_DEFS,
  REPORT_DEFS,
  documentToExcelXml,
  documentToText,
  printDocument,
  reportDate,
  type ChapterId,
  type ChapterSection,
  type ReportChapter,
  type ReportDocument,
  type ReportId,
  type ReportRecord,
} from "@/lib/reports";
import { ReportMap, downloadMapPng } from "./report-map";

/* ---------------------------- report cards ---------------------------- */

export function ReportCards({
  records,
  onPreview,
  onDownload,
  onDownloadExcel,
  onRegenerate,
}: {
  records: ReportRecord[];
  onPreview: (id: ReportId) => void;
  onDownload: (id: ReportId) => void;
  onDownloadExcel: (id: ReportId) => void;
  onRegenerate: (id: ReportId) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {REPORT_DEFS.map((def) => {
        const rec = records.find((r) => r.reportId === def.id);
        return (
          <article
            key={def.id}
            className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-smooth hover:shadow-lift"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-tight">{def.title}</h3>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{def.type}</p>
              </div>
              <span
                className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  rec ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {rec?.status ?? "Pending"}
              </span>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{def.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">{def.purpose}</p>

            <dl className="num mt-4 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-semibold">{rec?.version ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Pages</dt>
                <dd className="font-semibold">{rec?.pages ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Generated</dt>
                <dd className="font-semibold">
                  {rec ? new Date(rec.generatedAt).toLocaleDateString("en-US") : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => onPreview(def.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-smooth hover:opacity-90"
              >
                <Eye className="size-3.5" /> Preview
              </button>
              <button
                onClick={() => onDownload(def.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
              >
                <Download className="size-3.5" /> Download PDF
              </button>
              {def.formats.includes("excel") && (
                <button
                  onClick={() => onDownloadExcel(def.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
                >
                  <FileSpreadsheet className="size-3.5" /> Excel
                </button>
              )}
              <button
                onClick={() => onRegenerate(def.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
              >
                <RefreshCw className="size-3.5" /> Regenerate
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* --------------------------- section renderer --------------------------- */

function highlight(text: string, term: string) {
  if (!term) return text;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-warning-soft px-0.5">{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

function SectionBlock({ section, term }: { section: ChapterSection; term: string }) {
  return (
    <section className="mt-5 first:mt-0">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {highlight(section.heading, term)}
      </h4>
      {section.text && <p className="mt-2 text-sm">{highlight(section.text, term)}</p>}
      {section.rows && (
        <dl className="mt-2 divide-y divide-border rounded-xl border border-border">
          {section.rows.map(([k, v]) => (
            <div key={k} className="flex items-start gap-3 px-3 py-1.5 text-xs">
              <dt className="w-48 shrink-0 text-muted-foreground">{highlight(k, term)}</dt>
              <dd className="num font-semibold">{highlight(v, term)}</dd>
            </div>
          ))}
        </dl>
      )}
      {section.bullets && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {section.bullets.map((b) => (
            <li key={b}>{highlight(b, term)}</li>
          ))}
        </ul>
      )}
      {section.table && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="num w-full text-left text-xs">
            <thead className="bg-secondary">
              <tr>
                {section.table.head.map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {section.table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-1.5">
                      {highlight(c, term)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* --------------------------- interactive preview --------------------------- */

export function ReportPreview({
  doc,
  onClose,
  onDownload,
}: {
  doc: ReportDocument;
  onClose: () => void;
  onDownload: () => void;
}) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const [term, setTerm] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPage((p) => Math.min(doc.pages.length, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc.pages.length, onClose]);

  const matches = useMemo(() => {
    if (!term) return [];
    return doc.pages
      .filter((p) => JSON.stringify(p).toLowerCase().includes(term.toLowerCase()))
      .map((p) => p.index);
  }, [doc.pages, term]);

  const current = doc.pages[Math.min(page, doc.pages.length) - 1]!;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-2 backdrop-blur-sm md:p-6">
      <div
        className={`animate-rise flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lift ${
          full ? "h-full max-w-none" : "h-[92vh] max-w-6xl"
        }`}
      >
        <header className="flex flex-wrap items-center gap-2 border-b border-border p-3 md:p-4">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold tracking-tight">{doc.title}</h3>
            <p className="num text-[11px] text-muted-foreground">
              {doc.cover.project} · {doc.cover.version} · {reportDate(doc.cover.generatedAt)}
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search report"
                className="w-32 bg-transparent text-xs outline-none"
              />
              {term && (
                <span className="num text-[11px] text-muted-foreground">{matches.length}</span>
              )}
            </label>
            <div className="flex items-center gap-1 rounded-xl border border-border p-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                aria-label="Zoom out"
                className="rounded-lg p-1.5 transition-smooth hover:bg-accent"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="num w-10 text-center text-[11px]">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
                aria-label="Zoom in"
                className="rounded-lg p-1.5 transition-smooth hover:bg-accent"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <button
              onClick={() => setFull((f) => !f)}
              aria-label="Fullscreen"
              className="rounded-xl border border-border p-2 transition-smooth hover:bg-accent"
            >
              <Maximize2 className="size-3.5" />
            </button>
            <button
              onClick={() => printDocument(doc)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent"
            >
              <Printer className="size-3.5" /> Print
            </button>
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-smooth hover:opacity-90"
            >
              <Download className="size-3.5" /> Download
            </button>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-xl border border-border p-2 transition-smooth hover:bg-accent"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-40 shrink-0 overflow-auto border-r border-border bg-sidebar p-2 md:block">
            {doc.pages.map((p) => (
              <button
                key={p.index}
                onClick={() => setPage(p.index)}
                className={`mb-2 w-full rounded-xl border p-2 text-left transition-smooth ${
                  p.index === page ? "border-primary bg-primary-soft" : "border-border bg-card hover:bg-accent"
                }`}
              >
                <div className="mb-1 h-16 rounded-md border border-border bg-background p-1">
                  <div className="h-1.5 w-2/3 rounded bg-muted" />
                  <div className="mt-1 space-y-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-0.5 w-full rounded bg-muted" />
                    ))}
                  </div>
                </div>
                <p className="num text-[10px] font-semibold">Page {p.index}</p>
                <p className="truncate text-[10px] text-muted-foreground">{p.title}</p>
              </button>
            ))}
          </aside>

          <div ref={bodyRef} className="min-w-0 flex-1 overflow-auto bg-background p-4 md:p-8">
            <article
              className="mx-auto max-w-3xl origin-top rounded-2xl border border-border bg-card p-6 shadow-soft md:p-10"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            >
              {page === 1 && (
                <header className="mb-6 border-b border-border pb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {doc.cover.author}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight">{doc.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{doc.subtitle}</p>
                  <dl className="num mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Project</dt>
                      <dd className="font-semibold">{doc.cover.project}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Technology</dt>
                      <dd className="font-semibold">{doc.cover.technology}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Version</dt>
                      <dd className="font-semibold">{doc.cover.version}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Generated</dt>
                      <dd className="font-semibold">{reportDate(doc.cover.generatedAt)}</dd>
                    </div>
                  </dl>
                </header>
              )}

              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Page {current.index} of {doc.pages.length}
              </p>
              <h3 className="mt-1 text-lg font-bold tracking-tight">{current.title}</h3>
              {current.sections.map((s) => (
                <SectionBlock key={s.heading} section={s} term={term} />
              ))}

              <footer className="mt-8 border-t border-border pt-3 text-[11px] text-muted-foreground">
                {doc.title} · {doc.cover.project} · Page {current.index}
              </footer>
            </article>
          </div>
        </div>

        <footer className="flex items-center justify-center gap-3 border-t border-border p-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5" /> Previous
          </button>
          <span className="num text-xs text-muted-foreground">
            Page {page} / {doc.pages.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(doc.pages.length, p + 1))}
            disabled={page === doc.pages.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-smooth hover:bg-accent disabled:opacity-40"
          >
            Next <ArrowRight className="size-3.5" />
          </button>
        </footer>
      </div>
    </div>
  );
}

/* --------------------------- engineering maps --------------------------- */

export function MapsCenter({
  model,
  layers,
  antennas,
}: {
  model: BuildingModel;
  layers: Record<RfLayerId, RfLayer>;
  antennas: OptAntenna[];
}) {
  const [full, setFull] = useState<string | null>(null);
  const refs = useRef<Record<string, SVGSVGElement | null>>({});

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-bold tracking-tight">Engineering Maps Center</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        All engineering maps generated from the approved design. Interactive GIS, CAD overlay and
        GeoTIFF export arrive in a future version.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {MAP_DEFS.map((m) => {
          const layer = m.layer ? (layers[m.layer] ?? null) : null;
          return (
            <figure key={m.id} className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="aspect-4/3 bg-card">
                <ReportMap
                  model={model}
                  layer={layer}
                  antennas={antennas}
                  svgRef={(el) => {
                    refs.current[m.id] = el;
                  }}
                />
              </div>
              <figcaption className="border-t border-border p-3">
                <p className="text-xs font-bold tracking-tight">{m.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{m.description}</p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => setFull(m.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold transition-smooth hover:bg-accent"
                  >
                    <Maximize2 className="size-3" /> Fullscreen
                  </button>
                  <button
                    onClick={() => downloadMapPng(refs.current[m.id] ?? null, `${m.id}-map.png`)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold transition-smooth hover:bg-accent"
                  >
                    <Download className="size-3" /> PNG
                  </button>
                </div>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {full && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm">
          <div className="animate-rise flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
            <header className="flex items-center gap-3 border-b border-border p-4">
              <h4 className="text-sm font-bold tracking-tight">
                {MAP_DEFS.find((m) => m.id === full)?.title}
              </h4>
              <button
                onClick={() => setFull(null)}
                aria-label="Close map"
                className="ml-auto rounded-xl border border-border p-2 transition-smooth hover:bg-accent"
              >
                <X className="size-3.5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 bg-background p-4">
              <ReportMap
                model={model}
                layer={
                  MAP_DEFS.find((m) => m.id === full)?.layer
                    ? layers[MAP_DEFS.find((m) => m.id === full)!.layer as RfLayerId]
                    : null
                }
                antennas={antennas}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------ report library ------------------------------ */

export function ReportLibrary({
  records,
  onPreview,
  onDownload,
  onDuplicate,
  onRegenerate,
  onDelete,
}: {
  records: ReportRecord[];
  onPreview: (id: ReportId) => void;
  onDownload: (id: ReportId) => void;
  onDuplicate: (key: string) => void;
  onRegenerate: (id: ReportId) => void;
  onDelete: (key: string) => void;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<"date" | "name" | "type">("date");

  const types = useMemo(() => Array.from(new Set(records.map((r) => r.type))), [records]);

  const rows = useMemo(() => {
    const filtered = records.filter(
      (r) =>
        (type === "all" || r.type === type) &&
        (r.name.toLowerCase().includes(q.toLowerCase()) || r.type.toLowerCase().includes(q.toLowerCase())),
    );
    return filtered.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "type"
          ? a.type.localeCompare(b.type)
          : b.generatedAt - a.generatedAt,
    );
  }, [records, q, type, sort]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold tracking-tight">Report Library</h3>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reports"
              className="w-36 bg-transparent text-xs outline-none"
            />
          </label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="appearance-none rounded-xl border border-border bg-card py-1.5 pl-3 pr-7 text-xs font-semibold outline-none"
            >
              <option value="all">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 size-3.5 text-muted-foreground" />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "date" | "name" | "type")}
              className="appearance-none rounded-xl border border-border bg-card py-1.5 pl-3 pr-7 text-xs font-semibold outline-none"
            >
              <option value="date">Newest first</option>
              <option value="name">Name</option>
              <option value="type">Type</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 size-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary">
            <tr>
              {["Report name", "Type", "Generated", "Version", "Status", "Actions"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.key} className="transition-smooth hover:bg-accent/40">
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.type}</td>
                <td className="num px-3 py-2 text-muted-foreground">{reportDate(r.generatedAt)}</td>
                <td className="num px-3 py-2">{r.version}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onPreview(r.reportId)}
                      aria-label={`Preview ${r.name}`}
                      className="rounded-lg border border-border p-1.5 transition-smooth hover:bg-accent"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onDownload(r.reportId)}
                      aria-label={`Download ${r.name}`}
                      className="rounded-lg border border-border p-1.5 transition-smooth hover:bg-accent"
                    >
                      <Download className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onDuplicate(r.key)}
                      aria-label={`Duplicate ${r.name}`}
                      className="rounded-lg border border-border p-1.5 transition-smooth hover:bg-accent"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onRegenerate(r.reportId)}
                      aria-label={`Regenerate ${r.name}`}
                      className="rounded-lg border border-border p-1.5 transition-smooth hover:bg-accent"
                    >
                      <RefreshCw className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(r.key)}
                      aria-label={`Delete ${r.name}`}
                      className="rounded-lg border border-border p-1.5 text-danger transition-smooth hover:bg-danger-soft"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No reports match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------ chapter builder ------------------------------ */

export function ChapterBuilder({
  chapters,
  completed,
}: {
  chapters: ReportChapter[];
  completed: ChapterId[];
}) {
  const [open, setOpen] = useState<ChapterId | null>(chapters[0]?.id ?? null);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-primary" />
        <h3 className="text-sm font-bold tracking-tight">Chapter Builder</h3>
        <span className="num ml-auto text-xs text-muted-foreground">
          {completed.length}/{chapters.length} chapters generated
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Every chapter is generated independently so future report templates can reuse it without
        changing the workflow.
      </p>

      <div className="mt-4 space-y-2">
        {chapters.map((c) => (
          <div key={c.id} className="rounded-xl border border-border">
            <button
              onClick={() => setOpen((o) => (o === c.id ? null : c.id))}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              <span
                className={`size-2 rounded-full ${
                  completed.includes(c.id) ? "bg-success" : "bg-muted-foreground/40"
                }`}
              />
              <span className="text-sm font-semibold">{CHAPTER_LABELS[c.id]}</span>
              <span className="num ml-auto text-[11px] text-muted-foreground">
                {c.sections.length} sections
              </span>
              <ChevronDown
                className={`size-3.5 transition-smooth ${open === c.id ? "rotate-180" : ""}`}
              />
            </button>
            {open === c.id && (
              <div className="border-t border-border px-3 py-3">
                <p className="text-xs text-muted-foreground">{c.summary}</p>
                {c.sections.map((s) => (
                  <SectionBlock key={s.heading} section={s} term="" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ download helpers ------------------------------ */

export function downloadDocument(doc: ReportDocument, format: "pdf" | "excel") {
  if (typeof window === "undefined") return;
  if (format === "excel") {
    const blob = new Blob([documentToExcelXml(doc)], { type: "application/vnd.ms-excel" });
    triggerDownload(blob, `${doc.id}-${doc.cover.version}.xls`);
    return;
  }
  const blob = new Blob([documentToText(doc)], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${doc.id}-${doc.cover.version}.pdf.txt`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
