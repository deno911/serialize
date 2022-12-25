#!/usr/bin/env -S deno run -A --unstable

import { VERSION } from "./version.ts";
import { build, colors, emptyDir } from "./deps.ts";

const ansi = colors();
const NPM_DIR = "./npm";

const name = "serialize-typescript";
const version = Deno.args[0] ?? VERSION;

async function start() {
  await emptyDir(NPM_DIR);

  await build({
    entryPoints: ["./mod.ts"],
    outDir: NPM_DIR,
    packageManager: "pnpm",
    test: false,
    typeCheck: false,
    scriptModule: false,
    compilerOptions: {
      importHelpers: true,
      target: "Latest",
      lib: ["esnext", "dom", "dom.iterable"],
      skipLibCheck: true,
      emitDecoratorMetadata: true,
    },
    shims: {
      deno: true,
      crypto: true,
      weakRef: true,
      timers: true,
      custom: [
        { // janky temporary shim for missing dependency types
          module: "./mod.d.ts",
          globalNames: ["Primitive", "Printable", "Keyable", "Class"],
        },
      ],
    },
    package: {
      name,
      version,
      author: {
        name: "Nicholas Berlette",
        email: "nick@berlette.com",
        url: "https://github.com/nberlette",
      },
      license: "MIT",
      private: false,
      packageManager: "pnpm@7.18.2",
      publishConfig: {
        access: "public",
        registry: "https://registry.npmjs.org",
      },
      repository: "deno911/serialize",
      bugs: "https://github.com/deno911/serialize/issues",
      readme: "https://github.com/deno911/serialize/#readme",
      homepage: "https://deno.land/x/serialize?doc",
      description:
        "Serializes JavaScript/TypeScript code into a JSON superset with support for modern built-ins like Map, Set, Date, BigInt, and many more. Inspired by serialize-javascript and revived for the modern web. Available for Deno and Node.",
      prettier: "@brlt/prettier",
      eslintConfig: {
        extends: ["@brlt"],
      },
      dependencies: {
        "tslib": "~2.3.1",
      },
      devDependencies: {
        "@types/node": "^17",
        "@brlt/prettier": "latest",
        "@brlt/eslint-config": "latest",
        "eslint": "^8.30.0",
        "prettier": "^2.8.1",
      },
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
    },
  });

  for (const file of ["LICENSE", "README.md"]) {
    await Deno.copyFile(file, `${NPM_DIR}/${file}`);
  }
}

start().then(async () => {
  // const NPM_TOKEN = Deno.env.get("NPM_TOKEN") ?? Deno.env.get("NODEAUTHTOKEN") ?? Deno.env.get("NODE_TOKEN") ?? undefined;

  const postbuild_install = Deno.run({
    cwd: "./npm",
    cmd: ["deno", "run", "-A", "npm:pnpm@latest", "install"],
  });

  const postbuild_format = Deno.run({
    cwd: "./npm",
    cmd: ["deno", "run", "-A", "npm:prettier@latest", "--write", "."],
  });

  const postbuild = [
    postbuild_install,
    postbuild_format,
  ];

  // if (NPM_TOKEN) {
  //   const postbuild_publish = Deno.run({
  //     cwd: "./npm",
  //     env: {
  //       NPM_TOKEN,
  //     },
  //     cmd: ["deno", "run", "-A", "npm:pnpm@latest", "publish"],
  //   });

  //   postbuild.push(postbuild_publish);
  // }

  const _results = await Promise.all(postbuild.map((step) => step.status()));

  if (_results.every((res) => res.success)) {
    console.log(
      ansi.gray(
        ` ${ansi.bold.green("✓")} successfully built ${
          ansi.bold.underline.cyan(`${name}@${version}`)
        }. Ready to publish to ${ansi.brightRed.bold.underline("npm")} ${
          ansi.dim.brightRed("(registry.npmjs.org)")
        }`,
      ),
    );
  }
});
