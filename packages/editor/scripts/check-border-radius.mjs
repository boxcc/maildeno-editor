import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";

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
  const { radiusCorners, radiusToCss, hasRadius } =
    await load("utils/borderRadius");
  const corners = { topLeft: 0, topRight: 12, bottomRight: 24, bottomLeft: 36 };
  assert.equal(radiusToCss(8), "8px");
  assert.equal(radiusToCss(), "0px");
  assert.equal(radiusToCss(corners), "0px 12px 24px 36px");
  assert.equal(radiusToCss(corners, 2), "0px 14px 26px 38px");
  assert.equal(hasRadius(radiusCorners(0)), false);
  assert.equal(hasRadius(corners), true);
  assert.deepEqual(radiusCorners(8), {
    topLeft: 8,
    topRight: 8,
    bottomRight: 8,
    bottomLeft: 8,
  });

  const { defaultProps } = (
    await load("composables/emailBuilder/core/useEmailBuilderDefault")
  ).useEmailBuilderDefaults();
  const { registerBlock } = await load("blocks/registry");
  for (const type of ["button", "image", "video"]) {
    const definition = await load(`blocks/definitions/${type}`);
    registerBlock(type, definition[`${type}Block`]);
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
  const { hydrateRows } = await load(
    "composables/emailBuilder/transform/pipeline/hydrate",
  );
  const { optimizeRows } = await load(
    "composables/emailBuilder/transform/pipeline/optimize",
  );
  const components = [];
  for (const type of ["button", "image", "video"]) {
    for (const width of type === "button" ? ["auto", "200px"] : [100]) {
      for (const radius of [8, corners]) {
        const component = {
          id: type,
          type: "component",
          componentType: type,
          props: {
            ...structuredClone(defaultProps[type]),
            width,
            borderRadius: radius,
            mobile: { borderRadius: corners },
          },
        };
        for (const render of [html, mjml]) {
          const output = render(component);
          assert.ok(
            output.includes(`border-radius:${radiusToCss(radius)}`),
            `${type} HTML/MJML radius`,
          );
          assert.ok(!output.includes("[object Object]"));
        }
        assert.match(
          react(component),
          new RegExp(`borderRadius:\\s*"${radiusToCss(radius)}"`),
        );
        assert.ok(
          mobile(component, `eb-${type}`).includes(
            "border-radius: 0px 12px 24px 36px !important",
          ),
        );
        component.props.mobile.borderRadius = 0;
        assert.ok(
          mobile(component, `eb-${type}`).includes(
            "border-radius: 0px !important",
          ),
        );
        component.props.mobile.borderRadius = null;
        assert.ok(!mobile(component, `eb-${type}`).includes("border-radius:"));
        components.push(component);
      }
    }
  }

  const border = {
    width: 2,
    style: "solid",
    color: "#000000",
    radius: corners,
  };
  const wrappers = await load(
    "composables/emailBuilder/export/shared/containers",
  );
  assert.ok(
    wrappers
      .wrapWithContainerDiv("content", border)
      .includes("border-radius:0px 12px 24px 36px"),
  );
  assert.ok(
    wrappers
      .wrapWithContainerDivReact("content", border)
      .includes('borderRadius:"0px 12px 24px 36px"'),
  );
  const rows = [
    {
      id: "row",
      type: "row",
      border,
      columns: [{ id: "column", width: 100, border, children: components }],
    },
  ];
  const restored = hydrateRows(JSON.parse(JSON.stringify(optimizeRows(rows))));
  assert.deepEqual(restored[0].border.radius, corners);
  assert.deepEqual(restored[0].columns[0].border.radius, corners);
  for (let i = 0; i < components.length; i++) {
    assert.deepEqual(
      restored[0].columns[0].children[i].props.borderRadius,
      components[i].props.borderRadius,
    );
  }
  // Independent mode must survive even when every corner is zero.
  rows[0].border = { ...border, width: 0, radius: radiusCorners(0) };
  const zeros = hydrateRows(JSON.parse(JSON.stringify(optimizeRows(rows))));
  assert.deepEqual(zeros[0].border.radius, radiusCorners(0));

  const nested = structuredClone(restored[0]);
  nested.id = "nested";
  restored[0].columns[0].children.push(nested);
  const deps = {
    rows: { value: restored },
    canvasStyles: {
      value: { width: 600, mobileBreakpoint: 600, language: "en-US" },
    },
    generators: { html, mjml, react },
    espSyntax: { value: "liquid" },
    guardEmpty: () => true,
    collectFonts: () => new Set(),
    collectMobileCSS: () => [],
    buildMobileStyleBlock: () => "",
  };
  for (const [target, getter] of [
    ["htmlExport", "getHTML"],
    ["mjmlExport", "getMJML"],
    ["reactEmailExport", "getReactEmail"],
  ]) {
    const factory = (
      await load(`composables/emailBuilder/export/targets/${target}`)
    )[target];
    const output = factory(deps)[getter]();
    assert.ok(
      output.includes("0px 12px 24px 36px"),
      `${target} container corners`,
    );
    assert.ok(
      output.includes("0px 14px 26px 38px"),
      `${target} background clipping`,
    );
    assert.ok(
      !output.includes("[object Object]"),
      `${target} nested row serialization`,
    );
    if (target !== "reactEmailExport")
      assert.match(output, /border-collapse:\s*separate/);
  }
  console.log(
    "Border radius checks passed: legacy values, corner order, square corners, three exports, mobile overrides/reset, container wrappers, JSON round-trip.",
  );
} finally {
  await server.close();
}
