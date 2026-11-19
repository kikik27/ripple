export type Cardinal = "N" | "S" | "E" | "W";

export function cardinalFromAnalog(x: number, y: number, radius = 40): Cardinal | null {
  const length = Math.hypot(x, y);
  if (length < radius * 0.23) return null;
  return Math.abs(x) >= Math.abs(y) ? (x >= 0 ? "E" : "W") : (y >= 0 ? "S" : "N");
}
