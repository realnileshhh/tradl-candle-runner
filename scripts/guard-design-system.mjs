// PreToolUse hook (.claude/settings.json): the Tradl Design System is read only.
//
// Any Figma tool call that names the design system's file is checked here:
//   - read tools (screenshots, metadata, design context, variables) pass;
//   - `use_figma` passes only when its code is scripts/figma/read-design-system.js
//     (any PART), the repo's one vetted read;
//   - everything else is blocked, with the reason sent back to Claude.
// Exit 2 blocks the call; stderr is what Claude reads.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILE_KEY = "ZRYpUf3iulUMH0Rbdb68hk";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reader = join(root, "scripts", "figma", "read-design-system.js");

const READ_TOOLS = new Set([
  "get_design_context",
  "get_metadata",
  "get_screenshot",
  "get_variable_defs",
  "get_libraries",
  "search_design_system",
  "get_code_connect_map",
  "get_code_connect_suggestions",
  "get_context_for_code_connect",
  "list_file_components_for_code_connect",
  "download_assets",
  "get_motion_context",
  "list_file_shaders",
  "get_shader",
  "whoami",
]);

// The reader with its PART line taken out and whitespace collapsed, so the same
// script with a different PART compares equal.
const normalise = (code) =>
  code
    .replace(/^\s*const PART = .*;\s*$/m, "")
    .replace(/\s+/g, " ")
    .trim();

let input = "";
for await (const chunk of process.stdin) input += chunk;

let call;
try {
  call = JSON.parse(input);
} catch {
  process.exit(0);
}

const toolInput = call.tool_input ?? {};
if (!JSON.stringify(toolInput).includes(FILE_KEY)) process.exit(0);

const tool = String(call.tool_name ?? "")
  .split("__")
  .pop();
if (READ_TOOLS.has(tool)) process.exit(0);

if (tool === "use_figma" && typeof toolInput.code === "string") {
  if (normalise(toolInput.code) === normalise(readFileSync(reader, "utf8"))) process.exit(0);
}

process.stderr.write(
  `Blocked: the Tradl Design System (Figma file ${FILE_KEY}) is read only in this repo.\n` +
    `Only scripts/figma/read-design-system.js may run against it through use_figma (set PART; "svg:<node id>" exports a node), ` +
    `and the read tools (get_screenshot, get_metadata, get_design_context, get_variable_defs) are allowed.\n` +
    `A change the design system needs is the user's to make in Figma. Tell them what is missing instead.\n`,
);
process.exit(2);
