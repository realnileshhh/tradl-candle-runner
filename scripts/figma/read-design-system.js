// Reads the Tradl Design System, Figma file ZRYpUf3iulUMH0Rbdb68hk. READ ONLY:
// this is the only code that may run against that file (the guard in
// scripts/guard-design-system.mjs blocks anything else), and it changes nothing.
//
// Run it through the Figma MCP `use_figma` tool, with PART set first:
//   "fingerprint"   a hash of every part, to compare with the repo's snapshot
//                   (`npm run ds:check -- '<the result>'` names what changed)
//   "meta"          pages, variable collections and their modes, text styles
//   "variables-n"   the variables, every mode's value; aliases as "{collection/name}"
//   "icons-n"       the components on the Icons page (2:83): name, node id, key
//   "svg:<node id>" one node exported as SVG markup, e.g. an icon or a logo
// `use_figma` returns at most 20 KB, so variables and icons come in numbered
// parts of up to 18 KB each. Save each part, exactly as returned, to
// design-system/snapshot/<part>.json, then `npm run ds:sync`.
//
// Every list is sorted before it is hashed or split, so moving a variable, an
// icon, a page or a style around in Figma changes no hash: only an addition, a
// removal, a rename or a new value does.

const PART = "fingerprint";
const LIMIT = 18000;

// Plain code-unit order of each row's JSON: the same in every JS engine, and
// total, since no two rows are alike.
const sorted = (rows) =>
  rows
    .map((row) => [JSON.stringify(row), row])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, row]) => row);

const hex = ({ r, g, b, a }) => {
  const byte = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  const alpha = a === undefined || a >= 1 ? "" : byte(a);
  return `#${byte(r)}${byte(g)}${byte(b)}${alpha}`.toUpperCase();
};

// FNV-1a over the part's JSON; scripts/design-system.mjs hashes the same way.
const fnv = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

const chunk = (prefix, rows) => {
  const parts = [[]];
  let size = 0;
  for (const row of rows) {
    const rowSize = JSON.stringify(row).length + 1;
    if (size + rowSize > LIMIT && parts[parts.length - 1].length > 0) {
      parts.push([]);
      size = 0;
    }
    parts[parts.length - 1].push(row);
    size += rowSize;
  }
  return Object.fromEntries(parts.map((part, i) => [`${prefix}-${i + 1}`, { [prefix]: part }]));
};

if (PART.startsWith("svg:")) {
  const node = await figma.getNodeByIdAsync(PART.slice(4));
  if (!node || !("exportAsync" in node)) throw new Error(`No exportable node ${PART.slice(4)}`);
  return { id: node.id, name: node.name, svg: await node.exportAsync({ format: "SVG_STRING" }) };
}

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const byId = new Map(variables.map((v) => [v.id, v]));
const collectionName = new Map(collections.map((c) => [c.id, c.name]));

const valueOf = (value) => {
  if (!value || typeof value !== "object") return value;
  if (value.type === "VARIABLE_ALIAS") {
    const target = byId.get(value.id);
    return target ? `{${collectionName.get(target.variableCollectionId)}/${target.name}}` : `{${value.id}}`;
  }
  if ("r" in value) return hex(value);
  // A colour taken from another variable at an opacity: "{collection/name} 30%".
  if ("color" in value && "opacity" in value) {
    return `${valueOf(value.color)} ${value.opacity}%`;
  }
  return value;
};

const unit = (u) => (u === "PERCENT" ? "%" : "px");
const textStyles = await figma.getLocalTextStylesAsync();

const meta = {
  file: "ZRYpUf3iulUMH0Rbdb68hk",
  pages: sorted(figma.root.children.map((p) => [p.id, p.name])),
  collections: sorted(collections.map((c) => [c.name, c.modes.map((m) => m.name)])),
  textStyles: sorted(
    textStyles.map((s) => ({
      name: s.name,
      fontFamily: s.fontName.family,
      fontStyle: s.fontName.style,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight.unit === "AUTO" ? "auto" : `${s.lineHeight.value}${unit(s.lineHeight.unit)}`,
      letterSpacing: `${s.letterSpacing.value}${unit(s.letterSpacing.unit)}`,
      textCase: s.textCase,
    })),
  ),
};

// [collection, name, type, [value in each of the collection's modes]]
const variableRows = sorted(
  collections.flatMap((c) =>
    c.variableIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((v) => [c.name, v.name, v.resolvedType, c.modes.map((m) => valueOf(v.valuesByMode[m.modeId]))]),
  ),
);

// [name, node id, component key]. loadAsync reads the page without switching
// to it, so the file is left exactly as it was.
const iconsPage = await figma.getNodeByIdAsync("2:83");
await iconsPage.loadAsync();
const iconRows = sorted(
  iconsPage
    .findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] })
    .filter((n) => n.type === "COMPONENT_SET" || n.parent.type !== "COMPONENT_SET")
    .map((n) => [n.name, n.id, n.key]),
);

const parts = {
  meta,
  ...chunk("variables", variableRows),
  ...chunk("icons", iconRows),
};

if (PART === "fingerprint") {
  return Object.fromEntries(Object.entries(parts).map(([name, data]) => [name, fnv(JSON.stringify(data))]));
}
if (!(PART in parts)) {
  throw new Error(`Unknown PART "${PART}". Parts: ${Object.keys(parts).join(", ")}, svg:<node id>`);
}
return parts[PART];
