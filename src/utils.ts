import type { Row, RowJson, Value, ValueJson } from "./types.ts";

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

export function rowToJson<R extends Row>(row: R): RowJson<R> {
  function valueToJson<V extends Value>(value: V): ValueJson<V> {
    if (value instanceof Date) {
      return {
        type: "date",
        value: value.toJSON(),
      } as ValueJson<V>;
    }

    return value as ValueJson<V>;
  }

  let result = {} as Partial<RowJson<R>>;

  for (let key of Object.keys(row).sort() as (keyof R)[]) {
    result[key] = valueToJson(row[key]);
  }

  return result as RowJson<R>;
}

export function jsonToRow<R extends Row>(rowJson: RowJson<R>): R {
  function jsonToValue<V extends Value>(valueJson: ValueJson<V>): V {
    if (
      typeof valueJson === "object" &&
      "type" in valueJson &&
      valueJson.type === "date"
    ) {
      return new Date(valueJson.value) as V;
    }

    return valueJson as V;
  }

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
