/// <reference no-default-lib="true" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom" />

import {
  assert,
  deleteFunctions,
  escapeUnsafeChars,
  fallbackSymbolKey,
  getIndentSize,
  is,
  RE,
  RESERVED,
  SYMBOL,
  UID,
  validateRegExpFlags,
} from "./_util.ts";

/**
 * Options available to control the behavior of {@linkcode serialize}.
 */
export interface SerializeOptions {
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
   * Control the indentation width in the generated string.
   * Set to 0 to disable pretty-printing entirely.
   * @default 0
   */
  space?: string | number;

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
 * Serializes JavaScript / TypeScript to a _superset_ of JSON, supporting
 * builtin featurs including RegExp, Date, BigInt, Map, Set, and more.
 *
 * ### Usage
 *
 * @example ```ts
 * import { serialize } from "https://deno.land/x/serialize/mod.ts";
 *
 * serialize({
 *   strings: "string",
 *   booleans: true,
 *   numeric: 0,
 *   bigint1: 10n,
 *   bigint2: BigInt(10),
 *   regexp1: /([^\s]+)/g,
 *   regexp2: new RegExp("([^\\s]+)", "g"),
 *   objects: { foo: "foo" },
 *   arrayLikes: [1, 2, 3],
 *   actualNull: null,
 *   undefineds: undefined,
 *   nonFinites: Number.POSITIVE_INFINITY,
 *   dateObject: new Date(),
 *   mapObjects: new Map([["hello", "world"]]),
 *   setObjects: new Set([123, 456]),
 *   arrowFuncs: (arg) => `"${arg}"`,
 *   globalSyms: Symbol.for("Deno.customInspect"),
 * });
 * ```
 *
 * ### Supported Types
 *
 * - [x] `Array`
 * - [x] `Date`
 * - [x] `Map`
 * - [x] `Set`
 * - [x] `URL`
 * - [x] `Infinity`
 * - [x] `undefined`
 * - [x] `RegExp` · enable {@linkcode options.literalRegExp} to output literals}
 * - [x] `BigInt` · enable {@linkcode options.literalBigInt} to output literals
 * - [x] `Function` · disable {@linkcode options.includeFunction} to exclude
 * - [x] `Getters` · enable {@linkcode options.includeGetters} to output the
 * getter properties source code, instead of their resolved static value
 * - [x] `Symbol.for` · disable {@linkcode options.includeSymbols} to exclude
 *
 * ### Options
 *
 * The `serialize` function accepts an `options` object for its 2nd argument,
 * allowing fine-grained control of various aspects of the program behavior.
 *
 * #### Pretty Printing
 *
 * For a pretty-printed output, the optional second argument can be used to
 * define identation size. Accepted values: object literal with a property
 * named `space`, or just a `string` / `number` literal (legacy option).
 *
 * Note: **HTML entities and JS line terminators are escaped automatically.**
 * To disable this feature, set the `unsafe` option to `true`.
 *
 * @see {@linkcode SerializeOptions} for a complete list of options that are
 * available in the aforementioned second argument.
 * @module
 */

/**
 * Serializes JavaScript / TypeScript to a _superset_ of JSON, supporting
 * builtin featurs including RegExp, Date, BigInt, Map, Set, and more.
 *
 * @param value - object literal or instance to be serialized
 * @returns string contained the serialized data
 * @see {@linkcode SerializeOptions}
 */
function serialize<T = any>(value: T): string;

/**
 * Serializes JavaScript / TypeScript to a _superset_ of JSON, supporting
 * builtin featurs including RegExp, Date, BigInt, Map, Set, and more.
 *
 * @param value - object literal or instance to be serialized
 * @param options - object literal of {@linkcode SerializeOptions} type
 * @returns string contained the serialized data
 * @see {@linkcode SerializeOptions}
 */
function serialize<T = any, O extends SerializeOptions = SerializeOptions>(
  value: T,
  options: O,
): string;

/**
 * Serializes JavaScript / TypeScript to a _superset_ of JSON, supporting
 * builtin featurs including RegExp, Date, BigInt, Map, Set, and more.
 *
 * @param value - object literal or instance to be serialized
 * @param space - `string` or `number` of spaces to indent the output with.
 * Shorthand way to set the `options.space` value (and nothing else).
 * @returns string contained the serialized data
 * @see {@linkcode SerializeOptions}
 */
function serialize<
  T = any,
  S extends number | string = 0,
  O extends SerializeOptions = { space: S },
>(value: T, space: S): string;

/**
 * Serializes JavaScript / TypeScript to a _superset_ of JSON, supporting
 * builtin featurs including RegExp, Date, BigInt, Map, Set, and more.
 *
 * @param value - object literal or instance to be serialized
 * @param [options] - either an object literal of type {@linkcode SerializeOptions}, or a `string` or `number` as shorthand for the `options.space` value and nothing else.
 * @returns string contained the serialized data
 * @see {@linkcode SerializeOptions}
 */
function serialize(
  obj: any,
  maybeOptions: any = { ...defaultOptions },
): string {
  const options: SerializeOptions = { ...defaultOptions };

  const assign = Object.assign, seal = Object.seal;

  // Overload #1
  // serialize(value: any, { space: "\t" })
  if (is.plainObject(maybeOptions)) {
    assign(options, maybeOptions);
  } // Overload #2
  // serialize(value: any, space: 2)
  else if (is.number(maybeOptions) || is.numericString(maybeOptions)) {
    let space = +maybeOptions;
    space = space > 8 ? 8 : space < 0 ? 0 : space;
    assign(options, { space });
  } else {
    assign(options, { space: maybeOptions || 0 });
  }

  const $ = seal({
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

    // For nested function
    if (!options.includeFunction) {
      deleteFunctions(value as any);
    }

    // reject null values
    if (!value && value !== undefined) {
      return value as null;
    }
    let descriptor: TypedPropertyDescriptor<V> | undefined = undefined;

    try {
      descriptor = Object.getOwnPropertyDescriptor(
        this,
        key,
      ) as TypedPropertyDescriptor<V> ?? {};
    } catch { /* ignore */ }

    if (is.object(this[key]) && descriptor !== undefined) {
      /**
       * Typed Property Descriptor for the object property currently being
       * inspected. This is used to check enumerability and to extract the code
       * for data accessors (getters/setters), if configured as such.
       */

      // exclude hidden properties by default
      if (!options.includeHidden && descriptor.enumerable === false) {
        return null;
      }

      // Review property descriptors to see if prop is an accessor
      if (
        is.plainObject(descriptor) &&
        is.subset({
          get: () => {},
          set: () => {},
          enumerable: false,
          configurable: false,
        }, descriptor) && is.function(descriptor.get)
      ) {
        const getterSource = Function.prototype.toString.call(descriptor?.get);
        const getterValue = descriptor?.get?.();

        if (!options.includeGetters) {
          return getterValue || origValue;
        }

        if (RE.GETTER.test(getterSource)) {
          return `@__${SYMBOL.Getter}-${UID}-${
            $[SYMBOL.Getter].push(
              options.includeGetters ? descriptor.get : origValue,
            ) - 1
          }__@`;
        }

        return serialize(getterValue, options);
      }
    }

    if (is.object(origValue)) {
      if (is.regExp(origValue)) {
        return `@__${SYMBOL.RegExp}-${UID}-${
          $[SYMBOL.RegExp].push(
            origValue,
          ) - 1
        }__@`;
      }

      if (is.date(origValue)) {
        return `@__${SYMBOL.Date}-${UID}-${
          $[SYMBOL.Date].push(
            origValue,
          ) - 1
        }__@`;
      }

      if (is.nonEmptyMap(origValue)) {
        return `@__${SYMBOL.Map}-${UID}-${
          $[SYMBOL.Map].push(
            origValue,
          ) - 1
        }__@`;
      }

      if (is.nonEmptySet(origValue)) {
        return `@__${SYMBOL.Set}-${UID}-${
          $[SYMBOL.Set].push(
            origValue,
          ) - 1
        }__@`;
      }

      if (
        (is.nonEmptyArray(origValue) && is.sparseArray(origValue))
      ) {
        return `@__${SYMBOL.Array}-${UID}-${
          $[SYMBOL.Array].push(
            Array.from(origValue),
          ) - 1
        }__@`;
      }

      if (is.url(origValue)) {
        return `@__${SYMBOL.URL}-${UID}-${
          $[SYMBOL.URL].push(
            origValue,
          ) - 1
        }__@`;
      }
    }

    if (is.function(origValue)) {
      return `@__${SYMBOL.Function}-${UID}-${
        $[SYMBOL.Function].push(
          origValue,
        ) - 1
      }__@`;
    }

    if (is.undefined(origValue)) {
      return `@__${SYMBOL.Undefined}-${UID}-${
        $[SYMBOL.Undefined].push(
          origValue,
        ) - 1
      }__@`;
    }

    if (is.infinite(origValue)) {
      return `@__${SYMBOL.Infinity}-${UID}-${
        $[SYMBOL.Infinity].push(
          origValue,
        ) - 1
      }__@`;
    }

    if (is.bigint(origValue)) {
      return `@__${SYMBOL.BigInt}-${UID}-${
        $[SYMBOL.BigInt].push(
          origValue,
        ) - 1
      }__@`;
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
      return `@__${SYMBOL.Symbol}-${UID}-${
        $[SYMBOL.Symbol].push(value) - 1
      }__@`;
    }

    return value as any;
  }

  /**
   * Attempts to serialize a function into a string.
   *
   * @param fn the function expression to serialize
   * @date 11/24/2022 - 2:41:36 PM
   */
  function serializeFunc(fn: Function | ((...args: any[]) => unknown)): string {
    assert.function(fn);

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
        return "undefined";
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
    const defString = serializedFn.slice(0, argIndex).trim();
    const def = defString.normalize("NFC").split(" ").filter((val) =>
      val.length
    );

    const nonReservedSymbols = (def as any[]).filter((s) =>
      RESERVED.includes(s)
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
  if (!options.includeFunction && is.function(obj)) {
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
  if (!is.nonEmptyString(str)) {
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

  function maybeSort(arr: unknown[] | ArrayLike<unknown>) {
    const shouldSort = options.sorted === true;
    // const copy = (
    //   options.arrayFrom ? Array.from(arr) : Array.prototype.slice.call(arr)
    // );
    const copy = Array.from(arr);

    if (shouldSort) {
      let sortMethod: "toSorted" | "sort" = "sort";

      if ([].toSorted && is.function([].toSorted)) {
        sortMethod = "toSorted";
      }

      return copy[sortMethod](options.sortCompareFn || undefined);
    }
    return copy;
  }

  function replaceFn(
    str: string,
    backslash: string,
    key: SYMBOL[keyof SYMBOL] | keyof SYMBOL,
    i: number,
  ): string {
    // The placeholder may not be preceded by a backslash. This is to prevent
    // replacing things like `"a\"@__R-<UID>-0__@"` and thus outputting
    // invalid JS.
    if (backslash) return str;
    if (!Object.values(SYMBOL).includes(key as any) && (key in SYMBOL)) {
      return replaceFn(str, backslash, SYMBOL[key as keyof SYMBOL], i);
    }
    switch (key) {
      case SYMBOL.Date:
        return `new Date("${new Date($[key][i]).toISOString()}")`;
      case SYMBOL.RegExp: {
        if (options.literalRegExp) {
          return String.raw`/${$[key][i].source}/${
            validateRegExpFlags($[key][i].flags)
          }`;
        } else {
          return String.raw`new RegExp(${
            serialize($[key][i].source, options)
          },${options.space ? " " : ""}"${
            validateRegExpFlags($[key][i].flags)
          }")`;
        }
      }
      case SYMBOL.Getter: {
        return options.includeGetters
          ? Function.prototype.toString.call($[key][i] as Function)
          : String($[key][i]);
      }
      case SYMBOL.Map: {
        const indent = getIndentSize(options.space);
        const space = indent > 0 ? indent : 0;
        return `new Map(${
          serialize(maybeSort(Array.from($[key][i].entries())), {
            ...options,
            space,
          }).replaceAll(/^(\s+)/mg, "  $1")
        })`;
      }
      case SYMBOL.Set: {
        const indent = getIndentSize(options.space);
        const space = indent > 0 ? indent : 0;

        return `new Set(${
          serialize(maybeSort(Array.from($[key][i].values())), {
            ...options,
            space,
          }).replaceAll(/^(\s+)/mg, "  $1")
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
      case SYMBOL.Function:
        return serializeFunc($[SYMBOL.Function][i]);
      default: {
        try {
          return serializeFunc($[SYMBOL.Function][i]);
        } catch {
          return serialize($[key as keyof typeof $][i], options);
        }
      }
    }
  }

  // Replaces all occurrences of map, regexp, date, etc. placeholders in the
  // JSON string with their string representations. If the original value can
  // not be found, then `undefined` is used.
  str = str.replaceAll(RE.PLACEHOLDER, replaceFn);

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

  const indent = getIndentSize(options?.space ?? 0);
  if (indent > 0) {
    str = str.replaceAll(/^\s*(?=\]\))/mg, " ".repeat(indent));
  }
  return str;
}

Object.freeze(serialize);

export { serialize, serialize as default };
