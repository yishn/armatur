import { CircularDependencyError } from "./errors.ts";
import { Table } from "./table.ts";
import { objectMap } from "./utils.ts";

export class Resolver<V extends Record<string, () => Table>> {
  private _views: V;
  dependants: Map<keyof V, Set<keyof V>> = new Map();
  cache: Map<keyof V, Table> = new Map();

  static fromViews<V extends object>(
    views: V,
  ): V extends Record<string, () => Table> ? Resolver<V> : never {
    return new Resolver(views as Record<string, () => Table>) as never;
  }

  get views(): V {
    let self = this;

    return objectMap(this._views, (name, fn) => ({
      [name]: function (this: V): Table {
        if (self.cache.has(name)) return self.cache.get(name)!;

        let circularDependencyDetectingViews = (from: keyof V) =>
          objectMap(
            this,
            (dependency, fn) => ({
              [dependency]: (): Table => {
                if (
                  dependency === from ||
                  self.getAllDependants(from).has(dependency)
                ) {
                  throw new CircularDependencyError();
                }

                return fn.bind(circularDependencyDetectingViews(dependency))();
              },
            }),
          ) as V;

        let dependantsTrackingViews = objectMap(
          circularDependencyDetectingViews(name),
          (dependency, fn) => ({
            [dependency]: (): Table => {
              if (!self.dependants.has(dependency)) {
                self.dependants.set(dependency, new Set());
              }
              self.dependants.get(dependency)!.add(name);

              return fn();
            },
          }),
        ) as V;

        let table = fn.bind(dependantsTrackingViews)();
        self.cache.set(name, table);

        return table;
      },
    })) as V;
  }

  private constructor(views: V) {
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

  clearCache(name?: keyof V): void {
    if (name == null) {
      this.cache.clear();
    } else {
      this.cache.delete(name);

      for (let dependant of this.getAllDependants(name)) {
        this.cache.delete(dependant);
      }
    }
  }
}
