import { borderStyles, borderToCss } from "@/utils/border";
import { radiusToCss } from "@/utils/borderRadius";
import AnchorRenderer from "@/components/features/emailBuilder/ui/renderers/AnchorRenderer.vue";
import ButtonPanel from "@/components/features/emailBuilder/panels/ButtonPanel.vue";
import type { BlockDefinition, BlockRenderContext } from "../types";
import { getButtonSizeStyles } from "../buttonSizing";

function renderHtml(props: any, ctx: BlockRenderContext): string {
  const {
    marginStyle,
    paddingStyle,
    escapeHtml,
    escapeAttr,
    safeUrl,
    resolveBgCss,
    resolveBgVml,
    getResponsiveClasses,
  } = ctx;

  const btnAlign =
    props.align === "center"
      ? "text-align:center;"
      : props.align === "right"
        ? "text-align:right;"
        : "text-align:left;";

  const bgInlineStyle = resolveBgCss(
    props.backgroundGradient,
    props.backgroundColor,
  );
  const { vmlOpen, vmlClose } = resolveBgVml(
    props.backgroundGradient,
    props.backgroundColor,
  );

  const buttonContainerClasses = getResponsiveClasses(
    props.desktopHide,
    props.mobileHide,
  );
  const buttonLinkClasses = getResponsiveClasses(false, false, "link");
  const letterSpacingStyle =
    (props.letterSpacing as number) > 0
      ? `letter-spacing:${props.letterSpacing}px;`
      : "";

  const hasIcon = !!props.icon;
  const iconSize = props.iconSize ?? 20;
  const iconGap = props.iconGap ?? 8;
  const iconAlt = props.iconAlt ?? "";
  const iconIsBefore = props.iconPosition !== "after";

  const textStyles =
    `color:${props.color}; font-size:${props.fontSize}px; ` +
    `font-weight:${props.fontWeight}; ` +
    `font-family:'${props.fontFamily}', Arial, sans-serif; ` +
    `${letterSpacingStyle}`;

  const sizeStyles = getButtonSizeStyles(props);
  const linkShellStyles =
    (sizeStyles.width
      ? `display:block; height:100%; padding:0; border:0; text-align:center; `
      : `${paddingStyle} display:inline-block; ${bgInlineStyle} ` +
        `border-radius:${radiusToCss(props.borderRadius)}; ` +
        `${borderToCss(props.border)}; `) +
    `text-decoration:none; ` +
    (hasIcon
      ? `line-height:0; font-size:0;`
      : `line-height:normal; ${textStyles}`);

  let innerContent: string;

  if (hasIcon) {
    const iconCell =
      `<td style="padding:0; line-height:0; font-size:0; ` +
      `${iconIsBefore ? `padding-right:${iconGap}px` : `padding-left:${iconGap}px`};">` +
      `<img src="${safeUrl(props.icon)}" alt="${escapeAttr(iconAlt)}" ` +
      `width="${iconSize}" height="${iconSize}" ` +
      `style="display:block; width:${iconSize}px; height:${iconSize}px; ` +
      `border:0; outline:none;" />` +
      `</td>`;

    const buttonTextClasses = getResponsiveClasses(false, false, "text");

    const textCell =
      `<td class="${buttonTextClasses}" style="padding:0; line-height:1; ${textStyles} white-space:nowrap;">` +
      `${escapeHtml(props.text)}</td>`;

    innerContent =
      `<table ${sizeStyles.width ? 'align="center" ' : ""}role="presentation" border="0" cellpadding="0" cellspacing="0" ` +
      `style="border-collapse:collapse; border-spacing:0; line-height:0;"><tr>` +
      `${iconIsBefore ? iconCell + textCell : textCell + iconCell}` +
      `</tr></table>`;
  } else {
    innerContent = escapeHtml(props.text);
  }

  if (sizeStyles.width) {
    innerContent =
      `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" height="100%" ` +
      `style="width:100%; height:100%; border-collapse:collapse;"><tr>` +
      `<td align="center" valign="middle" class="${getResponsiveClasses(false, false, "text")} ${getResponsiveClasses(false, false, "button-content")}" ` +
      `style="${paddingStyle} line-height:normal; ${textStyles}">${innerContent}</td></tr></table>`;

    const widthAttr =
      sizeStyles.width === "auto"
        ? ""
        : ` width="${sizeStyles.width.replace(/px$/, "")}"`;
    const heightAttr =
      sizeStyles.height === "auto"
        ? ""
        : ` height="${sizeStyles.height.replace(/px$/, "")}"`;
    const solid = props.backgroundGradient?.solid ?? props.backgroundColor;
    const bgAttr =
      solid && solid !== "transparent" ? ` bgcolor="${escapeAttr(solid)}"` : "";
    // Tables own dimensions and borders; the link has no width-plus-padding box.
    return `<div style="${marginStyle} ${btnAlign}" class="${buttonContainerClasses}">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="${props.align === "right" ? "right" : props.align === "left" ? "left" : "center"}"${widthAttr}${heightAttr}${bgAttr}
    class="${getResponsiveClasses(false, false, "button-table")}" style="display:inline-table; float:none; margin:0; vertical-align:middle; border-collapse:separate; border-spacing:0; table-layout:fixed; width:${sizeStyles.width}; height:${sizeStyles.height}; ${bgInlineStyle} border-radius:${radiusToCss(props.borderRadius)}; ${borderToCss(props.border)};">
    <tr><td style="padding:0; height:100%;">
      <a href="${safeUrl(props.link)}" style="${linkShellStyles}" target="_blank" rel="noopener noreferrer nofollow" class="${buttonLinkClasses}">${innerContent}</a>
    </td></tr>
  </table>
</div>\n`;
  }

  return `              <div style="${marginStyle} ${btnAlign}" class="${buttonContainerClasses}">
${vmlOpen}
                <a href="${safeUrl(props.link)}" style="${linkShellStyles}" target="_blank" rel="noopener noreferrer nofollow" class="${buttonLinkClasses}">${innerContent}</a>
${vmlClose}
              </div>
`;
}

function renderMjml(props: any, ctx: BlockRenderContext): string {
  return `<mj-text padding="0" font-size="0" line-height="0" font-family="none">${renderHtml(
    props,
    {
      ...ctx,
      resolveBgVml: () => ({ vmlOpen: "", vmlClose: "" }),
    },
  )}</mj-text>`;
}

function renderReactEmail(props: any, ctx: BlockRenderContext): string {
  const { escapeAttr, safeUrl, resolveBgCss, getResponsiveClasses, react } =
    ctx;
  const { parseMarginPaddingDiscrete, styleObj } = react;

  const btnAlign =
    props.align === "center"
      ? "center"
      : props.align === "right"
        ? "right"
        : "left";

  const bgInlineStyle = resolveBgCss(
    props.backgroundGradient,
    props.backgroundColor,
  );
  const buttonContainerClasses = getResponsiveClasses(
    props.desktopHide,
    props.mobileHide,
  );
  const buttonLinkClasses = getResponsiveClasses(false, false, "link");

  const hasIcon = !!props.icon;
  const iconSize = props.iconSize ?? 20;
  const iconGap = props.iconGap ?? 8;
  const iconAlt = props.iconAlt ?? "";
  const iconIsBefore = props.iconPosition !== "after";

  const textStyles: Record<string, any> = {
    color: props.color,
    fontSize: `${props.fontSize}px`,
    fontWeight: String(props.fontWeight),
    fontFamily: react.normalizeFontFamily(
      `'${props.fontFamily}', Arial, sans-serif`,
    ),
    ...((props.letterSpacing as number) > 0 && {
      letterSpacing: `${props.letterSpacing}px`,
    }),
  };

  const sizeStyles = getButtonSizeStyles(props);
  const linkShellStyle: Record<string, any> = {
    ...(sizeStyles.width
      ? {
          display: "block",
          height: "100%",
          padding: 0,
          border: 0,
          textAlign: "center",
        }
      : {
          ...parseMarginPaddingDiscrete(undefined, props.padding),
          display: "inline-block",
          ...(bgInlineStyle ? react.parseCssString(bgInlineStyle) : {}),
          borderRadius: radiusToCss(props.borderRadius),
          ...borderStyles(props.border),
        }),
    textDecoration: "none",
    ...(hasIcon
      ? { lineHeight: 0, fontSize: 0 }
      : { lineHeight: "normal", ...textStyles }),
  };

  let innerContent: string;

  if (hasIcon) {
    const iconCellStyle: Record<string, any> = {
      padding: 0,
      lineHeight: 0,
      fontSize: 0,
      ...(iconIsBefore
        ? { paddingRight: `${iconGap}px` }
        : { paddingLeft: `${iconGap}px` }),
    };
    const textCellStyle: Record<string, any> = {
      padding: 0,
      lineHeight: 1,
      ...textStyles,
      whiteSpace: "nowrap",
    };
    const imgStyle: Record<string, any> = {
      display: "block",
      width: `${iconSize}px`,
      height: `${iconSize}px`,
      border: 0,
      outline: "none",
    };
    const tableStyle: Record<string, any> = {
      borderCollapse: "collapse",
      borderSpacing: 0,
      lineHeight: 0,
      ...(sizeStyles.width ? { margin: "0 auto" } : {}),
    };

    const iconCell = `<td style={{ ${styleObj(iconCellStyle)} }}><img src="${safeUrl(
      props.icon,
    )}" alt="${escapeAttr(iconAlt)}" width="${iconSize}" height="${iconSize}" style={{ ${styleObj(
      imgStyle,
    )} }} /></td>`;

    const buttonTextClasses = getResponsiveClasses(false, false, "text");
    const textCell = `<td style={{ ${styleObj(textCellStyle)} }} className={"${buttonTextClasses}"}>${props.text}</td>`;

    innerContent = `<table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ ${styleObj(
      tableStyle,
    )} }}><tbody><tr>${
      iconIsBefore ? iconCell + textCell : textCell + iconCell
    }</tr></tbody></table>`;
  } else {
    innerContent = props.text;
  }

  if (sizeStyles.width) {
    const tableStyle = {
      width: "100%",
      height: "100%",
      borderCollapse: "collapse",
    };
    const cellStyle = {
      ...parseMarginPaddingDiscrete(undefined, props.padding),
      lineHeight: "normal",
      ...textStyles,
    };
    innerContent = `<table role="presentation" border={0} cellPadding={0} cellSpacing={0} width="100%" height="100%" style={{ ${styleObj(tableStyle)} }}><tbody><tr><td align="center" valign="middle" className="${getResponsiveClasses(false, false, "text")} ${getResponsiveClasses(false, false, "button-content")}" style={{ ${styleObj(cellStyle)} }}>${innerContent}</td></tr></tbody></table>`;

    const outerStyle = {
      display: "inline-table",
      cssFloat: "none",
      margin: 0,
      verticalAlign: "middle",
      borderCollapse: "separate",
      borderSpacing: 0,
      tableLayout: "fixed",
      width: sizeStyles.width,
      height: sizeStyles.height,
      ...(bgInlineStyle ? react.parseCssString(bgInlineStyle) : {}),
      borderRadius: radiusToCss(props.borderRadius),
      ...borderStyles(props.border),
    };
    const widthAttr =
      sizeStyles.width === "auto"
        ? ""
        : ` width="${sizeStyles.width.replace(/px$/, "")}"`;
    const heightAttr =
      sizeStyles.height === "auto"
        ? ""
        : ` height="${sizeStyles.height.replace(/px$/, "")}"`;
    const solid = props.backgroundGradient?.solid ?? props.backgroundColor;
    const bgAttr =
      solid && solid !== "transparent" ? ` bgColor="${escapeAttr(solid)}"` : "";
    return `<div className="${buttonContainerClasses}" style={{ ${styleObj({ ...parseMarginPaddingDiscrete(props.margin, undefined), textAlign: btnAlign })} }}>
  <table role="presentation" border={0} cellPadding={0} cellSpacing={0} align="${btnAlign}"${widthAttr}${heightAttr}${bgAttr} className="${getResponsiveClasses(false, false, "button-table")}" style={{ ${styleObj(outerStyle)} }}>
    <tbody><tr><td style={{ padding: 0, height: "100%" }}>
      <Link href="${safeUrl(props.link)}" target="_blank" className="${buttonLinkClasses}" style={{ ${styleObj(linkShellStyle)} }}>${innerContent}</Link>
    </td></tr></tbody>
  </table>
</div>\n`;
  }

  return `<div
  className="${buttonContainerClasses}"
  style={{ ${styleObj({ ...parseMarginPaddingDiscrete(props.margin, undefined), textAlign: btnAlign })} }}
>
  <Link
    href="${safeUrl(props.link)}"
    target="_blank"
    className="${buttonLinkClasses}"
    style={{ ${styleObj(linkShellStyle)} }}
  >
    ${innerContent}
  </Link>
</div>\n`;
}

export const buttonBlock: BlockDefinition = {
  name: "Button",
  schema: {
    text: { type: "string", default: "Click Here" },
    link: { type: "string", default: "https://" },
    width: { type: "string", default: "auto" },
    height: { type: "string", default: "auto" },
  },
  renderCanvas: AnchorRenderer,
  renderSettings: ButtonPanel,
  renderEmail: {
    html: renderHtml,
    mjml: renderMjml,
    reactEmail: renderReactEmail,
  },
};
