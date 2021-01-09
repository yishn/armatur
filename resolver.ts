import { Table } from "./table.ts";
import type { DataSource } from "./data_source.ts";
import type {
  DataChangeEvent,
  DataSourcesConfig,
  Entities,
  Row,
} from "./types.ts";

export class Resolver<
  D extends Record<string, DataSource>,
  V extends Record<string, (entities: any) => Table> = {},
> {
  private _onDataChange?: (evt: DataChangeEvent) => unknown;

  dataSourcesConfig: DataSourcesConfig<D>;
  loading: Set<keyof D & string> = new Set();
  cache: Map<keyof D & string, Table> = new Map();
  dependants: Map<keyof D & string, Set<keyof V & string>> = new Map();
  views: V = {} as V;

  constructor(dataSourcesConfig: DataSourcesConfig<D>) {
    this.dataSourcesConfig = dataSourcesConfig;
  }

  defineView<K extends string, R extends Row>(
    name: Exclude<K, keyof D | keyof V>,
    view: (entities: Entities<D, V>) => Table<R>,
  ): Resolver<D, V & { [_ in K]: typeof view }> {
    this.views[name] = view as any;
    return this as any;
  }

  onDataChange(fn: (evt: DataChangeEvent) => unknown): this {
    this._onDataChange = fn;
    return this;
  }

  async loadData(name: keyof D & string): Promise<void> {
    if (this.loading.has(name)) return;

    this.loading.add(name);

    let { dataSource, params } = this.dataSourcesConfig[name];
    let result = await dataSource.call(params);

    this.cache.set(name, result);
    this.loading.delete(name);

    this._onDataChange?.({
      entities: [name, ...(this.dependants.get(name) ?? [])],
    });
  }

  private resolveDataSource<K extends keyof D & string>(
    name: K,
  ): ReturnType<Entities<D, V>[K]> {
    let cached = this.cache.get(name);
    if (cached != null) return cached as any;

    void this.loadData(name);

    return new Table([]) as any;
  }

  private resolveView<K extends keyof V & string>(
    name: K,
    entities: Entities<D, V>,
  ): ReturnType<Entities<D, V>[K]> {
    if (entities == null) {
      let partialEntities = {} as Partial<Entities<D, V>>;

      for (let name in this.views) {
        partialEntities[name] = () => this.resolveView(name, entities);
      }

      for (let name in this.dataSourcesConfig) {
        partialEntities[name] = () => this.resolveDataSource(name);
      }

      entities = partialEntities as Entities<D, V>;
    }

    return this.views[name](entities) as any;
  }

  resolve<K extends (keyof D | keyof V) & string>(
    name: K,
  ): ReturnType<Entities<D, V>[K]> {
    if (name in this.dataSourcesConfig) {
      return this.resolveDataSource(name);
    } else if (name in this.views) {
      let entities = {} as Entities<D, V>;

      for (let viewName in this.views) {
        entities[viewName] = () => this.resolveView(viewName, entities);
      }

      for (let dataSourceName in this.dataSourcesConfig) {
        if (!this.dependants.has(dataSourceName)) {
          this.dependants.set(dataSourceName, new Set());
        }

        this.dependants.get(dataSourceName)!.delete(name);

        entities[dataSourceName] = () => {
          this.dependants.get(dataSourceName)!.add(name);
          return this.resolveDataSource(dataSourceName);
        };
      }

      return this.resolveView(name, entities);
    }

    return new Table([]) as any;
  }
}
