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
  const { normalizeButtonDimension, getButtonSizeStyles } = await load(
    "blocks/buttonSizing",
  );
  for (const value of [
    "auto",
    "0px",
    "200px",
    "48.5px",
    "100%",
    "50.5%",
    ".5%",
  ])
    assert.equal(normalizeButtonDimension(value), value);
  assert.equal(normalizeButtonDimension(" 200PX "), "200px");
  for (const value of [
    undefined,
    null,
    200,
    "-1px",
    "20",
    "2em",
    "Infinitypx",
    "1px;color:red",
  ])
    assert.equal(normalizeButtonDimension(value), "auto");
  assert.deepEqual(getButtonSizeStyles({}), {});

  const { defaultProps } = (
    await load("composables/emailBuilder/core/useEmailBuilderDefault")
  ).useEmailBuilderDefaults();
  const { buttonBlock } = await load("blocks/definitions/button");
  (await load("blocks/registry")).registerBlock("button", buttonBlock);
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
  const makeButton = (props = {}) => ({
    id: "sizing",
    type: "component",
    componentType: "button",
    props: { ...structuredClone(defaultProps.button), ...props },
  });

  for (const icon of ["", "https://example.com/icon.png"]) {
    for (const [width, height] of [
      ["200px", "64px"],
      ["100%", "50%"],
      ["200px", "auto"],
      ["auto", "64px"],
    ]) {
      const button = makeButton({ width, height, icon });
      for (const render of [html, mjml]) {
        const doc = new JSDOM(render(button)).window.document;
        const table = doc.querySelector("table.eb-sizing-button-table");
        assert.ok(table, "Button dimensions must belong to an outer table");
        assert.equal(table.style.width, width);
        assert.equal(table.style.height, height);
        assert.equal(
          table.getAttribute("width"),
          width === "auto" ? null : width.replace(/px$/, ""),
        );
        const link = table.querySelector("a");
        assert.equal(link.style.width, "");
        assert.equal(link.style.padding, "0px");
        assert.equal(link.style.borderWidth, "0px");
        const content = link.querySelector("td.eb-sizing-button-content");
        assert.ok(content, "Padding must stay inside the clickable link");
        assert.equal(content.style.paddingTop, "12px");
        assert.equal(content.style.paddingRight, "24px");
        assert.equal(content.getAttribute("valign"), "middle");
      }
      const jsx = react(button);
      assert.ok(jsx.includes(`width: "${width}"`));
      assert.ok(jsx.includes(`height: "${height}"`));
      assert.ok(jsx.includes('valign="middle"'));
      assert.ok(jsx.includes('className="eb-sizing-button-table"'));
      const result = ts.transpileModule(`const Email = () => (${jsx});`, {
        compilerOptions: { jsx: ts.JsxEmit.Preserve },
        reportDiagnostics: true,
      });
      assert.equal(result.diagnostics.length, 0, "React Email JSX must parse");
    }
  }

  const legacy = makeButton();
  delete legacy.props.width;
  delete legacy.props.height;
  for (const render of [html, mjml, react])
    assert.equal(render(legacy), render(makeButton()));
  assert.equal(hydrateComponent(legacy).props.width, "auto");
  assert.equal(hydrateComponent(legacy).props.height, "auto");
  const sized = makeButton({
    width: "200px",
    height: "64px",
    mobile: { width: "100%", height: "auto" },
  });
  const css = mobile(sized, "eb-sizing");
  assert.ok(css.includes("width: 100% !important"));
  assert.ok(css.includes("height: auto !important"));
  assert.match(css, /\.eb-sizing-button-table \{[^}]*width: 100% !important/);
  assert.doesNotMatch(css, /\.eb-sizing-link \{[^}]*width:/);
  const decorated = mobile(
    makeButton({
      width: "100%",
      mobile: {
        padding: { top: 8, right: 32, bottom: 8, left: 32 },
        border: { width: 2, style: "solid", color: "#111111" },
        backgroundColor: "#ff0000",
      },
    }),
    "eb-sizing",
  );
  assert.match(decorated, /\.eb-sizing-button-content \{[^}]*padding:/);
  assert.match(decorated, /\.eb-sizing-button-table \{[^}]*border:/);
  assert.match(decorated, /\.eb-sizing-button-table \{[^}]*background-color:/);
  assert.doesNotMatch(
    decorated,
    /\.eb-sizing-link \{[^}]*(?:padding:|border:|background-color:)/,
  );
  assert.ok(
    !mobile({ ...sized, componentType: "anchor" }, "eb-sizing").includes(
      "width:",
    ),
  );
  assert.ok(
    !mobile(
      makeButton({ mobile: { width: "1px;color:red" } }),
      "eb-sizing",
    ).includes("color:red"),
  );
  const rows = [
    {
      id: "row",
      type: "row",
      columns: [{ id: "column", width: 100, children: [sized] }],
    },
  ];
  const restored = hydrateComponent(
    JSON.parse(JSON.stringify(optimizeRows(rows)))[0].columns[0].children[0],
  );
  assert.equal(restored.props.width, "200px");
  assert.equal(restored.props.height, "64px");
  assert.equal(restored.props.mobile.width, "100%");
  assert.equal(restored.props.mobile.height, "auto");
  console.log(
    "Button sizing checks passed: validation, three exports, legacy defaults, mobile overrides, JSON round-trip.",
  );
} finally {
  await server.close();
}
