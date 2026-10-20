import { hasBorder, borderToCss, borderStyles } from "@/utils/border";
import { hasRadius, radiusToCss } from "@/utils/borderRadius";
// export/shared/containers.ts
// Unified container wrappers used across HTML and React Email exports.
// These ensure the "outer-td / inner-div" structure remains identical
// regardless of which generator is being used.

// ─── Border helper ────────────────────────────────────────────────────────────

const buildBorderStyle = (border: any): string => {
  if (!hasBorder(border)) return "";
  return borderToCss(border);
};

// ─── HTML container wrapper ───────────────────────────────────────────────────

/**
 * Unified container wrapper for rows and columns (HTML export).
 *
 * Industry standard approach for email templates:
 * - Background colors stay on td elements for proper equal-height stretching
 * - Border-radius requires a nested div with overflow:hidden for clipping
 * - Simple borders can stay on td or div depending on context
 *
 * Strategy:
 *   - Background: ALWAYS on parent td (ensures columns stretch equally)
 *   - Padding: Applied via inner div (keeps content away from borders)
 *   - Border-radius: Outer div wrapper with overflow:hidden + border
 *   - Simple border (no radius): Can stay on td or inner div
 *
 * This matches how MJML, Foundation for Emails, and major email frameworks work.
 */
export const wrapWithContainerDiv = (
  content: string,
  border: any,
  backgroundStyles: string[] = [],
  padding?: any,
): string => {
  const paddingStr = `padding:${padding?.top ?? 0}px ${padding?.right ?? 0}px ${padding?.bottom ?? 0}px ${padding?.left ?? 0}px`;

  const hasBorderRadius =
    border && hasRadius(border.radius ?? 0) && hasBorder(border);
  const hasSimpleBorder =
    border && hasBorder(border) && !hasRadius(border.radius ?? 0);

  // Case 1: No border or simple border (no radius)
  // Background stays on td, border on inner div for consistent rendering
  if (!hasBorderRadius) {
    const innerDivStyles: string[] = [paddingStr];

    if (hasSimpleBorder) {
      innerDivStyles.push(buildBorderStyle(border));
    }

    // Add line-height fix for Outlook
    innerDivStyles.push("line-height:0");
    innerDivStyles.push("font-size:0");

    return `<div style="${innerDivStyles.join(";")}">${content}</div>`;
  }

  // Case 2: Border with radius - need outer wrapper for overflow:hidden
  const outerStyles: string[] = [
    `border-radius:${radiusToCss(border.radius)}`,
    `overflow:hidden`,
    `line-height:0`,
    `font-size:0`,
  ];

  if (hasBorder(border)) {
    outerStyles.push(buildBorderStyle(border));
  }

  // Inner div handles padding
  const innerDivStyles: string[] = [paddingStr, "line-height:0", "font-size:0"];

  return `<div style="${outerStyles.join(";")}"><div style="${innerDivStyles.join(";")}">${content}</div></div>`;
};

// ─── React container wrapper ──────────────────────────────────────────────────
//
// JSX equivalent of wrapWithContainerDiv. Produces the same structure
// (background on Column component, border + padding on nested divs)
// so React Email output is visually identical to the HTML export.

export const wrapWithContainerDivReact = (
  content: string,
  border: any,
  backgroundStyles: Record<string, string> = {},
  padding?: any,
  applyBorder = true,
): string => {
  const paddingVal = `${padding?.top ?? 0}px ${padding?.right ?? 0}px ${padding?.bottom ?? 0}px ${padding?.left ?? 0}px`;

  const hasBorderRadius =
    border && hasRadius(border.radius ?? 0) && hasBorder(border) && applyBorder;
  const hasSimpleBorder =
    border &&
    hasBorder(border) &&
    !hasRadius(border.radius ?? 0) &&
    applyBorder;

  // Case 1: No border-radius - simple div with padding and optional border
  if (!hasBorderRadius) {
    const divStyle: Record<string, string> = {
      padding: paddingVal,
      lineHeight: "0",
      fontSize: "0",
    };

    if (hasSimpleBorder) {
      Object.assign(divStyle, borderStyles(border));
      if (hasRadius(border.radius ?? 0)) {
        divStyle.borderRadius = radiusToCss(border.radius);
      }
    }

    const styleEntries = Object.entries(divStyle)
      .map(([k, v]) => `${k}:"${v}"`)
      .join(", ");

    return `<div style={{ ${styleEntries} }}>${content}</div>`;
  }

  // Case 2: Border with radius - need outer wrapper for overflow
  const outerStyle: Record<string, string> = {
    borderRadius: radiusToCss(border.radius),
    overflow: "hidden",
    lineHeight: "0",
    fontSize: "0",
  };

  if (hasBorder(border)) {
    Object.assign(outerStyle, borderStyles(border));
  }

  const innerStyle: Record<string, string> = {
    padding: paddingVal,
    lineHeight: "0",
    fontSize: "0",
  };

  const outerEntries = Object.entries(outerStyle)
    .map(([k, v]) => `${k}:"${v}"`)
    .join(", ");

  const innerEntries = Object.entries(innerStyle)
    .map(([k, v]) => `${k}:"${v}"`)
    .join(", ");

  return `<div style={{ ${outerEntries} }}><div style={{ ${innerEntries} }}>${content}</div></div>`;
};
