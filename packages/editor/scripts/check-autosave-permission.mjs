import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
for (const key of [
  "window",
  "document",
  "Element",
  "HTMLElement",
  "SVGElement",
  "localStorage",
]) {
  globalThis[key] = dom.window[key];
}

const { createApp, ref, nextTick } = await import("vue");
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { "@": `${root}src` } },
  server: { middlewareMode: true, watch: null },
});

try {
  const { provideCanSave, provideStorageAdapter } = await server.ssrLoadModule(
    "/src/adapters/index.ts",
  );
  const { provideInfoDialog } = await server.ssrLoadModule(
    "/src/composables/ui/useInfoDialog.ts",
  );
  const { provideEmailBuilder } = await server.ssrLoadModule(
    "/src/composables/emailBuilder/core/useEmailBuilder.ts",
  );
  const canSave = ref(false);
  let builder;
  const app = createApp({
    setup() {
      provideCanSave(canSave);
      builder = provideEmailBuilder(
        provideStorageAdapter(),
        provideInfoDialog(),
        canSave,
      );
      return () => null;
    },
  });
  const container = document.createElement("div");
  document.body.append(container);
  app.mount(container);
  try {
    for (const allowed of [false, true, false]) {
      localStorage.clear();
      canSave.value = allowed;
      builder.addRow([100]);
      await nextTick();
      window.dispatchEvent(new window.Event("beforeunload"));
      assert.equal(
        localStorage.getItem("maildeno:autosave") !== null,
        allowed,
        `Draft writes must follow the current canSave=${allowed}`,
      );
    }
    await assert.rejects(
      builder.saveTemplate({ rows: [], canvasStyles: {} }),
      /nothing was saved/,
    );
  } finally {
    app.unmount();
    container.remove();
  }
  console.log(
    "Autosave permission checks passed: disabled, enabled, disabled again, save guard.",
  );
} finally {
  await server.close();
  dom.window.close();
}
