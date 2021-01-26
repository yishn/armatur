import type { Value } from "../types.ts";
import { equidistantPoints, equisizedSectionMiddlepoints } from "../utils.ts";
import { Color, getDiscreteColor, hsva } from "./color.ts";
import { ContinuousScale, DiscreteScale, Scale } from "./scale.ts";
import { ChartScaleRanges, ChartScales } from "./types.ts";

export function getDefaultXRange(scale: Scale<Value, number>): number[] {
  return scale instanceof DiscreteScale
    ? equisizedSectionMiddlepoints(scale.domainValues.length)
    : [0, 1];
}

export function getDefaultYRange(scale: Scale<Value, number>): number[] {
  return scale instanceof DiscreteScale
    ? equisizedSectionMiddlepoints(scale.domainValues.length)
    : [1, 0];
}

export function getDefaultColorRange(
  scale: Color | Scale<Value, Color> | undefined,
): Color[] {
  return scale instanceof Color
    ? [scale]
    : scale instanceof DiscreteScale
    ? scale.domainValues.map((value) => getDiscreteColor(value))
    : scale instanceof ContinuousScale
    ? [
      hsva(2 / 3, 3 / 4, 1), // blue
      hsva(300 / 360, 3 / 4, 1), // violet
      hsva(0, 3 / 4, 1), // red
    ]
    : [
      hsva(2 / 3, 3 / 4, 1), // blue
    ];
}

export function getDefaultSizeRange(
  scale: number | Scale<Value, number> | undefined,
): number[] {
  return typeof scale === "number"
    ? [scale]
    : scale instanceof DiscreteScale
    ? equidistantPoints(scale.domainValues.length, 8, 80)
    : scale instanceof ContinuousScale
    ? [8, 80]
    : [8];
}

export function getDefaultRanges(scales: ChartScales): ChartScaleRanges {
  return {
    x: getDefaultXRange(scales.x),
    y: getDefaultYRange(scales.y),
    color: getDefaultColorRange(scales.color),
    size: getDefaultSizeRange(scales.size),
  };
}
