import type { Row, Value } from "../types.ts";
import type { DiscreteScaleDescriptor, LineChartOptions } from "./types.ts";
import { Table } from "../table.ts";
import { Color, getDiscreteColor, rgba } from "./color.ts";
import { DiscreteScale, Scale } from "./scale.ts";
import { equidistantPoints } from "../utils.ts";

export class LineChart<R extends Row> extends Table<{
  x: number;
  y: number;
  color: string;
}> {
  constructor(table: Table<R>, public options: LineChartOptions<R>) {
    super(async () => {
      let { properties: props } = options;

      let xScale = await Scale.fromDomain(table, props.x);
      let yScale = await Scale.fromDomain(table, props.y);
      let colorScale = props.color instanceof Color || props.color == null
        ? props.color ?? rgba(0, 0, 0)
        : await DiscreteScale.fromDomain(
          table,
          props.color,
        );
      let colorField = colorScale instanceof Color
        ? () => 1 as Value
        : (props.color as DiscreteScaleDescriptor<R, Value, Color>).field;

      let defaultXRange = xScale instanceof DiscreteScale
        ? equidistantPoints(xScale.domainValues.length + 1)
        : [0, 1];
      let defaultYRange = yScale instanceof DiscreteScale
        ? equidistantPoints(yScale.domainValues.length + 1)
        : [0, 1];
      let defaultColorRange = colorScale instanceof Color
        ? []
        : colorScale.domainValues.map((value) =>
          props.color instanceof Color || props.color == null
            ? (props.color as Color | undefined) ?? rgba(0, 0, 0)
            : getDiscreteColor(value)
        );

      return table
        .sortBy((row, i) => [
          colorField(row, i, table),
          props[options.keyAxis ?? "x"].field(row, i, table),
        ])
        .map((row, i, table) => {
          let x = xScale.map(props.x.field(row, i, table), defaultXRange);
          let y = yScale.map(props.y.field(row, i, table), defaultYRange);
          let color = colorScale instanceof Color ? colorScale : colorScale.map(
            colorField(row, i, table),
            defaultColorRange,
          );
          if (x == null || y == null || color == null) return;

          return { x, y, color: color.toString() };
        });
    });
  }
}
