#!/usr/bin/env -S deno run --allow-read --allow-write

/// <reference no-default-lib="true" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />

import {
  $,
  assert,
  colors,
  type ExpandGlobOptions,
  is,
  JSONC,
  semver,
  TOML,
  YAML,
} from "./deps.ts";

const ansi = colors();
const DEBUG = !["false", null, undefined].includes(Deno.env.get("DEBUG"));
const preventPublishOnError = false;

/** `VERSION` managed by https://deno.land/x/publish */
export const VERSION = "1.0.0-rc.2";
export const MODULE = "serialize";

/** `prepublish` will be invoked before publish */
export async function prepublish(version: string) {
  try {
    await bump("./*.{md,ts}", { version });

    // and link our nest api key from the environment
    const NESTAPIKEY = Deno.env.get("NESTAPIKEY");
    const egg = find<{
      version: string;
      [x: string]: JSONC.JSONValue;
    }>("./egg.*");

    // sanity check
    if (egg?.parsed) {
      if (is.nonEmptyStringAndNotWhitespace(NESTAPIKEY)) {
        // ensure eggs is installed (implicit latest version)
        await exec(
          Deno.execPath(),
          "install -A https://deno.land/x/eggs/cli.ts",
        );
        //
        await exec("eggs", `link ${NESTAPIKEY}`);

        if (semver.lt(egg.parsed.version!, version)) {
          egg.parsed.version = version;

          const stringify = (egg.path.endsWith("json")
            ? JSON.stringify
            : egg.path.endsWith("toml")
            ? TOML.stringify
            : YAML.stringify);

          Deno.writeTextFileSync(
            egg.path,
            Reflect.apply(
              stringify,
              undefined,
              stringify === JSON.stringify
                ? [egg.parsed, null, 2]
                : [egg.parsed],
            ),
          );
        }

        await exec("eggs", "publish");
      } else {
        throw new TypeError(
          `Missing environment variable \`$NESTAPIKEY\`, which is required to publish on ${
            ansi.bold.magenta("nest.land")
          }. Please set it and try again.`,
        );
      }
    }
  } catch (err) {
    console.error(err);
    if (preventPublishOnError) return false;
  }

  if (DEBUG) return false; // return a falsey value to prevent publishing.
}

/** `postpublish` will be invoked after publish */
export function postpublish(version: string) {
  console.log(
    ansi.bold.brightGreen(
      ` ✓ published ${ansi.green.underline(`${MODULE}@${version}`)}`,
    ),
  );
}

type Arrayable<T> = T | T[];

interface BumpContext {
  version?: string | semver.SemVer;
  previous?: string | semver.SemVer;
  semver: {
    releaseType: semver.ReleaseType;
    includePrelease?: boolean;
    operator?: semver.Operator;
  };
  options?: {
    failFast?: boolean;
    placeholder?: string;
    placeholders?: boolean | string | RegExp;
    delimiter?: string | RegExp;
    jsdoc?: boolean | Arrayable<string | RegExp>;
  };
}

const releaseType: semver.ReleaseType = "patch";

const defaultBumpContext: BumpContext = {
  version: semver.increment(VERSION ?? "0.0.0", releaseType) ?? "",
  semver: { releaseType },
  options: {
    placeholder: "VERSION",
    placeholders: `\\{<v>\\}|\\{\\{<v>\\}\\}|\\$<v>`,
    delimiter: `[\\/\"\'\\(\\)\\{\\}\\[\\]\\s]`,
    jsdoc: [
      "@version ",
      `@module ${MODULE}@`,
    ],
  },
};

async function bump(
  pattern: string | URL,
  ctx?: Partial<BumpContext>,
): Promise<void>;

async function bump(
  pattern: string | URL,
  version: string | semver.SemVer,
  ctx?: Partial<BumpContext>,
): Promise<void>;

async function bump(
  pattern: string | URL,
  version?: string | semver.SemVer | Partial<BumpContext>,
  ctx: Partial<BumpContext> = { ...defaultBumpContext },
): Promise<void> {
  const { semver: { releaseType }, options } = {
    ...defaultBumpContext,
    ...(ctx || {}),
  } as BumpContext;

  const previous = ctx?.previous ?? VERSION ?? "0.0.0";

  if (is.nullOrUndefined(version) || !is.string(version)) {
    version = semver.increment(previous, releaseType) ?? "";

    assert.nonEmptyStringAndNotWhitespace(version);
  }

  let path = String(pattern);
  if ($.path.isGlob(path)) {
    path = $.path.normalizeGlob(path);
  }

  for (const file of $.fs.expandGlobSync(path)) {
    if (file.isFile) {
      try {
        const PLACEHOLDER_RE = /[%#]\w+|[<]\w+?[>]/ig;
        let PLACEHOLDERS = (
          options?.placeholders === true
            ? defaultBumpContext.options?.placeholders
            : options?.placeholders === false
            ? ""
            : is.regExp(options?.placeholders)
            ? options?.placeholders.source
            : [options?.placeholders ?? ""].flat().flatMap((s) =>
              s.split(/\b\|\b/)
            ).map((s) =>
              s.replaceAll(PLACEHOLDER_RE, options?.placeholder ?? "VERSION")
            ).join("|")
        ) as string;

        PLACEHOLDERS = PLACEHOLDERS + "|";

        //
        // normalize our delimiter
        const DELIM = String(options?.delimiter);
        const JSDOC = is.nonEmptyArray(options?.jsdoc) ? options?.jsdoc! : [];
        const SPECIFIER_RE = new RegExp(
          // lookbehind
          `(?<=(?:^|${DELIM})(?:${MODULE}[@]${
            options?.jsdoc && JSDOC.length > 0
              ? `|(?:^[\\t ]+\\* |\\s)(?:${JSDOC.filter(Boolean).join("|")})`
              : ""
          }))` +
            // placeholder tags, literal previous version, or any non-DELIM
            `(${PLACEHOLDERS}${VERSION}|(?!${DELIM}).+?)` +
            // lookahead
            `(?=${DELIM}|$)`,
          "mig",
        );

        let content = await Deno.readTextFile(file.path);

        if (SPECIFIER_RE.test(content)) {
          content = content.replaceAll(
            SPECIFIER_RE,
            semver.valid(version) ?? version,
          ), await Deno.writeTextFile(file.path, content).catch(console.error);
        }
      } catch (error) {
        console.error(
          ansi.bold.bgRed(" FAILED "),
          `⚠︎ Unable to bump ${ansi.underline.red(file.name)} ${
            previous ? `from ${ansi.underline(String(previous))}` : ""
          }to ${ansi.bold(version)}!\n\n${error}`,
        );
      }
    }
  }
}

interface FindResult<T = { [key: string]: JSONC.JSONValue }> {
  source: string;
  parsed: T | undefined;
  path: string;
  ext?: string;
}

function find<T = { [key: string]: JSONC.JSONValue }>(
  glob: string | URL,
  options: Omit<ExpandGlobOptions, "includeDirs" | "caseInsensitive"> = {},
): FindResult<T> | undefined {
  glob = $.path.normalizeGlob(String(glob));
  const candidates = [
    ...$.fs.expandGlobSync(glob, {
      ...options,
      includeDirs: false,
      caseInsensitive: true,
    }),
  ].filter((f) => f.isFile);
  const feelingLucky = candidates.at(0);

  try {
    const source = Deno.readTextFileSync(String(feelingLucky?.path));
    if (!source) return undefined;
    const ext = $.path.extname(feelingLucky?.path ?? "").replace(/^\./, "");

    let parsed: T | undefined = undefined;
    const path = feelingLucky?.path ?? "";

    switch (ext) {
      case "json":
        parsed = JSONC.parse(source, { allowTrailingComma: true }) as T ??
          undefined;
        break;
      case "yaml":/* fallthrough */
      case "yml":
        parsed = YAML.parse(source) as T ?? undefined;
        break;
      case "toml":
        parsed = TOML.parse(source) as T ?? undefined;
        break;
      default:
        parsed = undefined;
    }

    return { source, parsed, path, ext };
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    return undefined;
  }
}

function exec<
  Env extends Record<string, string>,
  Cmd extends string[] = string[],
>(env: Env, ...cmd: Cmd): Promise<string>;

function exec<
  Cmd extends string[] = string[],
>(...cmd: Cmd): Promise<string>;

function exec(
  env: string | Record<string, string>,
  ...cmd: string[]
): Promise<string> {
  if (is.string(env)) {
    cmd.unshift(env);
    env = {} as Record<string, string>;
  }

  assert.plainObject(env);

  if (cmd.length === 1) {
    cmd = cmd[0].split(/\s+/, 2);
  }

  return Deno.run({
    cmd,
    env,
    stderr: "null",
    stdin: "null",
    stdout: "piped",
  }).output().then((output) => new TextDecoder().decode(output));
}

export { bump, exec, find };
