import type {
  ContinuousValue,
  Row,
  RowJson,
  Value,
  ValueJson,
} from "./types.ts";

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

export function equalValues(value: Value, other: Value): boolean {
  return JSON.stringify(valueToJson(value)) ===
    JSON.stringify(valueToJson(other));
}

export function compareLexicographically(
  values: Value[],
  others: Value[],
): -1 | 0 | 1 {
  if (values.length !== others.length) {
    return Math.sign(values.length - others.length) as -1 | 1;
  } else if (values.length === 0) {
    return 0;
  }

  let compareFirst = compareValues(values[0], others[0]);

  return compareFirst !== 0
    ? compareFirst
    : compareLexicographically(values.slice(1), others.slice(1));
}

export function valueToJson<V extends Value>(value: V): ValueJson<V> {
  if (typeOf(value, "date")) {
    return {
      type: "date",
      value: value.toJSON(),
    } as ValueJson<V>;
  }

  return value as ValueJson<V>;
}

export function jsonToValue<V extends Value>(valueJson: ValueJson<V>): V {
  if (
    typeof valueJson === "object" &&
    "type" in valueJson &&
    valueJson.type === "date"
  ) {
    return new Date(valueJson.value) as V;
  }

  return valueJson as V;
}

export function rowToJson<R extends Row>(row: R): RowJson<R> {
  let result = {} as Partial<RowJson<R>>;

  for (let key of Object.keys(row).sort() as (keyof R)[]) {
    result[key] = valueToJson(row[key]);
  }

  return result as RowJson<R>;
}

export function jsonToRow<R extends Row>(rowJson: RowJson<R>): R {
  let result = {} as Partial<R>;

  for (let key in rowJson) {
    result[key] = jsonToValue(rowJson[key]);
  }

  return result as R;
}

export function objectMap<T extends object, U extends object>(
  obj: T,
  fn: <K extends keyof T>(key: K, value: T[K]) => Partial<U>,
): U {
  return Object.entries(obj)
    .map(([key, value]) => fn(key as keyof T, value))
    .reduce((acc, part) => ({ ...acc, ...part }), {} as Partial<U>) as U;
}

export function typeOf(value: Value, type: "string"): value is string;
export function typeOf(value: Value, type: "boolean"): value is boolean;
export function typeOf(value: Value, type: "number"): value is number;
export function typeOf(value: Value, type: "date"): value is Date;
export function typeOf(value: Value, type: "null"): value is null;
export function typeOf(
  value: Value,
  type:
    | "string"
    | "boolean"
    | "number"
    | "date"
    | "null",
): boolean;
export function typeOf(value: Value, type: string): boolean {
  return typeof value === "string" && type === "string" ||
    typeof value === "boolean" && type === "boolean" ||
    typeof value === "number" && type === "number" ||
    value instanceof Date && type === "date" ||
    value == null && type === "null";
}

export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

export function continuousValueToNumber(value: ContinuousValue): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();

  throw new TypeError("Invalid data type for value");
}

export function equidistantPoints(
  n: number,
  min: number = 0,
  max: number = 1,
): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0];
  return [...Array(n)].map((_, i) => min + i * (max - min) / (n - 1));
}
