import type { FoldIterFn, IntoTable, IterFn, Row, Value } from "./types.ts";
import { addValues, compareLexicographically, compareValues, jsonToRow, rowToJson } from "./utils.ts";

export class Table<R extends Row = any> {
  readonly data: Promise<readonly Readonly<R>[]>;

  constructor(data: IntoTable<R>) {
    if (data instanceof Table) {
      this.data = data.data;
    } else if (data instanceof Promise) {
      this.data = data.then((data) => data instanceof Table ? data.data : data);
    } else if (typeof data === "function") {
      this.data = data().then((data) =>
        data instanceof Table ? data.data : data
      );
    } else if (Array.isArray(data)) {
      this.data = Promise.resolve(data);
    } else {
      throw TypeError("Invalid data type");
    }
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
    return new Table([{}, {}])
      .flatMap((_, index) => index === 0 ? this : other);
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

  filter(fn: IterFn<R, boolean>): Table<R> {
    return new Table(async () =>
      (await this.data).filter((row, index) => fn(row, index, this))
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
      (acc, row, index) => fn(acc, row, index, this),
      init,
    );
  }

  async first(): Promise<R | undefined> {
    return this.nth(0);
  }

  async groupBy(fn: IterFn<R, Value>): Promise<Table<R>[]> {
    let valueIndexMap = {} as Partial<Record<string, number>>;
    let result = [] as R[][];

    (await this.data).forEach((row, index) => {
      let key = JSON.stringify(fn(row, index, this));

      if (valueIndexMap[key] == null) {
        valueIndexMap[key] = result.length;
        result.push([row]);
      } else {
        result[valueIndexMap[key]!].push(row);
      }
    });

    return result.map((data) => new Table(data));
  }

  async last(): Promise<R | undefined> {
    return this.nth(-1);
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
    if (n < 0) {
      let length = await this.length;
      n = (n % length + length) % length;
    }

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

  sortBy(fn: IterFn<R, Value | Value[]>): Table<R> {
    return new Table(async () =>
      (await this.data).slice()
        .map((row, index) =>
          [row, index, undefined] as [Readonly<R>, number, Value | Value[] | undefined]
        )
        .sort((entry, other) => {
          if (entry[2] === undefined) {
            entry[2] = fn(entry[0], entry[1], this);
          }
          if (other[2] === undefined) {
            other[2] = fn(other[0], other[1], this);
          }
          if (!Array.isArray(entry[2])) {
            entry[2] = [entry[2]]
          }
          if (!Array.isArray(other[2])) {
            other[2] = [other[2]]
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
        return acc === undefined ? value : addValues(acc, value);
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
          (await this.data).map((row) => JSON.stringify(rowToJson(row))),
        ),
      ]
        .map((json) => jsonToRow(JSON.parse(json)))
    );
  }
}
