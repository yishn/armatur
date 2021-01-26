import type {
  ContinuousScaleDescriptor,
  ContinuousScaleOptions,
  DiscreteScaleDescriptor,
  DiscreteScaleOptions,
  Interpolatable,
  InterpolationFn,
  ScaleDescriptor,
} from "./types.ts";
import type { ContinuousValue, IntoTable, Row, Value } from "../types.ts";
import { Table } from "../table.ts";
import { continuousValueToNumber, equalValues } from "../utils.ts";
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
}

export class ContinuousScale<
  V extends ContinuousValue,
  T extends Interpolatable,
> extends Scale<V, T> {
  includeZero?: boolean;
  range?: T[];
  rangeInterpolation?: InterpolationFn;

  static async fromDomain<
    R extends Row,
    V extends ContinuousValue,
    T extends Interpolatable,
  >(
    source: IntoTable<R>,
    descriptor: ContinuousScaleDescriptor<R, V, T>,
  ): Promise<ContinuousScale<V, T>> {
    let valueNumbers = new Table(source)
      .map((row, index, table) => ({
        value: continuousValueToNumber(descriptor.field(row, index, table)),
      }))
      .filter((row) => !isNaN(row.value) && isFinite(row.value));

    let domainMin = (await valueNumbers.minBy((row) => row.value))?.value ?? 0;
    let domainMax = (await valueNumbers.maxBy((row) => row.value))?.value ?? 0;

    return new ContinuousScale(domainMin, domainMax, descriptor);
  }

  constructor(
    public domainMin: number,
    public domainMax: number,
    options: ContinuousScaleOptions<T> = {},
  ) {
    super();

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
