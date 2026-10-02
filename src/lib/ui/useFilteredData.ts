import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getLocaleDict } from "@/lib/i18n/locale.ts";
import type { FilterState, FilterOptions } from "@/lib/types/filters.ts";
import type { ApiResponse } from "@/lib/types/general.ts";

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

    if (completedKey.current === requestKey) {
      setLoading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");

    async function load() {
      try {
        const response = await fetch(requestKey, { signal: controller.signal });
        const body: ApiResponse<T> = await response.json();
        if (!response.ok || !body.success || body.data === undefined) {
          throw new Error(body.error || t.common.errorUnknown);
        }
        if (!active) return;
        completedKey.current = requestKey;
        setData(body.data);
        setError("");
      } catch (err: unknown) {
        if (!active || controller.signal.aborted) return;
        setError(t.error.message(err instanceof Error ? err.message : t.common.errorUnknown));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [qs, requestKey, keys, defaults, t]);

  return { filters, setFilter, clearFilters, searchValue, data, loading, error };
}
