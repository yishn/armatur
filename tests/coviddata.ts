import { parseDate, Resolver, Table } from "../src/mod.ts";
import { BarChart, LineChart, TableChart } from "../src/charts/mod.ts";
import { jsonToRow, parseRow } from "../src/utils.ts";

function fetchData(countries?: string[]): Table<{
  date: Date;
  confirmed: number;
  deaths: number;
  recovered: number;
  country: string;
}> {
  return new Table(async () => {
    let date = Date.now();
    let response = await fetch(
      "https://pomber.github.io/covid19/timeseries.json",
    );

    let data: Record<string, {
      date: string;
      confirmed: number;
      deaths: number;
      recovered: number;
    }[]> = await response.json();

    console.log(Date.now() - date, "ms");

    return new Table(Object.keys(data).map((country) => ({ country })))
      .filter((row) => countries?.includes(row.country) ?? true)
      .flatMap((row) => new Table(data[row.country]).extend(() => row))
      .extend((row) => ({
        date: parseDate(row.date, "yyyy-MM-dd"),
      }));
  });
}

function calculateDeltaTable<
  R extends {
    country: string;
    date: Date;
    active: number;
    confirmed: number;
    deaths: number;
    recovered: number;
  },
>(
  table: Table<R>,
) {
  return table
    .sortBy((row) => [row.country, row.date])
    .extend(async (row, i, table) => {
      let previousRow = await table.nth(i - 1);

      return {
        activeDelta: previousRow == null || previousRow.country !== row.country
          ? row.active
          : row.active - previousRow.active,
        confirmedDelta:
          previousRow == null || previousRow.country !== row.country
            ? row.confirmed
            : row.confirmed - previousRow.confirmed,
        deathsDelta: previousRow == null || previousRow.country !== row.country
          ? row.deaths
          : row.deaths - previousRow.deaths,
        recoveredDelta:
          previousRow == null || previousRow.country !== row.country
            ? row.recovered
            : row.recovered - previousRow.recovered,
      };
    });
}

let resolver = Resolver.fromViews({
  DataSource() {
    return fetchData(["Germany", "Spain"])
      .extend((row) => ({
        active: row.confirmed - row.deaths - row.recovered,
      }));
  },
  Countries() {
    return this.DataSource()
      .pick("country")
      .unique()
      .sortBy((row) => row.country);
  },
  SevenDaysAccumulation() {
    return this.DataSource()
      .groupBy(
        (row) => row.country,
        (table) =>
          table.pick("date")
            .sortBy((row) => row.date)
            .reverse()
            .collect<{ date: Date }>(async (acc, row) =>
              await acc.last() == null ||
                (await acc.last())!.date.getTime() - row.date.getTime() >=
                  7 * 24 * 60 * 60 * 1000 // 7 days
                ? { date: row.date }
                : undefined
            )
            .map(async (row, i, dates) => {
              let dateEnd = row.date;
              let dateStart = (await dates.nth(i + 1))?.date ?? -Infinity;

              let chunk = table
                .filter((row) =>
                  (dateStart ?? -Infinity) < row.date &&
                  row.date <= dateEnd
                );

              if (await chunk.length > 0) {
                return {
                  dateStart: (await chunk.first())!.date,
                  date: (await chunk.last())!.date,
                  country: (await chunk.first())!.country,
                  active: (await chunk.last())!.active,
                  confirmed: (await chunk.last())!.confirmed,
                  deaths: (await chunk.last())!.deaths,
                  recovered: (await chunk.last())!.recovered,
                };
              }
            }),
      );
  },
  Deltas() {
    return calculateDeltaTable(this.DataSource());
  },
  SevenDaysAccumulationDeltas() {
    return calculateDeltaTable(this.SevenDaysAccumulation());
  },
  SevenDaysAccumulationDeltaAverages() {
    return this.SevenDaysAccumulationDeltas()
      .extend((row) => ({
        activeDeltaAverage: row.activeDelta / 7,
        confirmedDeltaAverage: row.confirmedDelta / 7,
        deathsDeltaAverage: row.deathsDelta / 7,
        recoveredDeltaAverage: row.recoveredDelta / 7,
      }));
  },
  GrowthRate() {
    return this.Deltas()
      .extend((row) => ({
        growthRate: row.activeDelta === row.active
          ? null
          : row.activeDelta / (row.active - row.activeDelta),
      }));
  },
  SevenDaysAccumulationGrowthRate() {
    return this.SevenDaysAccumulationDeltaAverages()
      .extend((row) => {
        if (row.activeDelta === row.active) return;
        let growthRate = row.activeDelta / (row.active - row.activeDelta);

        return { growthRate };
      });
  },
  SevenDaysAccumulationGrowthRateChart() {
    return new BarChart(this.SevenDaysAccumulationGrowthRate(), {
      stacked: true,
      scales: {
        x: {
          type: "discrete",
          field: (row) => row.date,
        },
        y: {
          type: "continuous",
          field: (row) => row.growthRate,
        },
        color: {
          type: "discrete",
          field: (row) => row.country,
        },
      },
    });
  },
  SevenDaysAccumulationGrowthRateTableChart() {
    return new TableChart(
      this.SevenDaysAccumulationGrowthRate()
        .filter((row) => row.country === "Germany")
        .pick(
          "dateStart",
          "date",
          "growthRate",
          "confirmedDeltaAverage",
        ),
      {
        columnOptions: {
          dateStart: {
            dateFormat: "yyyy-MM-dd",
          },
          date: {
            dateFormat: "yyyy-MM-dd"
          },
          growthRate: {
            percent: true,
            round: 2,
          },
          confirmedDeltaAverage: {
            round: 2,
          },
        },
      },
    );
  },
}, {
  eventHandler(evt) {
    if (evt.DataInvalidationEvent != null) {
      console.log("DataInvalidationEvent", evt.DataInvalidationEvent.viewNames);
    }
  },
});

let date = Date.now();

console.log(
  await resolver.views.SevenDaysAccumulationGrowthRate()
    .filter((row) => row.country === "Germany")
    .sortBy((row) => row.date)
    .skip(-7)
    .pick(
      "country",
      "dateStart",
      "date",
      "growthRate",
      "confirmedDeltaAverage",
    )
    .data,
);

console.log(
  (await resolver.views.SevenDaysAccumulationGrowthRateTableChart()
    .skip(-15)
    .data).map((row) => parseRow(row.display)),
);

resolver.invalidate("DataSource");

console.log(Date.now() - date, "ms");
