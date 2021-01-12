import { Table } from "./table.ts";
import type {
  DataSourceOptions,
  IntoDataSource,
  IntoTable,
  Row,
} from "./types.ts";
import { rowToJson } from "./utils.ts";

export class DataSource<P extends Row = any, R extends Row = any> {
  private readonly fn: (params: P) => IntoTable<R>;
  cache: Map<string, Table<R>> = new Map();
  options: DataSourceOptions;

  constructor(
    data: IntoDataSource<P, R>,
    options: Partial<DataSourceOptions> = {},
  ) {
    this.options = {
      cacheTimeout: 0,
      ...options,
    };

    if (typeof data === "function") {
      this.fn = data;
    } else if (data instanceof DataSource) {
      this.fn = data.fn;
    } else {
      throw new TypeError("Invalid data type");
    }
  }

  retrieve(parameters: P): Table<R> {
    let key = JSON.stringify(rowToJson(parameters));
    if (this.cache.has(key)) return this.cache.get(key)!;

    let result = new Table(this.fn(parameters));

    if (this.options.cacheTimeout > 0) {
      this.cache.set(key, result);

      if (this.options.cacheTimeout < Infinity) {
        setTimeout(
          () => this.clearCache(parameters),
          this.options.cacheTimeout,
        );
      }
    }

    return result;
  }

  clearCache(parameters: P): void {
    let key = JSON.stringify(rowToJson(parameters));
    this.cache.delete(key);
  }
}
