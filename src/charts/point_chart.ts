import type { Row, Value } from "../types.ts";
import type { ChartOptions, ChartScales, ScaleDescriptor } from "./types.ts";
import type { Table } from "../table.ts";
import { Deferred, deferred } from "../deps.ts";
import { Color } from "./color.ts";
import { Chart } from "./chart.ts";
import { Scale } from "./scale.ts";
import {
  getDefaultColorRange,
  getDefaultSizeRange,
  getDefaultXYRange,
} from "./range.ts";

export interface PointChartScaleDescriptors<R extends Row> {
  x: ScaleDescriptor<R, Value, number>;
  y: ScaleDescriptor<R, Value, number>;
  color?: Color | ScaleDescriptor<R, Value, Color>;
  size?: number | ScaleDescriptor<R, Value, number>;
}

export type PointChartScales<R extends Row> = ChartScales<
  PointChartScaleDescriptors<R>
>;

export interface PointChartOptions<R extends Row> extends ChartOptions<R> {
  scales: PointChartScaleDescriptors<R>;
}

export type PointChartRow = {
  index: number;
  x: number;
  y: number;
  color: string;
  size: number;
};

export class PointChart<R extends Row> extends Chart<R, PointChartRow> {
  readonly scales: Deferred<PointChartScales<R>> = deferred();

  constructor(
    public readonly source: Table<R>,
    public readonly options: PointChartOptions<R>,
  ) {
    super(async () => {
      let { scales } = options;

      let xScale = await Scale.fromDomain(source, scales.x);
      let yScale = await Scale.fromDomain(source, scales.y);
      let colorScale = scales.color instanceof Color || scales.color == null
        ? scales.color
        : await Scale.fromDomain(source, scales.color);
      let sizeScale = typeof scales.size === "number" || scales.size == null
        ? scales.size
        : await Scale.fromDomain(source, scales.size);

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
        let x = xScale.map(scales.x.field(row, i, table), defaultXRange);
        let y = yScale.map(scales.y.field(row, i, table), defaultYRange);
        let color = defaultColorRange.length === 1
          ? defaultColorRange[0]
          : (colorScale as Scale<Value, Color>).map(
            (scales.color as ScaleDescriptor<R, Value, Color>).field(
              row,
              i,
              table,
            ),
            defaultColorRange,
          );
        let size = defaultSizeRange.length === 1
          ? defaultSizeRange[0]
          : (sizeScale as Scale<Value, number>).map(
            (scales.size as ScaleDescriptor<R, Value, number>).field(
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
