import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { JSDOM } from "jsdom";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { "@": `${root}src` } },
  plugins: [vue()],
  server: { middlewareMode: true, watch: null },
});

try {
  const load = (path) => server.ssrLoadModule(`/src/${path}.ts`);
  const { normalizeImageDimension } = await load("blocks/imageSizing");
  for (const [value, expected] of [
    [50, "50%"],
    ["50", "50%"],
    ["50%", "50%"],
    [0, "0%"],
    [".5", ".5%"],
    [" 200PX ", "200px"],
    ["auto", "auto"],
  ]) {
    assert.equal(normalizeImageDimension(value, "width"), expected);
  }
  for (const [value, expected] of [
    [50, "50px"],
    ["50", "50px"],
    ["50px", "50px"],
    [0, "0px"],
    ["auto", "auto"],
    ["50%", "auto"],
  ]) {
    assert.equal(normalizeImageDimension(value, "height"), expected);
  }
  for (const value of [
    undefined,
    null,
    "",
    -1,
    NaN,
    Infinity,
    "-1px",
    "2em",
    "1px;color:red",
  ]) {
    assert.equal(normalizeImageDimension(value, "width"), "100%");
    assert.equal(normalizeImageDimension(value, "height"), "auto");
  }

  const { defaultProps } = (
    await load("composables/emailBuilder/core/useEmailBuilderDefault")
  ).useEmailBuilderDefaults();
  const { imageBlock } = await load("blocks/definitions/image");
  (await load("blocks/registry")).registerBlock("image", imageBlock);
  const html = (
    await load("composables/emailBuilder/export/generators/html")
  ).htmlGenerator().generateHTMLComponent;
  const mjml = (
    await load("composables/emailBuilder/export/generators/mjml")
  ).mjmlGenerator().generateMJMLComponent;
  const react = (
    await load("composables/emailBuilder/export/generators/react-email")
  ).reactEmailGenerator().generateReactEmailComponent;
  const mobile = (
    await load("composables/emailBuilder/export/useEmailExportMobileStyles")
  ).useEmailExportMobileStyles().emailMobileStyles;
  const { hydrateComponent } = await load(
    "composables/emailBuilder/transform/pipeline/hydrate",
  );
  const { optimizeRows } = await load(
    "composables/emailBuilder/transform/pipeline/optimize",
  );
  const makeImage = (props = {}) => ({
    id: "image-sizing",
    type: "component",
    componentType: "image",
    props: { ...structuredClone(defaultProps.image), ...props },
  });

  for (const enabled of [false, true]) {
    for (const [width, height] of [
      [50, "auto"],
      ["50", 80],
      ["50%", "80px"],
      ["200px", "auto"],
      ["auto", "80px"],
      ["auto", "auto"],
      [0, 0],
      [undefined, undefined],
      ["1px;color:red", "50%"],
    ]) {
      const image = makeImage({ width, height, enabled });
      const expectedWidth = normalizeImageDimension(width, "width");
      const expectedHeight = normalizeImageDimension(height, "height");
      for (const render of [html, mjml]) {
        const doc = new JSDOM(render(image)).window.document;
        const img = doc.querySelector("img");
        assert.ok(img);
        assert.equal(img.style.width, expectedWidth);
        assert.equal(img.style.height, expectedHeight);
        assert.equal(!!img.closest("a"), enabled);
        assert.equal(img.style.color, "");
      }
      const jsx = react(image);
      assert.ok(jsx.includes(`width:"${expectedWidth}"`));
      assert.ok(jsx.includes(`height:"${expectedHeight}"`));
      const result = ts.transpileModule(`const Email = () => (${jsx});`, {
        compilerOptions: { jsx: ts.JsxEmit.Preserve },
        reportDiagnostics: true,
      });
      assert.equal(result.diagnostics.length, 0, "React Email JSX must parse");

      const css = mobile(makeImage({ mobile: { width, height } }), "eb-sizing");
      if (width != null)
        assert.ok(css.includes(`width: ${expectedWidth} !important`));
      if (height != null)
        assert.ok(css.includes(`height: ${expectedHeight} !important`));
      assert.ok(!css.includes("color:red"));

      const rows = [
        {
          id: "row",
          type: "row",
          columns: [
            {
              id: "column",
              width: 100,
              children: [
                makeImage({
                  width,
                  height,
                  mobile: { width, height },
                }),
              ],
            },
          ],
        },
      ];
      const saved = JSON.parse(JSON.stringify(optimizeRows(rows)));
      const restored = hydrateComponent(saved[0].columns[0].children[0]);
      assert.equal(
        normalizeImageDimension(restored.props.width, "width"),
        expectedWidth,
      );
      assert.equal(
        normalizeImageDimension(restored.props.height, "height"),
        expectedHeight,
      );
      if (width != null) assert.equal(restored.props.width, width);
      if (height != null) assert.equal(restored.props.height, height);
      if (width != null) assert.equal(restored.props.mobile.width, width);
      if (height != null) assert.equal(restored.props.mobile.height, height);
    }
  }
  assert.equal(mobile(makeImage(), "eb-sizing"), "");
  console.log(
    "Image sizing checks passed: validation, three exports, links, mobile overrides, JSON round-trip.",
  );
} finally {
  await server.close();
}
