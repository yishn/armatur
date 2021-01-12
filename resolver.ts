import { CircularDependencyError } from "./errors.ts";
import { Table } from "./table.ts";
import { Views } from "./types.ts";

export class Resolver<V extends object> {
  views: Views<V>;
  dependencies: Map<keyof V, Set<keyof V>> = new Map();

  static fromViews<V extends object>(
    views: V,
  ): V extends Views<V> ? Resolver<V> : never {
    return new Resolver(views) as never;
  }

  private constructor(views: V) {
    this.views = views as Views<V>;
  }

  getDependants(name: keyof V): Set<keyof V> {
    let result = new Set<keyof V>();

    for (let [view, dependencies] of this.dependencies.entries()) {
      if (dependencies.has(name)) {
        result.add(view);
      }
    }

    return result;
  }

  resolve<K extends keyof V>(
    name: K,
  ): Views<V>[K] extends () => Table<infer R> ? Table<R> : never {
    this.dependencies.set(name, new Set());

    let running = new Set<keyof V>([name]);
    let views = {} as Views<V>;

    for (let key of Object.keys(this.views) as (keyof V)[]) {
      views[key] = () => {
        if (running.has(key)) throw new CircularDependencyError();

        running.add(key);
        this.dependencies.get(name)!.add(key);

        let table = this.views[key].bind(views)();
        table.data.then(() => running.delete(key));

        return table;
      };
    }

    return this.views[name].bind(views)() as any;
  }
}
