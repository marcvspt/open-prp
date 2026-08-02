import { useState, useEffect, useRef, useCallback } from "react";

interface FilterState {
  [key: string]: string;
}

export function useFilteredData<T>(apiEndpoint: string, initial: FilterState, initialData?: T) {
  const [filters, setFilters] = useState<FilterState>(initial);
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
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

    const url = new URL(location.href);
    url.search = qs;
    history.replaceState(null, "", url.pathname + url.search);
  }, [filters, apiEndpoint]);

  return { filters, setFilter, clearFilters, data, loading };
}
