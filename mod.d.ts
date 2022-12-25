export type Primitive =
  | string
  | number
  | bigint
  | boolean
  | symbol
  | undefined
  | object
  | Function;

export interface WeakRef<T extends object> {
  readonly [Symbol.toStringTag]: "WeakRef";

  /**
   * Returns the WeakRef instance's target object, or undefined if the target object has been
   * reclaimed.
   */
  deref(): T | undefined;
}

export interface WeakRefConstructor {
  readonly prototype: WeakRef<any>;

  /**
   * Creates a WeakRef instance for the given target object.
   * @param target The target object for the WeakRef instance.
   */
  new <T extends object>(target: T): WeakRef<T>;
}

export const WeakRef: WeakRefConstructor;

// deno-fmt-ignore
export type Flatten<T, Deep = false, Infer = false> =
  | T extends Keyable
    ? Infer extends true
      ? T extends infer U
        ? Flatten<U, Deep, false>
      : never
    : { [K in keyof T]: Deep extends true ? Flatten<T[K], true, Infer> : T[K] }
  : T;

export type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (
    k: infer I,
  ) => void ? I
    : never;

export type UnionToFunction<T> = T extends any ? () => T : never;

export type LastOf<T> = UnionToIntersection<UnionToFunction<T>> extends
  () => infer R ? R
  : never;

export type Push<T extends unknown[], V> = [
  ...T,
  ...(V extends unknown[] ? V : [V]),
];

export type UnionToTuple<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false,
> = true extends N ? [] : Push<UnionToTuple<Exclude<T, L>>, L>;

/**
 * Matches a `class` constructor.
 * @see https://mdn.io/Classes.
 */
export interface Class<
  Proto = unknown,
  Args extends any[] = any[],
> extends Constructor<Proto, Args> {
  readonly prototype: Proto;
}

export interface Constructor<Proto = unknown, Args extends any[] = any[]> {
  new (...args: Args): Proto;
}

export type Predicate<T = unknown> = (value: unknown) => value is T;

/**
 * Matches any primitive value.
 * @see https://mdn.io/Primitive
 */
export type Primitive =
  | null
  | undefined
  | string
  | number
  | boolean
  | symbol
  | bigint;

/**
 * @see {@link Printable} for more information on Printable Primitive types.
 */
export type MaybePrintable = Exclude<Primitive, symbol>;

/**
 * The "Printable" Primitives - `string`, `number`, `boolean`, `bigint` - are
 * the subset of the Primitive types that can be printed in Template Literal
 * types (a feature of TypeScript 4.1+).
 *
 * _Technically_ `null` and `undefined` are also printable, but only as the
 * literal strings `"null"` and `"undefined"`, respectively. As such, they
 * are not included in this type.
 *
 * @see {@linkcode MaybePrintable} if you need to include `null` and `undefined` in the Printable type for your use case.
 */
export type Printable = NonNullable<MaybePrintable>;

/**
 * Matches any [typed array](https://mdn.io/TypedArray).
 * @see https://mdn.io/TypedArray
 */
export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export type Keyable =
  | Record<PropertyKey, unknown>
  | unknown[]
  | Map<any, any>
  | Set<any>;
