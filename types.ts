import type { Table } from "./table.ts";
import type { DataSource } from "./data_source.ts";

export type Value = string | boolean | number | Date | null;

export type Row = Record<string, Value>;

export type IntoTable<R extends Row> = Table<R> | R[];

export type IntoDataSource<P extends Row, R extends Row> =
  | DataSource<P, R>
  | ((params: P) => Promise<IntoTable<R>>);

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

export type Entities<
  D extends Record<string, DataSource>,
  V extends Record<string, (param: any) => Table>,
> = {
  [K in keyof D | keyof V]: () => Table<
    K extends keyof D ? D[K] extends DataSource<infer _, infer R> ? R
    : never
      : K extends keyof V ? ReturnType<V[K]> extends Table<infer R> ? R
      : never
      : never
  >;
};

export interface DataChangeEvent {
  entities: string[];
}

type ViewKey<V extends object, K extends keyof V> = K extends string
  ? V[K] extends () => Table ? K : never
  : never;

export type Views<V extends object> = {
  [K in ViewKey<V, keyof V>]: V[K] extends () => Table ? V[K] : never;
};
