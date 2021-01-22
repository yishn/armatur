import type {
  ContinuousScaleDescriptor,
  ContinuousScaleOptions,
  DiscreteScaleDescriptor,
  DiscreteScaleOptions,
  Interpolatable,
  InterpolationFn,
  ScaleDescriptor,
} from "./types.ts";
import type { ContinuousValue, Row, Value } from "../types.ts";
import type { Table } from "../table.ts";
import { continuousValueToNumber, equalValues } from "../utils.ts";
import { piecewiseInterpolation } from "./interpolation.ts";

export interface Scale<V extends Value, T> {
  map(value: V, defaultRange: T[]): T | undefined;
}

export namespace Scale {
  export async function fromDomain<R extends Row, V extends Value, T>(
    table: Table<R>,
    descriptor: ScaleDescriptor<R, V, T>,
  ): Promise<Scale<V, T>> {
    if (descriptor.type === "discrete") {
      return DiscreteScale.fromDomain(table, descriptor);
    } else if (descriptor.type === "continuous") {
      return ContinuousScale.fromDomain(table, descriptor);
    }

    throw new TypeError("Invalid descriptor type");
  }
}

export class DiscreteScale<V extends Value, T> implements Scale<V, T> {
  range?: T[];

  static async fromDomain<R extends Row, V extends Value, T>(
    table: Table<R>,
    descriptor: DiscreteScaleDescriptor<R, V, T>,
  ): Promise<DiscreteScale<V, T>> {
    return new DiscreteScale(
      [
        ...new Set(
          (await table.data).map((row, index) =>
            descriptor.field(row, index, table)
          ),
        ),
      ],
      descriptor,
    );
  }

  constructor(public domainValues: V[], options: DiscreteScaleOptions<T> = {}) {
    this.range = options.range;
  }

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

  static async fromDomain<
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

    return new ContinuousScale(domainMin, domainMax, descriptor);
  }

  constructor(
    public domainMin: number,
    public domainMax: number,
    options: ContinuousScaleOptions<T> = {},
  ) {
    this.includeZero = options.includeZero;
    this.range = options.range;
    this.rangeInterpolation = options.rangeInterpolation;
  }

  map(value: V, defaultRange: T[]): T | undefined {
    let range = this.range ?? defaultRange;
    let min = this.domainMin;
    let max = this.domainMax;

    if (this.includeZero) {
      if (max < 0) max = 0;
      if (min > 0) min = 0;
    }

    let lambda = (continuousValueToNumber(value) - min) / (max - min);

    return piecewiseInterpolation(lambda, range, this.rangeInterpolation);
  }
}
