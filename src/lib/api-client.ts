import type { ApiResponse } from "@/lib/types/general.ts";
import type { Locale } from "@/lib/i18n/es.ts";
import type { ApiErrorKind } from "@/lib/types/api-client.ts";

export class ApiError extends Error {
  constructor(public readonly kind: ApiErrorKind, public readonly status?: number, public readonly serverMessage?: string) {
    super(serverMessage ?? kind);
    this.name = "ApiError";
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function apiErrorMessage(error: unknown, t: Locale): string {
  if (error instanceof ApiError) {
    return error.serverMessage ?? (error.kind === "network" ? t.error.network : error.kind === "response" ? t.error.invalidResponse : t.common.errorUnknown);
  }
  return error instanceof Error ? error.message : t.common.errorUnknown;
}

/** Validates the API envelope; domain payloads retain their endpoint-specific types. */
export async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const headers = new Headers(options?.headers);
  headers.set("Accept", "application/json");
  if (typeof options?.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...options, headers });
  } catch (error: unknown) {
    if (isAbortError(error) || options?.signal?.aborted) throw error;
    throw new ApiError("network");
  }
  let body: unknown;
  try { body = await response.json(); }
  catch (error: unknown) {
    if (isAbortError(error) || options?.signal?.aborted) throw error;
    throw new ApiError(response.ok ? "response" : "http", response.status);
  }
  if (typeof body !== "object" || body === null || !("success" in body) || typeof body.success !== "boolean") {
    throw new ApiError("response", response.status);
  }
  if (!response.ok || !body.success) {
    throw new ApiError("http", response.status, "error" in body && typeof body.error === "string" ? body.error : undefined);
  }
  return body as ApiResponse<T>;
}

export async function apiData<T>(url: string, options?: RequestInit): Promise<T> {
  const body = await apiFetch<T>(url, options);
  if (body.data === undefined) throw new ApiError("response");
  return body.data;
}

export async function fetchList<T>(url: string, options?: RequestInit): Promise<T[]> {
  const data = await apiData<unknown>(url, options);
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object" && data !== null && "data" in data && Array.isArray(data.data)) return data.data as T[];
  throw new ApiError("response");
}
