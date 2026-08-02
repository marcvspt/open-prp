import { useState, useEffect, useRef, useCallback } from "react";

interface FilterState {
  [key: string]: string;
}

const NON_FILTER_PARAMS = new Set(["tab"]);

function filtersFromUrl(initial: FilterState): FilterState {
  const filters: FilterState = { ...initial };
  if (typeof window === "undefined") return filters;
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of params) {
    if (NON_FILTER_PARAMS.has(key)) continue;
    if (value) filters[key] = value;
  }
  return filters;
}

export function useFilteredData<T>(apiEndpoint: string, initial: FilterState, initialData?: T) {
  const [filters, setFilters] = useState<FilterState>(() => filtersFromUrl(initial));
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevQsRef = useRef<string>("");
  const isFirstRender = useRef(true);

  const setFilter = useCallback((key: string, value: string) => {
    if (key === "q") {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilters(prev => {
          const next = { ...prev };
          if (value) next.q = value;
          else delete next.q;
          return next;
        });
      }, 300);
    } else {
      setFilters(prev => {
        const next = { ...prev };
        if (value) next[key] = value;
        else delete next[key];
        return next;
      });
    }
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    const el = document.querySelector<HTMLInputElement>("[data-search-input]");
    if (el) el.value = "";
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const qs = new URLSearchParams(filters).toString();
      prevQsRef.current = qs;
      return;
    }
    const qs = new URLSearchParams(filters).toString();
    if (prevQsRef.current === qs) return;
    prevQsRef.current = qs;

    setLoading(true);
    fetch(`${apiEndpoint}?${qs}`)
      .then(r => r.json())
      .then(d => setData((d?.data ?? d) as T))
      .catch(() => setData([] as unknown as T))
      .finally(() => setLoading(false));

    const params = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const nextQs = params.toString();
    history.replaceState(null, "", nextQs ? `${location.pathname}?${nextQs}` : location.pathname);
  }, [filters, apiEndpoint]);

  return { filters, setFilter, clearFilters, data, loading };
}
