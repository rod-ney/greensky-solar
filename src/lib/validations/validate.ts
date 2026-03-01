import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";

export interface ValidationError {
  code: "VALIDATION_ERROR";
  message: string;
  issues: { path: (string | number)[]; message: string }[];
}

type ValidationIssue = { path: (string | number)[]; message: string };

/** Standard 400 response for validation errors */
export function validationErrorResponse(
  issues: z.ZodIssue[] | ValidationIssue[],
  message = "Invalid request"
): NextResponse<ValidationError> {
  const normalized = issues.map((i) => ({
    path: (i as { path?: (string | number)[] }).path ?? [],
    message: (i as { message?: string }).message ?? "",
  }));
  return NextResponse.json(
    { code: "VALIDATION_ERROR", message, issues: normalized },
    { status: 400 }
  );
}

export type ValidateResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Parse and validate request body against a Zod schema.
 * Returns typed data or a NextResponse to return from the route.
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<ValidateResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: validationErrorResponse(
        [{ path: [], message: "Invalid JSON body" }],
        "Invalid JSON"
      ),
    };
  }
  const result = schema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    response: validationErrorResponse(result.error.issues),
  };
}

/**
 * Validate route params against a Zod schema.
 */
export function validateParams<T>(
  params: Record<string, string | string[] | undefined>,
  schema: ZodType<T>
): ValidateResult<T> {
  const result = schema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    response: validationErrorResponse(result.error.issues, "Invalid route parameters"),
  };
}

/**
 * Validate query string params.
 */
export function validateQuery<T>(
  url: URL,
  schema: ZodType<T>
): ValidateResult<T> {
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    params[k] = v;
  });
  const result = schema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    response: validationErrorResponse(result.error.issues, "Invalid query parameters"),
  };
}
