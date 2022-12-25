#!/usr/bin/env -S deno run -A

import { build, emptyDir } from "https://deno.land/x/dnt@0.32.1/mod.ts";
import { VERSION } from "./version.ts";

const NPM_DIR = "./_npm";

async function start() {
  await emptyDir(NPM_DIR);

  await build({
    entryPoints: ["./mod.ts"],
    outDir: NPM_DIR,
    mappings: {
      "./http_server_native.ts": "./http_server_node.ts",
    },
    shims: {
      blob: true,
      crypto: true,
      deno: true,
    },
    test: true,
    typeCheck: false,
    compilerOptions: {
      importHelpers: true,
      target: "ES2021",
      lib: ["esnext", "dom", "dom.iterable"],
    },
    package: {
      name: "serializd",
      version: Deno.args[0] || VERSION,
      author: "Nicholas Berlette <nick@berlette.com>",
      license: "MIT",
      private: false,
      description:
        "Serialize JavaScript/TypeScript into a JSON superset, retaining Maps, Sets, Dates, RegExps, Functions, and more. Based on serialize-javascript, rewritten in TS for the modern era. Supports Deno and Node.",
      keywords: [
        "serialize",
        "typescript",
        "serialize-ts",
        "regexp-in-json",
        "json-superset",
        "functions-in-json",
        "deno911",
      ],
      engines: {
        node: ">=16.5.0",
      },
      homepage: "https://deno.land/x/serialize?doc",
      readme: "https://github.com/deno911/serialize/#readme",
      repository: {
        type: "git",
        url: "git+https://github.com/deno911/serialize.git",
      },
      bugs: {
        url: "https://github.com/deno911/serialize/issues",
      },
      dependencies: {
        "tslib": "~2.3.1",
      },
      devDependencies: {
        "@types/node": "^17",
      },
    },
  });

  await Deno.copyFile("LICENSE", `${NPM_DIR}/LICENSE`);
  await Deno.copyFile("README.md", `${NPM_DIR}/README.md`);
}

start();
