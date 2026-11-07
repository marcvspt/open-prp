import { registerHooks } from "node:module";

const sourceRoot = new URL("../src/", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(specifier.slice(2), sourceRoot).href, context);
    }
    return nextResolve(specifier, context);
  },
});
