import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
  base: {
    env: process.env.NODE_ENV,
  },
});

export type LogContext = {
  requestId?: string;
  userId?: string;
  route?: string;
  [key: string]: unknown;
};

function withContext(ctx: LogContext) {
  return logger.child(ctx);
}

export function createRequestLogger(ctx: LogContext) {
  const child = withContext(ctx);
  return {
    info: (msg: string, meta?: Record<string, unknown>) =>
      child.info(meta ?? {}, msg),
    warn: (msg: string, meta?: Record<string, unknown>) =>
      child.warn(meta ?? {}, msg),
    error: (msg: string, err?: Error | unknown, meta?: Record<string, unknown>) => {
      const errMeta = err instanceof Error
        ? { ...meta, stack: err.stack, message: err.message }
        : meta ?? {};
      child.error(errMeta, msg);
    },
    child: (extra: LogContext) => createRequestLogger({ ...ctx, ...extra }),
  };
}

export function getRequestId(request: Request): string {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("x-vercel-id") ??
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  );
}

/** Log API error and return a safe message for the client */
export function logApiError(
  log: ReturnType<typeof createRequestLogger>,
  err: unknown,
  route: string
): string {
  const message = err instanceof Error ? err.message : "Unknown error";
  log.error(`API error [${route}]`, err, { route });
  return message;
}
