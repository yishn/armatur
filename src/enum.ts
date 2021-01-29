declare const tag: unique symbol;

export type Enum<T extends object> =
  & { [tag]?: T }
  & {
    [K in keyof T]:
      & { [L in Exclude<keyof T, K>]?: never }
      & { [L in K]: T[K] };
  }[keyof T];

export const Enum = {
  match: <T extends object, U>(
    e: Enum<T>,
    matcher:
      | { [K in keyof T]: (data: T[K]) => U }
      | { [K in keyof T]?: (data: T[K]) => U } & { _: () => U },
  ): U => {
    let key = (Object.keys(e) as (keyof T)[])
      .find((key) => e[key] !== undefined);

    if (key !== undefined && matcher[key] !== undefined) {
      return matcher[key]!(e[key]!);
    } else if ("_" in matcher) {
      return matcher["_"]();
    }

    throw new Error("Non-exhaustive match");
  },
};
