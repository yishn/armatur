import type { Row, Value } from "../types.ts";
import type {
  ChartOptions,
  ChartScales,
  DiscreteScaleDescriptor,
  ScaleDescriptor,
} from "./types.ts";
import { Deferred, deferred } from "../deps.ts";
import type { Table } from "../table.ts";
import { Chart } from "./chart.ts";
import { Color } from "./color.ts";
import { DiscreteScale, Scale } from "./scale.ts";
import { getDefaultColorRange, getDefaultXYRange } from "./range.ts";

export interface LineChartScaleDescriptors<R extends Row> {
  x: ScaleDescriptor<R, Value, number>;
  y: ScaleDescriptor<R, Value, number>;
  color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
}

export type LineChartScales<R extends Row> = ChartScales<
  LineChartScaleDescriptors<R>
>;

export interface LineChartOptions<R extends Row> extends ChartOptions<R> {
  drawPoints?: boolean;
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
      let { scales } = options;

      let xScale = await Scale.fromDomain(source, scales.x);
      let yScale = await Scale.fromDomain(source, scales.y);
      let colorScale = scales.color instanceof Color || scales.color == null
        ? scales.color
        : await DiscreteScale.fromDomain(source, scales.color);

      this.scales.resolve({
        x: xScale,
        y: yScale,
        color: colorScale,
      });

      let colorField = scales.color instanceof Color || scales.color == null
        ? () => 1
        : scales.color.field;

      let defaultXRange = getDefaultXYRange(xScale);
      let defaultYRange = getDefaultXYRange(yScale);
      let defaultColorRange = getDefaultColorRange(colorScale);

      let sourceIndexMap = new WeakMap<R, number>();

      return source
        .inspect((row, i) => sourceIndexMap.set(row, i))
        .sortBy((row) => {
          let i = sourceIndexMap.get(row)!;

          return [
            colorField(row, i, source),
            scales[options.keyAxis ?? "x"].field(row, i, source),
          ];
        })
        .map((row) => {
          let i = sourceIndexMap.get(row)!;
          let x = xScale.map(scales.x.field(row, i, source), defaultXRange);
          let y = yScale.map(scales.y.field(row, i, source), defaultYRange);
          let color = defaultColorRange.length === 1
            ? defaultColorRange[0]
            : (colorScale as Scale<Value, Color>).map(
              colorField(row, i, source),
              defaultColorRange,
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
