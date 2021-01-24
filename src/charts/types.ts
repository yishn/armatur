import type { ContinuousValue, IterFn, Row, Value } from "../types.ts";
import type { ContinuousScale, DiscreteScale, Scale } from "./scale.ts";
import type { Color } from "./color.ts";

export type IntoColor = string | Color | Rgba;

export type Rgba = [r: number, g: number, b: number, a: number];

export type Interpolatable = number | Date | Color;

export type InterpolationFn = (
  lambda: number,
  start: number,
  end: number,
) => number;

export interface DiscreteScaleOptions<T> {
  range?: T[];
}

export interface ContinuousScaleOptions<T extends Interpolatable> {
  includeZero?: boolean;
  range?: T[];
  rangeInterpolation?: InterpolationFn;
}

export interface DiscreteScaleDescriptor<R extends Row, V extends Value, T>
  extends DiscreteScaleOptions<T> {
  type: "discrete";
  field: IterFn<R, V>;
}

export interface ContinuousScaleDescriptor<
  R extends Row,
  V extends ContinuousValue,
  T extends Interpolatable,
> extends ContinuousScaleOptions<T> {
  type: "continuous";
  field: IterFn<R, V>;
}

export type ScaleDescriptor<R extends Row, V extends Value, T> =
  | DiscreteScaleDescriptor<R, V, T>
  | ContinuousScaleDescriptor<
    R,
    V extends ContinuousValue ? V : never,
    T extends Interpolatable ? T : never
  >;

export interface ChartProperties<R extends Row> {
  x: ScaleDescriptor<R, Value, number>;
  y: ScaleDescriptor<R, Value, number>;
  color?: Color | ScaleDescriptor<R, Value, Color>;
  size?: number | ScaleDescriptor<R, Value, number>;
}

export type ScaleFromDescriptor<D> = ScaleDescriptor<any, any, any> extends D
  ? D extends ScaleDescriptor<any, infer V, infer T> ? Scale<V, T> : never
  : D extends DiscreteScaleDescriptor<any, infer V, infer T>
    ? DiscreteScale<V, T>
  : D extends ContinuousScaleDescriptor<any, infer V, infer T>
    ? ContinuousScale<V, T>
  : D;

export type ChartScales<T extends ChartProperties<any> = ChartProperties<any>> =
  {
    [K in keyof T]: ScaleFromDescriptor<T[K]>;
  };

export interface ChartOptions<R extends Row> {
  properties: ChartProperties<R>;
}

export interface BarChartOptions<R extends Row> extends ChartOptions<R> {
  stacked?: boolean;
  keyAxis?: "x" | "y";
  properties: {
    x: ScaleDescriptor<R, Value, number>;
    y: ScaleDescriptor<R, Value, number>;
    color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
  };
}

export interface PointChartOptions<R extends Row> extends ChartOptions<R> {
  properties: {
    x: ScaleDescriptor<R, Value, number>;
    y: ScaleDescriptor<R, Value, number>;
    color?: Color | ScaleDescriptor<R, Value, Color>;
    size?: number | ScaleDescriptor<R, Value, number>;
  };
}
