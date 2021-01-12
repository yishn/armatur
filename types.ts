import type { Table } from "./table.ts";
import type { DataSource } from "./data_source.ts";

export type Value = string | boolean | number | Date | null;

export type Row = Record<string, Value>;

export type IntoTable<R extends Row> =
  | Table<R>
  | readonly R[]
  | Promise<Table<R> | readonly R[]>
  | (() => Promise<Table<R> | readonly R[]>);

export type IntoDataSource<P extends Row, R extends Row> =
  | DataSource<P, R>
  | ((params: P) => IntoTable<R>);

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

export interface DataSourceConfig<D extends DataSource> {
  dataSource: D;
  params: D extends DataSource<infer P, infer _> ? P : never;
}

export type DataSourcesConfig<D extends Record<string, DataSource>> = {
  [K in keyof D]: DataSourceConfig<D[K]>;
};
