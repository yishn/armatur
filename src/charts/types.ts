import type { ContinuousValue, IterFn, Row, Value } from "../types.ts";
import type { Rgba } from "./color.ts";

export type IntoRgba = string | Rgba;

export type Interpolatable = number | Date | Rgba;

export type InterpolationFn = (
  lambda: number,
  start: number,
  end: number,
) => number;

export interface DiscreteScaleDescriptor<R extends Row, V extends Value, T> {
  type: "discrete";
  field: IterFn<R, V>;
  range?: T[];
}

export interface ContinuousScaleDescriptor<
  R extends Row,
  V extends ContinuousValue,
  T extends Interpolatable,
> {
  type: "continuous";
  field: IterFn<R, V>;
  includeZero?: boolean;
  range?: T[];
  rangeInterpolation?: InterpolationFn;
}

export type ScaleDescriptor<R extends Row, V extends Value, T> =
  | DiscreteScaleDescriptor<R, V, T>
  | ContinuousScaleDescriptor<
    R,
    V extends ContinuousValue ? V : never,
    T extends Interpolatable ? T : never
  >;

export interface Scale<V extends Value, T> {
  map(value: V, defaultRange: T[]): T | undefined;
}

export interface ChartProperties<R extends Row> {
  x: ScaleDescriptor<R, Value, number>;
  y: ScaleDescriptor<R, Value, number>;
  color?: Rgba | ScaleDescriptor<R, Value, Rgba>;
  size?: number | ScaleDescriptor<R, Value, number>;
}

export interface ChartOptions<R extends Row> {
  properties: ChartProperties<R>;
}

export interface BarChartOptions<R extends Row> extends ChartOptions<R> {
  stacked?: boolean;
  keyAxis?: "x" | "y";
  properties: {
    x: ScaleDescriptor<R, Value, number>;
    y: ScaleDescriptor<R, Value, number>;
    color?: Rgba | DiscreteScaleDescriptor<R, Value, Rgba>;
  };
}

export interface LineChartOptions<R extends Row> extends ChartOptions<R> {
  drawPoints?: boolean;
  properties: {
    x: ScaleDescriptor<R, Value, number>;
    y: ScaleDescriptor<R, Value, number>;
    color?: Rgba | DiscreteScaleDescriptor<R, Value, Rgba>;
  };
}

export interface PointChartOptions<R extends Row> extends ChartOptions<R> {
  properties: {
    x: ScaleDescriptor<R, Value, number>;
    y: ScaleDescriptor<R, Value, number>;
    color?: Rgba | ScaleDescriptor<R, Value, Rgba>;
    size?: number | ScaleDescriptor<R, Value, number>;
  };
}
