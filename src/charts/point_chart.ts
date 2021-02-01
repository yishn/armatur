import type { Row, Value } from "../types.ts";
import type { ChartScales, ScaleDescriptor } from "./types.ts";
import type { Table } from "../table.ts";
import { Deferred, deferred } from "../../deps.ts";
import { Color } from "./color.ts";
import { Chart, getScalesFromDescriptors } from "./chart.ts";
import { Scale } from "./scale.ts";
import { getDefaultRanges } from "./range.ts";

export interface PointChartScaleDescriptors<R extends Row> {
  x: ScaleDescriptor<R, Value, number>;
  y: ScaleDescriptor<R, Value, number>;
  color?: Color | ScaleDescriptor<R, Value, Color>;
  size?: number | ScaleDescriptor<R, Value, number>;
}

export type PointChartScales<R extends Row> = ChartScales<
  PointChartScaleDescriptors<R>
>;

export interface PointChartOptions<R extends Row> {
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
      let { scales: scaleDescriptors } = options;
      let scales = await getScalesFromDescriptors(source, scaleDescriptors);
      this.scales.resolve(scales);

      let defaultRanges = getDefaultRanges(scales);

      return source.map((row, i, table) => {
        let x = scales.x.map(
          scaleDescriptors.x.field(row, i, table),
          defaultRanges.x,
        );
        let y = scales.y.map(
          scaleDescriptors.y.field(row, i, table),
          defaultRanges.y,
        );
        let color = defaultRanges.color.length <= 1
          ? defaultRanges.color[0]
          : (scales.color as Scale<Value, Color>).map(
            (scaleDescriptors.color as ScaleDescriptor<R, Value, Color>).field(
              row,
              i,
              table,
            ),
            defaultRanges.color,
          );
        let size = defaultRanges.size.length <= 1
          ? defaultRanges.size[0]
          : (scales.size as Scale<Value, number>).map(
            (scaleDescriptors.size as ScaleDescriptor<R, Value, number>).field(
              row,
              i,
              table,
            ),
            defaultRanges.size,
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
