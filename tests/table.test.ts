import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.83.0/testing/asserts.ts";
import { Table } from "../mod.ts";

let table = new Table([1, 2, 3].map((val) => ({ val })));

Deno.test("Table#constructor", () => {
  let newTable = new Table(table);

  assertEquals(newTable.data, table.data);
  assertThrows(() => new Table(5 as any), TypeError);
});

Deno.test("Table#length", () => {
  assertEquals(table.length, 3);
});

Deno.test("Table#(all|any)", () => {
  assert(table.all((row) => row.val <= 3));
  assert(!table.all((row) => row.val <= 2));
  assert(table.any((row) => row.val === 1));
  assert(!table.any((row) => row.val === 4));
});

Deno.test("Table#(sumBy|averageBy|fold)", () => {
  assertEquals(table.sumBy((row) => row.val), 1 + 2 + 3);
  assertEquals(table.fold(0, (acc, row) => acc + row.val), 1 + 2 + 3);
  assertEquals(
    new Table<{ val: number }>([]).sumBy((row) => row.val),
    undefined,
  );
  assertEquals(table.averageBy((row) => row.val), (1 + 2 + 3) / 3);
  assertEquals(
    new Table<{ val: number }>([]).averageBy((row) => row.val),
    undefined,
  );
});

Deno.test("Table#(chain|first|last)", () => {
  let chain = table.chain([6, 5, 4].map((val) => ({ val })));

  assertEquals(chain.length, 6);
  assertEquals(chain.first()?.val, 1);
  assertEquals(chain.last()?.val, 4);
  assertEquals(new Table([]).first(), undefined);
  assertEquals(new Table([]).last(), undefined);
});

Deno.test("Table#extend", () => {
  let extended = table.extend((row) => ({ prod: row.val * row.val }));

  assertEquals(extended.sumBy((row) => row.prod), 1 * 1 + 2 * 2 + 3 * 3);
});

Deno.test("Table#filter", () => {
  let filtered = table.filter((row) => row.val > 1);

  assertEquals(filtered.length, 2);
  assertEquals(filtered.nth(0), { val: 2 });
  assertEquals(filtered.nth(1), { val: 3 });
});

Deno.test("Table#(find|position)", () => {
  assertEquals(table.find((row) => row.val >= 2), { val: 2 });
  assertEquals(table.find((row) => row.val >= 4), undefined);
  assertEquals(table.position((row) => row.val >= 2), 1);
  assertEquals(table.position((row) => row.val >= 4), undefined);
});

Deno.test("Table#flatMap", () => {
  let joined = table.flatMap((row) => [row, row, row]);

  assertEquals(joined.length, table.length * 3);
  assertEquals(
    joined.data,
    [1, 1, 1, 2, 2, 2, 3, 3, 3].map((val) => ({ val })),
  );
});

Deno.test("Table#groupBy", () => {
  let classified = table.chain([6, 5, 4]
    .map((val) => ({ val })))
    .extend(
      (row) => ({ type: row.val % 2 === 0 ? "even" : "odd" }),
    );

  assertEquals(classified.groupBy((row) => row.type).length, 2);
  assertEquals(
    classified
      .groupBy((row) => row.type)
      .map((table) => table.nth(0)?.type)
      .sort(),
    ["even", "odd"],
  );
});

Deno.test("Table#map", () => {
  assertEquals(
    table.map((row) => ({ value: row.val })).data,
    [1, 2, 3].map((value) => ({ value })),
  );
  assertEquals(
    table.map((row) => row.val % 2 === 0 ? undefined : row).data,
    [1, 3].map((val) => ({ val })),
  );
});

Deno.test("Table#(maxBy|minBy)", () => {
  assertEquals(table.maxBy((row) => row.val), { val: 3 });
  assertEquals(table.minBy((row) => row.val), { val: 1 });
});

Deno.test("Table#(omit|pick)", () => {
  let extended = table.map((row) => ({ a: row.val, b: row.val, c: row.val }));
  let picked = extended.pick("a", "c");
  let omitted = extended.omit("c");

  assertEquals(Object.keys(picked.nth(0)!), ["a", "c"]);
  assertEquals(Object.keys(omitted.nth(0)!), ["a", "b"]);
});

Deno.test("Table#sortBy", () => {
  let sorted = table.chain([6, 5, 4].map((val) => ({ val })))
    .sortBy((row) => row.val);

  assertEquals(sorted.data, [1, 2, 3, 4, 5, 6].map((val) => ({ val })));
});

Deno.test("Table#(skip|skipWhile|take|takeWhile)", () => {
  assertEquals(table.skip(1).data, [2, 3].map((val) => ({ val })));
  assertEquals(table.skip(3).length, 0);
  assertEquals(table.skip(10).length, 0);
  assertEquals(
    table.skipWhile((row) => row.val <= 1).data,
    [2, 3].map((val) => ({ val })),
  );
  assertEquals(table.skipWhile((row) => row.val <= 3).length, 0);
  assertEquals(table.take(1).data, [table.nth(0)]);
  assertEquals(table.take(3).length, 3);
  assertEquals(table.take(10).length, 3);
  assertEquals(
    table.takeWhile((row) => row.val <= 2).data,
    [1, 2].map((val) => ({ val })),
  );
  assertEquals(table.takeWhile((row) => row.val > 0).length, 3);
  assertEquals(table.takeWhile((row) => row.val > 3).length, 0);
});
