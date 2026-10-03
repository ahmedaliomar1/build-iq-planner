import type { APIError } from "@/types";

/**
 * Centralized API client. Every HTTP call to the FastAPI backend goes
 * through here — never call fetch() from components or pages.
 */
const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

/** Mock mode stays on until a backend URL is configured. */
export const USE_MOCK = !API_BASE_URL;

export class ApiError extends Error implements APIError {
  status: number;
  code: string;
  details?: unknown;
  constructor(e: APIError) {
    super(e.message);
    this.status = e.status;
    this.code = e.code;
    this.details = e.details;
  }
}

const friendly = (status: number) =>
  status === 0
    ? "Can't reach the server. Check your connection and try again."
    : status === 404
      ? "The requested item could not be found."
      : status >= 500
        ? "The server had a problem. Please try again in a moment."
        : "The request could not be completed.";

type Options = Omit<RequestInit, "body"> & { body?: unknown; timeoutMs?: number };

async function request<T>(method: string, path: string, opts: Options = {}): Promise<T> {
  const { body, timeoutMs = 30_000, headers, ...rest } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: rest.signal ?? controller.signal,
      headers: { ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      ...rest,
    });
    if (!res.ok) {
      let details: unknown;
      try {
        details = await res.json();
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError({ status: res.status, code: `HTTP_${res.status}`, message: friendly(res.status), details });
    }
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("application/json")) return (await res.json()) as T;
    return (await res.blob()) as unknown as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError({ status: 0, code: "NETWORK", message: friendly(0), details: e });
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, o?: Options) => request<T>("GET", path, o),
  post: <T>(path: string, body?: unknown, o?: Options) => request<T>("POST", path, { ...o, body }),
  put: <T>(path: string, body?: unknown, o?: Options) => request<T>("PUT", path, { ...o, body }),
  delete: <T>(path: string, o?: Options) => request<T>("DELETE", path, o),
  /** binary download (PDF, Excel, PNG, ZIP) */
  blob: (path: string, o?: Options) => request<Blob>("GET", path, o),
};

/** Simulated server latency for mock implementations. */
export const mockDelay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));

/** Reads a per-project slice from the local mock store. */
export function readMock<T>(key: string, projectId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, T>;
    return all[projectId] ?? null;
  } catch {
    return null;
  }
}

export function toUserMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Something went wrong. Please try again.";
}
