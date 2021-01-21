import type {
  ContinuousScale,
  ContinuousScaleOptions,
  DiscreteScale,
  DiscreteScaleOptions,
  Interpolatable,
  InterpolationFn,
  ScaleOptions,
} from "./types.ts";
import type { IterFn, Row, Value } from "../types.ts";
import { equalValues } from "../utils.ts";
import { Table } from "../table.ts";
import { piecewiseInterpolation } from "./interpolation.ts";

export class Scale<R extends Row, V extends Value, I extends Interpolatable> {
  includeZero?: boolean;
  range?: I[];
  rangeInterpolation?: InterpolationFn;

  static continuous<
    R extends Row,
    V extends Date | null,
    I extends Interpolatable,
  >(
    field: IterFn<R, V>,
    options?: ContinuousScaleOptions<V, I>,
  ): ContinuousScale<R, V, I>;
  static continuous<
    R extends Row,
    V extends number | null,
    I extends Interpolatable,
  >(
    field: IterFn<R, V>,
    options?: ContinuousScaleOptions<V, I>,
  ): ContinuousScale<R, V, I>;
  static continuous<
    R extends Row,
    V extends number | Date | null,
    I extends Interpolatable,
  >(
    field: IterFn<R, V>,
    options?: ContinuousScaleOptions<V, I>,
  ): ContinuousScale<R, V, I> {
    return new Scale("continuous", field, options) as ContinuousScale<R, V, I>;
  }

  static discrete<R extends Row, V extends Value, I extends Interpolatable>(
    field: IterFn<R, V>,
    options?: DiscreteScaleOptions<I>,
  ): DiscreteScale<R, V, I> {
    return new Scale("discrete", field, options) as DiscreteScale<R, V, I>;
  }

  private constructor(
    public type: "continuous" | "discrete",
    public field: IterFn<R, V>,
    options: ScaleOptions<I> = {},
  ) {
    this.includeZero = options.includeZero;
    this.range = options.range;
    this.rangeInterpolation = options.rangeInterpolation;
  }

  async getScaler(
    domain: Table<{ value: V }>,
    defaultRange: I[],
  ): Promise<(value: V | null) => I | undefined> {
    let range = this.range ?? defaultRange;
    if (range.length === 0) range = defaultRange;

    let domainMin =
      (this.type === "continuous"
        ? (await domain.minBy((row) => row.value))?.value
        : undefined) as number | Date | undefined;
    let domainMax =
      (this.type === "continuous"
        ? (await domain.maxBy((row) => row.value))?.value
        : undefined) as number | Date | undefined;
    let domainMinValue = domainMin instanceof Date
      ? domainMin.getTime()
      : domainMin;
    let domainMaxValue = domainMax instanceof Date
      ? domainMax.getTime()
      : domainMax;

    if (domainMinValue != null && domainMaxValue != null && this.includeZero) {
      if (domainMinValue < 0 && domainMaxValue < 0) domainMaxValue = 0;
      else if (domainMinValue > 0 && domainMaxValue > 0) domainMinValue = 0;
    }

    let domainValues = this.type === "discrete"
      ? (await domain.unique().data).map((row) => row.value)
      : undefined;

    return (value) => {
      if (value == null) return;

      if (this.type === "continuous") {
        let v = value instanceof Date ? value.getTime() : value as number;
        let lambda = domainMinValue == null || domainMaxValue == null
          ? 0
          : (v - domainMinValue) / (domainMaxValue - domainMinValue);

        return piecewiseInterpolation(lambda, range, this.rangeInterpolation);
      } else if (this.type === "discrete") {
        let index = domainValues!.findIndex((x) => equalValues(x, value));
        if (index < 0) return;

        return range[index % range.length];
      }
    };
  }
}
