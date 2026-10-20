export function normalizeButtonDimension(value: unknown): string {
  if (typeof value !== "string") return "auto";
  const dimension = value.trim().toLowerCase();
  return /^(?:auto|(?:\d+(?:\.\d+)?|\.\d+)(?:px|%))$/.test(dimension)
    ? dimension
    : "auto";
}

export function getButtonSizeStyles(
  props: Record<string, any>,
): Record<string, string> {
  const width = normalizeButtonDimension(props.width);
  const height = normalizeButtonDimension(props.height);
  const hasSize = [
    width,
    height,
    props.mobile?.width,
    props.mobile?.height,
  ].some((value) => normalizeButtonDimension(value) !== "auto");
  return hasSize
    ? { width, height, boxSizing: "border-box", textAlign: "center" }
    : {};
}
