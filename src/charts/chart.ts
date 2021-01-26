import type { IntoTable, Row, Value } from "../types.ts";
import type {
  ChartOptions,
  ChartScaleDescriptors,
  ChartScales,
  ScaleDescriptor,
} from "./types.ts";
import { Table } from "../table.ts";
import { asyncObjectMap, objectMap } from "../utils.ts";
import { Scale } from "./scale.ts";

export abstract class Chart<R extends Row, S extends Row> extends Table<S> {
  abstract readonly source: Table<R>;
  abstract readonly options: ChartOptions<R>;
  abstract readonly scales: Promise<ChartScales>;
}

export async function getScalesFromDescriptors<
  R extends Row,
  D extends ChartScaleDescriptors<R>,
>(
  source: IntoTable<R>,
  descriptors: D,
): Promise<ChartScales<D>> {
  return await asyncObjectMap(descriptors, async (key, value) => {
    return {
      [key]: "type" in value && value != null
        ? await Scale.fromDomain(
          source,
          value as unknown as ScaleDescriptor<R, Value, any>,
        )
        : value,
    } as unknown as Partial<ChartScales<D>>;
  });
}
