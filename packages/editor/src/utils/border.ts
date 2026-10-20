export interface BorderSide {
  width: number;
  color: string;
  style: string;
}

export const borderDirections = ["top", "right", "bottom", "left"] as const;
export type BorderDirection = (typeof borderDirections)[number];
export interface BorderValue extends BorderSide {
  sides?: Record<BorderDirection, BorderSide>;
}

export function borderSides(border?: BorderValue | null) {
  const base = {
    width: border?.width ?? 0,
    color: border?.color ?? "transparent",
    style: border?.style ?? "solid",
  };
  return Object.fromEntries(
    borderDirections.map((side) => [
      side,
      { ...base, ...border?.sides?.[side] },
    ]),
  ) as Record<BorderDirection, BorderSide>;
}

export function toggleBorderMode<T extends BorderValue>(border: T): T {
  const { sides, ...base } = border;
  return (
    sides
      ? { ...base, ...borderSides(border).top }
      : { ...base, sides: borderSides(border) }
  ) as T;
}

export function hasBorder(border?: BorderValue | null): boolean {
  return Object.values(borderSides(border)).some(
    (side) => side.width > 0 && side.style !== "none",
  );
}

export function borderStyles(
  border?: BorderValue | null,
): Record<string, string> {
  const sides = borderSides(border);
  if (!border?.sides) {
    const { width, style, color } = sides.top;
    return { border: `${width}px ${style} ${color}` };
  }
  return Object.fromEntries(
    borderDirections.map((side) => {
      const { width, style, color } = sides[side];
      return [
        `border${side[0]!.toUpperCase()}${side.slice(1)}`,
        `${width}px ${style} ${color}`,
      ];
    }),
  );
}

export function borderToCss(
  border?: BorderValue | null,
  important = false,
): string {
  return Object.entries(borderStyles(border))
    .map(
      ([key, value]) =>
        `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value}${important ? " !important" : ""}`,
    )
    .join(";");
}
