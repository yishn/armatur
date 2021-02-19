import type { IntoTable, Row, Value } from "../types.ts";
import type {
  ChartOptions,
  ChartRow,
  ChartScaleDescriptors,
  ChartScales,
  ScaleDescriptor,
} from "./types.ts";
import { Table } from "../table.ts";
import { asyncObjectMap } from "../utils.ts";
import { Scale } from "./scale.ts";

export abstract class Chart<R extends Row, S extends ChartRow>
  extends Table<S> {
  abstract readonly source: Table<R>;
  abstract readonly options: ChartOptions<R>;
  abstract readonly scales: Promise<ChartScales>;

  abstract render<
    F extends (tagName: string, props: any, ...children: any[]) => unknown,
  >(h: F, width: number, height: number): Promise<ReturnType<F>>;
}

export async function getScalesFromDescriptors<
  R extends Row,
  D extends ChartScaleDescriptors<R>,
>(
  source: IntoTable<R>,
  descriptors: D,
): Promise<ChartScales<D>> {
  return await asyncObjectMap(
    descriptors,
    async (key, value) => {
      return "type" in value && value != null
        ? await Scale.fromDomain(
          source,
          value as unknown as ScaleDescriptor<R, Value, any>,
        )
        : value as D[keyof D];
    },
  ) as unknown as ChartScales<D>;
}
