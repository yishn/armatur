import type { Row, Value } from "../types.ts";
import type {
  ChartScales,
  ContinuousScaleDescriptor,
  DiscreteScaleDescriptor,
  ScaleDescriptor,
} from "./types.ts";
import { Color } from "./color.ts";
import { Chart, getScalesFromDescriptors } from "./chart.ts";
import { Deferred, deferred } from "../deps.ts";
import { Table } from "../table.ts";
import { DiscreteScale, Scale } from "./scale.ts";
import { getDefaultColorRange, getDefaultXYRange } from "./range.ts";
import { equisizedSectionMiddlepoints } from "../utils.ts";

export interface BarChartScaleDescriptors<R extends Row> {
  x: ScaleDescriptor<R, Value, number>;
  y: ScaleDescriptor<R, Value, number>;
  color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
}

export type BarChartScales<R extends Row> = ChartScales<
  BarChartScaleDescriptors<R>
>;

export interface BarChartOptions<R extends Row> {
  stacked?: boolean;
  keyAxis?: "x" | "y";
  scales: BarChartScaleDescriptors<R>;
}

export type BarChartRow = {
  index: number;
  x: number;
  y: number;
  color: string;
};

export class BarChart<R extends Row> extends Chart<R, BarChartRow> {
  readonly scales: Deferred<BarChartScales<R>> = deferred();
  readonly options: BarChartOptions<R>;

  constructor(
    public readonly source: Table<R>,
    options: {
      stacked?: false;
      keyAxis?: "x";
      scales: {
        x: DiscreteScaleDescriptor<R, Value, number>;
        y: ScaleDescriptor<R, Value, number>;
        color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
      };
    } | {
      stacked: true;
      keyAxis?: "x";
      scales: {
        x: DiscreteScaleDescriptor<R, Value, number>;
        y: ContinuousScaleDescriptor<R, number, number>;
        color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
      };
    } | {
      stacked?: false;
      keyAxis: "y";
      scales: {
        x: ScaleDescriptor<R, Value, number>;
        y: DiscreteScaleDescriptor<R, Value, number>;
        color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
      };
    } | {
      stacked: true;
      keyAxis: "y";
      scales: {
        x: ContinuousScaleDescriptor<R, number, number>;
        y: DiscreteScaleDescriptor<R, Value, number>;
        color?: Color | DiscreteScaleDescriptor<R, Value, Color>;
      };
    },
  ) {
    super(async () => {
      let { scales: scaleDescriptors } = options as BarChartOptions<R>;
      let scales = await getScalesFromDescriptors(source, scaleDescriptors);
      this.scales.resolve(scales);

      let keyScale = options.keyAxis === "y" ? scales.y : scales.x;

      if (!(keyScale instanceof DiscreteScale)) {
        throw new TypeError("Scale defined at keyAxis must be a DiscreteScale");
      }

      let defaultXRange = getDefaultXYRange(scales.x);
      let defaultYRange = getDefaultXYRange(scales.y);
      let defaultColorRange = getDefaultColorRange(scales.color);

      let colorFieldFn = scaleDescriptors.color instanceof Color ||
          scaleDescriptors.color == null
        ? () => null
        : scaleDescriptors.color.field;
      let colorIndexScale = new DiscreteScale<Value, number>(
        scales.color instanceof DiscreteScale
          ? scales.color.domainValues
          : [null],
      );
      let colorGroupsCount = colorIndexScale.domainValues.length;
      let keysCount = keyScale.domainValues.length;

      return source.map((row, i, table) => {
        let x = scales.x.map(
          scaleDescriptors.x.field(row, i, table),
          defaultXRange,
        );
        let y = scales.y.map(
          scaleDescriptors.y.field(row, i, table),
          defaultYRange,
        );
        let key = options.keyAxis === "y" ? y : x;
        let color = colorGroupsCount <= 1
          ? defaultColorRange[0]
          : (scales.color as Scale<Value, Color>).map(
            colorFieldFn(row, i, table),
            defaultColorRange,
          );
        if (key == null || color == null) return;

        if (!options.stacked) {
          let min = key - 1 / keysCount / 2;
          let max = key + 1 / keysCount / 2;

          key = colorIndexScale.map(
            colorFieldFn(row, i, table),
            equisizedSectionMiddlepoints(colorGroupsCount, min, max),
          );

          if (options.keyAxis === "y") y = key;
          else x = key;
        }

        if (x == null || y == null) return;

        return {
          index: i,
          x,
          y,
          color: color.toString(),
        };
      });
    });

    this.options = options;
  }
}
