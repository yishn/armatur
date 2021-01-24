import { clamp, equidistantPoints } from "../utils.ts";
import { Color, rgba } from "./color.ts";
import type { Interpolatable, InterpolationFn, Rgba } from "./types.ts";

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
  lambda = clamp(lambda, 0, 1);

  if (typeof start === "number" && typeof end === "number") {
    return interpolation(lambda, start, end) as I;
  } else if (start instanceof Date && end instanceof Date) {
    return new Date(
      interpolate(lambda, start.getTime(), end.getTime(), interpolation)!,
    ) as I;
  } else if (start instanceof Color && end instanceof Color) {
    return rgba(
      ...start.toArray().map((start, i) =>
        interpolate(lambda, start, end.toArray()[i], interpolation)!
      ) as Rgba,
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
  if (n <= 1) return values[0];

  lambda = clamp(lambda, 0, 1);

  if (n === 2) {
    return interpolate(lambda, values[0], values[1], interpolation);
  }

  let positions = equidistantPoints(n);
  let i = Math.max(1, positions.findIndex((pos) => pos >= lambda));

  return interpolate(
    (lambda - positions[i - 1]) * (n - 1),
    values[i - 1],
    values[i],
    interpolation,
  );
}
