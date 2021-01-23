import type { Row, Tagged, Value } from "../types.ts";
import type {
  ChartOptions,
  DiscreteScaleDescriptor,
  ScaleDescriptor,
} from "./types.ts";
import type { Table } from "../table.ts";
import { Chart } from "./chart.ts";
import { Color, getDiscreteColor, rgba } from "./color.ts";
import { DiscreteScale, Scale } from "./scale.ts";
import { equisizedSectionMiddlepoints, stringifyRow } from "../utils.ts";

export interface LineChartOptions<R extends Row> extends ChartOptions<R> {
  drawPoints?: boolean;
  keyAxis?: "x" | "y";
  properties: {
    x: ScaleDescriptor<R, Value, number>;
    y: ScaleDescriptor<R, Value, number>;
    color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
  };
}

export type LineChartRow<R extends Row> = {
  x: number;
  y: number;
  color: string;
  data: string & Tagged<R>;
};

export class LineChart<R extends Row> extends Chart<R, LineChartRow<R>> {
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
        : await DiscreteScale.fromDomain(
          source,
          props.color,
        );
      let colorField = colorScale instanceof Color
        ? () => 1 as Value
        : (props.color as DiscreteScaleDescriptor<R, Value, Color>).field;

      let defaultXRange = xScale instanceof DiscreteScale
        ? equisizedSectionMiddlepoints(xScale.domainValues.length)
        : [0, 1];
      let defaultYRange = yScale instanceof DiscreteScale
        ? equisizedSectionMiddlepoints(yScale.domainValues.length + 1)
        : [0, 1];
      let defaultColorRange = colorScale instanceof Color
        ? []
        : colorScale.domainValues.map((value) =>
          props.color instanceof Color || props.color == null
            ? (props.color as Color | undefined) ?? rgba(0, 0, 0)
            : getDiscreteColor(value)
        );

      return source
        .sortBy((row, i) => [
          colorField(row, i, source),
          props[options.keyAxis ?? "x"].field(row, i, source),
        ])
        .map((row, i, table) => {
          let x = xScale.map(props.x.field(row, i, table), defaultXRange);
          let y = yScale.map(props.y.field(row, i, table), defaultYRange);
          let color = colorScale instanceof Color ? colorScale : colorScale.map(
            colorField(row, i, table),
            defaultColorRange,
          );
          if (x == null || y == null || color == null) return;

          return {
            x,
            y,
            color: color.toString(),
            data: stringifyRow(row),
          };
        });
    });
  }
}
