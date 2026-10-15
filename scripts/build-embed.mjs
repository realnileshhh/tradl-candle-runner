// Builds the one-file game the PRD promises (section 8): one HTML file, no
// dependencies, the only network request the Inter font.
//
//   node scripts/build-embed.mjs    src/embed/main.ts -> public/candle-runner-loading.html
//
// Next serves it at /candle-runner-loading.html, the iframe path the PRD gives
// the front end, so the review page loads it exactly as the product will. It is
// a build output (git-ignored): hand the front end this file.

import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "candle-runner-loading.html");

const result = await build({
  absWorkingDir: root,
  entryPoints: ["src/embed/main.ts"],
  bundle: true,
  write: false,
  outdir: "embed-build",
  format: "iife",
  target: ["es2020", "chrome100", "safari15", "firefox100"],
  minify: true,
  legalComments: "none",
  logLevel: "warning",
});

const file = (ext) => result.outputFiles.find((f) => f.path.endsWith(ext))?.text ?? "";
const js = file(".js");
let css = file(".css");

// The design system's full token set is large and the game uses a few of its
// tokens: keep the --ds-* declarations something references, drop the rest.
const declared = /(--ds-[a-z0-9-]+):[^;}]*;?/g;
const used = new Set();
const referenced = (text) => [...text.matchAll(/var\((--ds-[a-z0-9-]+)/g)].map((m) => m[1]);
let frontier = referenced(css.replace(declared, ""));
const values = new Map([...css.matchAll(/(--ds-[a-z0-9-]+):([^;}]*)/g)].map((m) => [m[1], m[2]]));
while (frontier.length) {
  const next = [];
  for (const name of frontier) {
    if (used.has(name)) continue;
    used.add(name);
    next.push(...referenced(values.get(name) ?? ""));
  }
  frontier = next;
}
css = css.replace(declared, (match, name) => (used.has(name) ? match : ""));

const template = readFileSync(join(root, "src", "embed", "index.html"), "utf8");
const html = template.replace("/*__CSS__*/", () => css.trim()).replace("/*__JS__*/", () => js.trim());

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(
  `Built public/candle-runner-loading.html: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB (script ${(js.length / 1024).toFixed(1)} KB, styles ${(css.length / 1024).toFixed(1)} KB, ${used.size} design system tokens).`,
);
