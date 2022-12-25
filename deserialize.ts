import serialize from "./serialize.ts";
import { is } from "./_util.ts";

/**
 * Deserialize in a super unsafe way. This should probably never be used, as it
 * literally just evaluates whatever is passed into it. You've been warned.
 */
export function deserialize<T = unknown>(encoded: string): T {
  if (!is.nonEmptyStringAndNotWhitespace(encoded)) {
    encoded = serialize(encoded as unknown);
  }

  try {
    return eval(`(${encoded})`) as T;
  } catch (cause) {
    throw new EvalError(
      `Unable to deserialize code:\n\n\t${
        String(encoded).slice(0, 50)
      } [...]\n\nException raised: ${cause.toString()}`,
      { cause },
    );
  }
}

Object.defineProperty(deserialize, Symbol.toStringTag, {
  value: "deserialize",
});

Object.preventExtensions(deserialize);

export default deserialize;
