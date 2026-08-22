/**
 * project-template.ts — static string templates for generated project files.
 *
 * SRP: Only generates boilerplate; no IR traversal here.
 */

import type { ThemeTokens } from "@pageforge/ir";

// ---------------------------------------------------------------------------
// tailwind.config.ts
// ---------------------------------------------------------------------------

export const TAILWIND_CONFIG_TEMPLATE = `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
`;

// ---------------------------------------------------------------------------
// tsconfig.json
// ---------------------------------------------------------------------------

export const TSCONFIG_TEMPLATE = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

// ---------------------------------------------------------------------------
// package.json builder
// ---------------------------------------------------------------------------

/**
 * Build a minimal Next.js package.json for the generated project.
 * `usedPackages` — packages collected from ImportCollector (e.g. "@pageforge/registry").
 */
export function buildPackageJson(usedPackages: string[]): string {
  const extraDeps: Record<string, string> = {};
  for (const pkg of usedPackages) {
    if (pkg === "@pageforge/registry") {
      extraDeps["@pageforge/registry"] = "workspace:*";
    }
  }

  const pkg = {
    name: "pageforge-generated",
    version: "0.0.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
    },
    dependencies: {
      next: "^15.0.0",
      react: "^19.0.0",
      "react-dom": "^19.0.0",
      ...extraDeps,
    },
    devDependencies: {
      "@types/node": "^22.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      typescript: "^5.7.0",
    },
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

// ---------------------------------------------------------------------------
// CSS token renderer
// ---------------------------------------------------------------------------

/**
 * Render ThemeTokens as CSS custom properties.
 * When token values are CSS var() references (as in DEFAULT_THEME), substitutes
 * sensible design-system defaults so the generated CSS is immediately usable.
 */
export function renderThemeCss(_theme: ThemeTokens): string {
  return `/* PageForge Design Tokens — generated */
/* Customize these values to match your brand */
:root {
  /* Colors */
  --pf-color-primary: #6366f1;
  --pf-color-secondary: #8b5cf6;
  --pf-color-background: #ffffff;
  --pf-color-surface: #f8fafc;
  --pf-color-text: #0f172a;
  --pf-color-muted: #64748b;
  --pf-color-border: #e2e8f0;
  --pf-color-accent: #f59e0b;

  /* Spacing */
  --pf-spacing-xs: 4px;
  --pf-spacing-sm: 8px;
  --pf-spacing-md: 16px;
  --pf-spacing-lg: 24px;
  --pf-spacing-xl: 40px;
  --pf-spacing-2xl: 64px;

  /* Radii */
  --pf-radius-sm: 4px;
  --pf-radius-md: 8px;
  --pf-radius-lg: 16px;
  --pf-radius-full: 9999px;

  /* Typography */
  --pf-font-sans: Inter, system-ui, sans-serif;
  --pf-font-mono: "Fira Code", monospace;

  /* Scale */
  --pf-scale-xs: 0.75rem;
  --pf-scale-sm: 0.875rem;
  --pf-scale-base: 1rem;
  --pf-scale-lg: 1.125rem;
  --pf-scale-xl: 1.25rem;
  --pf-scale-2xl: 1.5rem;
  --pf-scale-3xl: 2rem;
}
`;
}
