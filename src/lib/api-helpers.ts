import type { APIContext } from "astro";
import type { ApiResponse } from "@/types/general.ts";

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
