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
import {
  DiscreteScale,
  getDefaultColorRange,
  getDefaultXYRange,
  Scale,
} from "./scale.ts";

export interface LineChartProperties<R extends Row> {
  x: ScaleDescriptor<R, Value, number>;
  y: ScaleDescriptor<R, Value, number>;
  color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
}

export interface LineChartOptions<R extends Row> extends ChartOptions<R> {
  drawPoints?: boolean;
  keyAxis?: "x" | "y";
  properties: LineChartProperties<R>;
}

export type LineChartRow = {
  index: number;
  x: number;
  y: number;
  color: string;
};

export class LineChart<R extends Row> extends Chart<R, LineChartRow> {
  readonly scales: Deferred<
    ChartScales<LineChartProperties<R>>
  > = deferred();

  constructor(
    public readonly source: Table<R>,
    public readonly options: LineChartOptions<R>,
  ) {
    super(async () => {
      let { properties: props } = options;

      let xScale = await Scale.fromDomain(source, props.x);
      let yScale = await Scale.fromDomain(source, props.y);
      let colorScale = props.color instanceof Color || props.color == null
        ? props.color
        : await DiscreteScale.fromDomain(source, props.color);

      this.scales.resolve({
        x: xScale,
        y: yScale,
        color: colorScale,
      });

      let colorField = props.color instanceof Color || props.color == null
        ? () => 1
        : props.color.field;

      let defaultXRange = getDefaultXYRange(xScale);
      let defaultYRange = getDefaultXYRange(yScale);
      let defaultColorRange = getDefaultColorRange(colorScale);

      let sourceIndexMap = new WeakMap<R, number>();

      return source
        .inspect((row, i) => sourceIndexMap.set(row, i))
        .sortBy((row, i) => [
          colorField(row, i, source),
          props[options.keyAxis ?? "x"].field(row, i, source),
        ])
        .map((row, i, table) => {
          let x = xScale.map(props.x.field(row, i, table), defaultXRange);
          let y = yScale.map(props.y.field(row, i, table), defaultYRange);
          let color = defaultColorRange.length === 1
            ? defaultColorRange[0]
            : (colorScale as Scale<Value, Color>).map(
              colorField(row, i, table),
              defaultColorRange,
            );
          if (x == null || y == null || color == null) return;

          return {
            index: sourceIndexMap.get(row)!,
            x,
            y,
            color: color.toString(),
          };
        });
    });
  }
}
