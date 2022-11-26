/**
 * ## 🦕 serialize
 *
 * Serializes JavaScript / TypeScript to a _superset_ of JSON, supporting
 * builtin featurs including RegExp, Date, BigInt, Map, Set, and more.
 *
 * Based heavily on the `serialize-javascript` project by Yahoo!, this was
 * ported to TypeScript for Deno, and extended with a few extra features.
 *
 * @see https://github.com/yahoo/serialize-javascript
 *
 * ### Usage
 *
 * Try out the "kitchen sink" example, with _almost_ every supported type:
 *
 * @example
 * ```ts
 * import { serialize } from "https://deno.land/x/serialize/mod.ts";
 *
 * serialize({
 *   strg: 'string',
 *   bool: true,
 *   numb: 0,
 *   big1: 10n,
 *   big2: BigInt(10),
 *   reg1: /([^\s]+)/g,
 *   reg2: new RegExp("([^\s]+)", "g")
 *   objs: {foo: 'foo'},
 *   arrr: [1, 2, 3],
 *   nill: null,
 *   unde: undefined,
 *   infi: Number.POSITIVE_INFINITY,
 *   date: new Date(),
 *   maps: new Map([['hello', 'world']]),
 *   sets: new Set([123, 456]),
 *   func: (arg) => `"${arg}"`,
 *   symb: Symbol.for("Deno.customInspect")
 * });
 * ```
 * @author Nicholas Berlette <https://github.com/nberlette>
 * @license MIT
 * @module
 */

export { default, serialize, type SerializeOptions } from "./serialize.ts";
export { deserialize } from "./deserialize.ts";
