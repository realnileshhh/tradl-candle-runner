// The Tradl Design System in this repo: a read-only mirror of the Figma file
// (ZRYpUf3iulUMH0Rbdb68hk) and the CSS variables generated from it.
//
//   node scripts/design-system.mjs status            the snapshot's parts and their hashes
//   node scripts/design-system.mjs check '<json>'    compare with a fingerprint read from Figma:
//                                                    which parts to read again or delete
//   node scripts/design-system.mjs sync              write src/design-system/tokens.css, tokens.ts and icons.ts
//   node scripts/design-system.mjs session-start     what the SessionStart hook prints
//
// The snapshot is design-system/snapshot/<part>.json, each part saved exactly as
// scripts/figma/read-design-system.js returned it. Nothing here writes to Figma.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotDir = join(root, "design-system", "snapshot");
const outDir = join(root, "src", "design-system");
const cssFile = join(outDir, "tokens.css");
const tsFile = join(outDir, "tokens.ts");
const iconsDir = join(root, "design-system", "icons");
const iconsFile = join(outDir, "icons.ts");
const FILE_KEY = "ZRYpUf3iulUMH0Rbdb68hk";

// FNV-1a, the same as the read script's.
const fnv = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

const partOrder = (a, b) => {
  const [an, ai] = a.split(/-(?=\d+$)/);
  const [bn, bi] = b.split(/-(?=\d+$)/);
  return an === bn ? Number(ai ?? 0) - Number(bi ?? 0) : an.localeCompare(bn);
};

const readSnapshot = () => {
  if (!existsSync(snapshotDir)) return {};
  return Object.fromEntries(
    readdirSync(snapshotDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(snapshotDir, f), "utf8"))])
      .sort(([a], [b]) => partOrder(a, b)),
  );
};

const hashes = (snapshot) =>
  Object.fromEntries(Object.entries(snapshot).map(([part, data]) => [part, fnv(JSON.stringify(data))]));

const status = () => console.log(JSON.stringify(hashes(readSnapshot())));

const check = (arg) => {
  if (!arg) {
    console.error("Pass the fingerprint JSON that the Figma read returned.");
    process.exit(2);
  }
  const remote = JSON.parse(arg);
  const local = hashes(readSnapshot());
  const read = Object.keys(remote).filter((p) => remote[p] !== local[p]);
  const remove = Object.keys(local).filter((p) => !(p in remote));
  if (read.length === 0 && remove.length === 0) {
    console.log("The design system is unchanged since the last sync.");
    return;
  }
  if (read.length > 0) console.log(`Read again from Figma: ${read.join(", ")}`);
  if (remove.length > 0) {
    console.log(`Delete from design-system/snapshot/: ${remove.map((p) => `${p}.json`).join(", ")}`);
  }
  console.log("Then: npm run ds:sync");
  process.exitCode = 1;
};

// ---------- names ----------
// A Figma path becomes a CSS name: lowercase, kebab-case, and a segment that
// only repeats the start of the next one is dropped, so "color/green/green-400"
// reads "color-green-400" and "Accent/Tints/Positive/positive-10" reads
// "accent-tints-positive-10".
const kebab = (path) => {
  const segments = path
    .split("/")
    .map((s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean);
  return segments
    .filter((s, i) => {
      const next = segments[i + 1];
      return !(next && (next === s || next.startsWith(`${s}-`)));
    })
    .join("-");
};

// Semantics carry no prefix (they are what the code uses). Primitives carry
// "primitive-" so they read as the raw layer. Other collections (Radius,
// Padding, Gap) already start their names with what they are.
const cssName = (collection, name) => {
  if (collection === "Semantics") return `--ds-${kebab(name)}`;
  if (collection === "Primitives") return `--ds-primitive-${kebab(name)}`;
  return `--ds-${kebab(name)}`;
};

const PX = /(^|\/)(radius|space|padding|gap|size|width|height|spacing)/i;

// ---------- values ----------
const withOpacity = (hex, opacity) => {
  const base = hex.slice(0, 7);
  const alpha = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
  const a = Math.round(alpha * opacity * 255);
  return a >= 255 ? base : `${base}${a.toString(16).padStart(2, "0").toUpperCase()}`;
};

// "{Primitives/color/green/green-400} 30%" resolved through every alias, in the
// mode asked for (or the target collection's only mode).
const makeResolver = (snapshot, rows) => {
  const modes = new Map(snapshot.meta.collections);
  const values = new Map(rows.map(([collection, name, , vals]) => [`${collection}/${name}`, { collection, vals }]));
  const resolve = (value, mode, depth = 0) => {
    if (typeof value !== "string" || depth > 20) return value;
    const match = value.match(/^\{(.+)\}(?: (\d+(?:\.\d+)?)%)?$/);
    if (!match) return value;
    const [, ref, opacity] = match;
    const target = values.get(ref);
    if (!target) throw new Error(`Unresolved alias ${value}`);
    const targetModes = modes.get(target.collection);
    const index = Math.max(0, targetModes.indexOf(mode));
    const resolved = resolve(target.vals[index] ?? target.vals[0], mode, depth + 1);
    return opacity === undefined ? resolved : withOpacity(resolved, Number(opacity) / 100);
  };
  return resolve;
};

const cssValue = (type, name, value) => {
  if (type === "COLOR") return value;
  if (type === "FLOAT") return PX.test(name) ? `${value}px` : String(value);
  if (type === "STRING") return JSON.stringify(value);
  return null; // BOOLEAN has no CSS form
};

const weights = {
  Thin: 100,
  "Extra Light": 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  "Semi Bold": 600,
  Bold: 700,
  "Extra Bold": 800,
  Black: 900,
};

const tracking = (letterSpacing) => {
  if (letterSpacing.endsWith("%")) {
    const em = Number((parseFloat(letterSpacing) / 100).toFixed(4));
    return em === 0 ? "0" : `${em}em`;
  }
  return parseFloat(letterSpacing) === 0 ? "0" : letterSpacing;
};

// ---------- sync ----------
const sync = () => {
  const snapshot = readSnapshot();
  if (!snapshot.meta) {
    console.error("No snapshot yet: read the design system from Figma first.");
    process.exit(2);
  }
  const rows = Object.entries(snapshot)
    .filter(([part]) => part.startsWith("variables"))
    .flatMap(([, data]) => data.variables);
  const resolve = makeResolver(snapshot, rows);

  const tokens = new Map(); // css name -> { figma, type }
  const claim = (css, figma, type) => {
    if (tokens.has(css)) throw new Error(`Two design system names make ${css}: ${tokens.get(css).figma} and ${figma}`);
    tokens.set(css, { figma, type });
  };

  const header = [
    `/*`,
    ` * Generated by \`npm run ds:sync\` from the Tradl Design System (Figma file ${FILE_KEY}).`,
    ` * Do not edit. The design system is read only: it changes in Figma, then the`,
    ` * snapshot is read again and this file is regenerated.`,
    ` * Aliases are resolved to final values; each line names its Figma variable.`,
    ` */`,
  ];
  const blocks = [];

  for (const [collection, collectionModes] of snapshot.meta.collections) {
    const own = rows.filter(([c, , type]) => c === collection && type !== "BOOLEAN");
    collectionModes.forEach((mode, index) => {
      const lines = own.map(([, name, type]) => {
        const css = cssName(collection, name);
        if (index === 0) claim(css, `${collection}/${name}`, type);
        const value = cssValue(type, name, resolve(`{${collection}/${name}}`, mode));
        return `  ${css}: ${value}; /* ${collection}/${name} */`;
      });
      const multi = collectionModes.length > 1;
      const theme = kebab(mode);
      const selector = !multi ? ":root" : index === 0 ? `:root,\n[data-theme="${theme}"]` : `[data-theme="${theme}"]`;
      const scheme = multi && ["dark", "light"].includes(theme) ? [`  color-scheme: ${theme};`] : [];
      blocks.push(
        `/* ${collection}${multi ? `, ${mode}` : ""} */\n${selector} {\n${[...scheme, ...lines].join("\n")}\n}`,
      );
    });
  }

  // Text styles: a `font` shorthand and a letter spacing per style. The family is
  // a variable of its own: an app that self-hosts the font sets --font-<family>
  // on <html> (next/font does), and the family name is the fallback.
  const families = [...new Set(snapshot.meta.textStyles.map((s) => s.fontFamily))];
  const typeLines = families.map((family) => {
    const css = `--ds-font-${kebab(family)}`;
    claim(css, `font family ${family}`, "STRING");
    return `  ${css}: var(--font-${kebab(family)}, ${JSON.stringify(family)}); /* every text style set in ${family} */`;
  });
  for (const s of snapshot.meta.textStyles) {
    const base = `--ds-type-${kebab(s.name)}`;
    const lineHeight = s.lineHeight === "auto" ? "normal" : s.lineHeight;
    claim(base, `text style ${s.name}`, "FONT");
    claim(`${base}-tracking`, `text style ${s.name}`, "TRACKING");
    typeLines.push(
      `  ${base}: ${weights[s.fontStyle] ?? 400} ${s.fontSize}px/${lineHeight} var(--ds-font-${kebab(s.fontFamily)}); /* ${s.name}, ${s.fontFamily} ${s.fontStyle} */`,
      `  ${base}-tracking: ${tracking(s.letterSpacing)};`,
    );
    if (s.textCase && s.textCase !== "ORIGINAL") {
      claim(`${base}-case`, `text style ${s.name}`, "CASE");
      const transform = { UPPER: "uppercase", LOWER: "lowercase", TITLE: "capitalize" }[s.textCase] ?? "none";
      typeLines.push(`  ${base}-case: ${transform};`);
    }
  }
  blocks.push(`/* Text styles */\n:root {\n${typeLines.join("\n")}\n}`);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(cssFile, `${header.join("\n")}\n\n${blocks.join("\n\n")}\n`);

  const names = [...tokens.keys()].sort();
  const ts = [
    `// Generated by \`npm run ds:sync\` from the Tradl Design System (Figma file`,
    `// ${FILE_KEY}). Do not edit: the values live in tokens.css; this file gives`,
    `// TypeScript the names, so a token renamed in Figma breaks the build where it is used.`,
    ``,
    `export const dsTokens = {`,
    ...names.map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(tokens.get(n).figma)},`),
    `} as const;`,
    ``,
    `/** A CSS custom property generated from the design system. */`,
    `export type DsToken = keyof typeof dsTokens;`,
    ``,
  ];
  writeFileSync(tsFile, ts.join("\n"));

  const iconCount = syncIcons(snapshot);
  console.log(
    `Wrote src/design-system/tokens.css, tokens.ts and icons.ts: ${rows.length} variables in ${snapshot.meta.collections.length} collections, ${snapshot.meta.textStyles.length} text styles, ${names.length} CSS names, ${iconCount} icons.`,
  );
};

// Icons exported from the design system (scripts/figma/read-design-system.js,
// PART "svg:<node id>") live in design-system/icons/<name>.svg as Figma gave them.
// icons.ts carries each as markup: its own colours become currentColor so a token
// colours it, and its size comes from CSS. React and the engine use the same strings.
const syncIcons = (snapshot) => {
  const known = new Map(
    Object.entries(snapshot)
      .filter(([part]) => part.startsWith("icons"))
      .flatMap(([, data]) => data.icons.map(([name, id]) => [name, id])),
  );
  const files = existsSync(iconsDir)
    ? readdirSync(iconsDir)
        .filter((f) => f.endsWith(".svg"))
        .sort()
    : [];
  const entries = files.map((file) => {
    const name = file.replace(/\.svg$/, "");
    if (!known.has(name))
      throw new Error(`design-system/icons/${file} is not an icon on the design system's Icons page.`);
    const svg = readFileSync(join(iconsDir, file), "utf8")
      .replace(/\s(width|height)="[^"]*"/g, "")
      .replace(/(fill|stroke)="#[0-9A-Fa-f]{3,8}"/g, '$1="currentColor"')
      .replace(/\s*\n\s*/g, "")
      .trim()
      .replace("<svg ", '<svg aria-hidden="true" ');
    return `  ${JSON.stringify(name)}: ${JSON.stringify(svg)}, // node ${known.get(name)}`;
  });
  writeFileSync(
    iconsFile,
    [
      `// Generated by \`npm run ds:sync\` from design-system/icons/*.svg, exported from the`,
      `// Tradl Design System (Figma file ${FILE_KEY}). Do not edit. Colours are currentColor`,
      `// and the size comes from CSS. Add an icon by exporting it (CLAUDE.md > Icons).`,
      ``,
      `export const dsIcons = {`,
      ...entries,
      `} as const;`,
      ``,
      `export type DsIconName = keyof typeof dsIcons;`,
      ``,
    ].join("\n"),
  );
  return files.length;
};

// Printed into Claude's context at the start of every session
// (.claude/settings.json): the design system is still changing, so it is read
// from Figma before any other work.
const sessionStart = () => {
  const local = hashes(readSnapshot());
  const synced = existsSync(cssFile) ? statSync(cssFile).mtime.toLocaleDateString("en-CA") : "never";
  console.log(`Tradl Candle Runner: read the Tradl Design System before any other work (CLAUDE.md > Session start).
The design system is READ ONLY: never write to Figma file ${FILE_KEY}; only scripts/figma/read-design-system.js runs against it.
1. Run scripts/figma/read-design-system.js through the Figma MCP use_figma tool on file ${FILE_KEY}, with PART = "fingerprint".
2. npm run ds:check -- '<the result>'
3. If it names parts: read each one, save it to design-system/snapshot/<part>.json exactly as returned, delete the parts it names, npm run ds:sync, npm run lint, then tell the user what changed.
If Figma can't be reached, say so and work from the snapshot.
The snapshot now: ${JSON.stringify(local)}, tokens last generated ${synced}.`);
};

const [command, arg] = process.argv.slice(2);
if (command === "session-start") sessionStart();
else if (command === "status") status();
else if (command === "check") check(arg);
else if (command === "sync") sync();
else {
  console.error("Usage: node scripts/design-system.mjs status | check '<json>' | sync | session-start");
  process.exit(2);
}
