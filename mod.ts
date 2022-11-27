/**
 * ## 🦕 serialize
 *
 * Serializes JavaScript / TypeScript to a _superset_ of JSON, supporting
 * builtin featurs including RegExp, Date, BigInt, Map, Set, and more.
 *
 * ### Usage
 *
 * @example
 * ```ts
 * import { serialize } from "https://deno.land/x/serialize/mod.ts";
 *
 * serialize({
 *   bigints: 10n,
 *   regexps: /([^\s]+)/g,
 *   infinite: Number.POSITIVE_INFINITY,
 *   date: new Date(),
 *   maps: new Map([["hello", "world"]]),
 *   sets: new Set([123, 456]),
 *   funky: (arg) => `"${arg}"`,
 *   symbols: Symbol.for("Deno.customInspect"),
 * });
 * ```
 * ---
 * @author Nicholas Berlette <https://github.com/nberlette>
 * @license MIT
 * @see https://github.com/deno911/serialize/#readme
 * @see https://doc.deno.land/https://deno.land/x/serialize/mod.ts
 * ---
 * Based heavily on the `serialize-javascript` project by Yahoo!, this was
 * ported to TypeScript for Deno, and extended with a few extra features.
 * @see https://github.com/yahoo/serialize-javascript
 * ---
 * @module
 */

export { default, serialize, type SerializeOptions } from "./serialize.ts";
export { deserialize } from "./deserialize.ts";
