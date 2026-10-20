export interface RadiusCorners {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

export type BorderRadius = number | RadiusCorners;

export function radiusCorners(value: BorderRadius = 0): RadiusCorners {
  return typeof value === "number"
    ? { topLeft: value, topRight: value, bottomRight: value, bottomLeft: value }
    : { ...value };
}

export function hasRadius(value: BorderRadius = 0): boolean {
  return Object.values(radiusCorners(value)).some((corner) => corner > 0);
}

export function radiusToCss(value: BorderRadius = 0, offset = 0): string {
  const px = (corner: number) => `${corner > 0 ? corner + offset : 0}px`;
  if (typeof value === "number") return px(value);
  return [value.topLeft, value.topRight, value.bottomRight, value.bottomLeft]
    .map(px)
    .join(" ");
}
