import { clamp } from "../utils.ts";
import type { Value } from "../types.ts";
import type { IntoRgba } from "./types.ts";

export class Rgba {
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a: number = 1,
  ) {}

  toArray(): [r: number, g: number, b: number, a: number] {
    let { r, g, b, a } = this;
    return [r, g, b, a];
  }

  toString(): string {
    let { r, g, b, a } = this;
    let result = "#" + [r, g, b, a]
      .map((x) =>
        Math.round(clamp(x, 0, 1) * 255)
          .toString(16).padStart(2, "0")
      )
      .join("");

    if (result.endsWith("ff")) result = result.slice(0, -2);
    return result;
  }

  toJSON(): string {
    return this.toString();
  }
}

function hexToRgba(color: string): Rgba {
  if (color.startsWith("#")) color = color.slice(1);

  let [r, g, b, a] = color.match(/\w\w/g)
    ?.map((hex) => clamp(parseInt(hex, 16) / 255, 0, 1))
    .map((x) => isNaN(x) ? undefined : x) ?? [];

  return rgba(r ?? 0, g ?? 0, b ?? 0, a ?? 1);
}

export function rgba(r: number, g: number, b: number, a?: number): Rgba;
export function rgba(value: IntoRgba): Rgba;
export function rgba(...args: any[]): Rgba {
  if (args.length === 1) {
    let value = args[0] as IntoRgba;

    if (typeof value === "string") return hexToRgba(value);
    if (value instanceof Rgba) return value;

    throw new TypeError("Invalid input data type");
  } else {
    let [r, g, b, a] = args;
    return new Rgba(r, g, b, a);
  }
}

export function hsva(h: number, s: number, v: number, a: number = 1): Rgba {
  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);

  let [r, g, b] = ([
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ] as const)[i % 6];

  return rgba(r, g, b, a);
}

export function getDiscreteColor(value: Value): Rgba {
  let key = JSON.stringify(value);
  let hash = [...key].map((_, i) => key.charCodeAt(i));
  let mod1 = (x: number) => x - Math.floor(x);
  let getIndexFromHash = (m: number, hash: number[]) =>
    (hash.reduce((acc, x) => (acc * 33) ^ x, 5381) >>> 0) % m;

  return hsva(
    mod1(79 / 997 * getIndexFromHash(997, hash)),
    3 / 4,
    1,
  );
}
