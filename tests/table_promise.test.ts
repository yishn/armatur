import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.83.0/testing/asserts.ts";
import { Table, TablePromise } from "../mod.ts";
import { assertTypeEquals } from "../utils.ts";

let table = new TablePromise(async () => [1, 2, 3].map((val) => ({ val })));

Deno.test("TablePromise API should coincide with Table API", () => {
  type R = { a: number; b: string };
  type TableKeys = keyof Table<R>;
  type TablePromiseKeys = Exclude<keyof TablePromise<R>, "promise">;
  type Values<T> = {
    [K in keyof T]: T[K] extends (...args: any) => any ? ReturnType<T[K]>
      : T[K];
  };
  type TableToTablePromiseValues<T extends Table> = {
    [K in keyof T]: Values<T>[K] extends Table<infer S> ? TablePromise<S>
      : Promise<Values<T>[K]>;
  };

  assertTypeEquals<TableKeys, TablePromiseKeys>(true);
  assertTypeEquals<
    TableToTablePromiseValues<Table<R>>,
    Values<Omit<TablePromise<R>, "promise">>
  >(true);
});

Deno.test("TablePromise#constructor", async () => {
  let newTable = new TablePromise(table);

  assertEquals(await newTable.data, await table.data);
  assertThrows(() => new TablePromise(5 as any), TypeError);
});

Deno.test("TablePromise#length", async () => {
  assertEquals(await table.length, 3);
});

Deno.test("TablePromise#(all|any)", async () => {
  assert(await table.all((row) => row.val <= 3));
  assert(!(await table.all((row) => row.val <= 2)));
  assert(await table.any((row) => row.val === 1));
  assert(!(await table.any((row) => row.val === 4)));
});

Deno.test("TablePromise#(sumBy|averageBy|fold)", async () => {
  assertEquals(await table.sumBy((row) => row.val), 1 + 2 + 3);
  assertEquals(await table.fold(0, (acc, row) => acc + row.val), 1 + 2 + 3);
  assertEquals(
    await new TablePromise<{ val: number }>([]).sumBy((row) => row.val),
    undefined,
  );
  assertEquals(await table.averageBy((row) => row.val), (1 + 2 + 3) / 3);
  assertEquals(
    await new TablePromise<{ val: number }>([]).averageBy((row) => row.val),
    undefined,
  );
});

Deno.test("TablePromise#(chain|first|last)", async () => {
  let chain = table.chain([6, 5, 4].map((val) => ({ val })));

  assertEquals(await chain.length, 6);
  assertEquals((await chain.first())?.val, 1);
  assertEquals((await chain.last())?.val, 4);
  assertEquals(await new TablePromise([]).first(), undefined);
  assertEquals(await new TablePromise([]).last(), undefined);
});

Deno.test("TablePromise#extend", async () => {
  let extended = table.extend((row) => ({ prod: row.val * row.val }));

  assertEquals(await extended.sumBy((row) => row.prod), 1 * 1 + 2 * 2 + 3 * 3);
});

Deno.test("TablePromise#filter", async () => {
  let filtered = table.filter((row) => row.val > 1);

  assertEquals(await filtered.length, 2);
  assertEquals(await filtered.nth(0), { val: 2 });
  assertEquals(await filtered.nth(1), { val: 3 });
});

Deno.test("TablePromise#(find|position)", async () => {
  assertEquals(await table.find((row) => row.val >= 2), { val: 2 });
  assertEquals(await table.find((row) => row.val >= 4), undefined);
  assertEquals(await table.position((row) => row.val >= 2), 1);
  assertEquals(await table.position((row) => row.val >= 4), undefined);
});

Deno.test("TablePromise#flatMap", async () => {
  let joined = table.flatMap((row) => [row, row, row]);

  assertEquals(await joined.length, await table.length * 3);
  assertEquals(
    await joined.data,
    [1, 1, 1, 2, 2, 2, 3, 3, 3].map((val) => ({ val })),
  );
});

Deno.test("TablePromise#groupBy", async () => {
  let classified = table.chain([6, 5, 4]
    .map((val) => ({ val })))
    .extend(
      (row) => ({ type: row.val % 2 === 0 ? "even" : "odd" }),
    );

  assertEquals((await classified.groupBy((row) => row.type)).length, 2);
  assertEquals(
    (await classified
      .groupBy((row) => row.type))
      .map((table) => table.nth(0)?.type)
      .sort(),
    ["even", "odd"],
  );
});

Deno.test("TablePromise#map", async () => {
  assertEquals(
    await table.map((row) => ({ value: row.val })).data,
    [1, 2, 3].map((value) => ({ value })),
  );
  assertEquals(
    await table.map((row) => row.val % 2 === 0 ? undefined : row).data,
    [1, 3].map((val) => ({ val })),
  );
});

Deno.test("TablePromise#(maxBy|minBy)", async () => {
  assertEquals(await table.maxBy((row) => row.val), { val: 3 });
  assertEquals(await table.minBy((row) => row.val), { val: 1 });
});

Deno.test("TablePromise#(omit|pick)", async () => {
  let extended = table.map((row) => ({ a: row.val, b: row.val, c: row.val }));
  let picked = extended.pick("a", "c");
  let omitted = extended.omit("c");

  assertEquals(Object.keys((await picked.nth(0))!), ["a", "c"]);
  assertEquals(Object.keys((await omitted.nth(0))!), ["a", "b"]);
});

Deno.test("TablePromise#sortBy", async () => {
  let sorted = table.chain([6, 5, 4].map((val) => ({ val })))
    .sortBy((row) => row.val);

  assertEquals(await sorted.data, [1, 2, 3, 4, 5, 6].map((val) => ({ val })));
});

Deno.test("TablePromise#(skip|skipWhile|take|takeWhile)", async () => {
  assertEquals(await table.skip(1).data, [2, 3].map((val) => ({ val })));
  assertEquals(await table.skip(3).length, 0);
  assertEquals(await table.skip(10).length, 0);
  assertEquals(
    await table.skipWhile((row) => row.val <= 1).data,
    [2, 3].map((val) => ({ val })),
  );
  assertEquals(await table.skipWhile((row) => row.val <= 3).length, 0);
  assertEquals(await table.take(1).data, [await table.nth(0)]);
  assertEquals(await table.take(3).length, 3);
  assertEquals(await table.take(10).length, 3);
  assertEquals(
    await table.takeWhile((row) => row.val <= 2).data,
    [1, 2].map((val) => ({ val })),
  );
  assertEquals(await table.takeWhile((row) => row.val > 0).length, 3);
  assertEquals(await table.takeWhile((row) => row.val > 3).length, 0);
});
