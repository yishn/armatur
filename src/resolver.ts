import { Enum, memo, ofType } from "../deps.ts";
import { CircularDependencyError } from "./errors.ts";
import { Table } from "./table.ts";
import { objectMap } from "./utils.ts";

const ResolverEventVariants = {
  DataInvalidationEvent: ofType<{
    viewNames: unknown[];
  }>(),
};

export type ResolverEvent<V> = Enum<
  typeof ResolverEventVariants & {
    DataInvalidationEvent: {
      viewNames: (keyof V)[];
    };
  }
>;

export const ResolverEvent = memo(<V>() =>
  Enum.factory<ResolverEvent<V>>(ResolverEventVariants)
);

export interface ResolverOptions<V> {
  eventHandler?: (evt: ResolverEvent<V>) => unknown;
}

export class Resolver<V extends Record<string, () => Table>> {
  private _views: V;
  dependants: Map<keyof V, Set<keyof V>> = new Map();
  cache: Map<keyof V, Table> = new Map();

  static fromViews<V extends object>(
    views: V,
    options?: ResolverOptions<V>,
  ): V extends Record<string, () => Table> ? Resolver<V> : never {
    return new Resolver(
      views as Record<string, () => Table>,
      options as ResolverOptions<Record<string, () => Table>>,
    ) as never;
  }

  get views(): V {
    let self = this;

    return objectMap(
      this._views,
      (name, fn) =>
        function (this: V): Table {
          if (self.cache.has(name)) return self.cache.get(name)!;

          let circularDependencyDetectingViews = (from: keyof V) =>
            objectMap(
              this,
              (dependency, fn) =>
                (): Table => {
                  if (
                    dependency === from ||
                    self.getAllDependants(from).has(dependency)
                  ) {
                    throw new CircularDependencyError();
                  }

                  return fn.bind(
                    circularDependencyDetectingViews(dependency),
                  )();
                },
            ) as V;

          let dependantsTrackingViews = objectMap(
            circularDependencyDetectingViews(name),
            (dependency, fn) =>
              (): Table => {
                if (!self.dependants.has(dependency)) {
                  self.dependants.set(dependency, new Set());
                }
                self.dependants.get(dependency)!.add(name);

                return fn();
              },
          ) as V;

          let table = fn.bind(dependantsTrackingViews)();
          self.cache.set(name, table);

          return table;
        },
    ) as V;
  }

  private constructor(views: V, public options: ResolverOptions<V> = {}) {
    this._views = views;
  }

  getAllDependants(name: keyof V): Set<keyof V> {
    let result = new Set<keyof V>();

    let inner = (name: keyof V, result: Set<keyof V>): Set<keyof V> => {
      for (let dependant of this.dependants.get(name) ?? []) {
        if (!result.has(dependant)) {
          result.add(dependant);
          inner(dependant, result);
        }
      }

      return result;
    };

    return inner(name, result);
  }

  invalidate(name?: keyof V): void {
    if (name == null) {
      this.cache.clear();
    } else {
      let viewNames = [name, ...this.getAllDependants(name)];

      for (let viewName of viewNames) {
        this.cache.delete(viewName);
      }

      this.options.eventHandler?.(
        ResolverEvent<V>().DataInvalidationEvent({ viewNames }),
      );
    }
  }
}
