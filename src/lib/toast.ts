/**
 * ButterPop toast utility - theme: material, position: top-right, duration: 5000ms
 * Use only in client components ("use client").
 */

let configured = false;

type ButterPopAPI = {
  configure: (opts: Record<string, unknown>) => void;
  success: (msg: string, opts?: Record<string, unknown>) => void;
  error: (msg: string, opts?: Record<string, unknown>) => void;
  warning: (msg: string, opts?: Record<string, unknown>) => void;
  info: (msg: string, opts?: Record<string, unknown>) => void;
};

function resolveButterPop(mod: unknown): ButterPopAPI | null {
  const m = mod as
    | { ButterPop?: unknown; default?: unknown }
    | undefined;

  const candidates: unknown[] = [
    m?.ButterPop,
    m?.default,
    (m?.default as { ButterPop?: unknown } | undefined)?.ButterPop,
    (m?.default as { default?: unknown } | undefined)?.default,
    mod,
  ];

  for (const candidate of candidates) {
    const api = candidate as Partial<ButterPopAPI> | undefined;
    if (
      api &&
      typeof api.configure === "function" &&
      typeof api.success === "function" &&
      typeof api.error === "function" &&
      typeof api.warning === "function" &&
      typeof api.info === "function"
    ) {
      return api as ButterPopAPI;
    }
  }

  return null;
}

async function getButterPop(): Promise<ButterPopAPI> {
  const mod = (await import("butterpop")) as unknown;
  const ButterPop = resolveButterPop(mod);
  if (!ButterPop) {
    throw new Error("ButterPop failed to load");
  }
  if (!configured) {
    ButterPop.configure({
      theme: "material",
      position: "top-right",
      duration: 5000,
      pauseOnHover: true,
    });
    configured = true;
  }
  return ButterPop as ButterPopAPI;
}

const TOAST_OPTS = { duration: 5000 };

export const toast = {
  success: (message: string) =>
    getButterPop()
      .then((bp) => bp.success(message, TOAST_OPTS))
      .catch((err) => console.error("Toast success failed:", err)),
  error: (message: string) =>
    getButterPop()
      .then((bp) => bp.error(message, TOAST_OPTS))
      .catch((err) => console.error("Toast error failed:", err)),
  warning: (message: string) =>
    getButterPop()
      .then((bp) => bp.warning(message, TOAST_OPTS))
      .catch((err) => console.error("Toast warning failed:", err)),
  info: (message: string) =>
    getButterPop()
      .then((bp) => bp.info(message, TOAST_OPTS))
      .catch((err) => console.error("Toast info failed:", err)),
};
