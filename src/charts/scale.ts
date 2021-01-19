import type { ContinuousScale, DiscreteScale, ScaleOptions } from "./types.ts";
import type { IterFn, Row, Value } from "../types.ts";

export class Scale<R extends Row, V extends Value, T> {
  includeZero?: boolean;
  range?: T[];

  static continuous<R extends Row, V extends Date | null, T>(
    field: IterFn<R, V>,
    options?: Omit<ScaleOptions<T>, "includeZero">,
  ): ContinuousScale<R, V, T>;
  static continuous<R extends Row, V extends number | null, T>(
    field: IterFn<R, V>,
    options?: ScaleOptions<T>,
  ): ContinuousScale<R, V, T>;
  static continuous<R extends Row, V extends number | Date | null, T>(
    field: IterFn<R, V>,
    options?: ScaleOptions<T>,
  ): ContinuousScale<R, V, T> {
    return new Scale("continuous", field, options) as ContinuousScale<R, V, T>;
  }

  static discrete<R extends Row, V extends Value, T>(
    field: IterFn<R, V>,
    options?: Omit<ScaleOptions<T>, "includeZero">,
  ): DiscreteScale<R, V, T> {
    return new Scale("discrete", field, options) as DiscreteScale<R, V, T>;
  }

  private constructor(
    public type: "continuous" | "discrete",
    public field: IterFn<R, V>,
    options: ScaleOptions<T> = {},
  ) {
    this.includeZero = options.includeZero;
    this.range = options.range;
  }
}
