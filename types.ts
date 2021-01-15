import type { Table } from "./table.ts";

export type Value = string | boolean | number | Date | null;

export type ValueJson<V extends Value> = V extends Date ? {
  type: "date";
  value: string;
}
  : V;

export type Row = Record<string, Value>;

export type RowJson<R extends Row> = {
  [K in keyof R]: ValueJson<R[K]>;
};

export type IntoTable<R extends Row> =
  | Table<R>
  | readonly R[]
  | Promise<Table<R> | readonly R[]>
  | (() => Promise<Table<R> | readonly R[]>);

export type IterFn<R extends Row, T> = (
  row: Readonly<R>,
  index: number,
  table: Table<R>,
) => T;

export type FoldIterFn<R extends Row, T> = (
  acc: T,
  row: Readonly<R>,
  index: number,
  table: Table<R>,
) => T;

export type Views<V extends object> = {
  [K in keyof V]: () => V[K] extends () => Table<infer R> ? Table<R>
    : never;
};
