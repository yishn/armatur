import { Table } from "./table.ts";
import type {
  FoldIterFn,
  IntoTablePromise,
  IterFn,
  Row,
  Value,
} from "./types.ts";

export class TablePromise<R extends Row = Row> {
  promise: Promise<Table<R>>;

  constructor(data: IntoTablePromise<R>) {
    if (data instanceof TablePromise) {
      this.promise = data.promise;
    } else if (data instanceof Promise) {
      this.promise = data.then((intoTable) => new Table(intoTable));
    } else if (typeof data === "function") {
      this.promise = data().then((intoTable) => new Table(intoTable));
    } else {
      this.promise = Promise.resolve(new Table(data));
    }
  }

  private async _adaptProperty<K extends keyof Table<R>>(
    name: K,
  ): Promise<Table<R>[K]> {
    let table = await this.promise;
    return table[name];
  }

  private async _adaptScalarMethod<K extends keyof Table<R>>(
    name: K,
    params: Table<R>[K] extends (...args: any) => any ? Parameters<Table<R>[K]>
      : never,
  ): Promise<
    Table<R>[K] extends (...args: any) => any ? ReturnType<Table<R>[K]> : never
  > {
    let table = await this.promise;
    return (table[name] as any)(...params);
  }

  private _adaptTableMethod<K extends keyof Table<R>>(
    name: K,
    params: Table<R>[K] extends (...args: any) => any
      ? (Promise<Parameters<Table<R>[K]>> | Parameters<Table<R>[K]>)
      : never,
  ): Table<R>[K] extends Table<infer S> ? TablePromise<S> : never {
    return new TablePromise(
      Promise.all([this.promise, params])
        .then(([table, params]) => (table[name] as any)(...params)),
    ) as any;
  }

  get data(): Promise<readonly Readonly<R>[]> {
    return this._adaptProperty("data");
  }

  get length(): Promise<number> {
    return this._adaptProperty("length");
  }

  async all(fn: IterFn<R, boolean>): Promise<boolean> {
    return this._adaptScalarMethod("all", [fn]);
  }

  async any(fn: IterFn<R, boolean>): Promise<boolean> {
    return this._adaptScalarMethod("any", [fn]);
  }

  async averageBy(fn: IterFn<R, number>): Promise<number | undefined> {
    return this._adaptScalarMethod("averageBy", [fn]);
  }

  chain(other: IntoTablePromise<R>): TablePromise<R> {
    return this._adaptTableMethod(
      "chain",
      new TablePromise(other).promise.then((x) => [x]),
    );
  }

  extend<S>(fn: IterFn<R, S>): TablePromise<Omit<R, keyof S> & S> {
    return this._adaptTableMethod("extend", [fn]);
  }

  filter(fn: IterFn<R, boolean>): TablePromise<R> {
    return this._adaptTableMethod("filter", [fn]);
  }

  async find(fn: IterFn<R, boolean>): Promise<R | undefined> {
    return this._adaptScalarMethod("find", [fn]);
  }

  flatMap<S extends Row>(fn: IterFn<R, IntoTablePromise<S>>): TablePromise<S> {
    let promisedFn = this.promise.then(async (table) => {
      let tables = await Promise.all(
        table.data.map((row, i) => new TablePromise(fn(row, i, table)).promise),
      );

      return (_: R, index: number) => tables[index];
    });

    return this._adaptTableMethod("flatMap", promisedFn.then((fn) => [fn]));
  }

  async fold<T>(init: T, fn: FoldIterFn<R, T>): Promise<T> {
    return this._adaptScalarMethod(
      "fold",
      [init, fn as FoldIterFn<R, unknown>],
    ) as Promise<T>;
  }

  async first(): Promise<R | undefined> {
    return this._adaptScalarMethod("first", []);
  }

  async groupBy(fn: IterFn<R, Value>): Promise<Table<R>[]> {
    return this._adaptScalarMethod("groupBy", [fn]);
  }

  async last(): Promise<R | undefined> {
    return this._adaptScalarMethod("last", []);
  }

  map<S extends Row>(fn: IterFn<R, S | undefined>): TablePromise<S> {
    return this._adaptTableMethod("map", [fn]);
  }

  async maxBy(fn: IterFn<R, Value>): Promise<R | undefined> {
    return this._adaptScalarMethod("maxBy", [fn]);
  }

  async minBy(fn: IterFn<R, Value>): Promise<R | undefined> {
    return this._adaptScalarMethod("minBy", [fn]);
  }

  async nth(n: number): Promise<R | undefined> {
    return this._adaptScalarMethod("nth", [n]);
  }

  omit<K extends string>(...keys: K[]): TablePromise<Omit<R, K>> {
    return this._adaptTableMethod("omit", keys);
  }

  pick<K extends string>(
    ...keys: K[]
  ): TablePromise<Pick<R, Extract<K, keyof R>>> {
    return this._adaptTableMethod("pick", keys);
  }

  async position(fn: IterFn<R, boolean>): Promise<number | undefined> {
    return this._adaptScalarMethod("position", [fn]);
  }

  sortBy(fn: IterFn<R, Value>): TablePromise<R> {
    return this._adaptTableMethod("sortBy", [fn]);
  }

  skip(n: number): TablePromise<R> {
    return this._adaptTableMethod("skip", [n]);
  }

  skipWhile(fn: IterFn<R, boolean>): TablePromise<R> {
    return this._adaptTableMethod("skipWhile", [fn]);
  }

  async sumBy(fn: IterFn<R, number>): Promise<number | undefined> {
    return this._adaptScalarMethod("sumBy", [fn]);
  }

  take(n: number): TablePromise<R> {
    return this._adaptTableMethod("take", [n]);
  }

  takeWhile(fn: IterFn<R, boolean>): TablePromise<R> {
    return this._adaptTableMethod("takeWhile", [fn]);
  }
}
