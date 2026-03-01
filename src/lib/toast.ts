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

async function getButterPop(): Promise<ButterPopAPI> {
  const mod = await import("butterpop") as { ButterPop?: ButterPopAPI; default?: ButterPopAPI };
  const ButterPop = mod.ButterPop ?? mod.default ?? (mod as unknown as ButterPopAPI);
  if (!ButterPop?.configure) {
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
  success: (message: string) => getButterPop().then((bp) => bp.success(message, TOAST_OPTS)),
  error: (message: string) => getButterPop().then((bp) => bp.error(message, TOAST_OPTS)),
  warning: (message: string) => getButterPop().then((bp) => bp.warning(message, TOAST_OPTS)),
  info: (message: string) => getButterPop().then((bp) => bp.info(message, TOAST_OPTS)),
};
