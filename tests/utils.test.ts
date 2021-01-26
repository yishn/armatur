import { assertEquals } from "./deps.ts";
import {
  compareLexicographically,
  compareValues,
  jsonToRow,
  rowToJson,
  stringifyRow,
} from "../src/utils.ts";

Deno.test("compareValues", () => {
  assertEquals(compareValues(4, 5), -1);
  assertEquals(compareValues(5, 5), 0);
  assertEquals(compareValues(123, 5), 1);
  assertEquals(compareValues("123", "5"), -1);
  assertEquals(compareValues("Caesar", "Abraham"), 1);
  assertEquals(compareValues(null, "Hi"), -1);
  assertEquals(compareValues(new Date(2020, 1, 1), new Date(2019, 1, 1)), 1);
  assertEquals(compareValues(new Date(2020, 1, 1), "str"), -1);
  assertEquals(compareValues(true, true), 0);
  assertEquals(compareValues(true, false), 1);
  assertEquals(compareValues(NaN, NaN), 0);
});

Deno.test("compareLexicographically", () => {
  assertEquals(compareLexicographically([4, 1], [4]), 1);
  assertEquals(compareLexicographically([4, 1], []), 1);
  assertEquals(compareLexicographically([4, 1], [4, 2]), -1);
  assertEquals(compareLexicographically([4, 1], [4, 1, 3]), -1);
  assertEquals(compareLexicographically([], []), 0);
});

Deno.test("rowToJson, jsonToRow, stringifyRow", () => {
  let row = {
    hello: "world",
    date: new Date(Date.UTC(2021, 1, 12)),
    age: 5,
  };

  let anotherRow = {
    hello: "world",
    age: 5,
    date: new Date(Date.UTC(2021, 1, 12)),
  };

  assertEquals(rowToJson(row), {
    hello: "world",
    date: {
      type: "date",
      value: "2021-02-12T00:00:00.000Z",
    },
    age: 5,
  });

  assertEquals(
    stringifyRow(row, true),
    stringifyRow(anotherRow, true),
    "property order should not matter",
  );

  assertEquals(jsonToRow(rowToJson(row)), row);
});
