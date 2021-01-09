import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.83.0/testing/asserts.ts";
import { delay } from "https://deno.land/std@0.83.0/async/mod.ts";
import { DataChangeEvent, DataSource, Resolver, Table } from "../mod.ts";

type A = {
  name: string;
  gender: "male" | "female" | "other";
  age: number;
};

function before() {
  let dataSource = new DataSource(
    async function (params: {
      delay: number;
      name: string;
      gender: "male" | "female" | "other";
      age: number;
    }): Promise<Table<A>> {
      await delay(params.delay);

      return new Table([
        {
          name: params.name,
          gender: params.gender,
          age: params.age,
        },
        {
          name: "Hi",
          gender: "other",
          age: 5,
        },
      ]);
    },
  );

  let dataChanges = [] as DataChangeEvent[];

  let resolver = new Resolver(
    {
      people: {
        dataSource,
        params: {
          name: "Mario",
          age: 32,
          gender: "male",
          delay: 500,
        },
      },
      others: {
        dataSource,
        params: {
          name: "Luigi",
          age: 36,
          gender: "male",
          delay: 1000,
        },
      },
      unused: {
        dataSource,
        params: {
          name: "Peach",
          age: 27,
          gender: "female",
          delay: 60000,
        },
      },
    },
  )
    .defineView(
      "allPeople",
      (entities) => entities.people().chain(entities.others()),
    )
    .defineView(
      "peopleWithHeight",
      (entities) =>
        entities.people()
          .extend((row) => ({
            height: row.age * 2,
          }))
          .sortBy((row) => row.height),
    )
    .defineView(
      "allOtherGenderPeople",
      (entities) =>
        entities.allPeople()
          .filter((row) => row.gender === "other")
          .sortBy((row) => row.age),
    )
    .onDataChange((evt) => dataChanges.push(evt));

  return { dataSource, dataChanges, resolver };
}
