import "https://deno.land/x/this@0.160.1/testing.ts";

import { deserialize, serialize } from "./mod.ts";

const raw = {
  ...{
    str: "string",
    num: 0,
    obj: { foo: "foo" },
    arr: [1, 2, 3],
    bool: true,
    nil: null,
    undef: undefined,
    inf: Infinity,
    date: new Date("Thu, 28 Apr 2016 22:02:17 GMT"),
    map: new Map([["hello", "world"]]),
    set: new Set([123, 456]),
    re: /([^\s]+)/g,
    big: 10n,
  } as const,
};

type raw = typeof raw;

describe("serialize()", () => {
  const encoded = serialize({ ...raw } as raw);
  const decoded = deserialize<raw>(encoded);

  it("should deserialize properly", () => {
    assertObjectMatch(decoded, raw);
  });
  it("should deserialize literal bigints", () => {
    assertEquals(decoded.big, raw.big);
  });
  it("should deserialize infinities", () => {
    assertEquals(decoded.inf, raw.inf);
  });
  it("should deserialize deeply nested values", () => {
    assertEquals(decoded.obj.foo, raw.obj.foo);
  });
  it("should deserialize regular expressions", () => {
    assertEquals(decoded.re.source, raw.re.source);
    assertEquals(decoded.re.flags, raw.re.flags);
  });
});
