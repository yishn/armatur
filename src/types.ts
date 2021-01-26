import type { Table } from "./table.ts";

declare const tag: unique symbol;

export type Tagged<T> = { [tag]?: T };

export type Value = string | boolean | number | Date | null;

export type ContinuousValue = Date | number;

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

export interface TableJson<R extends Row> {
  data: RowJson<R>[];
}

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
) => T | Promise<T>;

export type CollectIterFn<R extends Row, S extends Row> = (
  acc: Table<S>,
  row: Readonly<R>,
  index: number,
  table: Table<R>,
) => S | undefined | Promise<S | undefined>;
