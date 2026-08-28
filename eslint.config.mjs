// @ts-check
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

/**
 * Hexagonal architecture element types.
 *
 * zero-io  — packages with ZERO IO dependencies. Must not import from io-allowed or apps.
 * io-allowed — packages that may perform IO (DB, LLM, Redis, R2).
 * app        — entry-point applications. May import from any package type.
 */

export default tseslint.config(
  // ── Global ignores ────────────────────────────────────────────────────────
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/coverage/**",
      "evals/dist/**",
    ],
  },

  // ── TypeScript parser for all TS/TSX files ────────────────────────────────
  // Without this, ESLint treats .ts files as plain JS and fails on TS syntax.
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
    },
  },

  // ── Boundary enforcement ───────────────────────────────────────────────────
  {
    files: [
      "packages/**/*.ts",
      "packages/**/*.tsx",
      "apps/**/*.ts",
      "apps/**/*.tsx",
    ],
    plugins: { boundaries },
    settings: {
      /**
       * Each element maps to a directory glob (relative to repo root).
       * ESLint resolves the actual file path of the importer to determine
       * which type it belongs to, then enforces the `element-types` rule
       * on the resolved path of the imported module.
       */
      "boundaries/elements": [
        {
          type: "zero-io",
          pattern: [
            "packages/ir/src/**/*",
            "packages/commands/src/**/*",
            "packages/registry/src/**/*",
            "packages/emitter-react/src/**/*",
            "packages/emitter-html/src/**/*",
            "packages/contracts/src/**/*",
          ],
        },
        {
          type: "io-allowed",
          pattern: [
            "packages/harness/src/**/*",
            "packages/db/src/**/*",
          ],
        },
        {
          type: "app",
          pattern: [
            "apps/web/src/**/*",
            "apps/web/app/**/*",
            "apps/agent/src/**/*",
            "apps/worker/src/**/*",
          ],
        },
      ],
      /** Workspace package aliases — maps @pageforge/* to source directories */
      "boundaries/resolve-alias": {
        "@pageforge/ir": "packages/ir/src",
        "@pageforge/commands": "packages/commands/src",
        "@pageforge/registry": "packages/registry/src",
        "@pageforge/emitter-react": "packages/emitter-react/src",
        "@pageforge/emitter-html": "packages/emitter-html/src",
        "@pageforge/contracts": "packages/contracts/src",
        "@pageforge/harness": "packages/harness/src",
        "@pageforge/db": "packages/db/src",
      },
    },
    rules: {
      /**
       * zero-io   → only imports from other zero-io packages
       * io-allowed → imports from zero-io and io-allowed
       * app        → imports from zero-io and io-allowed (not other apps)
       */
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "zero-io", allow: ["zero-io"] },
            { from: "io-allowed", allow: ["zero-io", "io-allowed"] },
            { from: "app", allow: ["zero-io", "io-allowed"] },
          ],
        },
      ],
    },
  },
);
