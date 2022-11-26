/// <reference no-default-lib="true" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />
/// <reference lib="deno.unstable" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.extras" />
/// <reference lib="dom" />

import {
  assert,
  deleteFunctions,
  escapeUnsafeChars,
  fallbackSymbolKey,
  is,
  isAccessorDescriptor,
  isInfinite,
  isSparse,
  RE,
  RESERVED,
  SYMBOL,
  UID,
  validateRegExpFlags,
} from "./_util.ts";

/**
 * Options available to control the behavior of {@linkcode serialize}.
 */
interface SerializeOptions {
  /**
   * Serialize Arrays using the `Array.from` method, which may not be available
   * in all target environments (looking at you, Internet Explorer). Default
   * behavior is to use the `Array.prototype.splice` method, constructing an
   * Array from an Array-like object.
   * @default true
   */
  arrayFrom?: boolean;

  /**
   * Enable serializing of any functions encountered in the target object.
   * @default true
   */
  includeFunction?: boolean;

  /**
   * Serialize get property accessors ("getters") into their resolved values.
   * @default false
   */
  includeGetters?: boolean;

  /**
   * Serialize all properties, including any that are non-enumerable (hidden).
   * By default this is disabled, meaning that only enumerable properties are
   * serialized and included in the output.
   * @default false
   */
  includeHidden?: boolean;

  /**
   * Include `Symbol` primitives (typeof `symbol`) in the serialized output.
   * @default true
   */
  includeSymbols?: boolean;

  /**
   * Skips the replacement step, treating the input as pure JSON. This means
   * much faster processing times, at the cost of **no support** for objects
   * like RegExp/URL/Function/etc. `**You should probably leave this alone.**
   * @default false
   */
  isJSON?: boolean;

  /**
   * Serialize BigInt as literals.
   * @example BigInt("100") -> 100n
   * @default false
   */
  literalBigInt?: boolean;

  /**
   * Serialize RegExp as literals.
   * @example RegExp('(a|b|c)', 'g') -> /(a|b|c)/g
   * @default false
   */
  literalRegExp?: boolean;

  /**
   * Attempt to silently handle raised exceptions, rather than throwing hard
   * exceptions, by skipping over problem areas wherever possible. This is
   * ignored if a fatal error is thrown.
   * @default true
   */
  silent?: boolean;

  /**
   * Control the indentation width in the generated string.
   * Set to 0 to disable pretty-printing entirely.
   * @default 0
   */
  space?: string | number;

  /**
   * Sort entries of keyed collections (Array, Object, Set, Map).
   * @default false
   */
  sorted?: boolean;

  /**
   * Custom comparator to sort entries (implies {@linkcode sorted} is `true`).
   * **Note**: if {@linkcode sorted} is `false`, but this option is defined
   * with a valid comparator function, it will override the former and sort
   * all entries.
   * @default undefined
   */
  sortCompareFn?: ((a: unknown, b: unknown) => number) | null;

  /**
   * The maximum length of a string before it is truncated with an ellipsis.
   * @default undefined (no limit)
   */
  strAbbreviateSize?: number;

  /**
   * Skips sanitization of unsafe HTML characters.
   * @default false
   */
  unsafe?: boolean;
}

const defaultOptions: SerializeOptions = {
  space: 0,
  isJSON: false,
  unsafe: false,
  arrayFrom: true,
  silent: true,
  sorted: false,
  includeFunction: true,
  includeGetters: false,
  includeHidden: false,
  includeSymbols: true,
  literalRegExp: false,
  literalBigInt: false,
};

/**
 * ## Serialize
 *
 * Serializes JavaScript / TypeScript to a _superset_ of JSON, supporting
 * builtin featurs including RegExp, Date, BigInt, Map, Set, and more.
 *
 * Based heavily on the `serialize-javascript` project by Yahoo!, this was
 * ported to TypeScript for Deno, and extended with a few extra features.
 *
 * ### Supported Types
 *
 * - [x] `Array`
 * - [x] `Date`
 * - [x] `Map`
 * - [x] `Set`
 * - [x] `URL`
 * - [x] `Function`
 * - [x] `Getters` · _accessor properties_
 * - [x] `RegExp` · _literal_ or _constructed_
 * - [x] `BigInt` · _literal_ or _constructed_
 * - [x] `Symbol` 🚧 · **globals only** · experimental
 * - [x] `Infinity`
 * - [x] `undefined`
 *
 * ### Usage
 *
 * @example
 * ```ts
 * import { serialize } from "https://x.nest.land/serialize@1.0.0-rc.1/mod.ts";
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
 *
 * ### Pretty Printing
 *
 * For a pretty-printed output, the optional second argument can be used to
 * define identation size. Accepted values are an object literal with a `space`
 * property, or literal `string`/`number` (legacy option for compatibility, not
 * recommended).
 *
 * ### Options
 *
 * The `serialize()` function accepts an `options` object for its 2nd argument,
 * allowing fine-grained control of various aspects of the program's behavior.
 *
 * @see {@linkcode SerializeOptions} for a complete list of options that are available in the aforementioned second argument.
 *
 * > Note: **HTML entities and JS line terminators are escaped automatically.**
 * > To disable this feature, set the `unsafe` option to `true`.
 */
function serialize<T>(value: T, options?: SerializeOptions): string;
function serialize<T>(value: T, space: number | string): string;
function serialize<T>(value: T, options: SerializeOptions): string;
function serialize<T = unknown>(
  obj: T,
  maybeOptions: any = { ...defaultOptions },
): string {
  const options: SerializeOptions = { ...defaultOptions };

  // Backwards-compatibility for `space` as the second argument.
  if (is.plainObject(maybeOptions)) {
    Object.assign(options, { ...maybeOptions });
  } else if (is.number(maybeOptions) || is.numericString(maybeOptions)) {
    Object.assign(options, { space: +maybeOptions });
  } else if (is.string(maybeOptions)) {
    Object.assign(options, { space: maybeOptions });
  }

  const $ = Object.freeze({
    [SYMBOL.URL]: [] as (URL | string)[],
    [SYMBOL.Map]: [] as Map<unknown, unknown>[],
    [SYMBOL.Set]: [] as Set<unknown>[],
    [SYMBOL.Date]: [] as Date[],
    [SYMBOL.Array]: [] as unknown[][],
    [SYMBOL.BigInt]: [] as (bigint | BigInt)[],
    [SYMBOL.Symbol]: [] as symbol[],
    [SYMBOL.RegExp]: [] as RegExp[],
    [SYMBOL.Function]: [] as Function[],
    [SYMBOL.Getter]: [] as unknown[],
    [SYMBOL.Infinity]: [] as any[],
    [SYMBOL.Undefined]: [] as undefined[],
  });

  /**
   * Returns placeholders for functions and regexps (identified by index)
   * which are later replaced by their string representation.
   * @internal
   */
  function replacer<V>(this: any, key: string, value: V): V | string | null {
    /**
     * If the value is an object w/ a toJSON method, toJSON is called before
     * the replacer runs, so we use this[key] to get the non-toJSONed value.
     */
    const origValue = (this as any)[key] ?? Reflect.get(this, key);

    /**
     * Typed Property Descriptor for the object property currently being
     * inspected. This is used to check enumerability and to extract the code
     * for data accessors (getters/setters), if configured as such.
     */
    const descriptor = Object.getOwnPropertyDescriptor(
      this,
      key,
    ) as TypedPropertyDescriptor<V>;

    // For nested function
    if (!options.includeFunction) {
      deleteFunctions(value as any);
    }

    // reject null values
    if (!value && value !== undefined) {
      return value as null;
    }

    // exclude hidden properties by default
    if (!options.includeHidden && descriptor.enumerable === false) {
      return null;
    }

    // Review property descriptors to see if prop is an accessor
    if (isAccessorDescriptor(descriptor) && is.function_(descriptor.get)) {
      const getterSource = Function.prototype.toString.call(descriptor.get);
      const getterValue = descriptor.get.call(this);

      if (!options.includeGetters) {
        return value;
      }

      if (RE.GETTER.test(getterSource)) {
        return `@__${SYMBOL.Getter}-${UID}-${($[SYMBOL.Getter].push(
          options.includeGetters ? descriptor.get : value,
        ) - 1)}__@`;
      }

      return serialize(getterValue, options);
    }

    if (is.object(origValue)) {
      if (is.regExp(origValue)) {
        return `@__${SYMBOL.RegExp}-${UID}-${($[SYMBOL.RegExp].push(
          origValue,
        ) - 1)}__@`;
      }

      if (is.date(origValue)) {
        return `@__${SYMBOL.Date}-${UID}-${($[SYMBOL.Date].push(
          origValue,
        ) - 1)}__@`;
      }

      if (is.map(origValue)) {
        return `@__${SYMBOL.Map}-${UID}-${($[SYMBOL.Map].push(
          origValue,
        ) - 1)}__@`;
      }

      if (is.set(origValue)) {
        return `@__${SYMBOL.Set}-${UID}-${($[SYMBOL.Set].push(
          origValue,
        ) - 1)}__@`;
      }

      if (is.array(origValue) && isSparse(origValue)) {
        return `@__${SYMBOL.Array}-${UID}-${($[SYMBOL.Array].push(
          origValue,
        ) - 1)}__@`;
      }

      if (is.urlInstance(origValue)) {
        return `@__${SYMBOL.URL}-${UID}-${($[SYMBOL.URL].push(
          origValue,
        ) - 1)}__@`;
      }
    }

    if (is.function_(origValue)) {
      return `@__${SYMBOL.Function}-${UID}-${($[SYMBOL.Function].push(
        origValue,
      ) - 1)}__@`;
    }

    if (is.undefined(origValue)) {
      return `@__${SYMBOL.Undefined}-${UID}-${($[SYMBOL.Undefined].push(
        origValue,
      ) - 1)}__@`;
    }

    if (isInfinite(origValue)) {
      return `@__${SYMBOL.Infinity}-${UID}-${($[SYMBOL.Infinity].push(
        origValue,
      ) - 1)}__@`;
    }

    if (is.bigint(origValue)) {
      return `@__${SYMBOL.BigInt}-${UID}-${($[SYMBOL.BigInt].push(
        origValue,
      ) - 1)}__@`;
    }

    if (is.symbol(origValue)) {
      if (!options.includeSymbols) {
        return null;
      }
      const globalKey = Symbol.keyFor(origValue);
      const key = (
        globalKey ??
          origValue.description ??
          fallbackSymbolKey($[SYMBOL.Symbol].length)
      );
      const value = origValue ?? Symbol.for(key);
      return `@__${SYMBOL.Symbol}-${UID}-${($[SYMBOL.Symbol].push(value) -
        1)}__@`;
    }

    return value as any;
  }

  /**
   * Attempts to serialize a function into a string.
   *
   * @param fn the function expression to serialize
   * @date 11/24/2022 - 2:41:36 PM
   */
  function serializeFunc(fn: Function | ((...args: any[]) => unknown)) {
    assert.function_(fn);

    /**
     * String containing the serialized source of the target function.
     *
     * We use `Function.prototype.toString.call` to try to dodge potential
     * masks that may exist on the method itself. For example, some authors
     * add a static `toString()` method that returns `[object Object]`,
     * rather than the source code, effectively breaking the standard style
     * of serialization.
     *
     * This is a workaround for that.
     */
    const serializedFn = Function.prototype.toString.call(fn);

    if (RE.NATIVE.test(serializedFn)) {
      if (options.silent) {
        return undefined;
      } else {
        throw new TypeError(
          `Unable to serialize native function:\n\t${fn.name}`,
        );
      }
    }

    // pure functions, example: {key: function() {}}
    if (RE.PURE.test(serializedFn)) {
      return serializedFn;
    }

    // arrow functions, example: arg1 => arg1+5
    if (RE.ARROW.test(serializedFn)) {
      if (options.space && options.space !== 0) {
        return serializedFn.replaceAll(/(?<=\S)(=>)(?=\S)/g, " $1 ");
      }
      return serializedFn.replaceAll(/(?<=\S)[ ]*(=>)[ ]*(?=\S)/g, "$1");
    }

    const argIndex = serializedFn.indexOf("(");
    const _argLastIndex = serializedFn.search({
      [Symbol.search]: (string: string): number => (
        ~string.indexOf("){\n") ||
        ~string.indexOf(") {") ||
        ~string.indexOf(")=>") ||
        ~string.indexOf(") =>") ||
        -1
      ),
    });
    const def = serializedFn.slice(0, argIndex).trim().split(" ").filter((
      val,
    ) => val.length > 0);

    const nonReservedSymbols = def.filter((s) =>
      RESERVED.includes(s as RESERVED[number])
    );

    // enhanced literal objects, example: {key() {}}
    if (nonReservedSymbols.length > 0) {
      return (
        (def.includes("async") ? "async " : "") +
        "function " +
        (def.join("").replaceAll(/[^*]/g, "")) +
        (serializedFn.slice(argIndex))
      );
    }

    // arrow functions
    return serializedFn;
  }

  // Check if the parameter issa function
  if (!options.includeFunction && is.function_(obj)) {
    obj = undefined as any;
  }

  // Protects against `JSON.stringify()` returning `undefined`, by serializing
  // to the literal string: "undefined".
  if (is.nullOrUndefined(obj)) {
    return String(obj);
  }

  let str: any;

  // Creates a JSON string representation of the value.
  str = JSON.stringify(
    obj,
    options.isJSON ? undefined : replacer,
    options.space ?? 0,
  );

  // another sanity check...
  if (!is.string(str)) {
    return String(str);
  }

  // Replace unsafe HTML and invalid JavaScript line terminator chars with
  // their safe Unicode char counterpart. This _must_ happen before the
  // regexps and functions are serialized and added back to the string.
  if (!options.unsafe) {
    str = str.replace(RE.UNSAFE, escapeUnsafeChars);
  }

  if (is.all(is.emptyArray, ...Object.values($))) {
    return str;
  }

  function maybeSort(arr: unknown[]) {
    const shouldSort = options.sorted === true;
    const copy = (
      options.arrayFrom ? Array.from(arr) : Array.prototype.slice.call(arr)
    );
    if (shouldSort) {
      let sortMethod: "toSorted" | "sort" = "sort";

      if ([].toSorted && typeof [].toSorted === "function") {
        sortMethod = "toSorted";
      }

      return copy[sortMethod](options.sortCompareFn || undefined);
    }
    return copy;
  }

  function replaceFn(str: string, backslash: string, key: string, i: number) {
    // The placeholder may not be preceded by a backslash. This is to prevent
    // replacing things like `"a\"@__R-<UID>-0__@"` and thus outputting
    // invalid JS.
    if (backslash) return str;

    switch (key) {
      case SYMBOL.Date:
        return `new Date("${$[key][i].toISOString()}")`;
      case SYMBOL.RegExp: {
        if (options.literalRegExp) {
          return String.raw`/${$[key][i].source}/${
            validateRegExpFlags($[key][i].flags)
          }`;
        } else {
          return String.raw`new RegExp(${
            serialize($[key][i].source, options)
          }, "${validateRegExpFlags($[key][i].flags)}")`;
        }
      }
      case SYMBOL.Getter: {
        return options.includeGetters
          ? Function.prototype.toString.call($[key][i] as Function)
          : String($[key][i]);
      }
      case SYMBOL.Map: {
        return `new Map(${
          serialize(maybeSort(Array.from($[key][i].entries())), options)
        })`;
      }
      case SYMBOL.Set: {
        return `new Set(${
          serialize(maybeSort(Array.from($[key][i].values())), options)
        })`;
      }
      case SYMBOL.Array: {
        return `Array.${options.arrayFrom ? "from" : "prototype.slice.call"}(${
          serialize(
            Object.assign({ length: $[key][i].length }, maybeSort($[key][i])),
            options,
          )
        })`;
      }
      case SYMBOL.Undefined:
        return "undefined";
      case SYMBOL.Infinity:
        return $[key][i];
      case SYMBOL.BigInt: {
        return options.literalBigInt
          ? `${$[key][i]}n`
          : `BigInt("${$[key][i]}")`;
      }
      case SYMBOL.URL:
        return `new URL("${new URL($[key][i]).toString()}")`;
      case SYMBOL.Symbol:
        return `Symbol.for(${
          serialize(
            Symbol.keyFor($[key][i]) ?? $[key][i].description ??
              fallbackSymbolKey(i),
            options,
          )
        })`;
      case SYMBOL.Function:/* fall through */
      default:
        return serializeFunc($[SYMBOL.Function][i]);
    }
  }

  // Replaces all occurrences of map, regexp, date, etc. placeholders in the
  // JSON string with their string representations. If the original value can
  // not be found, then `undefined` is used.
  str = str.replace(RE.PLACEHOLDER, replaceFn);

  /**
   * @FIXME come up with a better solution to this problem!
   *
   * When serializing an object with a getter in it, we would expect a result
   * with a `get name() {...` statement in it as well. However, we get the
   * following output; and it doesn't work at all.
   *
   * ```ts
   * // Input / Expected:
   * { get name() { return "nick"; } }
   *
   * // Output / Actual:
   * { "name": get name() { return "nick"; } }
   * ```
   */
  if (options.includeGetters && RE.GETTER_BROKEN.test(str)) {
    str = str.replaceAll(RE.GETTER_BROKEN, "");
  }

  if (RE.SHORT_BROKEN.test(str)) {
    str = str.replaceAll(RE.SHORT_BROKEN, "");
  }

  return str;
}

export { serialize, type SerializeOptions };

export default Object.freeze(serialize);
