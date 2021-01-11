import type { Value } from "./types.ts";

export type TypeEquals<T, U> = Exclude<T, U> extends never
  ? Exclude<U, T> extends never ? true : false
  : false;

export function assertTypeEquals<T, U>(_: TypeEquals<T, U>) {}

export function compareValues(value: Value, other: Value): -1 | 0 | 1 {
  if (value instanceof Date) {
    value = value.getTime();
  }
  if (other instanceof Date) {
    other = other.getTime();
  }

  if (value === other) return 0;
  if (value == null) return -1;
  if (other == null) return 1;

  if (typeof value !== typeof other) {
    value = typeof value;
    other = typeof other;
  }

  if (
    typeof value === "number" && typeof other === "number" &&
    isNaN(value) && isNaN(other)
  ) {
    return 0;
  }

  return value < other ? -1 : 1;
}

export function addValues(value: Value, other: Value): number {
  if (typeof value !== "number" || typeof other !== "number") {
    return NaN;
  }

  return value + other;
}
