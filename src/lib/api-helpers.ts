import type { APIContext, APIRoute } from "astro";
import type { ApiResponse } from "@/types/general.ts";
import { lastYearWindow, lastDayOfMonth } from "@/lib/date.ts";

/** Wraps an API handler so thrown errors become a JSON 500 instead of Astro's HTML error page. */
export function withErrorHandling(handler: APIRoute): APIRoute {
  return async (context) => {
    try {
      return await handler(context);
    } catch (err: unknown) {
      console.error(`API ${context.request.method} ${context.url.pathname} failed:`, err);
      return errorResponse("Error interno del servidor", 500);
    }
  };
}

/** Parses the request body as a JSON object; returns `null` for malformed/invalid bodies. */
export async function readJsonBody(context: APIContext): Promise<Record<string, unknown> | null> {
  try {
    const body = await context.request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data } satisfies ApiResponse<T>), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message } satisfies ApiResponse<never>), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function requireUserId(context: APIContext): string | Response {
  const userId = context.locals.userId;
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }
  return userId;
}

export function getSearchParams(context: APIContext): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};
  context.url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function parsePageParams(url: URL): { page: number; pageSize: number } {
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "50", 10);
  return { page: Math.max(1, page), pageSize: Math.min(100, Math.max(1, pageSize)) };
}

/** True/false from a `?x=true|false` query param; undefined when absent or invalid. */
export function parseBoolParam(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Date window for list endpoints: explicit `date_from`/`date_to` are kept, but when
 * neither a month nor dates are given the "Último año" window is applied
 * (registration month or 12 months ago, through the next month).
 */
export function getDateRange(
  params: Record<string, string | undefined>,
  createdAt: string
): { date_from?: string; date_to?: string } {
  let date_from = params.date_from;
  let date_to = params.date_to;
  if (!params.month && !date_from && !date_to) {
    const { from, to } = lastYearWindow(createdAt);
    date_from = `${from}-01`;
    date_to = lastDayOfMonth(to);
  }
  return { date_from, date_to };
}
