import { swapFunctions } from "astro:transitions/client";
import type { DataChangeDetail, DataRefreshHandler, DataRefreshState } from "@/lib/types/data-refresh.ts";

const handlers = new Map<string, Set<DataRefreshHandler>>();
const dependencies: Record<string, readonly string[]> = {
  cards: ["cards", "payment-methods", "transactions", "installments", "cashback", "card-monthly"],
  "payment-methods": ["payment-methods", "cards"],
  transactions: ["transactions", "categories", "payment-methods", "cards"],
  installments: ["installments", "categories", "payment-methods", "cards"],
  cashback: ["cashback", "cards"],
  pantry: ["pantry", "categories"],
  "recurring-payments": ["recurring-payments", "recurring-payment-monthly", "categories", "payment-methods", "cards"],
  tasks: ["tasks", "categories"],
  events: ["events", "categories"],
  notes: ["notes"],
  categories: ["categories"],
};
let initialized = false;
let currentController: AbortController | null = null;
let retryModule = "";

export function registerDataRefresh(module: string, handler: DataRefreshHandler): () => void {
  const group = handlers.get(module) ?? new Set<DataRefreshHandler>();
  group.add(handler);
  handlers.set(module, group);
  return () => {
    group.delete(handler);
    if (!group.size) handlers.delete(module);
  };
}

function showStatus(state: DataRefreshState) {
  const status = document.querySelector<HTMLElement>("[data-refresh-status]");
  if (!status) return;
  status.hidden = state === "idle";
  status.setAttribute("role", state === "error" ? "alert" : "status");
  for (const element of status.querySelectorAll<HTMLElement>("[data-refresh-state]")) {
    element.hidden = element.dataset.refreshState !== state;
  }
}

async function refreshSsrRegion(region: HTMLElement, signal: AbortSignal) {
  const url = window.location.href;
  const response = await fetch(url, {
    headers: { "X-Open-PRP-Refresh": "content" },
    cache: "no-store",
    signal,
  });
  if (!response.ok || response.redirected) throw new Error("Section refresh failed");
  const html = await response.text();
  if (signal.aborted || !region.isConnected) return true;
  if (window.location.href !== url) return false;
  const nextDocument = new DOMParser().parseFromString(html, "text/html");
  const nextRegion = [...nextDocument.querySelectorAll<HTMLElement>("[data-module]")]
    .find(element => element.dataset.module === region.dataset.module);
  if (!nextRegion) throw new Error("Section missing in refresh response");

  // Scripts were loaded with the page. Existing Astro custom elements hydrate the new islands.
  for (const script of nextRegion.querySelectorAll("script")) script.remove();
  const { scrollX, scrollY } = window;
  const focused = document.activeElement;
  const restoreFocus = region.contains(focused);
  swapFunctions.swapBodyElement(nextRegion, region);
  // Astro unmounts disconnected React roots on this lifecycle event.
  document.dispatchEvent(new Event("astro:after-swap"));
  if (restoreFocus) {
    nextRegion.tabIndex = -1;
    nextRegion.focus({ preventScroll: true });
  }
  window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
  return true;
}

async function refreshCurrentSection(module: string) {
  const region = document.querySelector<HTMLElement>("[data-module]");
  const section = region?.dataset.module;
  if (!region || !section || !(dependencies[section] ?? [section]).includes(module)) return;
  currentController?.abort();
  const controller = new AbortController();
  currentController = controller;
  retryModule = module;
  showStatus("loading");
  region.setAttribute("aria-busy", "true");
  try {
    const group = handlers.get(section);
    if (region.dataset.refreshMode === "api" && module === section && group?.size) {
      await Promise.all([...group].map(handler => handler(controller.signal)));
    } else {
      const refreshed = await refreshSsrRegion(region, controller.signal);
      if (!refreshed) {
        void refreshCurrentSection(module);
        return;
      }
    }
    if (!controller.signal.aborted) showStatus("idle");
  } catch (error: unknown) {
    if (!controller.signal.aborted) {
      if (error instanceof DOMException && error.name === "AbortError") {
        showStatus("idle");
        return;
      }
      console.error("Section refresh failed", error);
      showStatus("error");
    }
  } finally {
    if (!controller.signal.aborted) {
      document.querySelector<HTMLElement>("[data-module]")?.removeAttribute("aria-busy");
      currentController = null;
    }
  }
}

export function initDataRefresh() {
  if (initialized) return;
  initialized = true;
  window.addEventListener("datachange", (event: Event) => {
    const detail = (event as CustomEvent<DataChangeDetail>).detail;
    if (!detail || typeof detail.module !== "string") return;
    void refreshCurrentSection(detail.module.split("/")[0]);
  });
  document.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("[data-refresh-retry]")) {
      void refreshCurrentSection(retryModule);
    }
  });
  document.addEventListener("astro:before-preparation", () => {
    currentController?.abort();
    currentController = null;
    showStatus("idle");
    document.querySelector<HTMLElement>("[data-module]")?.removeAttribute("aria-busy");
  });
}

export function notifyDataChange(module: string) {
  initDataRefresh();
  window.dispatchEvent(new CustomEvent<DataChangeDetail>("datachange", { detail: { module } }));
}
