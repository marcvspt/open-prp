import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { FilterState, FilterOptions } from "@/lib/types/filters.ts";
import { registerDataRefresh } from "@/lib/ui/data-refresh.ts";
import type { ApiResponse, PaginatedResponse } from "@/lib/types/general.ts";

function isPaginated(value: unknown): value is PaginatedResponse<unknown> {
  return typeof value === "object" && value !== null
    && "data" in value && Array.isArray(value.data)
    && "total" in value && typeof value.total === "number" && value.total >= 0
    && "page" in value && typeof value.page === "number" && Number.isInteger(value.page)
    && "pageSize" in value && typeof value.pageSize === "number" && value.pageSize > 0;
}

function filtersFromUrl(initial: FilterState, keys: readonly string[], defaults: FilterState): FilterState {
  const filters: FilterState = {};
  const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  for (const key of keys) {
    const value = params ? params.get(key) ?? defaults[key] : initial[key] ?? defaults[key];
    if (value) filters[key] = value;
  }
  return filters;
}

export function useFilteredData<T>(apiEndpoint: string, initial: FilterState, initialData: T | undefined, options: FilterOptions) {
  const t = getLocaleDict(options.locale);
  const keysSignature = options.keys.join(",");
  const keys = useMemo(() => keysSignature.split(","), [keysSignature]);
  const defaultsSignature = JSON.stringify(options.defaults ?? {});
  const defaults = useMemo(() => JSON.parse(defaultsSignature) as FilterState, [defaultsSignature]);
  const [filters, setFilters] = useState<FilterState>(() => filtersFromUrl(initial, keys, defaults));
  const [searchValue, setSearchValue] = useState(filters.q ?? "");
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const requestController = useRef<AbortController | null>(null);
  const qs = new URLSearchParams(filters).toString();
  const requestKey = `${apiEndpoint}?${qs}`;
  // SSR data already corresponds to the initial URL; completed requests replace this key.
  const completedKey = useRef<string | null>(initialData !== undefined ? requestKey : null);

  const setFilter = useCallback((key: string, value: string) => {
    if (!keys.includes(key)) return;
    const update = () => setFilters(prev => {
      const next = { ...prev };
      if (key !== "page") delete next.page;
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
    if (key === "q") {
      setSearchValue(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(update, 300);
    } else {
      update();
    }
  }, [keys]);

  const clearFilters = useCallback(() => {
    clearTimeout(debounceRef.current);
    setSearchValue("");
    setFilters({ ...defaults });
  }, [defaults]);

  useEffect(() => {
    const restore = () => {
      clearTimeout(debounceRef.current);
      const next = filtersFromUrl({}, keys, defaults);
      setFilters(next);
      setSearchValue(next.q ?? "");
    };
    window.addEventListener("popstate", restore);
    return () => {
      clearTimeout(debounceRef.current);
      window.removeEventListener("popstate", restore);
    };
  }, [keys, defaults]);

  useEffect(() => {
    const url = new URL(window.location.href);
    for (const key of keys) url.searchParams.delete(key);
    const params = new URLSearchParams(qs);
    for (const [key, value] of params) {
      if (value !== defaults[key]) url.searchParams.set(key, value);
    }
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [qs, keys, defaults]);

  const refresh = useCallback(async (externalSignal?: AbortSignal) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const abort = () => controller.abort();
    externalSignal?.addEventListener("abort", abort, { once: true });
    if (externalSignal?.aborted) controller.abort();
    if (!externalSignal) setLoading(true);
    setError("");
    let nextRequestKey = requestKey;
    let correctedPage: number | undefined;
    try {
      async function readData(url: string): Promise<T> {
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        const body: ApiResponse<T> = await response.json();
        if (!response.ok || !body.success || body.data === undefined) {
          throw new Error(body.error || t.common.errorUnknown);
        }
        return body.data;
      }
      let result = await readData(nextRequestKey);
      // Deleting the final row on a page may move the last available page backwards.
      if (isPaginated(result)) {
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (result.page > lastPage) {
          correctedPage = lastPage;
          const url = new URL(requestKey, window.location.origin);
          if (lastPage === 1) url.searchParams.delete("page");
          else url.searchParams.set("page", String(lastPage));
          nextRequestKey = `${url.pathname}?${url.searchParams.toString()}`;
          result = await readData(nextRequestKey);
        }
      }
      if (controller.signal.aborted) throw new DOMException("Request aborted", "AbortError");
      completedKey.current = nextRequestKey;
      if (correctedPage !== undefined) {
        const page = correctedPage;
        setFilters(prev => {
          const next = { ...prev };
          if (page === 1) delete next.page;
          else next.page = String(page);
          return next;
        });
      }
      setData(result);
      setError("");
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setError(externalSignal ? t.error.refreshData : t.error.message(err instanceof Error ? err.message : t.common.errorUnknown));
      }
      throw err;
    } finally {
      externalSignal?.removeEventListener("abort", abort);
      if (requestController.current === controller) setLoading(false);
    }
  }, [requestKey, t]);

  useEffect(() => {
    if (completedKey.current === requestKey) {
      setLoading(false);
      setError("");
      return;
    }
    void refresh().catch(() => {});
    return () => requestController.current?.abort();
  }, [requestKey, refresh]);

  useEffect(() => registerDataRefresh(apiEndpoint.replace(/^\/api\//, ""), refresh), [apiEndpoint, refresh]);
  useEffect(() => () => requestController.current?.abort(), []);

  return { filters, setFilter, clearFilters, searchValue, data, loading, error };
}
