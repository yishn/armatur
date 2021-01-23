import type { Row } from "../types.ts";
import type { ChartOptions, ChartScales } from "./types.ts";
import { Table } from "../table.ts";

export abstract class Chart<R extends Row, S extends Row> extends Table<S> {
  abstract readonly source: Table<R>;
  abstract readonly options: ChartOptions<R>;
  abstract readonly scales: Promise<ChartScales<any>>;
}
