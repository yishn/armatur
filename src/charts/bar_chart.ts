import type { Row, Value } from "../types.ts";
import type {
  ChartScales,
  ContinuousScaleDescriptor,
  DiscreteScaleDescriptor,
  ScaleDescriptor,
} from "./types.ts";
import { Color } from "./color.ts";
import { Chart, getScalesFromDescriptors } from "./chart.ts";
import { Deferred, deferred } from "../../deps.ts";
import { Table } from "../table.ts";
import { DiscreteScale, Scale } from "./scale.ts";
import { getDefaultRanges } from "./range.ts";
import { equalValues, equisizedSectionMiddlepoints } from "../utils.ts";

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
  width: number;
  height: number;
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
      } & BarChartScaleDescriptors<R>;
    } | {
      stacked: true;
      keyAxis?: "x";
      scales: {
        x: DiscreteScaleDescriptor<R, Value, number>;
        y: ContinuousScaleDescriptor<R, number, number>;
      } & BarChartScaleDescriptors<R>;
    } | {
      stacked?: false;
      keyAxis: "y";
      scales: {
        y: DiscreteScaleDescriptor<R, Value, number>;
      } & BarChartScaleDescriptors<R>;
    } | {
      stacked: true;
      keyAxis: "y";
      scales: {
        x: ContinuousScaleDescriptor<R, number, number>;
        y: DiscreteScaleDescriptor<R, Value, number>;
      } & BarChartScaleDescriptors<R>;
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

      let defaultRanges = getDefaultRanges(scales);

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

      let result = source
        .map((row, i, table) => {
          let [xValue, yValue] = [
            scaleDescriptors.x.field(row, i, table),
            scaleDescriptors.y.field(row, i, table),
          ] as const;
          let x = scales.x.map(xValue, defaultRanges.x) ?? null;
          let y = scales.y.map(yValue, defaultRanges.y) ?? null;
          let [key, value] = options.keyAxis === "y" ? [y, x] : [x, y];
          let keyFieldValue = options.keyAxis === "y" ? yValue : xValue;

          let color: string | null = (
            colorGroupsCount <= 1
              ? defaultRanges.color[0]
              : (scales.color as Scale<Value, Color>).map(
                colorFieldFn(row, i, table),
                defaultRanges.color,
              )
          )?.toString() ?? null;

          return { key, value, keyFieldValue, color };
        })
        .map(async ({ key, value, keyFieldValue, color }, i, table) => {
          if (key == null || value == null || color == null) return;

          let row = (await source.nth(i))!;
          let barBaseSize = 1 / keysCount;
          let stackedValue = 0;

          if (!options.stacked) {
            barBaseSize /= colorGroupsCount;
            let min = key - 1 / keysCount / 2;
            let max = key + 1 / keysCount / 2;

            key = colorIndexScale.map(
              colorFieldFn(row, i, source),
              equisizedSectionMiddlepoints(colorGroupsCount, min, max),
            ) ?? null;
          } else {
            stackedValue = (
              await table
                .take(i)
                .filter((prevRow) =>
                  prevRow.value != null &&
                  equalValues(prevRow.keyFieldValue, keyFieldValue)
                )
                .maxBy((prevRow) => prevRow.value)
            )?.value ?? 0;
          }

          if (key == null || value == null) return;

          let [x, y] = options.keyAxis === "y"
            ? [stackedValue + value, key - barBaseSize / 2]
            : [key - barBaseSize / 2, stackedValue + value];
          let [width, height] = options.keyAxis === "y"
            ? [value, barBaseSize]
            : [barBaseSize, value];

          return {
            index: i,
            x,
            y,
            width,
            height,
            color,
          };
        });

      if (options.stacked) {
        // Normalize values if stacked

        const valueAxis = options.keyAxis === "y" ? "x" : "y";

        let maxValue = (await result.maxBy((row) =>
          row[valueAxis]
        ))?.[valueAxis] ?? 1;

        result = result.extend((row) => ({
          x: valueAxis === "x" ? row.x / maxValue : row.x,
          y: valueAxis === "y" ? row.y / maxValue : row.y,
          width: valueAxis === "x" ? row.width / maxValue : row.width,
          height: valueAxis === "y" ? row.height / maxValue : row.height,
        }));
      }

      return result;
    });

    this.options = options;
  }
}
