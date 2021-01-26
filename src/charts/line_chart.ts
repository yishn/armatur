import type { Row, Value } from "../types.ts";
import type {
  ChartScales,
  DiscreteScaleDescriptor,
  ScaleDescriptor,
} from "./types.ts";
import { Deferred, deferred } from "../deps.ts";
import type { Table } from "../table.ts";
import { Chart, getScalesFromDescriptors } from "./chart.ts";
import { Color } from "./color.ts";
import { Scale } from "./scale.ts";
import { getDefaultRanges } from "./range.ts";

export interface LineChartScaleDescriptors<R extends Row> {
  x: ScaleDescriptor<R, Value, number>;
  y: ScaleDescriptor<R, Value, number>;
  color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
}

export type LineChartScales<R extends Row> = ChartScales<
  LineChartScaleDescriptors<R>
>;

export interface LineChartOptions<R extends Row> {
  keyAxis?: "x" | "y";
  scales: LineChartScaleDescriptors<R>;
}

export type LineChartRow = {
  index: number;
  x: number;
  y: number;
  color: string;
};

export class LineChart<R extends Row> extends Chart<R, LineChartRow> {
  readonly scales: Deferred<LineChartScales<R>> = deferred();

  constructor(
    public readonly source: Table<R>,
    public readonly options: LineChartOptions<R>,
  ) {
    super(async () => {
      let { scales: scaleDescriptors } = options;
      let scales = await getScalesFromDescriptors(source, scaleDescriptors);
      this.scales.resolve(scales);

      let colorField = scaleDescriptors.color instanceof Color ||
          scaleDescriptors.color == null
        ? () => 1
        : scaleDescriptors.color.field;

      let defaultRanges = getDefaultRanges(scales);
      let sourceIndexMap = new WeakMap<R, number>();

      return source
        .inspect((row, i) => sourceIndexMap.set(row, i))
        .sortBy((row) => {
          let i = sourceIndexMap.get(row)!;

          return [
            colorField(row, i, source),
            scaleDescriptors[options.keyAxis ?? "x"].field(row, i, source),
          ];
        })
        .map((row) => {
          let i = sourceIndexMap.get(row)!;
          let x = scales.x.map(
            scaleDescriptors.x.field(row, i, source),
            defaultRanges.x,
          );
          let y = scales.y.map(
            scaleDescriptors.y.field(row, i, source),
            defaultRanges.y,
          );
          let color = defaultRanges.color.length <= 1
            ? defaultRanges.color[0]
            : (scales.color as Scale<Value, Color>).map(
              colorField(row, i, source),
              defaultRanges.color,
            );
          if (x == null || y == null || color == null) return;

          return {
            index: i,
            x,
            y,
            color: color.toString(),
          };
        });
    });
  }
}
