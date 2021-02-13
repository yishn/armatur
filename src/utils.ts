import { formatDate, parseDate as _parseDate } from "../deps.ts";
import type {
  ContinuousValue,
  FormatValueOptions,
  Row,
  RowJson,
  Tagged,
  Value,
  ValueJson,
  ValueType,
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
  return stringifyValue(value) === stringifyValue(other);
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

export function stringifyValue<V extends Value>(value: V): string & Tagged<V> {
  return JSON.stringify(valueToJson(value));
}

export function parseValue<V extends Value>(json: string & Tagged<V>): V {
  return jsonToValue(JSON.parse(json));
}

export function rowToJson<R extends Row>(
  row: R,
  orderKeys: boolean = false,
): RowJson<R> {
  let result = {} as Partial<RowJson<R>>;
  let keys = Object.keys(row) as (keyof R)[];
  if (orderKeys) keys.sort();

  for (let key of keys) {
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

export function stringifyRow<R extends Row>(
  row: R,
  orderKeys?: boolean,
): string & Tagged<R> {
  return JSON.stringify(rowToJson(row, orderKeys));
}

export function parseRow<R extends Row>(json: string & Tagged<R>): R {
  return jsonToRow(JSON.parse(json));
}

export function objectMap<T extends object, U>(
  obj: T,
  fn: <K extends keyof T>(
    key: K,
    value: T[K],
  ) => U,
): Record<keyof T, U> {
  return Object.entries(obj)
    .map(([key, value]) => [key, fn(key as keyof T, value)] as const)
    .reduce(
      (acc, [key, value]) => ({ ...acc, [key]: value }),
      {} as Record<keyof T, U>,
    );
}

export async function asyncObjectMap<T extends object, U>(
  obj: T,
  fn: <K extends keyof T>(
    key: K,
    value: T[K],
  ) => U | Promise<U>,
): Promise<Record<keyof T, U>> {
  return (await Promise.all(
    Object.entries(obj)
      .map(async ([key, value]) =>
        [key, await fn(key as keyof T, value)] as const
      ),
  ))
    .reduce(
      (acc, [key, value]) => ({ ...acc, [key]: value }),
      {} as Record<keyof T, U>,
    );
}

export function typeOf(value: Value): ValueType;
export function typeOf(value: Value, type: "string"): value is string;
export function typeOf(value: Value, type: "boolean"): value is boolean;
export function typeOf(value: Value, type: "number"): value is number;
export function typeOf(value: Value, type: "date"): value is Date;
export function typeOf(value: Value, type: "null"): value is null;
export function typeOf(value: Value, type: ValueType): boolean;
export function typeOf(value: Value, type?: string): ValueType | boolean {
  let detectedType: ValueType = typeof value === "string"
    ? "string"
    : typeof value === "boolean"
    ? "boolean"
    : typeof value === "number"
    ? "number"
    : value instanceof Date
    ? "date"
    : value == null
    ? "null"
    : undefined as never;

  return type == null ? detectedType : detectedType === type;
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

export function equisizedSectionMiddlepoints(
  n: number,
  min: number = 0,
  max: number = 1,
) {
  if (n <= 0) return [];
  return equidistantPoints(n + 1, min, max)
    .slice(0, -1)
    .map((x) => x + (max - min) / n / 2);
}

export function floor(a: number, n: number = 0): number {
  return Math.floor(a * 10 ** n) / 10 ** n;
}

export function ceil(a: number, n: number = 0): number {
  return Math.ceil(a * 10 ** n) / 10 ** n;
}

export function round(a: number, n: number = 0): number {
  return Math.round(a * 10 ** n) / 10 ** n;
}

export enum RoundDateUnit {
  Year,
  HalfYear,
  QuarterYear,
  Month,
  Week,
  Day,
  Hour,
  Minute,
  Second,
}

export const minRoundDateUnit = RoundDateUnit.Year;
export const maxRoundDateUnit = RoundDateUnit.Second;

export function floorDate(date: Date, unit: RoundDateUnit): Date {
  let result = new Date(date.getTime());

  if (unit >= RoundDateUnit.Second) result.setMilliseconds(0);
  if (unit >= RoundDateUnit.Minute) result.setSeconds(0);
  if (unit >= RoundDateUnit.Hour) result.setMinutes(0);
  if (unit >= RoundDateUnit.Day) result.setHours(0);

  if (unit >= RoundDateUnit.Week) {
    result.setDate(result.getDate() - result.getDay());
  } else if (unit >= RoundDateUnit.Month) {
    result.setDate(1);
  }

  if (unit >= RoundDateUnit.QuarterYear) {
    result.setMonth(Math.round(result.getMonth() / 3) * 3);
  } else if (unit >= RoundDateUnit.HalfYear) {
    result.setMonth(Math.round(result.getMonth() / 6) * 6);
  } else if (unit >= RoundDateUnit.Year) {
    result.setMonth(0);
  }

  return result;
}

export function addUnitToDate(date: Date, unit: RoundDateUnit): Date {
  let result = new Date(date.getTime());

  if (unit === RoundDateUnit.Year) {
    result.setFullYear(result.getFullYear() + 1);
  } else if (unit === RoundDateUnit.HalfYear) {
    result.setMonth(result.getMonth() + 6);
  } else if (unit === RoundDateUnit.QuarterYear) {
    result.setMonth(result.getMonth() + 3);
  } else if (unit === RoundDateUnit.Month) {
    result.setMonth(result.getMonth() + 1);
  } else if (unit === RoundDateUnit.Week) {
    result.setDate(result.getDate() + 7);
  } else if (unit === RoundDateUnit.Day) {
    result.setDate(result.getDate() + 1);
  } else if (unit === RoundDateUnit.Hour) {
    result.setHours(result.getHours() + 1);
  } else if (unit === RoundDateUnit.Minute) {
    result.setMinutes(result.getMinutes() + 1);
  } else if (unit === RoundDateUnit.Second) {
    result.setSeconds(result.getSeconds() + 1);
  }

  return result;
}

export function ceilDate(date: Date, unit: RoundDateUnit): Date {
  let result = floorDate(date, unit);
  if (result.getTime() === date.getTime()) return result;

  return addUnitToDate(date, unit);
}

export function roundDate(date: Date, unit: RoundDateUnit): Date {
  let floored = floorDate(date, unit);
  let ceiled = ceilDate(date, unit);

  if (
    (date.getTime() - floored.getTime()) < (ceiled.getTime() - date.getTime())
  ) {
    return floored;
  } else {
    return ceiled;
  }
}

export function formatValue(
  value: Value,
  options: FormatValueOptions = {},
): string {
  let result = "";

  if (typeOf(value, "string") || typeOf(value, "boolean")) {
    result = value.toString();
  } else if (typeOf(value, "null")) {
    result = "-";
  } else if (typeOf(value, "number")) {
    if (isNaN(value)) {
      result = "?";
    } else if (!isFinite(value)) {
      result = (value < 0 ? "-" : "") + "∞";
    } else {
      if (options.percent) {
        value = value * 100;
        if (options.suffix == null) options.suffix = " %";
      }
      if (options.round != null) {
        value = round(value, options.round);
      }

      let [, int, decimal] =
        (value.toString().match(/(\d+)(\.\d+)?/) ?? []) as string[];

      if (int == null) {
        result = value.toString();
      } else {
        int = [...[...int].reverse().join("").replace(/\d{3}/g, "$&,")]
          .reverse().join("");
        result = int + (decimal ?? "");
      }
    }
  } else if (typeOf(value, "date")) {
    result = formatDate(value, options.dateFormat ?? "yyyy-MM-dd HH:mm:ss", {});
  }

  result = (options.prefix ?? "") + result + (options.suffix ?? "");

  if (options.maxLength != null && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength - 1) + "…";
  }

  return result;
}

export function parseDate(value: string, format: string): Date {
  return _parseDate(value, format, new Date(), undefined);
}
