import { clamp } from "../utils.ts";
import { Rgba, rgba } from "./color.ts";
import type { Interpolatable, InterpolationFn } from "./types.ts";

export const linearInterpolation = (
  lambda: number,
  start: number,
  end: number,
) => start + lambda * (end - start);

export function interpolate<I extends Interpolatable>(
  lambda: number,
  start: I,
  end: I,
  interpolation: InterpolationFn = linearInterpolation,
): I | undefined {
  if (typeof start === "number" && typeof end === "number") {
    return interpolation(lambda, start, end) as I;
  } else if (start instanceof Date && end instanceof Date) {
    return new Date(
      interpolate(lambda, start.getTime(), end.getTime(), interpolation)!,
    ) as I;
  } else if (start instanceof Rgba && end instanceof Rgba) {
    return rgba(
      ...start.toArray().map((start, i) =>
        interpolate(lambda, start, end.toArray()[i], interpolation)!
      ) as [number, number, number, number],
    ) as I;
  }

  return undefined;
}

export function piecewiseInterpolation<I extends Interpolatable>(
  lambda: number,
  values: I[],
  interpolation: InterpolationFn = linearInterpolation,
): I | undefined {
  let n = values.length;
  lambda = clamp(lambda, 0, 1);

  if (n <= 1) return values[0];
  if (n === 2) {
    return interpolate(lambda, values[0], values[1], interpolation);
  }

  let positions = values.map((_, i) => i / (n - 1));
  let i = Math.max(1, positions.findIndex((pos) => pos >= lambda));

  return interpolate(
    (lambda - positions[i - 1]) * (n - 1),
    values[i - 1],
    values[i],
    interpolation,
  );
}
