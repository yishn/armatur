import { FormatValueOptions, Row, Tagged, Value } from "../types.ts";
import { Chart } from "./chart.ts";
import { Deferred, deferred } from "../deps.ts";
import { Table } from "../table.ts";
import { formatValue, objectMap, stringifyRow } from "../utils.ts";

export interface TableChartOptions<R extends Row> {
  columnOptions?: {
    [K in keyof R]?: FormatValueOptions;
  };
  scales: {};
}

type MappedRow<R extends Row, V extends Value> = {
  [K in keyof R]: V;
};

export type TableChartRow<R extends Row> = {
  index: number;
  display: string & Tagged<MappedRow<R, string>>;
};

export class TableChart<R extends Row> extends Chart<R, TableChartRow<R>> {
  readonly scales: Deferred<{}> = deferred();
  readonly options: TableChartOptions<R>;

  constructor(
    public readonly source: Table<R>,
    options: Omit<TableChartOptions<R>, "scales">,
  ) {
    super(
      source.map((row, i) => ({
        index: i,
        display: stringifyRow(
          objectMap(
            row,
            (key, value) => formatValue(value, options.columnOptions?.[key]),
          ),
        ),
      })),
    );

    this.options = {
      ...options,
      scales: {},
    };
  }
}
