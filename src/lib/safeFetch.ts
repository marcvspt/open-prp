interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function safeFetch<T>(url: string): Promise<T | undefined>;
export async function safeFetch(url: string, init: RequestInit): Promise<boolean>;
export async function safeFetch<T>(url: string, init?: RequestInit): Promise<T | undefined | boolean> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return init ? false : undefined;
    const json: ApiResponse<T> = await res.json();
    if (!json.success) return init ? false : undefined;
    return init ? true : json.data;
  } catch {
    return init ? false : undefined;
  }
}

/** Fetches a list endpoint, normalizing both plain arrays and PaginatedResponse (`{ data: [...] }`). */
export async function fetchList<T>(url: string): Promise<T[]> {
  const data = await safeFetch<unknown>(url);
  if (Array.isArray(data)) return data as T[];
  const rows = (data as { data?: unknown } | undefined)?.data;
  return Array.isArray(rows) ? (rows as T[]) : [];
}
