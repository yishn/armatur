import type {
  CollectIterFn,
  FoldIterFn,
  IntoTable,
  IterFn,
  Row,
  TableJson,
  Value,
} from "./types.ts";
import {
  compareLexicographically,
  compareValues,
  jsonToRow,
  parseRow,
  rowToJson,
  stringifyRow,
  stringifyValue,
} from "./utils.ts";

export class Table<R extends Row = any> implements AsyncIterable<R> {
  readonly data: Promise<readonly Readonly<R>[]>;

  constructor(data: IntoTable<R>) {
    if (typeof data === "function") {
      data = data();
    }

    if (data instanceof Promise) {
      this.data = data.then((data) => new Table(data).data);
    } else if (data instanceof Table) {
      this.data = data.data;
    } else if (Array.isArray(data)) {
      this.data = Promise.resolve(data);
    } else {
      throw TypeError("Invalid data type");
    }
  }

  static empty(length: number): Table<{}> {
    return new Table([...Array(length)].map(() => ({})));
  }

  static chain<R extends Row>(...others: IntoTable<R>[]): Table<R> {
    return Table.empty(others.length).flatMap((_, i) => others[i]);
  }

  static fromJSON<R extends Row>(json: TableJson<R>): Table<R> {
    return new Table(json.data.map((row) => jsonToRow(row)));
  }

  async toJSON(): Promise<TableJson<R>> {
    return {
      data: (await this.data).map((row) => rowToJson(row)),
    };
  }

  async *[Symbol.asyncIterator]() {
    yield* await this.data;
  }

  get length(): Promise<number> {
    return this.data.then((data) => data.length);
  }

  async all(fn: IterFn<R, boolean>): Promise<boolean> {
    return (await this.data).every((row, index) => fn(row, index, this));
  }

  async any(fn: IterFn<R, boolean>): Promise<boolean> {
    return (await this.data).some((row, index) => fn(row, index, this));
  }

  async averageBy(fn: IterFn<R, number>): Promise<number | undefined> {
    let sum = await this.sumBy(fn);
    return sum === undefined ? undefined : sum / await this.length;
  }

  chain(other: IntoTable<R>): Table<R> {
    return Table.chain(this, other);
  }

  collect<S extends Row>(
    fn: CollectIterFn<R, S>,
  ): Table<S> {
    return new Table(
      this.fold(new Table<S>([]), async (acc, row, index, table) => {
        let transformedRow = await fn(acc, row, index, table);
        return transformedRow === undefined ? acc : acc.chain([transformedRow]);
      }),
    );
  }

  extend<S>(
    fn: IterFn<R, S | undefined | Promise<S | undefined>>,
  ): Table<Omit<R, keyof S> & S> {
    return this.map(async (row, index, table) => {
      let extension = await fn(row, index, table);
      if (extension === undefined) return undefined;

      return { ...row, ...extension };
    });
  }

  filter<S extends R = R>(fn: IterFn<R, boolean>): Table<S> {
    return new Table(async () =>
      (await this.data).filter((row, index): row is S => fn(row, index, this))
    );
  }

  async find(fn: IterFn<R, boolean>): Promise<R | undefined> {
    return (await this.data).find((row, index) => fn(row, index, this));
  }

  flatMap<S extends Row>(fn: IterFn<R, IntoTable<S>>): Table<S> {
    return new Table(async () =>
      (await this.data)
        .map((row, index) => new Table<S>(fn(row, index, this)))
        .reduce(
          (acc, table) =>
            acc.then(async (acc) => {
              acc.push(...await table.data);
              return acc;
            }),
          Promise.resolve([] as S[]),
        )
    );
  }

  async fold<T>(init: T, fn: FoldIterFn<R, T>): Promise<T> {
    return (await this.data).reduce(
      async (acc, row, index) => await fn(await acc, row, index, this),
      Promise.resolve(init),
    );
  }

  async first(): Promise<R | undefined> {
    return this.nth(0);
  }

  groupBy(fn: IterFn<R, Value>): Promise<Table<R>[]>;
  groupBy<S extends Row>(
    fn: IterFn<R, Value>,
    map: (table: Table<R>) => IntoTable<S>,
  ): Table<S>;
  groupBy<S extends Row>(
    fn: IterFn<R, Value>,
    map?: (table: Table<R>) => IntoTable<S>,
  ): Table<S> | Promise<Table<R>[]> {
    let tables = (async () => {
      let valueIndexMap = {} as Partial<Record<string, number>>;
      let result = [] as R[][];

      (await this.data).forEach((row, index) => {
        let key = stringifyValue(fn(row, index, this));

        if (valueIndexMap[key] == null) {
          valueIndexMap[key] = result.length;
          result.push([row]);
        } else {
          result[valueIndexMap[key]!].push(row);
        }
      });

      return result.map((data) => new Table(data));
    })();

    if (map == null) return tables;

    return new Table(async () =>
      Table.chain(
        ...(await tables).map((table) => new Table(map(table))),
      )
    );
  }

  inspect(fn: IterFn<R, unknown>): Table<R> {
    return new Table(async () => {
      await Promise.all(
        (await this.data).map((row, index) => fn(row, index, this)),
      );

      return this;
    });
  }

  async last(): Promise<R | undefined> {
    return this.nth(await this.length - 1);
  }

  map<S extends Row>(
    fn: IterFn<R, S | undefined | Promise<S | undefined>>,
  ): Table<S> {
    return new Table(async () =>
      (await Promise.all(
        (await this.data).map((row, index) => fn(row, index, this)),
      )).filter((row): row is S => row !== undefined)
    );
  }

  async maxBy(fn: IterFn<R, Value>): Promise<R | undefined> {
    return (await this.fold(
      undefined as readonly [R, number] | undefined,
      (acc, row, index, table) => {
        let value = fn(row, index, table);
        return acc === undefined ||
            compareValues(fn(acc[0], acc[1], this), value) < 0
          ? [row, index] as const
          : acc;
      },
    ))?.[0];
  }

  async minBy(fn: IterFn<R, Value>): Promise<R | undefined> {
    return (await this.fold(
      undefined as readonly [R, number] | undefined,
      (acc, row, index, table) => {
        let value = fn(row, index, table);
        return acc === undefined ||
            compareValues(fn(acc[0], acc[1], this), value) > 0
          ? [row, index] as const
          : acc;
      },
    ))?.[0];
  }

  async nth(n: number): Promise<R | undefined> {
    return (await this.data)[n];
  }

  omit<K extends keyof R>(...keys: K[]): Table<Omit<R, K>> {
    return this.map((row) => {
      let result = { ...row } as Partial<R>;

      for (let key of keys) {
        delete result[key];
      }

      return result as Omit<R, K>;
    });
  }

  pick<K extends keyof R>(
    ...keys: K[]
  ): Table<Pick<R, Extract<K, keyof R>>> {
    return this.map((row) => {
      let result = {} as Partial<R>;

      for (let key of keys) {
        result[key] = row[key];
      }

      return result as Pick<R, Extract<K, keyof R>>;
    });
  }

  async position(fn: IterFn<R, boolean>): Promise<number | undefined> {
    let result = (await this.data).findIndex((row, index) =>
      fn(row, index, this)
    );

    return result < 0 ? undefined : result;
  }

  reverse(): Table<R> {
    return new Table(async () => (await this.data).slice().reverse());
  }

  sortBy(fn: IterFn<R, Value | Value[]>): Table<R> {
    return new Table(async () =>
      (await this.data).slice()
        .map((row, index) =>
          [row, index, undefined] as [
            Readonly<R>,
            number,
            Value | Value[] | undefined,
          ]
        )
        .sort((entry, other) => {
          if (entry[2] === undefined) {
            entry[2] = fn(entry[0], entry[1], this);
          }
          if (other[2] === undefined) {
            other[2] = fn(other[0], other[1], this);
          }
          if (!Array.isArray(entry[2])) {
            entry[2] = [entry[2]];
          }
          if (!Array.isArray(other[2])) {
            other[2] = [other[2]];
          }

          return compareLexicographically(entry[2], other[2]);
        })
        .map(([row]) => row)
    );
  }

  skip(n: number): Table<R> {
    return new Table(async () => (await this.data).slice(n));
  }

  skipWhile(fn: IterFn<R, boolean>): Table<R> {
    return new Table(async () => {
      let index = await this.position((row, index, table) =>
        !fn(row, index, table)
      );
      if (index === undefined) return new Table([]);

      return this.skip(index);
    });
  }

  async sumBy(fn: IterFn<R, number>): Promise<number | undefined> {
    return this.fold(
      undefined as number | undefined,
      (acc, row, index, table) => {
        let value = fn(row, index, table);
        return acc === undefined ? value : acc + value;
      },
    );
  }

  take(n: number): Table<R> {
    return new Table(async () => (await this.data).slice(0, n));
  }

  takeWhile(fn: IterFn<R, boolean>): Table<R> {
    return new Table(async () => {
      let index = await this.position((row, index, table) =>
        !fn(row, index, table)
      );
      if (index === undefined) return this;

      return this.take(index);
    });
  }

  unique(): Table<R> {
    return new Table(async () =>
      [
        ...new Set(
          (await this.data).map((row) => stringifyRow(row, true)),
        ),
      ]
        .map((json) => parseRow(json))
    );
  }
}
