import { Table } from "../table.ts";
import type { Row } from "../types.ts";
import { ChartOptions } from "./mod.ts";

export abstract class Chart<R extends Row, S extends Row> extends Table<S> {
  abstract readonly source: Table<R>;
  abstract readonly options: ChartOptions<R>;
}
