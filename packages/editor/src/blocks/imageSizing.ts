import { normalizeButtonDimension } from "./buttonSizing";

export function normalizeImageDimension(
  value: unknown,
  key: "width" | "height",
): string {
  const fallback = key === "width" ? "100%" : "auto";
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  let dimension = String(value).trim().toLowerCase();
  // Unitless widths remain percentages for both existing and new templates.
  if (/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(dimension)) {
    dimension += key === "width" ? "%" : "px";
  }
  if (key === "height" && dimension.endsWith("%")) return fallback;
  const normalized = normalizeButtonDimension(dimension);
  return normalized === "auto" && dimension !== "auto" ? fallback : normalized;
}
