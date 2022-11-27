import serialize from "./serialize.ts";

/**
 * Deserialize in a super unsafe way. This should probably never be used, as it
 * literally just evaluates whatever is passed into it. You've been warned.
 */
function deserialize<T = unknown>(serialized: string): T {
  if (typeof serialized !== "string") {
    serialized = serialize(serialized as unknown);
  }
  try {
    return eval(`(${serialized})`) as T;
  } catch (cause) {
    throw new Error(
      `Unable to deserialize code:\n\n\t${
        String(serialized).slice(0, 50)
      } [...]\n\nException raised: ${cause.toString()}`,
      { cause },
    );
  }
}

Object.freeze(deserialize);

// export default deserialize;

export { deserialize, deserialize as default };
