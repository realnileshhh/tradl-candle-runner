import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Playwright fixtures call `use()`, which is not React's hook.
  { files: ["tests/**"], rules: { "react-hooks/rules-of-hooks": "off" } },
  globalIgnores([
    // Next's own
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // the original game, kept as it shipped; the one-file build
    "reference/**",
    "public/**",
    // runs inside Figma (top-level return), not in Node
    "scripts/figma/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
