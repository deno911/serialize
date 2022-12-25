<div align="center">

# 🦕 serialize

##### Serialize JS/TS to a **_superset_ of JSON** without sacrificing critical data.

</div>

## Usage

### `serialize`

The string returned from the `serialize` function is **literal** and **valid** JavaScript, which can be saved to a `.js` or `.ts` file, or even embedded inside of a `<script>` tag.

#### [deno.land](https://deno.land/x/serialize)

```ts
import { serialize } from "https://deno.land/x/serialize@1.0.0/mod.ts";
```

#### [nest.land](https://x.nest.land/gallery/serialize)

```ts
import { serialize } from "https://x.nest.land/serialize@1.0.0/mod.ts";
```

### "Kitchen Sink" Demo

```ts
serialize({
  strings: "string",
  booleans: true,
  numeric: 0,
  bigint1: 10n,
  bigint2: BigInt(10),
  regexp1: /([^\s]+)/g,
  regexp2: new RegExp("([^\\s]+)", "g"),
  objects: { foo: "foo" },
  arrayLikes: [1, 2, 3],
  actualNull: null,
  undefineds: undefined,
  nonFinites: Number.POSITIVE_INFINITY,
  dateObject: new Date("2022-11-26T05:48:02.806Z"),
  mapObjects: new Map([["hello", "world"]]),
  setObjects: new Set([123, 456]),
  arrowFuncs: (arg) => `"${arg}"`,
  globalSyms: Symbol.for("Deno.customInspect"),
});
```

The above will produce the following string output:

```ts
'{"strings":"string","booleans":true,"numeric":0,"bigint1":BigInt("10"),"bigint2":BigInt("10"),"regexp1":new RegExp("([^\\\\s]+)", "g"),"regexp2":new RegExp("([^\\\\s]+)", "g"),"objects":{"foo":"foo"},"arrayLikes":[1,2,3],"actualNull":null,"undefineds":undefined,"nonFinites":Infinity,"dateObject":new Date("2022-11-26T05:48:02.806Z"),"mapObjects":new Map([["hello","world"]]),"setObjects":new Set([123,456]),"arrowFuncs":(arg)=>`"${arg}"`,"globalSyms":Symbol.for("Deno.customInspect")}';
```

> **Note**: to produced a beautified string, you can pass an optional second argument to `serialize()` to define the number of spaces to be used for the indentation.

---

## Supported Types

- [x] `Array`
- [x] `Date`
- [x] `Map`
- [x] `Set`
- [x] `URL`
- [x] `Infinity`
- [x] `undefined`
- [x] `RegExp` · [`options.literalRegExp`](#optionsliteralregexp) for literal output
- [x] `BigInt` · [`options.literalBigInt`](#optionsliteralbigint) for literal output
- [x] `Function` · [`options.includeFunction`](#optionsincludefunction)(enabled by default)
- [x] `Getters` · [`options.includeGetters`](#optionsincludegetters) required
- [ ] `Symbol` · [`options.includeSymbols`](#optionsincludesymbols) required 🚧

[🚧 <u> **More information on Symbols and Serialization**</u>](#optionsincludesymbols)

---

## Options

The `serialize()` function accepts an `options` object for a second argument, allowing fine-grained control of various aspects of the program's behavior.

<details><summary><strong><u><code>TypeScript interface</code></u></strong></summary><br>

```ts
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
```

</details>

### `options.arrayFrom`

Serialize Arrays using the `Array.from` method, which may not be available in all target environments.

Default behavior is to use the `Array.prototype.splice` method, constructing an Array from an Array-like object.

> Default value is `false`

### `options.isJSON`

This option indicates the target object does not contain any functions or RegExp expressions. This enables a hot-path that allows serialization to be over 3x faster. If you're serializing a lot of data, and know its pure JSON, then you can enable this option for a speed-up.

> Default value is `false`

```ts
serialize(obj, { isJSON: true });
```

> **Note**: still escaped for XSS prevention ([see `options.unsafe`](#optionsunsafe))

### `options.includeFunction`

Disable this option to **ignore** JavaScript/TypeScript functions, treating them just like `JSON.stringify` (e.g. ignore them entirely). Other features will work as expected.

> Default value is `true`

```ts
serialize(obj, { ignoreFunction: true });
```

### `options.includeGetters`

Enable to include the source for `getter` accessor properties, which allow for computed values. If not enabled, their values will be calculated at the time of serialization
and fixed to whatever the static output was at that point in time.

> Default value is `false`

```ts
const obj = {
  name: "Nick",
  title: "dev",
  get greet() {
    return `Hello, I'm a ${this.title} named ${this.name}!`;
  },
};

serialize(obj);
// {"name":"Nick","title":"dev","greet":"Hello, I'm a dev named Nick!"}

serialize(obj, { includeGetters: true });
// {
//   "name": "Nick",
//   "title": "dev",
//   get greet () {
//     return `Hello, I'm a ${this.title} named ${this.name}!`;
//   }
// }
```

### `options.includeHidden`

Serialize non-enumerable properties that are normally hidden.

> **Note**: only partially implemented

> Default value is `false`

### `options.includeSymbols`

> ⚠️ **support for symbols is experimental**

Serialize values with the type of `symbol`. Only works with global symbols created with the `Symbol.for()` method. Any standard symbols will be coerced into globals,
carrying over their description text (if any).

Serializing the symbol primitive is a totally bonkers concept, and - by design - is impossible to truly achieve. In reality, it's just copying the string key from
a given symbol, and therefore there is a strong chance the one created during
the deserializing process **will be a different value entirely**.

> Default value is `true`

### `options.literalBigInt`

Serialize BigInt expressions into literals, e.g. `100n` rather than the default `BigInt("100")`.

```ts
serialize({ big: BigInt("100") }, { literalBigInt: true });
// '{"big":100n}'
```

> Default value is `false`, with behavior as seen below.

```ts
serialize({ bigger: 200n });
// '{"bigger":BigInt("200")}'
```

### `options.literalRegExp`

Serialize Regular Expressions into literals, e.g. `/.../i` rather than the default `RegExp("...", "i")`.

```ts
serialize({ pattern: /(foo|bar|baz)/i }, { literalRegExp: true });
// '{"pattern":/(foo|bar|baz)/i}'
```

> Default value is `false`, with behavior as seen below.

```ts
serialize({ pattern: /(foo|bar|baz)/i });
// '{"pattern":new RegExp("(foo|bar|baz)","i")}'
```

### `options.silent`

Attempt to silence most errors and diagnostic messages.

> Default value is `true`

### `options.sorted`

Sort entries of keyed collections (Array, Object, Set, Map).

> Default value is `false`

### `options.sortCompareFn`

Custom comparator to sort entries in Arrays, Maps, Sets, etc.

**Note**: Implies `options.sorted`. If `sorted` is `false` while this option is defined with a valid
comparator function, it will override the former.

> Default value is `undefined`

### `options.space`

This option is the same as the `space` argument that can be passed to [`JSON.stringify`][JSON.stringify]. It can be used to add whitespace and indentation to the serialized output to make it more readable.

> Default value is `0`

```ts
serialize(obj, { space: 2 });
```

### `options.strAbbreviateSize`

> **Note**: not yet implemented

The maximum length of a string before it is truncated with an ellipsis.

> Default value is `undefined` (no limit)

### `options.unsafe`

This option is to signal `serialize()` that we want to do a straight conversion, without the XSS protection. This option needs to be explicitly set to `true`. HTML characters and JavaScript line terminators will not be escaped. You will have to roll your own.

> Default value is `false`

```ts
serialize(obj, { unsafe: true });
```

> **Note**: [please see the **Auto-Escaped Characters** section below](#auto-escaped-characters).

---

### Auto-Escaped Characters

One of the primary features of this module is to serialize code to a string of literal JavaScript, which can be safely embedded in an HTML document as the content of a `<script>` element.

In order to make this safe, HTML entities and JS line terminators are auto-escaped:

```ts
const dangerous = { haxorXSS: "</script>" };
```

The above will produce the following string, HTML-escaped output which is
safe to put into an HTML document as it will not cause the inline script
element to terminate:

```ts
serialize(dangerous);

// HTML entities have been safely escaped:
'{"haxorXSS":"\\u003C\\u002Fscript\\u003E"}';
```

You can pass `unsafe` argument to `serialize()` for straight serialization:

```ts
serialize(dangerous, { unsafe: true });

// HTML entities have NOT been escaped:
'{"haxorXSS":"</script>"}';
```

---

## Deserializing

For some use cases you might also need to **_deserialize_** the string.
~~This is explicitly not part of this module. However, you can easily write it yourself:~~

This is **extremely unsafe**, should probably be avoided, and is quite possibly
unsupported by your environment. To understand why these risks exist, take a
look at the code behind the deserialize function:

```ts
function deserialize<T>(serialized: string): T {
  return eval(`(${serialized})`) as T;
}
```

> **Warning**: Don't forget to wrap the **entire** serialized string with parentheses, as seen as `(` `)` in the example above). Otherwise the opening bracket `{` will be considered to be the start of a body.

### Type Safety

```ts
import {
  deserialize,
  serialize,
} from "https://deno.land/x/serialize@1.0.0/mod.ts";

interface User {
  name: string;
  age: bigint;
}

// encoded to a plain old string
const encoded = serialize<User>({ name: "Nick", age: 29n });

// ensures the decoded data has a consistent type, and
// instructs our IDE which properties and types to anticipate.
const decoded = deserialize<User>(encoded);
// => { name: string; age: bigint; }
```

---

## Contributing

> This section assumes you have [**the GitHub CLI**][gh-cli].

<details><summary><strong>  ⚠️ Fixing a bug? Create an issue <i>first</i>!</strong></summary><br>

Unless, of course, you're fixing a bug for which an issue already exists!

This allows the issue to be connected to your Pull Request, creating a permanent
record of your contribution to the project. It also makes it easier for
maintainers to track project progression.

Creating an issue also ensures you're given proper credit for fixing that bug 😉

</details>

### Fork the repository

```sh
gh repo fork deno911/serialize --clone
```

### Create a feature branch

```sh
git checkout -b fix/typo-in-readme
```

### Make some improvements

Don't forget to **format**, **lint**, and **test** your code before committing!

```sh
# hack hack hack...

deno fmt
deno lint --unstable
deno test --unstable -A --no-check
```

### Commit your changes

Please try keep all changes concise and relevant to each other.

```sh
git add .

# all commits should be signed + verified with GPG/SSH
git commit -S -m "fix: typos in README.md"

git push
```

### Open a Pull Request

```sh
gh pr create --title "fix: typos in README.md"
```

**Or just open your repo on GitHub.com and follow the prompts.**

<details><summary>As a general rule: <strong><em>the smaller the PR, the better</em>. Why?</strong></summary><br>

1. Implementing / reverting the effects of a small pull is easy.
2. Large pulls can quickly become unmanageable and fragile.
3. Large pulls make it quite difficult to identify, isolate, and fix bugs.

</details>

> **Warning**: make sure you select the upstream repo for your PR!

---

<div align="center">

### [🅓🅔🅝🅞⑨①①][deno911]

##### Written in TypeScript, for Deno and the Web.

###### Inspired by the [serialize-javascript][sjs-gh] project by Yahoo! Inc.

</div>

[JSON.stringify]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
[deno911]: https://github.com/deno911
[gh-cli]: https://cli.github.com
[nberlette]: https://github.com/nberlette
[LICENSE]: https://github.com/deno911/serialize/blob/main/LICENSE
[sjs-gh]: https://github.com/yahoo/serialize-javascript
