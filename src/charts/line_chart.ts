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
import { Color, getDiscreteColor, rgba } from "./color.ts";
import { DiscreteScale, Scale } from "./scale.ts";
import { equisizedSectionMiddlepoints } from "../utils.ts";

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
        ? props.color ?? rgba(0, 0, 0)
        : await DiscreteScale.fromDomain(source, props.color);

      this.scales.resolve({
        x: xScale,
        y: yScale,
        color: colorScale,
      });

      let colorField = props.color instanceof Color || props.color == null
        ? () => 1
        : props.color.field;

      let defaultXRange = xScale instanceof DiscreteScale
        ? equisizedSectionMiddlepoints(xScale.domainValues.length)
        : [0, 1];
      let defaultYRange = yScale instanceof DiscreteScale
        ? equisizedSectionMiddlepoints(yScale.domainValues.length)
        : [0, 1];
      let defaultColorRange = colorScale instanceof Color
        ? []
        : colorScale.domainValues.map((value) =>
          props.color instanceof Color || props.color == null
            ? (props.color as Color | undefined) ?? rgba(0, 0, 0)
            : getDiscreteColor(value)
        );

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
          let color = colorScale instanceof Color
            ? colorScale
            : colorScale.map(colorField(row, i, table), defaultColorRange);
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
