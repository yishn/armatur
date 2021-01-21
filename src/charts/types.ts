import type { Row, Value } from "../types.ts";
import type { Rgba } from "./color.ts";
import type { Scale } from "./scale.ts";

export interface ScaleOptions<I> {
  includeZero?: boolean;
  range?: I[];
  rangeInterpolation?: InterpolationFn;
}

export type SafeOmit<T, K extends keyof T> = Omit<T, K>

export type ContinuousScaleOptions<V extends Value, I> =
  & SafeOmit<ScaleOptions<I>, "includeZero">
  & {
    includeZero?: V extends number | null ? boolean : false;
  };

export type DiscreteScaleOptions<I> = SafeOmit<
  ScaleOptions<I>,
  "includeZero" | "rangeInterpolation"
>;

export type ContinuousScale<
  R extends Row,
  V extends Value,
  I extends Interpolatable,
> =
  & Scale<R, V, I>
  & { type: "continuous" };

export type DiscreteScale<
  R extends Row,
  V extends Value,
  I extends Interpolatable,
> =
  & Scale<R, V, I>
  & { type: "discrete" };

export interface ChartProperties<R extends Row> {
  x: Scale<R, Value, number>;
  y: Scale<R, Value, number>;
  color?: Rgba | Scale<R, Value, Rgba>;
  size?: number | Scale<R, Value, number>;
}

export interface ChartOptions<R extends Row> {
  properties: ChartProperties<R>;
}

export interface BarChartOptions<R extends Row> extends ChartOptions<R> {
  stacked?: boolean;
  keyAxis?: "x" | "y";
  properties: {
    x: Scale<R, Value, number>;
    y: Scale<R, Value, number>;
    color?: Rgba | DiscreteScale<R, Value, Rgba>;
  };
}

export interface LineChartOptions<R extends Row> extends ChartOptions<R> {
  drawPoints?: boolean;
  properties: {
    x: Scale<R, Value, number>;
    y: Scale<R, Value, number>;
    color?: Rgba | DiscreteScale<R, Value, Rgba>;
  };
}

export interface PointChartOptions<R extends Row> extends ChartOptions<R> {
  properties: {
    x: Scale<R, Value, number>;
    y: Scale<R, Value, number>;
    color?: Rgba | Scale<R, Value, Rgba>;
    size?: number | Scale<R, Value, number>;
  };
}

export type IntoRgba = string | Rgba;

export type Interpolatable = number | Date | Rgba;

export type InterpolationFn = (
  lambda: number,
  start: number,
  end: number,
) => number;
