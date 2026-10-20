import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
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
  const {
    borderStyles,
    borderToCss,
    borderSides,
    toggleBorderMode,
    hasBorder,
  } = await load("utils/border");
  const unified = { width: 2, style: "solid", color: "#112233", radius: 8 };
  assert.deepEqual(borderStyles(unified), { border: "2px solid #112233" });
  const separate = toggleBorderMode(unified);
  assert.deepEqual(separate.sides, borderSides(unified));
  separate.sides.right.width = 7;
  assert.equal(separate.sides.top.width, 2);
  assert.equal(unified.width, 2);
  separate.sides.bottom = { width: 4, style: "dashed", color: "#ff0000" };
  separate.sides.left = { width: 0, style: "dotted", color: "transparent" };
  assert.deepEqual(toggleBorderMode(separate), unified);
  assert.equal(
    borderToCss(separate),
    "border-top:2px solid #112233;border-right:7px solid #112233;border-bottom:4px dashed #ff0000;border-left:0px dotted transparent",
  );
  assert.equal(hasBorder({ ...separate, width: 0 }), true);
  assert.equal(hasBorder(), false);

  const { defaultProps } = (
    await load("composables/emailBuilder/core/useEmailBuilderDefault")
  ).useEmailBuilderDefaults();
  const { registerBlock } = await load("blocks/registry");
  for (const type of ["button", "image", "video"]) {
    registerBlock(
      type,
      (await load(`blocks/definitions/${type}`))[`${type}Block`],
    );
  }
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
  const components = [];
  for (const type of ["button", "image", "video"]) {
    for (const width of type === "button" ? ["auto", "200px"] : [100]) {
      const component = {
        id: `${type}-${width}`,
        type: "component",
        componentType: type,
        props: {
          ...structuredClone(defaultProps[type]),
          width,
          border: separate,
          mobile: { border: separate },
        },
      };
      for (const render of [html, mjml]) {
        assert.ok(
          render(component).includes(borderToCss(separate)),
          `${type} ${width} HTML/MJML sides`,
        );
      }
      for (const [key, value] of Object.entries(borderStyles(separate))) {
        assert.ok(
          react(component).includes(key) && react(component).includes(value),
          `${type} React ${key}`,
        );
      }
      assert.ok(
        mobile(component, "eb-test").includes(borderToCss(separate, true)),
        `${type} mobile sides`,
      );
      component.props.mobile.border = unified;
      assert.ok(
        mobile(component, "eb-test").includes(
          "border:2px solid #112233 !important",
        ),
      );
      component.props.mobile.border = null;
      assert.ok(!mobile(component, "eb-test").includes("border-top:"));
      components.push(component);
    }
  }

  const { hydrateRows } = await load(
    "composables/emailBuilder/transform/pipeline/hydrate",
  );
  const { optimizeRows } = await load(
    "composables/emailBuilder/transform/pipeline/optimize",
  );
  const zeroSides = toggleBorderMode({
    width: 0,
    color: "#000000",
    style: "solid",
    radius: 0,
  });
  const rows = hydrateRows([
    {
      id: "row",
      type: "row",
      border: { ...separate, width: 0 },
      columns: [
        {
          id: "column",
          width: 100,
          border: separate,
          children: [
            ...components,
            {
              id: "nested",
              type: "row",
              border: separate,
              columns: [
                {
                  id: "nested-column",
                  width: 100,
                  border: zeroSides,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
  const restored = hydrateRows(JSON.parse(JSON.stringify(optimizeRows(rows))));
  assert.deepEqual(restored[0].border, rows[0].border);
  assert.deepEqual(restored[0].columns[0].border, rows[0].columns[0].border);
  assert.deepEqual(
    restored[0].columns[0].children.at(-1).columns[0].border.sides,
    zeroSides.sides,
  );
  assert.deepEqual(restored[0].columns[0].children[0].props.border, separate);
  const legacy = hydrateRows([
    { id: "legacy", type: "row", border: unified, columns: [] },
  ]);
  assert.equal(legacy[0].border.sides, undefined);

  const { ref } = await import("vue");
  const deps = {
    rows: ref(rows),
    canvasStyles: ref({
      width: 600,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      backgroundColor: "#fff",
      bodyBackgroundColor: "#fff",
      mobileBreakpoint: 600,
    }),
    generators: { html, mjml, react },
    espSyntax: ref("liquid"),
    visibilityContext: ref({}),
    tagSubstitution: ref(undefined),
    guardEmpty: () => true,
    collectFonts: () => new Set(),
    collectMobileCSS: () => [],
    buildMobileStyleBlock: () => "",
  };
  const exportedHtml = (
    await load("composables/emailBuilder/export/targets/htmlExport")
  )
    .htmlExport(deps)
    .getHTML();
  const exportedMjml = (
    await load("composables/emailBuilder/export/targets/mjmlExport")
  )
    .mjmlExport(deps)
    .getMJML();
  const exportedReact = (
    await load("composables/emailBuilder/export/targets/reactEmailExport")
  )
    .reactEmailExport(deps)
    .getReactEmail();
  for (const output of [exportedHtml, exportedMjml]) {
    assert.ok(output.includes("border-bottom:4px dashed #ff0000"));
    assert.ok(!output.includes("[object Object]"));
    assert.ok(
      (output.match(/border-right:7px solid #112233/g) ?? []).length >= 6,
      "rows, columns, nested rows and components retain sides",
    );
  }
  assert.ok(exportedReact.includes('borderBottom:"4px dashed #ff0000"'));
  assert.ok((exportedReact.match(/borderRight:/g) ?? []).length >= 6);
  const syntax = ts.transpileModule(exportedReact, {
    fileName: "email.tsx",
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ESNext,
    },
  });
  assert.deepEqual(syntax.diagnostics, [], "React Email export is valid TSX");
  console.log(
    "Border checks passed: mode switching, side isolation, component and nested-row exports, mobile CSS, JSON round trip, legacy templates.",
  );
} finally {
  await server.close();
}
