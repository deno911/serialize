#!/usr/bin/env -S deno run -A

// Copyright 2018-2022 the oak authors. All rights reserved. MIT license.

/**
 * This is the build script for building the oak framework into a Node.js
 * compatible npm package.
 *
 * @module
 */

import { build, emptyDir } from "https://deno.land/x/dnt@0.32.1/mod.ts";
import { copy } from "https://deno.land/std@0.170.0/fs/copy.ts";

const NPM_DIR = "./_npm";

async function start() {
  await emptyDir(NPM_DIR);
  // await copy("fixtures", "npm/esm/fixtures", { overwrite: true });
  // await copy("fixtures", "npm/script/fixtures", { overwrite: true });

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
      undici: true,
      custom: [{
        package: {
          name: "stream/web",
        },
        globalNames: ["ReadableStream", "TransformStream"],
      }, {
        module: "./node_shims.ts",
        globalNames: ["ErrorEvent"],
      }],
    },
    test: true,
    typeCheck: false,
    compilerOptions: {
      importHelpers: true,
      target: "ES2021",
      lib: ["esnext", "dom", "dom.iterable"],
    },
    package: {
      name: "serialize.ts",
      version: Deno.args[0],
      author: "Nicholas Berlette <nick@berlette.com>",
      license: "MIT",
      private: false,
      homepage: "https://github.com/deno911/serialize/#readme",
      readme: "https://github.com/deno911/serialize/#readme",
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
