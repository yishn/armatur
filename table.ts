import type { FoldIterFn, IntoTable, IterFn, Row, Value } from "./types.ts";
import { addValues, compareValues } from "./utils.ts";

export class Table<R extends Row = Row> {
  data: readonly Readonly<R>[];

  constructor(data: IntoTable<R>) {
    if (Array.isArray(data)) {
      this.data = data;
    } else if (data instanceof Table) {
      this.data = data.data;
    } else {
      throw new TypeError("Invalid data type");
    }
  }

  get length(): number {
    return this.data.length;
  }

  all(fn: IterFn<R, boolean>): boolean {
    return this.data.every((row, index) => fn(row, index, this));
  }

  any(fn: IterFn<R, boolean>): boolean {
    return this.data.some((row, index) => fn(row, index, this));
  }

  averageBy(fn: IterFn<R, number>): number | undefined {
    let sum = this.sumBy(fn);
    return sum === undefined ? undefined : sum / this.length;
  }

  chain(other: IntoTable<R>): Table<R> {
    return new Table([{}, {}])
      .flatMap((_, index) => index === 0 ? this : other);
  }

  extend<S>(fn: IterFn<R, S>): Table<Omit<R, keyof S> & S> {
    return this.map((row, index, table) => ({
      ...row,
      ...fn(row, index, table),
    }));
  }

  filter(fn: IterFn<R, boolean>): Table<R> {
    return new Table(this.data.filter((row, index) => fn(row, index, this)));
  }

  find(fn: IterFn<R, boolean>): R | undefined {
    return this.data.find((row, index) => fn(row, index, this));
  }

  flatMap<S extends Row>(fn: IterFn<R, IntoTable<S>>): Table<S> {
    if (this.length === 0) return new Table([]);

    return new Table(
      this.data.map((row, index) => new Table<S>(fn(row, index, this)))
        .reduce((acc, table) => {
          acc.push(...table.data);
          return acc;
        }, [] as S[]),
    );
  }

  fold<T>(init: T, fn: FoldIterFn<R, T>): T {
    return this.data.reduce(
      (acc, row, index) => fn(acc, row, index, this),
      init,
    );
  }

  first(): R | undefined {
    return this.nth(0);
  }

  groupBy(fn: IterFn<R, Value>): Table<R>[] {
    let valueIndexMap = {} as Partial<Record<string, number>>;
    let result = [] as R[][];

    this.data.forEach((row, index) => {
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

  last(): R | undefined {
    return this.nth(-1);
  }

  map<S extends Row>(fn: IterFn<R, S | undefined>): Table<S> {
    return new Table(
      this.data
        .map((row, index) => fn(row, index, this))
        .filter((row): row is S => row !== undefined),
    );
  }

  maxBy(fn: IterFn<R, Value>): R | undefined {
    return this.fold(
      undefined as readonly [R, number] | undefined,
      (acc, row, index, table) => {
        let value = fn(row, index, table);
        return acc === undefined ||
            compareValues(fn(acc[0], acc[1], this), value) < 0
          ? [row, index] as const
          : acc;
      },
    )?.[0];
  }

  minBy(fn: IterFn<R, Value>): R | undefined {
    return this.fold(
      undefined as readonly [R, number] | undefined,
      (acc, row, index, table) => {
        let value = fn(row, index, table);
        return acc === undefined ||
            compareValues(fn(acc[0], acc[1], this), value) > 0
          ? [row, index] as const
          : acc;
      },
    )?.[0];
  }

  nth(n: number): R | undefined {
    if (n < 0) {
      n = (n % this.length + this.length) % this.length;
    }

    return this.data[n];
  }

  omit<K extends string>(...keys: K[]): Table<Omit<R, K>> {
    return this.map((row) => {
      let result = { ...row } as Partial<R>;

      for (let key of keys) {
        delete result[key];
      }

      return result as Omit<R, K>;
    });
  }

  pick<K extends string>(...keys: K[]): Table<Pick<R, Extract<K, keyof R>>> {
    return this.map((row) => {
      let result = {} as Partial<R>;

      for (let key of keys) {
        result[key] = row[key];
      }

      return result as Pick<R, Extract<K, keyof R>>;
    });
  }

  position(fn: IterFn<R, boolean>): number | undefined {
    let result = this.data.findIndex((row, index) => fn(row, index, this));

    return result < 0 ? undefined : result;
  }

  sortBy(fn: IterFn<R, Value>): Table<R> {
    return new Table(
      this.data.slice()
        .map((row, index) =>
          [row, index, undefined] as [Readonly<R>, number, Value | undefined]
        )
        .sort((entry, other) => {
          if (entry[2] === undefined) {
            entry[2] = fn(entry[0], entry[1], this);
          }
          if (other[2] === undefined) {
            other[2] = fn(other[0], other[1], this);
          }

          return compareValues(entry[2], other[2]);
        })
        .map(([row]) => row),
    );
  }

  skip(n: number): Table<R> {
    return new Table(this.data.slice(n));
  }

  skipWhile(fn: IterFn<R, boolean>): Table<R> {
    let index = this.position((row, index, table) => !fn(row, index, table));
    if (index === undefined) return new Table([]);

    return this.skip(index);
  }

  sumBy(fn: IterFn<R, number>): number | undefined {
    return this.fold(
      undefined as number | undefined,
      (acc, row, index, table) => {
        let value = fn(row, index, table);
        return acc === undefined ? value : addValues(acc, value);
      },
    );
  }

  take(n: number): Table<R> {
    return new Table(this.data.slice(0, n));
  }

  takeWhile(fn: IterFn<R, boolean>): Table<R> {
    let index = this.position((row, index, table) => !fn(row, index, table));
    if (index === undefined) return this;

    return this.take(index);
  }
}
