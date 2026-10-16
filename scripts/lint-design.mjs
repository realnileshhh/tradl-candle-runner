// The design lint (part of `npm run lint`): keeps the code on the Tradl Design System.
//
// Errors (exit 1):
//   1. a --ds-* or --cr-* token used anywhere in src/ that is not defined
//      (a token renamed or removed in Figma shows up here after `npm run ds:sync`)
//   2. a colour written by hand anywhere in src/ (hex, rgb(), hsl() and friends),
//      outside the two token files
//   3. in src/app and src/components: type, radius, gap or padding not from a
//      --ds-* token (0, auto and inherit are fine)
//   4. an em dash in src/, docs/, CLAUDE.md, README.md or .claude/rules/
// Report (no exit code): the game's harmonisation backlog, i.e. the --cr-* tokens
// that still hold a colour of their own and the game stylesheet's raw sizes.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => relative(root, p);

const walk = (dir, exts) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p, exts);
    return exts.some((e) => p.endsWith(e)) ? [p] : [];
  });
};

const DS_CSS = join(root, "src/design-system/tokens.css");
const GAME_TOKENS = join(root, "src/game/tokens.css");
const GENERATED = new Set([
  DS_CSS,
  join(root, "src/design-system/tokens.ts"),
  join(root, "src/design-system/icons.ts"),
  join(root, "src/design-system/logos.ts"),
]);

const definitions = (file, prefix) =>
  new Set([...readFileSync(file, "utf8").matchAll(new RegExp(`(--${prefix}-[a-z0-9-]+)\\s*:`, "g"))].map((m) => m[1]));
const dsTokens = definitions(DS_CSS, "ds");
const crTokens = definitions(GAME_TOKENS, "cr");

const errors = [];
const lineOf = (text, index) => text.slice(0, index).split("\n").length;
// Comments are prose: a token or a colour named in one is not a use.
const stripComments = (text, file) =>
  text.replace(file.endsWith(".css") ? /\/\*[\s\S]*?\*\//g : /\/\*[\s\S]*?\*\/|(?<![:"'`])\/\/[^\n]*/g, (m) =>
    m.replace(/[^\n]/g, " "),
  );

const sources = walk(join(root, "src"), [".css", ".ts", ".tsx"]).filter((f) => !GENERATED.has(f));

for (const file of sources) {
  const raw = readFileSync(file, "utf8");
  const text = stripComments(raw, file);

  // 1. every token used is defined
  for (const m of text.matchAll(/--(ds|cr)-[a-z0-9-]+/g)) {
    const isDefinition = /^\s*:/.test(text.slice(m.index + m[0].length)) && file === GAME_TOKENS;
    if (isDefinition) continue;
    const known = m[1] === "ds" ? dsTokens : crTokens;
    if (!known.has(m[0])) errors.push(`${rel(file)}:${lineOf(text, m.index)}  ${m[0]} is not defined`);
  }

  // 2. no colour by hand, outside the token files
  if (file !== GAME_TOKENS) {
    const colour =
      /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch)\(\s*[\d.]/g;
    for (const m of text.matchAll(colour)) {
      errors.push(`${rel(file)}:${lineOf(text, m.index)}  colour by hand (${m[0]}): use a design system token`);
    }
  }

  // 3. type, radius and spacing from tokens, in the app's own styles
  const own = /src\/(app|components)\//.test(file) && file.endsWith(".css");
  if (own) {
    const props =
      /(?<![\w-])(font|font-size|font-weight|line-height|letter-spacing|border-radius|gap|row-gap|column-gap|padding(?:-[a-z]+)*)\s*:\s*([^;}]+)/g;
    for (const m of text.matchAll(props)) {
      const rest = m[2]
        .replace(/var\(--ds-[a-z0-9-]+\)/g, "")
        .trim()
        .split(/\s+/)
        .filter((v) => v && !["0", "auto", "inherit", "initial", "normal", "none"].includes(v));
      if (rest.length)
        errors.push(`${rel(file)}:${lineOf(text, m.index)}  ${m[1]}: ${rest.join(" ")} is not a design system token`);
    }
  }
}

// 4. no em dashes in what people read
const prose = [
  ...sources,
  ...walk(join(root, "docs"), [".md"]).filter((f) => !f.includes(`${join("docs", "prd")}`)),
  ...walk(join(root, ".claude", "rules"), [".md"]),
  ...["CLAUDE.md", "README.md"].map((f) => join(root, f)).filter(existsSync),
];
for (const file of prose) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/—/g))
    errors.push(`${rel(file)}:${lineOf(text, m.index)}  em dash: rewrite the sentence`);
}

// The harmonisation backlog: reported, not failed.
const gameTokens = readFileSync(GAME_TOKENS, "utf8");
const own = [...gameTokens.matchAll(/(--cr-[a-z0-9-]+)\s*:\s*([^;]+);/g)].filter(
  ([, , value]) => !value.includes("var(--ds-") && /#|rgba?\(/.test(value),
);
const gameCss = readFileSync(join(root, "src/game/candle-runner.module.css"), "utf8");
const rawSizes = [
  ...gameCss.matchAll(/(font-size|line-height|border-radius|gap|padding|letter-spacing)\s*:\s*[^;]*\d(px|em)/g),
].length;

if (errors.length) {
  console.error(
    `Design lint: ${errors.length} problem${errors.length === 1 ? "" : "s"}\n${errors.map((e) => `  ${e}`).join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(`Design lint: clean (${dsTokens.size} design system tokens, ${crTokens.size} game tokens).`);
}
console.log(
  `Harmonisation backlog: ${own.length} of ${crTokens.size} game tokens hold their own colour; the game stylesheet has ${rawSizes} raw sizes. See docs/harmonisation.md.`,
);
