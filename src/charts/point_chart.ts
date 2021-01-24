import type { Row, Value } from "../types.ts";
import type { ChartOptions, ChartScales, ScaleDescriptor } from "./types.ts";
import type { Table } from "../table.ts";
import { Deferred, deferred } from "../deps.ts";
import { Color, rgba } from "./color.ts";
import { Chart } from "./chart.ts";
import {
  getDefaultColorRange,
  getDefaultSizeRange,
  getDefaultXYRange,
  Scale,
} from "./scale.ts";

export interface PointChartProperties<R extends Row> {
  x: ScaleDescriptor<R, Value, number>;
  y: ScaleDescriptor<R, Value, number>;
  color?: Color | ScaleDescriptor<R, Value, Color>;
  size?: number | ScaleDescriptor<R, Value, number>;
}

export interface PointChartOptions<R extends Row> extends ChartOptions<R> {
  properties: PointChartProperties<R>;
}

export type PointChartRow = {
  index: number;
  x: number;
  y: number;
  color: string;
  size: number;
};

export class PointChart<R extends Row> extends Chart<R, PointChartRow> {
  readonly scales: Deferred<
    ChartScales<PointChartProperties<R>>
  > = deferred();

  constructor(
    public readonly source: Table<R>,
    public readonly options: PointChartOptions<R>,
  ) {
    super(async () => {
      let { properties: props } = options;

      let xScale = await Scale.fromDomain(source, props.x);
      let yScale = await Scale.fromDomain(source, props.y);
      let colorScale = props.color instanceof Color || props.color == null
        ? props.color ?? rgba(0, 0, 0)
        : await Scale.fromDomain(source, props.color);
      let sizeScale = typeof props.size === "number" || props.size == null
        ? props.size
        : await Scale.fromDomain(source, props.size);

      this.scales.resolve({
        x: xScale,
        y: yScale,
        color: colorScale,
        size: sizeScale,
      });

      let defaultXRange = getDefaultXYRange(xScale);
      let defaultYRange = getDefaultXYRange(yScale);
      let defaultColorRange = getDefaultColorRange(colorScale);
      let defaultSizeRange = getDefaultSizeRange(sizeScale);

      return source.map((row, i, table) => {
        let x = xScale.map(props.x.field(row, i, table), defaultXRange);
        let y = yScale.map(props.y.field(row, i, table), defaultYRange);
        let color = defaultColorRange.length === 1
          ? defaultColorRange[0]
          : (colorScale as Scale<Value, Color>).map(
            (props.color as ScaleDescriptor<R, Value, Color>).field(
              row,
              i,
              table,
            ),
            defaultColorRange,
          );
        let size = defaultSizeRange.length === 1
          ? defaultSizeRange[0]
          : (sizeScale as Scale<Value, number>).map(
            (props.size as ScaleDescriptor<R, Value, number>).field(
              row,
              i,
              table,
            ),
            defaultSizeRange,
          );
        if (x == null || y == null || color == null || size == null) return;

        return {
          index: i,
          x,
          y,
          color: color.toString(),
          size,
        };
      });
    });
  }
}
