import { Table } from "./table.ts";
import type { IntoDataSource, IntoTable, Row } from "./types.ts";

export class DataSource<P extends Row = any, R extends Row = any> {
  fn: (params: P) => Promise<IntoTable<R>>;

  constructor(data: IntoDataSource<P, R>) {
    if (typeof data === "function") {
      this.fn = data;
    } else if (data instanceof DataSource) {
      this.fn = data.fn;
    } else {
      throw new TypeError("Invalid data type");
    }
  }

  async call(parameters: P): Promise<Table<R>> {
    return new Table(await this.fn(parameters));
  }
}
