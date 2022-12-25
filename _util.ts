import { assert, is } from "https://x.nest.land/dis@0.3.0-rc.3/mod.ts";

// Generate an internal UID to make the regexp pattern harder to guess.
export const UID_LENGTH = 16;
export const UID = generateUID(UID_LENGTH, 36);

// deno-fmt-ignore
export const SYMBOL_NAME = {
  L: "URL",
  M: "Map",
  S: "Set",
  D: "Date",
  A: "Array",
  B: "BigInt",
  Y: "Symbol",
  R: "RegExp",
  F: "Function",
  G: "Getter",
  // P: "Proxy",
  I: "Infinity",
  U: "Undefined",
} as const;
// deno-fmt-ignore
export const SYMBOL = Object.keys(SYMBOL_NAME).reduce(
  (map, K) => ({ ...map, [SYMBOL_NAME[K as keyof SYMBOL_NAME]]: K }),
  {} as { [K in keyof SYMBOL_NAME as SYMBOL_NAME[K]]: K; });

export const SYMBOLS = Object.values(SYMBOL) as [
  "L",
  "M",
  "S",
  "D",
  "A",
  "B",
  "Y",
  "R",
  "F",
  "I",
  "U",
  "G",
];

export type SYMBOL = typeof SYMBOL;
export type SYMBOLS = typeof SYMBOLS;
export type SYMBOL_NAME = typeof SYMBOL_NAME;

export const RE = {
  ARROW: /(?<=[a-zA-Z0-9_\$]|[)]).*?=>.*?/d,
  NATIVE: /\{[\s\n]*\[native code\][\s\n]*\}/dg,
  PURE: /\bfunction\b.*?\(/d,
  GETTER: /\bget\b.*?\(\) \{/d,
  SHORT: /^(async)? *(\*)? *((?!function|get|set)[a-zA-Z0-9_\$]+)\b.*?\(/d,
  GETTER_BROKEN: /(?:"([a-zA-Z0-9_\$]+)"[:] ?)(?=get (\1) \(\))/dg,
  SHORT_BROKEN: /(?:"([a-zA-Z0-9_\$]+)"[:] ?)(?=(async ?)?(\* ?)?(\1) \()/dg,
  UNSAFE: /[<>\/\u2028\u2029]/dg,
  PLACEHOLDER: RegExp(
    `(\\\\)?"@__(${SYMBOLS.join("|")})-${UID}-(\\d+)__@"`,
    "dg",
  ),
};

export const RESERVED = ["*", "async", "get", "set"] as const;
export type RESERVED = typeof RESERVED;

// Mapping of unsafe HTML and invalid JavaScript line terminator chars to their
// Unicode char counterparts which are safe to use in JavaScript strings.

const CHAR_MAP = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
} as const;

type CHAR_MAP = typeof CHAR_MAP;

export function escapeUnsafeChars<C extends string>(char: C) {
  return (
    char in CHAR_MAP ? CHAR_MAP[char as keyof CHAR_MAP] : char
  ) as string;
}

export function getIndentSize(space: string | number = 0): number {
  let indent = 0;
  const tabSize = 8;
  if (is.number(space) || is.numericString(space)) {
    indent = +space;
  } else if (is.nonEmptyString(space)) {
    indent = space.replace(/\t/g, " ".repeat(tabSize)).split("").length;
  } else {
    indent = 0;
  }
  return indent;
}
export function generateUID(length = UID_LENGTH, radix = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (let i = 0; i < length; ++i) {
    result += bytes[i].toString(radix);
  }
  return result;
}

export function deleteFunctions<T extends Record<string, any>>(obj: T) {
  const functionKeys = [];
  const props = Object.getOwnPropertyDescriptors(obj);

  for (const key in props) {
    if (is.function(props[key].value) || is.function(obj[key])) {
      functionKeys.push(key);
    }
  }

  for (const k of functionKeys) {
    Reflect.defineProperty(obj, k, {
      value: undefined,
      configurable: true,
    });
    Reflect.deleteProperty(obj, k);
  }
}

export function fallbackSymbolKey(id: number, prefix = "Symbol_") {
  return `${prefix || "Symbol_"}${id}`;
}

export type PositiveInfinity = 1e999;
export type NegativeInfinity = -1e999;
export type Infinite = PositiveInfinity | NegativeInfinity;

export type RegExpFlags = ["d", "g", "i", "m", "s", "u", "y"];
export type RegExpFlag = RegExpFlags[number];

export type ValidateRegExpFlag<S extends string, R extends string = ""> =
  S extends "" ? R
    : Lowercase<S> extends `${infer C}${infer Rest}`
      ? ValidateRegExpFlag<Rest, `${R}${C extends RegExpFlag ? C : ""}`>
    : never;

export function validateRegExpFlags<S extends string>(flags: S) {
  const f = String(flags).toLowerCase().trim().replace(/[^dgimsuy]/g, "");
  return (f.length > 0 ? f : "") as ValidateRegExpFlag<S>;
}

export { assert, is };
