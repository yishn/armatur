import type {
  ContinuousScaleDescriptor,
  DiscreteScaleDescriptor,
  Interpolatable,
  InterpolationFn,
  Scale,
} from "./types.ts";
import type { ContinuousValue, Row, Value } from "../types.ts";
import type { Table } from "../table.ts";
import { continuousValueToNumber, equalValues } from "../utils.ts";
import { piecewiseInterpolation } from "./interpolation.ts";

export class DiscreteScale<V extends Value, T> implements Scale<V, T> {
  range?: T[];

  static async fromDescriptor<
    R extends Row,
    V extends ContinuousValue,
    T extends Interpolatable,
  >(
    table: Table<R>,
    descriptor: DiscreteScaleDescriptor<R, V, T>,
  ): Promise<DiscreteScale<V, T>> {
    let scale = new DiscreteScale<V, T>(
      (await table.map((row, index, table) => ({
        value: descriptor.field(row, index, table),
      }))
        .unique()
        .data)
        .map((row) => row.value),
    );

    scale.range = descriptor.range;

    return scale;
  }

  constructor(public domainValues: V[]) {}

  map(value: V, defaultRange: T[]): T | undefined {
    if (value == null) return;
    let index = this.domainValues.findIndex((x) => equalValues(x, value));
    if (index < 0) return;

    let range = this.range ?? defaultRange;
    return range[index % range.length];
  }
}

export class ContinuousScale<
  V extends ContinuousValue,
  T extends Interpolatable,
> implements Scale<V, T> {
  includeZero?: boolean;
  range?: T[];
  rangeInterpolation?: InterpolationFn;

  static async fromDescriptor<
    R extends Row,
    V extends ContinuousValue,
    T extends Interpolatable,
  >(
    table: Table<R>,
    descriptor: ContinuousScaleDescriptor<R, V, T>,
  ): Promise<ContinuousScale<V, T>> {
    let valueNumbers = table.map((row, index, table) => ({
      value: continuousValueToNumber(descriptor.field(row, index, table)),
    }));
    let domainMin = (await valueNumbers.minBy((row) => row.value))?.value ?? 0;
    let domainMax = (await valueNumbers.maxBy((row) => row.value))?.value ?? 0;
    let scale = new ContinuousScale<V, T>(domainMin, domainMax);

    scale.includeZero = descriptor.includeZero;
    scale.range = descriptor.range;
    scale.rangeInterpolation = descriptor.rangeInterpolation;

    return scale;
  }

  constructor(public domainMin: number, public domainMax: number) {}

  map(value: V, defaultRange: T[]): T | undefined {
    let range = this.range ?? defaultRange;
    let min = this.domainMin;
    let max = this.domainMax;
    let lambda = (continuousValueToNumber(value) - min) / (max - min);

    return piecewiseInterpolation(lambda, range, this.rangeInterpolation);
  }
}
