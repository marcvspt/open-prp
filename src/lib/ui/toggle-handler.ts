import { apiFetch } from "@/lib/api-client.ts";
import { notifyDataChange } from "@/lib/ui/data-refresh.ts";

let initialized = false;

export function initToggleHandler() {
  if (initialized) return;
  initialized = true;
  document.addEventListener("change", async event => {
    if (!(event.target instanceof HTMLInputElement)) return;
    const input = event.target;
    const config = [...document.querySelectorAll<HTMLElement>("[data-toggle-config]")]
      .find(element => input.hasAttribute(`data-toggle-${element.dataset.toggleConfig}`));
    const module = config?.dataset.toggleConfig;
    const endpoint = config?.dataset.toggleEndpoint;
    const key = config?.dataset.toggleKey;
    if (!module || !endpoint || !key) return;
    const id = input.getAttribute(`data-toggle-${module}`);
    if (!id || input.disabled) return;
    const value = input.checked;
    const status = document.querySelector<HTMLElement>("[data-toggle-error]");
    if (status) status.hidden = true;
    input.disabled = true;
    try {
      await apiFetch(endpoint, { method: "PUT", body: JSON.stringify({ id, [key]: value }) });
      notifyDataChange(module);
    } catch (error: unknown) {
      input.checked = !value;
      console.error("Toggle failed", error);
      if (status) status.hidden = false;
    } finally {
      input.disabled = false;
    }
  });
}
