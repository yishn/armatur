import type {
  ContinuousScaleDescriptor,
  ContinuousScaleOptions,
  DiscreteScaleDescriptor,
  DiscreteScaleOptions,
  Interpolatable,
  ScaleDescriptor,
} from "./types.ts";
import type { ContinuousValue, IntoTable, Row, Value } from "../types.ts";
import { Table } from "../table.ts";
import {
  addUnitToDate,
  ceil,
  ceilDate,
  clamp,
  continuousValueToNumber,
  equalValues,
  floor,
  floorDate,
  maxRoundDateUnit,
  minRoundDateUnit,
  round,
  RoundDateUnit,
  typeOf,
} from "../utils.ts";
import { piecewiseInterpolation } from "./interpolation.ts";

export abstract class Scale<V extends Value, T> {
  static async fromDomain<R extends Row, V extends Value, T>(
    source: IntoTable<R>,
    descriptor: ScaleDescriptor<R, V, T>,
  ): Promise<Scale<V, T>> {
    if (descriptor.type === "discrete") {
      return DiscreteScale.fromDomain(source, descriptor);
    } else if (descriptor.type === "continuous") {
      return ContinuousScale.fromDomain(source, descriptor);
    }

    throw new TypeError("Invalid descriptor type");
  }

  abstract map(value: V, defaultRange: T[]): T | undefined;
  abstract getTicks(level: number): V[];
}

export class DiscreteScale<V extends Value, T> extends Scale<V, T> {
  range?: T[];

  static async fromDomain<R extends Row, V extends Value, T>(
    source: IntoTable<R>,
    descriptor: DiscreteScaleDescriptor<R, V, T>,
  ): Promise<DiscreteScale<V, T>> {
    return new DiscreteScale(
      (await new Table(source)
        .map((row, i, table) => ({ value: descriptor.field(row, i, table) }))
        .unique()
        .data)
        .map((row) => row.value),
      descriptor,
    );
  }

  constructor(public domainValues: V[], options: DiscreteScaleOptions<T> = {}) {
    super();

    this.range = options.range;
  }

  map(value: V, defaultRange: T[]): T | undefined {
    if (value == null) return;
    let index = this.domainValues.findIndex((x) => equalValues(x, value));
    if (index < 0) return;

    let range = this.range ?? defaultRange;
    return range[index % range.length];
  }

  getTicks(level: number): V[] {
    return this.domainValues;
  }
}

export class ContinuousScale<
  V extends ContinuousValue,
  T extends Interpolatable,
> extends Scale<V, T> {
  includeZero?: boolean;
  range?: T[];

  static async fromDomain<
    R extends Row,
    V extends ContinuousValue,
    T extends Interpolatable,
  >(
    source: IntoTable<R>,
    descriptor: ContinuousScaleDescriptor<R, V, T>,
  ): Promise<ContinuousScale<V, T>> {
    let valueNumbers = new Table(source)
      .map((row, i, table) => {
        let value = descriptor.field(row, i, table);
        let numberValue = continuousValueToNumber(value);
        if (isNaN(numberValue) || !isFinite(numberValue)) return;

        return {
          value,
          type: typeOf(value),
        };
      });

    let domainMin = await valueNumbers.minBy((row) => row.value);
    let domainMax = await valueNumbers.maxBy((row) => row.value);

    return new ContinuousScale(
      domainMin?.value ?? null,
      domainMax?.value ?? null,
      descriptor,
    );
  }

  constructor(
    public domainMin: V | null,
    public domainMax: V | null,
    options: ContinuousScaleOptions<T> = {},
  ) {
    super();

    this.includeZero = options.includeZero;
    this.range = options.range;
  }

  map(value: V, defaultRange: T[]): T | undefined {
    let range = this.range ?? defaultRange;
    let min = continuousValueToNumber(this.domainMin ?? 0);
    let max = continuousValueToNumber(this.domainMax ?? 0);

    if (this.includeZero) {
      if (max < 0) max = 0;
      if (min > 0) min = 0;
    }

    let lambda = (continuousValueToNumber(value) - min) / (max - min);

    return piecewiseInterpolation(lambda, range);
  }

  getTicks(level: number): V[] {
    if (this.domainMax == null || this.domainMin == null) return [];

    let minType = typeOf(this.domainMin) as "date" | "number";
    let maxType = typeOf(this.domainMax) as "date" | "number";
    let type = minType === maxType ? minType : "number";

    if (type === "number") {
      let minTick = floor(continuousValueToNumber(this.domainMin), level);
      let maxTick = ceil(continuousValueToNumber(this.domainMax), level);
      let tickDiff = 10 ** -level;
      let result = [minTick];

      while (true) {
        let nextTick = round(result.slice(-1)[0] + tickDiff, level);

        if (nextTick > maxTick) break;
        result.push(nextTick);
      }

      return result as V[];
    } else {
      let unit = clamp(
        level,
        minRoundDateUnit,
        maxRoundDateUnit,
      ) as RoundDateUnit;
      let minTick = floorDate(this.domainMin as Date, unit);
      let maxTick = ceilDate(this.domainMax as Date, unit);
      let result = [minTick];

      while (true) {
        let nextTick = addUnitToDate(result.slice(-1)[0], unit);

        if (nextTick > maxTick) break;
        result.push(nextTick);
      }

      return result as V[];
    }
  }
}
