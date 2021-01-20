import type { Row, Value } from "../types.ts";
import type { Rgba } from "./color.ts";
import type { Scale } from "./scale.ts";

export interface ScaleOptions<T> {
  includeZero?: boolean;
  range?: T[];
}

export type ContinuousScale<R extends Row, V extends Value, T = never> =
  & Scale<R, V, T>
  & { type: "continuous" };

export type DiscreteScale<R extends Row, V extends Value, T = never> =
  & Scale<R, V, T>
  & { type: "discrete" };

export interface ChartProperties<R extends Row> {
  x: Scale<R, Value, number>;
  y: Scale<R, Value, number>;
  color?: IntoRgba | Scale<R, Value, IntoRgba>;
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
    color?: IntoRgba | DiscreteScale<R, Value, IntoRgba>;
  };
}

export interface LineChartOptions<R extends Row> extends ChartOptions<R> {
  drawPoints?: boolean;
  properties: {
    x: Scale<R, Value, number>;
    y: Scale<R, Value, number>;
    color?: IntoRgba | DiscreteScale<R, Value, IntoRgba>;
  };
}

export interface PointChartOptions<R extends Row> extends ChartOptions<R> {
  properties: {
    x: Scale<R, Value, number>;
    y: Scale<R, Value, number>;
    color?: IntoRgba | Scale<R, Value, IntoRgba>;
    size?: number | Scale<R, Value, number>;
  };
}

export type IntoRgba = string | Rgba;
