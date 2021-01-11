import { DataSource } from "./data_source.ts";
import { Table } from "./table.ts";
import { Row, Views } from "./types.ts";

export function defineViews<V extends object>(views: V): Views<V> {
  return views as Views<V>;
}

export function defineDataSource<P extends Row, R extends Row>(
  dataSource: DataSource<P, R>,
  params: P,
): Table<R> {
  return new Table([]);
}

defineViews({
  dataSource() {
    return defineDataSource(
      new DataSource(async (params: {}) =>
        new Table([{
          b: "sdfdsf",
        }])
      ),
      {},
    );
  },

  view1() {
    return this.dataSource();
  },

  view2() {
    return this.view1().extend((row) => ({ a: row.b.length }));
  },
});
