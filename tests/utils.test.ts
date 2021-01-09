import { assertEquals } from "https://deno.land/std@0.83.0/testing/asserts.ts";
import { addValues, compareValues } from "../utils.ts";

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

Deno.test("addValues", () => {
  assertEquals(addValues(2, 3), 2 + 3);
  assertEquals(addValues(NaN, 3), NaN);
  assertEquals(addValues(new Date(2020, 1, 1), new Date(2019, 1, 1)), NaN);
  assertEquals(addValues("sdf", 3), NaN);
  assertEquals(addValues("sdf", "dslfk"), NaN);
});
